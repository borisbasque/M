// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Flexible responsive dashboard React application.
 *
 * @module     core_my/index
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Badge, Button, Link} from '@moodlehq/design-system';
import {getString} from '@moodle/lms/core/stringUtils';
import {requireManyAsync} from '@moodle/lms/core/amd';
import Pending from '@moodle/lms/core/pending';
import {redirect} from '@moodle/lms/core/location';
import Toast, {type ToastAction, type ToastMessage} from '@moodle/lms/core/Toast';
import DashboardTile from './components/DashboardTile';
import ConfirmationDialog from './components/ConfirmationDialog';
import BlockBrowser from './components/BlockBrowser';
import GridCell from './components/GridCell';
import DashboardLoading from './components/DashboardLoading';
import {
    columnsForWidth,
    emptyRegions,
    applyRowSpans,
    firstFreeSpace,
    collapseEmptyRows,
    disturbedCount,
    fitMinimum,
    maxRow,
    measureNaturalHeight,
    packLayout,
    packWithPinned,
    readGridMetrics,
    rowsForHeight,
    writeBack,
    type GridSize,
    type LayoutItem,
} from './layout';
import {
    beaconRemoval,
    getDashboard,
    getDashboardBlock,
    updateDashboard,
    type AvailableBlock,
    type DashboardBlockContent,
    type DashboardData,
    type DashboardLabels,
    type DashboardUrls,
    type UpdateResult,
} from './repository';
import {SaveQueue, isTransientError, type SaveStatus} from './saveQueue';
import {BlockLoader} from './blockLoader';
import {useHeadingAlignment} from './headingAlignment';

/**
 * Turn a rejection into readable text.
 *
 * Moodle's web-service layer rejects with a plain object carrying `message` (and `errorcode`),
 * not an Error, so `String(caught)` would show "[object Object]".
 *
 * @param caught Whatever a failed call rejected with.
 * @return The message to display.
 */
export const errorMessage = (caught: unknown): string => {
    if (caught instanceof Error) {
        return caught.message;
    }
    if (caught && typeof caught === 'object' && typeof (caught as {message?: unknown}).message === 'string') {
        return (caught as {message: string}).message;
    }
    return String(caught);
};

interface DashboardScopeBannerProps {
    siteDefault: boolean;
    caneditotherscope: boolean;
    urls: DashboardUrls;
    labels: DashboardLabels;
}

// Kept in this file rather than its own module: it's only ever used from Dashboard below, and
// every ESM component here is a separate network request, so folding trivially-small, non-swizzled
// pieces into their one caller cuts requests without changing what's independently themeable (see
// swizzle.json - this was never a swizzle point of its own).
export const DashboardScopeBanner = ({siteDefault, caneditotherscope, urls, labels}: DashboardScopeBannerProps) =>
    <div className="core-my-dashboard-scope">
        <Badge
            variant={siteDefault ? 'warning' : 'info'}
            subtle
            pill
            label={siteDefault ? labels.scopesitedefault : labels.scopeown}
        />
        {caneditotherscope && <Link
            variant="secondary"
            href={siteDefault ? urls.ownpage : urls.sitedefault}
            label={siteDefault ? labels.switchtoown : labels.switchtositedefault}
        />}
    </div>;

interface Interaction {
    id: number;
    mode: 'move' | 'resize';
    origin: 'keyboard' | 'mouseclick' | 'pointer';
    original: LayoutItem;
    draft: LayoutItem;
    before: LayoutItem[];
    drag?: PointerDrag;
}

interface PointerDrag {
    x: number;
    y: number;
    width?: number;
    height?: number;
    shrinking?: boolean;
}

/** Where the block browser was opened from: a space the person picked, or nowhere in particular. */
interface PaletteTarget {
    column?: number;
    row?: number;
    // The empty region picked, which a block added there fills.
    columns?: number;
    rows?: number;
}

// Removing a block can be undone, so only resetting the dashboard still asks first.
type ConfirmAction = {type: 'reset'};

/** How many changes Undo can reverse within one visit. */
const HISTORY_LIMIT = 50;

// See the settling MutationObserver in the collected-JS effect below for what these guard.
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5000;
// Fired by blocks that declare asynchronous content: eventTypes.blockContentLoaded in core_block/events.
const BLOCK_CONTENT_LOADED = 'core_block/contentLoaded';
// How close to the top or bottom of the window a drag scrolls the page, and how far per frame.
const AUTOSCROLL_EDGE_PX = 64;
const AUTOSCROLL_STEP_PX = 12;
// How long a newly added block stays highlighted.
const NEW_BLOCK_HIGHLIGHT_MS = 2000;
let dashboardSettleCounter = 0;

const isSiteDefault = (): boolean => window.location.pathname.endsWith('/my/indexsys.php');

/**
 * Whether the grid is laid out right to left. CSS grid already mirrors the columns there, so only
 * what JavaScript works out from pointer positions and arrow keys needs mirroring by hand.
 */
const isRtl = (element: Element | null): boolean =>
    window.getComputedStyle(element ?? document.documentElement).direction === 'rtl';

/** Whether a key press belongs to a field being typed in, rather than to the dashboard. */
const isTyping = (target: EventTarget | null): boolean => target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const layoutChanged = (original: LayoutItem, draft: LayoutItem): boolean =>
    original.column !== draft.column || original.row !== draft.row ||
    original.columns !== draft.columns || original.rows !== draft.rows;

/**
 * A batch of collected block JavaScript to run, as its own object so each batch runs once.
 *
 * `asyncBlocks` lists the blocks in the batch that report when their content is in place
 * (block_base::has_async_content(), MDL-89736), so the dashboard waits for exactly those. `blocks`
 * limits the batch to some tiles, such as a block just added, so other blocks are left alone.
 */
interface CollectedScript {
    source: string;
    asyncBlocks: number[];
    // The blocks whose tiles the script belongs to, or undefined for every tile on the grid.
    blocks?: number[];
    // Held since the block's content was requested, and released once its script has started
    // (which holds its own until the block settles), so nothing waiting on the page sees a gap.
    pending?: Pending;
}

/**
 * Run collected block JavaScript, and report the dashboard as pending (via core/pending) until the
 * blocks it initialises have settled.
 *
 * A block's own async fetch-and-replace of its rendered content (e.g. Course overview, Recently
 * accessed items) is invisible to anything watching M.util.pending_js - Behat's
 * wait_for_pending_js() included - unless the block reports it. Blocks that declare
 * block_base::has_async_content() do (MDL-89736): they hold their own core/pending key while
 * loading and fire core_block/contentLoaded when done, so the dashboard waits for exactly those
 * events. Blocks that declare nothing - every contributed block today - must keep working
 * unmodified, so the dashboard also waits for a heuristic: such a replacement is always a
 * structural (childList) DOM mutation somewhere under the grid, so treat it as still settling
 * until the grid goes quiet for a short window. Either way a hard ceiling bounds the wait, in case
 * a block never reports or never goes quiet, so this can never hang a caller indefinitely. Only
 * childList is watched (not attributes/characterData), so unrelated noise - drag positioning,
 * resize-driven style changes - never resets the quiet window.
 *
 * @param script The collected JavaScript, and which of its blocks report their own loading.
 * @param grid The grid element to watch for mutations under.
 * @param onSettled Called once the batch has settled, unless it was stopped first.
 * @return A function that stops the batch: it will not run if it has not started yet.
 */
const runCollectedJavascript = (
    script: CollectedScript,
    grid: HTMLDivElement | null,
    onSettled?: () => void,
): () => void => {
    let superseded = false;
    let settled = false;
    let quiet = false;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;
    const pending = new Pending(`core_my/dashboard:settling:${dashboardSettleCounter++}`);

    // The DOM must also go quiet, not only the declaring blocks report: that covers blocks that
    // declare nothing, and late touches by declaring blocks after their main content lands (Course
    // overview, for one, updates its paging bar after its first page is shown).
    const awaiting = new Set(script.asyncBlocks);
    const onContentLoaded = (event: Event) => {
        awaiting.delete(Number((event as CustomEvent<{instanceId: number | null}>).detail?.instanceId));
        settleIfDone();
    };
    const settle = () => {
        if (settled) {
            return;
        }
        settled = true;
        clearTimeout(quietTimer);
        clearTimeout(hardTimer);
        observer?.disconnect();
        grid?.removeEventListener(BLOCK_CONTENT_LOADED, onContentLoaded);
        pending.resolve();
        if (!superseded) {
            onSettled?.();
        }
    };
    const settleIfDone = () => {
        if (awaiting.size === 0 && quiet) {
            settle();
        }
    };
    const startQuietWindow = () => {
        quiet = false;
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
            quiet = true;
            settleIfDone();
        }, DASHBOARD_SETTLE_QUIET_MS);
    };
    const hardTimer = setTimeout(settle, DASHBOARD_SETTLE_TIMEOUT_MS);
    if (grid) {
        grid.addEventListener(BLOCK_CONTENT_LOADED, onContentLoaded);
        observer = new MutationObserver(startQuietWindow);
        observer.observe(grid, {childList: true, subtree: true});
    }
    // Nothing may ever mutate at all (every block already rendered its final content
    // server-side) - start the quiet window immediately too, not only on the observer's
    // first callback.
    startQuietWindow();

    if (script.source) {
        void requireManyAsync(['core/fragment', 'core/templates', 'core_filters/events']).then(
            ([fragment, templates, filterEvents]) => {
                if (superseded) {
                    return undefined;
                }
                const processed = (fragment as {processCollectedJavascript: (source: string) => string})
                    .processCollectedJavascript(script.source);
                (templates as {runTemplateJS: (source: string) => void}).runTemplateJS(processed);
                // Tile content is injected by React rather than Templates.replaceNodeContents(), so
                // tell the filter system about it the same way that would have: without this,
                // filter-driven content in a block (MathJax, media players) never initialises.
                const selector = script.blocks
                    ? script.blocks.map(id =>
                        `.core-my-dashboard-tile[data-instance-id="${id}"] .core-my-dashboard-tile__content`).join(', ')
                    : '.core-my-dashboard-tile__content';
                const tiles = selector ? grid?.querySelectorAll(selector) : undefined;
                if (tiles?.length) {
                    (filterEvents as {notifyFilterContentUpdated: (nodes: NodeListOf<Element>) => void})
                        .notifyFilterContentUpdated(tiles);
                }
                return undefined;
            },
        );
    }
    return () => {
        superseded = true;
        settle();
    };
};

/**
 * Run a full dashboard load's collected block JavaScript.
 *
 * Keyed on the script object, not on the dashboard data: the data also changes when a block is
 * removed or added in place, and re-running every block's initialiser then would re-fetch the
 * content of blocks that did not change. A newer full load supersedes an older one whose script
 * has not started yet, since it replaced the tile content that script was written to target.
 *
 * @param script The latest full load's collected JavaScript, or null before the first load.
 * @param gridRef The grid element to watch for mutations under.
 * @param onSettled Called once this load's blocks have settled, unless a newer load superseded it.
 */
const useCollectedBlockJavascript = (
    script: CollectedScript | null,
    gridRef: React.RefObject<HTMLDivElement>,
    onSettled: () => void,
): void => {
    // Read through a ref so a new callback never re-runs the effect (and so the blocks' JavaScript).
    const onSettledRef = useRef(onSettled);
    onSettledRef.current = onSettled;
    useEffect(() => {
        if (!script) {
            return undefined;
        }
        return runCollectedJavascript(script, gridRef.current, () => onSettledRef.current());
    }, [script]);
};

/**
 * Track the grid's current responsive column count from its own rendered width.
 *
 * Returns both the reactive state (for rendering/memoization) and a ref mirroring the same value
 * (for imperative reads from callbacks - e.g. commit() in Dashboard below - that must see the
 * latest column count even when invoked from a stale closure, such as a pointerup listener
 * registered several renders ago).
 *
 * @param gridRef The grid element to measure.
 * @param data The current dashboard payload; re-measures whenever a fresh one loads.
 * @return A tuple of [columnCount, columnCountRef].
 */
const useResponsiveColumnCount = (
    gridRef: React.RefObject<HTMLDivElement>,
    data: DashboardData | null,
): [number, React.RefObject<number>] => {
    const [columnCount, setColumnCount] = useState(1);
    const columnCountRef = useRef(1);

    // UseLayoutEffect, not useEffect: the initial columnCount=1 default must be corrected
    // before the browser paints, not after - otherwise the grid visibly repacks from one
    // column to the real column count on every load, a large, confirmed layout shift.
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) {
            return undefined;
        }
        const measure = () => {
            const next = columnsForWidth(grid.getBoundingClientRect().width);
            columnCountRef.current = next;
            setColumnCount(next);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(grid);
        measure();
        return () => observer.disconnect();
    }, [data]);

    return [columnCount, columnCountRef];
};

interface DashboardProps {
    loadingLabel?: string;
    initialLayout?: LayoutItem[];
    // Open the block browser once loaded: Edit mode was turned on to add a block (see my/index.php).
    openBrowser?: boolean;
    // The dashboard, sent with the page so the first view needs no request for it (see my/index.php).
    initialData?: DashboardData | null;
}

const Dashboard = ({loadingLabel = '', initialLayout = [], openBrowser = false, initialData = null}: DashboardProps) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [canonical, setCanonical] = useState<LayoutItem[]>([]);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const [error, setError] = useState('');
    const [palette, setPalette] = useState<PaletteTarget | null>(null);
    const browserRequestedRef = useRef(openBrowser);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    // Set when changes could not be sent even after retrying; the banner offers to try again.
    const [unsaved, setUnsaved] = useState(false);
    const [loadedScript, setLoadedScript] = useState<CollectedScript | null>(null);
    const [addedScripts, setAddedScripts] = useState<CollectedScript[]>([]);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    // The toast on screen, its close handler, and which interaction (if any) it is instructions for.
    const toastRef = useRef<ToastMessage | null>(null);
    const toastOnCloseRef = useRef<(() => void) | null>(null);
    const toastCounterRef = useRef(0);
    const interactionToastRef = useRef<number | null>(null);
    // Layouts to go back to, newest last (see pushHistory and undo).
    const historyRef = useRef<LayoutItem[][]>([]);
    const [historySize, setHistorySize] = useState(0);
    // Blocks removed on screen whose removal is not sent yet, so Undo can bring them back as they
    // were: their tiles stay in the page, hidden, with their content and JavaScript intact.
    const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(new Set());
    const pendingRemovalRef = useRef<{id: number; toastId: number} | null>(null);
    // Where focus goes once the next layout has rendered: a block, or the Add a block button.
    const focusAfterRef = useRef<number | 'add' | null>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const saveStatusRef = useRef<SaveStatus>('idle');
    const gridRef = useRef<HTMLDivElement>(null);
    const pointerRef = useRef<{x: number; y: number; moved: boolean} | null>(null);
    const interactionRef = useRef<Interaction | null>(null);
    const canonicalRef = useRef<LayoutItem[]>([]);
    const displayLayoutRef = useRef<LayoutItem[]>([]);
    const dataRef = useRef<DashboardData | null>(null);
    // Blocks removed on screen whose removal has not reached the server yet (see retryUnsaved).
    const unsentRemovalsRef = useRef<Set<number>>(new Set());
    // Set just before the dashboard reloads itself on purpose, so that is not mistaken for the user
    // leaving with changes unsent.
    const reloadingRef = useRef(false);
    const siteDefault = isSiteDefault();
    // The revision of the dashboard this window last saw. Every change carries it, so the server
    // refuses one made from an out-of-date window rather than let it undo a newer change made
    // elsewhere (see dashboard::require_revision()), and each accepted change moves it on.
    const revisionRef = useRef<number | null>(null);
    const [send] = useState(() => async(
        action: 'save' | 'add' | 'remove',
        layout: LayoutItem[] = [],
        blockname = '',
        blockid = 0,
    ): Promise<UpdateResult> => {
        const result = await updateDashboard(action, siteDefault, layout, blockname, blockid, revisionRef.current);
        if (typeof result.revision === 'number') {
            revisionRef.current = result.revision;
        }
        return result;
    });
    // Every change to the dashboard goes through this one queue: in order, merged, and retried
    // across dropped connections (see saveQueue.ts).
    const [queue] = useState(() => new SaveQueue({
        sendLayout: layout => send('save', layout),
        onStatus: setSaveStatus,
    }));

    // The server resolves each block's minimum size (its own Block API declaration, or the default)
    // and sends it with the payload, so the editor and the server's own validation can never
    // disagree. Read through the ref so callbacks registered in an earlier render (e.g. a pointerup
    // listener) still see the current payload's values.
    const minimumSize = useCallback((id: number): GridSize => {
        const current = dataRef.current;
        return current?.blocks.find(block => block.id === id)?.minsize ?? current?.grid.minsize ?? {columns: 1, rows: 1};
    }, []);

    /**
     * Fetch a full dashboard payload and reset the canonical layout to match it.
     *
     * Called on mount, and to resynchronise with the server after it definitively rejected a
     * change (so what is on screen may no longer match what is saved). Moves, resizes, additions
     * and removals otherwise update the dashboard in place, without a reload.
     */
    // Used once, for the first view; every later reload (after a reset, a conflict with another
    // window or a refused change) asks the server again.
    const initialDataRef = useRef(initialData);
    const load = useCallback(async() => {
        try {
            const response = initialDataRef.current ?? await getDashboard(siteDefault);
            initialDataRef.current = null;
            setData(response);
            dataRef.current = response;
            setCanonical(response.layout);
            canonicalRef.current = response.layout;
            revisionRef.current = response.revision;
            settledRef.current = new Set();
            measuredRef.current = new Set();
            unsentRemovalsRef.current = new Set();
            pendingRemovalRef.current = null;
            setHiddenIds(new Set());
            setUnsaved(false);
            setLoadedScript({
                source: response.javascript,
                asyncBlocks: response.blocks.filter(block => block.asynccontent && block.loaded).map(block => block.id),
            });
            startLoadingBlocks(response);
            setError('');
            return response;
        } catch (caught) {
            setError(errorMessage(caught));
            return null;
        }
    }, [siteDefault]);

    /**
     * Load each block's content on its own, after the layout, a few at a time, visible blocks first
     * (see blockLoader.ts). A newer full load stops an older one's loading.
     */
    const loaderRef = useRef<BlockLoader<DashboardBlockContent & {pending: Pending}> | null>(null);
    const startLoadingBlocks = (response: DashboardData) => {
        loaderRef.current?.stop();
        const loader = new BlockLoader<DashboardBlockContent & {pending: Pending}>({
            fetch: id => {
                const pending = new Pending(`core_my/dashboard:block:${id}`);
                return getDashboardBlock(siteDefault, id).then(
                    result => ({...result, pending}),
                    error => {
                        pending.resolve();
                        throw error;
                    },
                );
            },
            onLoaded: (id, {block, javascript, pending}) => {
                const current = dataRef.current;
                if (!current) {
                    pending.resolve();
                    return;
                }
                // A block with nothing to show the viewer has no tile, as on the classic dashboard.
                patchDataRef.current({blocks: block
                    ? current.blocks.map(existing => existing.id === id ? {...existing, ...block, loaded: true} : existing)
                    : current.blocks.filter(existing => existing.id !== id)});
                setAddedScripts(scripts => [...scripts, {
                    source: block ? javascript : '',
                    asyncBlocks: block?.asynccontent ? [id] : [],
                    blocks: [id],
                    pending,
                }]);
            },
            onFailed: id => {
                const current = dataRef.current;
                if (current) {
                    patchDataRef.current({blocks: current.blocks.map(existing => existing.id === id
                        ? {...existing, content: '', footer: '', loaded: true, failed: true} : existing)});
                }
            },
        });
        loaderRef.current = loader;
        // Reading order, which is the layout's own order: the top of the page loads first.
        const waiting = new Set(response.blocks.filter(block => !block.loaded).map(block => block.id));
        loader.enqueue(response.layout.map(item => item.id).filter(id => waiting.has(id)));
    };

    /** Replace fields of the current dashboard payload without reloading it. */
    const patchData = useCallback((patch: Partial<DashboardData>) => {
        const current = dataRef.current;
        if (!current) {
            return;
        }
        const next = {...current, ...patch};
        dataRef.current = next;
        setData(next);
    }, []);
    const patchDataRef = useRef(patchData);

    // A block scrolled into view jumps the queue of blocks waiting for their content.
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }
        const observer = new IntersectionObserver(entries => entries
            .filter(entry => entry.isIntersecting)
            .forEach(entry => loaderRef.current?.prioritise(Number((entry.target as HTMLElement).dataset.instanceId))));
        grid.querySelectorAll('.core-my-dashboard-tile[aria-busy="true"]').forEach(tile => observer.observe(tile));
        return () => observer.disconnect();
    }, [data]);

    /** Replace the canonical layout, in state and in the ref callbacks read it from. */
    const updateCanonical = useCallback((next: LayoutItem[]) => {
        canonicalRef.current = next;
        setCanonical(next);
    }, []);

    /**
     * Show a toast, replacing any already showing. A replaced toast counts as closed, so its own
     * close handler (such as sending a delayed removal) still runs.
     *
     * @return The new toast's id.
     */
    const showToast = useCallback((text: string, options: {
        action?: ToastAction;
        persist?: boolean;
        onClose?: () => void;
    } = {}): number => {
        // While offline, every toast also says that changes will save on reconnecting, since it
        // replaces the toast that said so.
        const offline = saveStatusRef.current === 'offline' && dataRef.current
            && text !== dataRef.current.labels.saveoffline ? ` ${dataRef.current.labels.saveoffline}` : '';
        const next: ToastMessage = {
            id: ++toastCounterRef.current,
            text: text + offline,
            action: options.action,
            persist: options.persist,
        };
        const previousClose = toastOnCloseRef.current;
        toastOnCloseRef.current = options.onClose ?? null;
        toastRef.current = next;
        setToast(next);
        previousClose?.();
        return next.id;
    }, []);

    /** Close the toast, running its close handler. */
    const hideToast = useCallback(() => {
        const close = toastOnCloseRef.current;
        toastOnCloseRef.current = null;
        toastRef.current = null;
        setToast(null);
        close?.();
    }, []);

    /** Close one particular toast, if it is still the one showing, without running its close handler. */
    const dropToast = useCallback((id: number | null) => {
        if (id !== null && toastRef.current?.id === id) {
            toastOnCloseRef.current = null;
            toastRef.current = null;
            setToast(null);
        }
    }, []);

    /**
     * Announce a message to screen readers through the page's live region.
     *
     * The toast is a status region of its own, so a message it is already showing is not announced
     * a second time. The region is polite: routine changes never interrupt what is being read.
     */
    const announce = useCallback(async(key: string, value?: string | Record<string, unknown>) => {
        const text = await getString(key, 'my', value);
        if (toastRef.current?.text === text) {
            return;
        }
        setAnnouncement(text);
    }, []);

    /** Show a toast with one of this page's strings. */
    const toastString = useCallback(async(
        key: string,
        value?: string | Record<string, unknown>,
        options?: Parameters<typeof showToast>[1],
    ): Promise<number> => showToast(await getString(key, 'my', value), options), [showToast]);

    /**
     * React to a change the server did not accept.
     *
     * If the request never got through, even after the queue's retries, keep what is on screen and
     * let the user try again (see retryUnsaved) rather than throwing their work away. If the server
     * refused it, what is on screen is wrong: say why, and reload what is actually saved.
     */
    const handleSyncFailure = useCallback((caught: unknown) => {
        if (isTransientError(caught)) {
            setUnsaved(true);
            return;
        }
        const message = errorMessage(caught);
        // Show the reason once the reload is in (a successful load clears errors); if the reload
        // itself fails, its own error is the more useful one to show.
        void load().then(response => {
            if (response) {
                setError(message);
            }
            return undefined;
        });
    }, [load]);

    /**
     * Send again whatever did not get through: removals first (the layout no longer includes those
     * blocks, so the server must lose them before it will accept it), then the current layout.
     */
    const retryUnsaved = useCallback(async() => {
        setUnsaved(false);
        try {
            for (const id of [...unsentRemovalsRef.current]) {
                await queue.call(() => send('remove', [], '', id), true);
                unsentRemovalsRef.current.delete(id);
            }
            await queue.saveLayout(canonicalRef.current);
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [handleSyncFailure, queue, siteDefault]);

    // If changes are waiting when the connection comes back, send them without being asked.
    useEffect(() => {
        if (!unsaved) {
            return undefined;
        }
        const online = () => void retryUnsaved();
        window.addEventListener('online', online);
        return () => window.removeEventListener('online', online);
    }, [retryUnsaved, unsaved]);

    // Leaving the page with changes still unsent would lose them: ask first. A removal that is only
    // waiting for its toast to close is sent as the page goes instead (see beaconRemoval()), so
    // removing a block and then turning Edit mode off never asks.
    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (reloadingRef.current) {
                return;
            }
            if (saveStatus === 'idle' && !unsaved) {
                const pending = pendingRemovalRef.current;
                if (pending) {
                    pendingRemovalRef.current = null;
                    beaconRemoval(siteDefault, pending.id, canonicalRef.current, revisionRef.current);
                }
                return;
            }
            event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [saveStatus, siteDefault, unsaved]);

    useEffect(() => {
        void load().then(response => {
            if (response?.editing && browserRequestedRef.current) {
                browserRequestedRef.current = false;
                setPalette({});
            }
            return undefined;
        });
    }, [load]);

    // Say so when changes cannot be sent because the browser is offline, and confirm once they are
    // saved after reconnecting. Nothing is said about routine saving.
    const wasOfflineRef = useRef(false);
    useEffect(() => {
        saveStatusRef.current = saveStatus;
        const labels = dataRef.current?.labels;
        if (!labels) {
            return;
        }
        if (saveStatus === 'offline' && !wasOfflineRef.current) {
            wasOfflineRef.current = true;
            showToast(labels.saveoffline, {persist: true});
        } else if (saveStatus === 'idle' && wasOfflineRef.current) {
            wasOfflineRef.current = false;
            void toastString('dashboardsavedonline');
        }
    }, [saveStatus, showToast, toastString]);

    // Size every block that follows its content (MDL-89635 auto height) once per load, after its
    // content is in place: at its current width, rounded up to whole rows, between its minimum and
    // the cap. A declared preferred height wins over measuring. Only blocks in the way move, and only
    // down. The result is saved only to the viewer's own stored dashboard, and only when it changed.
    // Blocks whose content has settled, and blocks already measured, since the last full load: each
    // block is measured once, after its own content is in place, whichever order blocks load in.
    const settledRef = useRef(new Set<number>());
    const measuredRef = useRef(new Set<number>());
    const fitAutoHeights = useCallback((settled?: number[]) => {
        const current = dataRef.current;
        const grid = gridRef.current;
        if (!current || !grid) {
            return;
        }
        (settled ?? current.blocks.filter(block => block.loaded).map(block => block.id))
            .forEach(id => settledRef.current.add(id));
        if (interactionRef.current) {
            return;
        }
        const metrics = readGridMetrics(grid);
        const blocks = new Map(current.blocks.map(block => [block.id, block]));
        const rows = new Map<number, number>();
        canonicalRef.current.forEach(item => {
            const block = blocks.get(item.id);
            const tile = grid.querySelector<HTMLElement>(`.core-my-dashboard-tile[data-instance-id="${item.id}"]`);
            // A block is measured once its own content has settled, and only once per load.
            if (item.autorows === false || !block || !block.loaded || !tile
                    || !settledRef.current.has(item.id) || measuredRef.current.has(item.id)) {
                return;
            }
            measuredRef.current.add(item.id);
            rows.set(item.id, block.preferredrows ?? rowsForHeight(
                measureNaturalHeight(tile), metrics, block.minsize.rows, current.grid.autorowscap,
            ));
        });
        const next = applyRowSpans(canonicalRef.current, rows);
        if (next === canonicalRef.current) {
            return;
        }
        setCanonical(next);
        canonicalRef.current = next;
        if (current.ownlayout && current.canedit && !siteDefault) {
            // Only so the loading skeleton matches next time; a failure here costs nothing more.
            // Through the queue, so it can never overtake (or be overtaken by) an edit.
            void queue.saveLayout(next).catch(() => null);
        }
    }, [queue, siteDefault]);
    useCollectedBlockJavascript(loadedScript, gridRef, fitAutoHeights);
    // A newly added block's own JavaScript runs once its tile is in the DOM, after this render.
    // Each runs to completion: unlike a full reload, adding one block never invalidates another's.
    // Once it settles, auto heights are fitted again, which measures the new block too.
    useEffect(() => {
        if (!addedScripts.length) {
            return;
        }
        addedScripts.forEach(script => {
            runCollectedJavascript(script, gridRef.current, () => fitAutoHeights(script.blocks));
            script.pending?.resolve();
        });
        setAddedScripts([]);
    }, [addedScripts, fitAutoHeights]);
    const [columnCount, columnCountRef] = useResponsiveColumnCount(gridRef, data);

    const displayLayout = useMemo(() => packLayout(canonical, columnCount), [canonical, columnCount]);
    displayLayoutRef.current = displayLayout;
    // The page heading runs from the leftmost to the rightmost column that has a block.
    useHeadingAlignment(gridRef, displayLayout, columnCount);
    const previewLayout = useMemo(() => interaction
        ? packWithPinned(displayLayout, columnCount, interaction.draft,
            fitMinimum(minimumSize(interaction.id), columnCount))
        : displayLayout, [columnCount, displayLayout, interaction, minimumSize]);
    const bumpedBlockIds = useMemo(() => {
        if (interaction?.origin !== 'pointer') {
            return new Set<number>();
        }
        const originalItems = new Map(displayLayout.map(item => [item.id, item]));
        return new Set(previewLayout.filter(item => {
            const original = originalItems.get(item.id);
            return item.id !== interaction.id && original && (
                item.column !== original.column || item.row !== original.row
            );
        }).map(item => item.id));
    }, [displayLayout, interaction, previewLayout]);
    const previewById = useMemo(() => new Map(previewLayout.map(item => [item.id, item])), [previewLayout]);
    const blocksById = useMemo(() => new Map((data?.blocks ?? []).map(block => [block.id, block])), [data]);


    /**
     * Send a removal that was waiting for its toast to close, or for the next change.
     *
     * Until then the block is only hidden, so Undo can bring it back with its settings and content.
     * The removal is queued straight away, without waiting, so it always reaches the server before
     * the layout save of whatever change triggered it: the server will not accept a layout that
     * leaves out a block it still has.
     */
    const flushRemoval = useCallback(async() => {
        const pending = pendingRemovalRef.current;
        const current = dataRef.current;
        if (!pending || !current) {
            return;
        }
        pendingRemovalRef.current = null;
        // Its Undo would now reverse something else, so its toast goes too.
        dropToast(pending.toastId);
        const {id} = pending;
        unsentRemovalsRef.current.add(id);
        const removed = queue.call(() => send('remove', [], '', id), true);
        const layout = queue.saveLayout(canonicalRef.current);
        patchData({blocks: current.blocks.filter(block => block.id !== id)});
        setHiddenIds(previous => new Set([...previous].filter(hidden => hidden !== id)));
        try {
            const result = await removed;
            unsentRemovalsRef.current.delete(id);
            if (result.availableblocks) {
                patchData({availableblocks: result.availableblocks});
            }
            await layout;
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [dropToast, handleSyncFailure, patchData, queue, siteDefault]);

    /**
     * Record the layout as it is before a change, so Undo can return to it. Any removal still
     * waiting is sent first: the change is about to make its Undo unreachable.
     */
    const pushHistory = useCallback(() => {
        void flushRemoval();
        historyRef.current = [...historyRef.current, canonicalRef.current].slice(-HISTORY_LIMIT);
        setHistorySize(historyRef.current.length);
    }, [flushRemoval]);

    /**
     * Reverse the most recent change.
     *
     * Blocks added since are removed again, a removal not yet sent is cancelled (the block was only
     * hidden), and every block returns to where it was. A block whose removal has already reached
     * the server cannot come back, so it is left out.
     */
    const undo = useCallback(async() => {
        const previous = historyRef.current.pop();
        setHistorySize(historyRef.current.length);
        const current = dataRef.current;
        if (!previous || !current) {
            return;
        }
        interactionRef.current = null;
        setInteraction(null);

        const pending = pendingRemovalRef.current;
        const wanted = new Set(previous.map(item => item.id));
        if (pending && wanted.has(pending.id)) {
            pendingRemovalRef.current = null;
            setHiddenIds(hidden => new Set([...hidden].filter(id => id !== pending.id)));
        }
        const existing = new Set(current.blocks.map(block => block.id));
        const added = canonicalRef.current.filter(item => !wanted.has(item.id)).map(item => item.id);
        const layout = previous.filter(item => existing.has(item.id));

        updateCanonical(layout);
        if (added.length) {
            patchData({blocks: current.blocks.filter(block => !added.includes(block.id))});
        }
        hideToast();
        void announce('dashboardundone');

        try {
            const removals = added.map(id => queue.call(() => send('remove', [], '', id), true));
            const saved = queue.saveLayout(layout);
            const results = await Promise.all(removals);
            const palette = results.reverse().find(result => result.availableblocks)?.availableblocks;
            if (palette) {
                patchData({availableblocks: palette});
            }
            await saved;
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [announce, handleSyncFailure, hideToast, patchData, queue, siteDefault, updateCanonical]);

    // Ctrl+Z, or Cmd+Z, undoes the last change while editing, except while typing in a field or
    // while a block is picked up (Escape puts that back instead).
    useEffect(() => {
        if (!data?.editing) {
            return undefined;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== 'z' || !(event.ctrlKey || event.metaKey) || event.shiftKey
                    || event.altKey || isTyping(event.target) || interactionRef.current) {
                return;
            }
            event.preventDefault();
            void undo();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [data?.editing, undo]);

    // Once a layout change has rendered, move focus where it was asked to go (see remove()).
    useEffect(() => {
        const target = focusAfterRef.current;
        if (target === null) {
            return;
        }
        focusAfterRef.current = null;
        if (target === 'add') {
            addButtonRef.current?.focus();
            return;
        }
        gridRef.current?.querySelector<HTMLElement>(
            `.core-my-dashboard-tile[data-instance-id="${target}"] .core-my-dashboard-handle--move`,
        )?.focus();
    }, [canonical]);

    /**
     * Keep instructions on screen while a block is picked up without dragging, with Cancel for
     * touch screens that have no Escape key. The toast is the announcement too.
     */
    const showInstructions = useCallback(async(title: string, mode: 'move' | 'resize', how: 'keyboard' | 'tap') => {
        const labels = dataRef.current?.labels;
        if (!labels) {
            return;
        }
        const key = how === 'keyboard'
            ? (mode === 'move' ? 'dashboardkeyboardmove' : 'dashboardkeyboardresize')
            : (mode === 'move' ? 'dashboardtapmove' : 'dashboardtapresize');
        const text = await getString(key, 'my', title);
        if (!interactionRef.current) {
            return;
        }
        interactionToastRef.current = showToast(text, {
            persist: true,
            action: {label: labels.cancel, onClick: () => cancelRef.current()},
        });
    }, [showToast]);

    /** Finish the current interaction, taking its instructions off screen. */
    const endInteraction = useCallback(() => {
        interactionRef.current = null;
        setInteraction(null);
        dropToast(interactionToastRef.current);
        interactionToastRef.current = null;
    }, [dropToast]);

    /**
     * Begin a move or resize interaction on a tile.
     *
     * `origin` distinguishes how the interaction started (keyboard activation, a mouse click that
     * turns out not to be a drag, or an active pointer drag) because several things downstream -
     * whether the on-screen move/resize controls are shown, whether other tiles animate out of the
     * way live, whether Escape/Enter apply - only make sense for some of these (see showControls
     * and shouldAnimatePosition where Interaction is consumed further down).
     */
    const start = useCallback((id: number, mode: 'move' | 'resize', origin: Interaction['origin'] = 'keyboard') => {
        const item = displayLayout.find(candidate => candidate.id === id);
        const block = blocksById.get(id);
        if (!item || !block) {
            return;
        }
        const next = {id, mode, origin, original: item, draft: item, before: displayLayout};
        interactionRef.current = next;
        setInteraction(next);
        if (origin === 'keyboard') {
            void showInstructions(block.title, mode, 'keyboard');
        } else {
            void announce(mode === 'move' ? 'dashboardmovebegin' : 'dashboardresizebegin', block.title);
        }
    }, [announce, blocksById, displayLayout, showInstructions]);

    /**
     * Nudge the in-progress interaction's draft rectangle by whole grid cells - one keypress, one
     * cell. (pointerDown's own `move` handler needs sub-cell drag position for the tile to track
     * the pointer smoothly, so it recomputes the equivalent clamping itself rather than reusing
     * this; see the comment there.) A resize that would fall below the minimum tile size is
     * rejected (with an announcement) rather than clamped, so the keyboard controls never go
     * silently unresponsive at the limit.
     */
    const shift = useCallback((visualHorizontal: number, vertical: number) => {
        // Arrow keys and direction buttons are visual: in a right-to-left grid, right is backwards.
        const horizontal = isRtl(gridRef.current) ? -visualHorizontal : visualHorizontal;
        setInteraction(current => {
            if (!current) {
                return current;
            }
            const draft = {...current.draft};
            if (current.mode === 'move') {
                draft.column = Math.max(0, Math.min(columnCount - draft.columns, draft.column + horizontal));
                draft.row = Math.max(0, draft.row + vertical);
            } else {
                const nextColumns = draft.columns + horizontal;
                const nextRows = draft.rows + vertical;
                const minimum = fitMinimum(minimumSize(current.id), columnCount);
                if (nextColumns < minimum.columns || nextRows < minimum.rows) {
                    void announce('dashboardminimumsize', `${minimum.columns} × ${minimum.rows}`);
                    return current;
                }
                draft.columns = Math.min(columnCount - draft.column, nextColumns);
                draft.rows = nextRows;
            }
            const next = {...current, draft};
            interactionRef.current = next;
            return next;
        });
    }, [announce, columnCount, minimumSize]);

    /**
     * Persist the in-progress interaction's draft rectangle as the new canonical layout.
     *
     * Reads from refs (currentData/currentDisplay/currentCanonical/currentColumns), not state,
     * because this can be invoked from a pointerup listener registered once per drag in
     * pointerDown's closure - by the time the user releases, several renders may have happened
     * and captured state there would be stale. packWithPinned resolves any other tiles the
     * committed rectangle now overlaps (recorded in `disturbed`, purely for the a11y announcement);
     * writeBack then restores every item's canonical (full-width) column span and re-packs at
     * that width, so the persisted layout matches what was just resolved on-screen rather than
     * whatever the current, possibly narrower, responsive column count would produce (see the
     * writeBack/packLayout comments in layout.ts).
     */
    const commit = useCallback(async() => {
        const current = interactionRef.current;
        const currentData = dataRef.current;
        const currentDisplay = displayLayoutRef.current;
        const currentCanonical = canonicalRef.current;
        const currentColumns = columnCountRef.current;
        if (!current || !currentData) {
            return;
        }
        if (!layoutChanged(current.original, current.draft)) {
            endInteraction();
            void announce('dashboardnothingchanged');
            return;
        }
        pushHistory();
        const minimum = minimumSize(current.id);
        const derived = packWithPinned(currentDisplay, currentColumns, current.draft, fitMinimum(minimum, currentColumns));
        const disturbed = disturbedCount(current.before, derived, current.id);
        // Resizing a block fixes its height: it no longer follows its content.
        const next = writeBack(currentCanonical, derived, current.id, minimum).map(item =>
            current.mode === 'resize' && item.id === current.id ? {...item, autorows: false} : item);
        const item = derived.find(candidate => candidate.id === current.id)!;

        // Optimistic: settle the tile where it was dropped straight away, and save in the
        // background. The layout is fully known client-side, so there is nothing to wait for.
        updateCanonical(next);
        endInteraction();
        void announce(current.mode === 'move' ? 'dashboardmovecommitted' : 'dashboardresizecommitted', {
            row: item.row + 1,
            column: item.column + 1,
            columns: item.columns,
            rows: item.rows,
            disturbed,
        });

        try {
            await queue.saveLayout(next);
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [announce, endInteraction, handleSyncFailure, pushHistory, queue, updateCanonical]);

    /** Abandon the in-progress interaction, discarding its draft rectangle unsaved. */
    const cancel = useCallback(() => {
        if (interactionRef.current) {
            void announce('dashboardoperationdiscarded');
        }
        endInteraction();
    }, [announce, endInteraction]);
    // Read through refs by listeners and toast actions registered before the latest render.
    const cancelRef = useRef(cancel);
    cancelRef.current = cancel;
    const commitRef = useRef(commit);
    commitRef.current = commit;

    /**
     * Keyboard-driven move/resize: Space/Enter starts or commits an interaction, Escape cancels
     * it, and the arrow keys nudge it one cell via shift() - a full keyboard-only equivalent of
     * the pointer drag pointerDown offers with a mouse.
     */
    const keyDown = useCallback((event: React.KeyboardEvent, id: number, mode: 'move' | 'resize') => {
        if (!interaction && (event.key === ' ' || event.key === 'Enter')) {
            event.preventDefault();
            start(id, mode);
            return;
        }
        if (!interaction || interaction.id !== id || interaction.mode !== mode) {
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        } else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            void commit();
        } else if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            const directions: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            };
            shift(...directions[event.key]);
        }
    }, [cancel, commit, interaction, shift, start]);

    /**
     * Mouse/touch-driven move or resize, tracked with raw window pointer listeners rather than
     * React drag events so the drag keeps following the pointer even outside the tile or the grid.
     *
     * Two coordinate systems are maintained together throughout the drag: `draft` (whole grid
     * cells - column/row/columns/rows, exactly what shift()/keyDown also produce, and the only
     * form the server ever sees) and `drag` (raw sub-cell pixel offsets/dimensions, used only to
     * animate the dragged tile smoothly under the pointer - see DashboardTile). `columnStride` and
     * `rowStride` are one cell plus one gap each, i.e. the pixel distance between equivalent points
     * on adjacent cells; dividing a pixel delta by a stride and rounding is what turns a drag
     * distance into a whole number of cells for `draft`. A move is capped so the tile's whole
     * rectangle - not just its origin corner - stays on the grid (`columnCount - draft.columns`,
     * never negative row); a resize is capped so it never shrinks below the minimum tile size and
     * never grows past the grid's right edge. `pointer.moved` (a small 4px threshold, to absorb
     * hand tremor on a click that was never meant to be a drag) is what pointerup below uses to
     * decide whether this was a genuine drag to commit, or a plain click that should instead just
     * reveal the on-screen move/resize controls (see the `up` handler and Interaction.origin).
     */
    const pointerDown = useCallback((event: React.PointerEvent, id: number, mode: 'move' | 'resize') => {
        event.preventDefault();
        // While a block is picked up by a click, the next click places it, wherever it lands -
        // including on a handle (see the click-mode effect below).
        if (interactionRef.current?.origin === 'mouseclick') {
            return;
        }
        start(id, mode, 'pointer');
        pointerRef.current = {x: event.clientX, y: event.clientY, moved: false};
        const origin = displayLayout.find(item => item.id === id);
        if (!origin) {
            return;
        }
        const grid = gridRef.current;
        const {rowHeight, gap} = readGridMetrics(grid);
        const minimum = fitMinimum(minimumSize(id), columnCount);
        const cellWidth = grid
            ? (grid.getBoundingClientRect().width - gap * (columnCount - 1)) / columnCount
            : 1;
        const columnStride = cellWidth + gap;
        const rowStride = rowHeight + gap;
        // In a right-to-left grid, dragging right moves towards the first column.
        const direction = isRtl(grid) ? -1 : 1;
        const originalWidth = origin.columns * cellWidth + (origin.columns - 1) * gap;
        const originalHeight = origin.rows * rowHeight + (origin.rows - 1) * gap;
        // The page scrolls while the pointer is held near the top or bottom of the window, so a
        // block can be dragged further than one screen. Distances count the scroll as movement.
        const startScroll = window.scrollY;
        let lastPointer: {clientX: number; clientY: number} | null = null;
        let scrollFrame = 0;
        const autoScroll = () => {
            scrollFrame = 0;
            if (!lastPointer || !pointerRef.current) {
                return;
            }
            const edge = Math.min(AUTOSCROLL_EDGE_PX, window.innerHeight / 4);
            const step = lastPointer.clientY < edge ? -AUTOSCROLL_STEP_PX
                : lastPointer.clientY > window.innerHeight - edge ? AUTOSCROLL_STEP_PX : 0;
            if (!step) {
                return;
            }
            const before = window.scrollY;
            window.scrollBy(0, step);
            if (window.scrollY !== before) {
                move(lastPointer);
            }
        };
        const move = (pointerEvent: {clientX: number; clientY: number}) => {
            const pointer = pointerRef.current;
            if (!pointer) {
                return;
            }
            lastPointer = {clientX: pointerEvent.clientX, clientY: pointerEvent.clientY};
            if (!scrollFrame) {
                scrollFrame = window.requestAnimationFrame(autoScroll);
            }
            const deltaX = pointerEvent.clientX - pointer.x;
            const deltaY = pointerEvent.clientY - pointer.y + window.scrollY - startScroll;
            pointer.moved = pointer.moved || Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4;
            const horizontal = Math.round(direction * deltaX / columnStride);
            const vertical = Math.round(deltaY / rowStride);
            setInteraction(current => {
                if (!current) {
                    return current;
                }
                const draft = {...origin};
                let drag: PointerDrag;
                if (mode === 'move') {
                    draft.column = Math.max(0, Math.min(columnCount - draft.columns, origin.column + horizontal));
                    draft.row = Math.max(0, origin.row + vertical);
                    // How far the tile may travel on screen, towards the start and the end of a row.
                    const towardsStart = -origin.column * columnStride;
                    const towardsEnd = (columnCount - origin.column - origin.columns) * columnStride;
                    drag = {
                        x: direction > 0
                            ? Math.max(towardsStart, Math.min(towardsEnd, deltaX))
                            : Math.max(-towardsEnd, Math.min(-towardsStart, deltaX)),
                        y: Math.max(-origin.row * rowStride, deltaY),
                    };
                } else {
                    draft.columns = Math.max(minimum.columns,
                        Math.min(columnCount - draft.column, origin.columns + horizontal));
                    draft.rows = Math.max(minimum.rows, origin.rows + vertical);
                    drag = {
                        x: 0,
                        y: 0,
                        width: Math.max(cellWidth, Math.min(
                            (columnCount - origin.column) * columnStride - gap,
                            originalWidth + direction * deltaX,
                        )),
                        height: Math.max(rowHeight, originalHeight + deltaY),
                        shrinking: direction * deltaX < 0 || deltaY < 0,
                    };
                }
                const next = {...current, draft, drag};
                interactionRef.current = next;
                return next;
            });
        };
        const cleanup = () => {
            window.cancelAnimationFrame(scrollFrame);
            lastPointer = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', abort);
            pointerRef.current = null;
        };
        const up = () => {
            const current = interactionRef.current;
            if (pointerRef.current?.moved && current && layoutChanged(current.original, current.draft)) {
                void commit();
            } else if (!pointerRef.current?.moved && current) {
                // A click without a drag picks the block up: the next click places it.
                const next = {...current, origin: 'mouseclick' as const, drag: undefined};
                interactionRef.current = next;
                setInteraction(next);
                const block = dataRef.current?.blocks.find(candidate => candidate.id === current.id);
                if (block) {
                    void showInstructions(block.title, current.mode, 'tap');
                }
            } else {
                cancel();
            }
            cleanup();
        };
        const abort = () => {
            cleanup();
            cancel();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', abort);
    }, [cancel, columnCount, commit, displayLayout, minimumSize, showInstructions, start]);

    /**
     * Click mode: a block picked up by a click follows the pointer as a preview, and the next click
     * anywhere on the grid places it (move) or sets its new bottom corner (resize). That includes a
     * click on the block's own handle, which the preview will often have moved under the pointer.
     * A click outside the grid, Escape, or the toast's Cancel puts it back. Moving and resizing
     * therefore never need dragging (WCAG 2.2 SC 2.5.7).
     */
    const tapKey = interaction?.origin === 'mouseclick' ? `${interaction.id}:${interaction.mode}` : null;
    useEffect(() => {
        const grid = gridRef.current;
        if (!tapKey || !grid) {
            return undefined;
        }
        const draftAt = (x: number, y: number) => {
            const current = interactionRef.current;
            if (!current) {
                return null;
            }
            const columns = columnCountRef.current ?? 1;
            const rect = grid.getBoundingClientRect();
            const {rowHeight, gap} = readGridMetrics(grid);
            const cellWidth = (rect.width - gap * (columns - 1)) / columns;
            const offset = isRtl(grid) ? rect.right - x : x - rect.left;
            const column = Math.max(0, Math.min(columns - 1, Math.floor(offset / (cellWidth + gap))));
            const row = Math.max(0, Math.floor((y - rect.top) / (rowHeight + gap)));
            const {original} = current;
            const draft = {...original};
            if (current.mode === 'move') {
                draft.column = Math.min(column, columns - original.columns);
                draft.row = row;
            } else {
                const minimum = fitMinimum(minimumSize(current.id), columns);
                draft.columns = Math.min(columns - original.column, Math.max(minimum.columns, column - original.column + 1));
                draft.rows = Math.max(minimum.rows, row - original.row + 1);
            }
            return {...current, draft};
        };
        const onMove = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') {
                return;
            }
            const next = draftAt(event.clientX, event.clientY);
            if (next && layoutChanged(next.draft, interactionRef.current!.draft)) {
                interactionRef.current = next;
                setInteraction(next);
            }
        };
        const onClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest('.core-toast')) {
                // The toast's Cancel decides.
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (!target || !grid.contains(target)) {
                cancelRef.current();
                return;
            }
            const next = draftAt(event.clientX, event.clientY);
            if (next) {
                interactionRef.current = next;
                void commitRef.current();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelRef.current();
            }
        };
        // Wait for the click that picked the block up to finish, so it is not taken as the drop.
        const timer = setTimeout(() => {
            window.addEventListener('pointermove', onMove);
            window.addEventListener('click', onClick, true);
        });
        window.addEventListener('keydown', onKeyDown);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('click', onClick, true);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [columnCountRef, minimumSize, tapKey]);

    /**
     * Remove a block: one click, no confirmation, because it can be undone.
     *
     * The tile disappears at once and the rows it leaves empty close up, but the block is only
     * hidden until its toast closes or the next change is made (see flushRemoval), so Undo brings
     * it back exactly as it was. Focus moves to the next block, or the previous one if it was the
     * last, or to Add a block when none are left.
     */
    const remove = useCallback(async(id: number) => {
        const current = dataRef.current;
        const block = current?.blocks.find(candidate => candidate.id === id);
        if (!current || !block) {
            return;
        }
        pushHistory();
        const order = displayLayoutRef.current.map(item => item.id);
        const index = order.indexOf(id);
        focusAfterRef.current = order[index + 1] ?? order[index - 1] ?? 'add';

        setHiddenIds(hidden => new Set([...hidden, id]));
        updateCanonical(collapseEmptyRows(canonicalRef.current.filter(item => item.id !== id)));

        const text = await getString('dashboardblockremovednamed', 'my', block.title);
        const pending = {id, toastId: 0};
        pendingRemovalRef.current = pending;
        pending.toastId = showToast(text, {
            action: {label: current.labels.undo, onClick: () => void undo()},
            onClose: () => void flushRemoval(),
        });
    }, [flushRemoval, pushHistory, showToast, undo, updateCanonical]);

    /**
     * Add the block chosen in the block browser.
     *
     * Opened from a space the person picked, the block goes there. Opened anywhere else, it goes in
     * the first space that fits and is picked up straight away, ready to move with the arrow keys.
     *
     * A new block's id, default size and rendered content are only known once the server
     * responds, so this cannot be drawn optimistically. But the same response carries everything
     * needed to insert just that block (see dashboard::get_added_block()), so nothing else on the
     * dashboard is reloaded, re-rendered or has its JavaScript run again.
     *
     * Adding is the one change that is never retried automatically: if the connection drops after
     * the server added the block but before the reply arrives, a retry would add a second one.
     */
    const add = useCallback(async(block: AvailableBlock) => {
        const target = palette;
        setPalette(null);
        pushHistory();
        let result;
        try {
            result = await queue.call(() => send('add', [], block.name), false);
        } catch (caught) {
            historyRef.current.pop();
            setHistorySize(historyRef.current.length);
            if (isTransientError(caught)) {
                // The reply was lost, so the block may or may not have been added. Adding again
                // could add a second one: show what is actually saved instead.
                if (await load()) {
                    void toastString('dashboardaddunconfirmed');
                }
            } else {
                setError(errorMessage(caught));
            }
            return;
        }
        const current = dataRef.current;
        if (!current || !result.block || !result.layoutitem) {
            // An older server that does not return the new block: fall back to a full reload.
            await load();
            return;
        }
        const added = result.block;
        const item = result.layoutitem;
        patchData({
            blocks: [...current.blocks.filter(existing => existing.id !== added.id), added],
            availableblocks: result.availableblocks ?? current.availableblocks,
        });
        // Always queued, even with no JavaScript, so the new block is measured once it settles.
        setAddedScripts(scripts => [...scripts, {
            source: result.javascript ?? '',
            asyncBlocks: added.asynccontent ? [added.id] : [],
            blocks: [added.id],
        }]);

        const columns = columnCountRef.current ?? 1;
        const others = canonicalRef.current.filter(existing => existing.id !== item.id);
        const minimum = added.minsize ?? current.grid.minsize;
        const targeted = target?.column !== undefined && target.row !== undefined;
        // A block added to an empty region fills its width, but never goes below its own minimum.
        const width = Math.min(columns, targeted && target.columns
            ? Math.max(target.columns, minimum.columns)
            : item.columns);
        const place = targeted
            ? {column: Math.min(target.column!, columns - width), row: target.row!}
            : firstFreeSpace(packLayout(others, columns), columns, width, item.rows);
        const pinned: LayoutItem = {...item, ...place, columns: width};
        const appended = [...others, item];
        const next = writeBack(appended,
            packWithPinned(packLayout(appended, columns), columns, pinned, fitMinimum(minimum, columns)), item.id, minimum);
        updateCanonical(next);
        newBlockRef.current = {id: item.id, pickUp: !targeted};
        if (targeted) {
            void toastString('dashboardblockadded', block.title, {
                action: {label: current.labels.undo, onClick: () => void undo()},
            });
        } else {
            // Picked up next (see the effect below), whose instructions are the toast.
            void announce('dashboardblockadded', block.title);
        }
        try {
            await queue.saveLayout(next);
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [announce, handleSyncFailure, load, palette, patchData, pushHistory, queue, send, toastString, undo, updateCanonical]);

    // Once a newly added block is on screen: scroll it into view, highlight it briefly, and pick it
    // up ready to move when it went in the first free space rather than one the person picked.
    const newBlockRef = useRef<{id: number; pickUp: boolean} | null>(null);
    const [highlightId, setHighlightId] = useState<number | null>(null);
    useEffect(() => {
        const fresh = newBlockRef.current;
        if (!fresh) {
            return undefined;
        }
        const tile = gridRef.current?.querySelector<HTMLElement>(`.core-my-dashboard-tile[data-instance-id="${fresh.id}"]`);
        if (!tile) {
            return undefined;
        }
        newBlockRef.current = null;
        tile.scrollIntoView?.({block: 'nearest'});
        setHighlightId(fresh.id);
        if (fresh.pickUp) {
            tile.querySelector<HTMLElement>('.core-my-dashboard-handle--move')?.focus();
            start(fresh.id, 'move', 'keyboard');
        }
        const timer = setTimeout(() => setHighlightId(null), NEW_BLOCK_HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [canonical, start]);

    /**
     * Discard the user's own dashboard customisation and revert to the site default.
     * Own dashboard only - see the 'reset' case in update_dashboard.php.
     */
    const reset = useCallback(async() => {
        if (!data) {
            return;
        }
        // Reset cannot be undone, and replaces everything a pending removal or Undo would act on.
        historyRef.current = [];
        setHistorySize(0);
        pendingRemovalRef.current = null;
        try {
            // Through the queue, so anything still being sent lands first.
            await queue.call(() => updateDashboard('reset', false), false);
            // Reset restores the system dashboard, which also ends Moodle edit mode.
            // Reload the document to keep the server-rendered edit switch in sync.
            reloadingRef.current = true;
            window.location.reload();
        } catch (caught) {
            setError(errorMessage(caught));
        }
    }, [data, queue]);

    if (!data) {
        return error
            ? <div className="core-my-dashboard-status alert alert-danger" role="alert">{error}</div>
            : <DashboardLoading label={loadingLabel} layout={initialLayout} />;
    }

    const rows = Math.max(1, maxRow(previewLayout));
    const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) ||
        (interaction.origin === 'pointer' && interaction.mode === 'resize' && interaction.drag?.shrinking))
        ? interaction.draft : undefined;
    const renderTile = (committed: LayoutItem, hidden: boolean) => {
        const item = previewById.get(committed.id) ?? committed;
        const block = blocksById.get(item.id);
        if (!block) {
            return null;
        }
        return <DashboardTile
            key={item.id}
            block={block}
            item={item}
            labels={data.labels}
            editing={data.editing}
            hidden={hidden}
            tapping={interaction?.id === item.id && interaction.origin === 'mouseclick'}
            activeMode={interaction?.id === item.id ? interaction.mode : undefined}
            showControls={interaction?.id === item.id && interaction.origin === 'keyboard'}
            drag={interaction?.id === item.id ? interaction.drag : undefined}
            dragOrigin={interaction?.id === item.id ? interaction.original : undefined}
            shouldAnimatePosition={interaction?.origin === 'pointer' && interaction.id !== item.id}
            isBumped={bumpedBlockIds.has(item.id)}
            highlighted={highlightId === item.id}
            onStart={start}
            onKeyDown={keyDown}
            onPointerDown={pointerDown}
            onDirection={shift}
            onCommit={() => void commit()}
            onRemove={id => void remove(id)}
        />;
    };
    const regions = data.editing && !interaction ? emptyRegions(displayLayout, columnCount, rows) : [];
    const gridChildren = [
        ...displayLayout.map(committed => ({row: committed.row, column: committed.column, node: renderTile(committed, false)})),
        ...regions.map(region => ({row: region.row, column: region.column, node: <GridCell
            key={`region:${region.column}:${region.row}`}
            {...region}
            label={data.labels.emptyregion}
            addLabel={data.labels.addblockhere}
            onActivate={(column, row, columns, regionRows) => setPalette({column, row, columns, rows: regionRows})}
        />})),
    ].sort((left, right) => left.row - right.row || left.column - right.column).map(child => child.node);
    // Tiles stay in the page while their removal can still be undone, hidden, after everything else.
    hiddenIds.forEach(id => gridChildren.push(renderTile({id, column: 0, row: 0, columns: 1, rows: 1}, true)));

    // With no blocks, the grid gives way to a message and a clear way forward. Adding a block from
    // view mode turns Edit mode on first, and opens the browser once there.
    const empty = displayLayout.length === 0;
    const addBlockUrl = `${siteDefault ? data.urls.sitedefault : data.urls.ownpage}?edit=1&addblock=1`;
    // Done leaves Edit mode the way the page's own Edit mode switch does.
    const doneUrl = `${siteDefault ? data.urls.sitedefault : data.urls.ownpage}?edit=0`;
    // Being offline is said by a toast (see the saveStatus effect); only retrying is said here.
    const statusMessages: Record<SaveStatus, string> = {
        idle: '',
        saving: '',
        offline: '',
        retrying: data.labels.saveretrying,
    };
    return <div className="core-my-dashboard-app" aria-busy={saveStatus !== 'idle'}>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {unsaved && <div className="alert alert-warning core-my-dashboard-unsaved" role="alert">
            {data.labels.savefailed}
            <Button
                className="ms-2"
                variant="secondary"
                size="sm"
                label={data.labels.retry}
                onClick={() => void retryUnsaved()}
            />
        </div>}
        <div className="core-my-dashboard-savestatus" role="status">{statusMessages[saveStatus]}</div>
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
        {data.editing && <DashboardScopeBanner
            siteDefault={siteDefault}
            caneditotherscope={data.caneditotherscope}
            urls={data.urls}
            labels={data.labels}
        />}
        {data.editing && <div className="core-my-dashboard-toolbar">
            <p className="core-my-dashboard-toolbar__notice">{data.labels.editingnotice}</p>
            <div className="core-my-dashboard-toolbar__actions">
                {!siteDefault && <Button
                    variant="ghost"
                    label={data.labels.reset}
                    onClick={() => setConfirmAction({type: 'reset'})}
                />}
                <Button
                    variant="ghost"
                    label={data.labels.undo}
                    startIcon={<i className="fa fa-rotate-left" aria-hidden="true" />}
                    disabled={historySize === 0}
                    onClick={() => void undo()}
                />
                <Button
                    variant="secondary"
                    label={data.labels.done}
                    onClick={() => redirect(doneUrl)}
                />
                <Button
                    ref={addButtonRef}
                    variant="primary"
                    label={data.labels.addblock}
                    startIcon={<i className="fa fa-plus" aria-hidden="true" />}
                    onClick={() => setPalette({})}
                />
            </div>
        </div>}
        {empty && data.canedit && <div className="core-my-dashboard-empty">
            <p>{data.labels.empty}</p>
            <div className="core-my-dashboard-empty__actions">
                {data.editing
                    ? <Button variant="primary" label={data.labels.addblock} onClick={() => setPalette({})} />
                    : <a className="btn btn-primary" href={addBlockUrl}>{data.labels.addblock}</a>}
                {!siteDefault && <Button
                    variant="secondary"
                    label={data.labels.restoredefault}
                    onClick={() => setConfirmAction({type: 'reset'})}
                />}
            </div>
        </div>}
        <div
            ref={gridRef}
            hidden={empty || undefined}
            className="core-my-dashboard-grid"
            role="group"
            aria-label={data.labels.dashboardblocks}
            style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, var(--core-my-dashboard-row-height))`,
            }}
            data-columns={columnCount}
        >
            {/* Tiles and empty regions in reading order, so Tab order and screen reader order match
                what is on screen. Tiles stay in committed order while a drag previews other
                positions: grid placement comes from each tile's own style, so DOM order need not
                follow the preview. Reordering the DOM on every pointer move would detach and
                reattach tiles, which restarts anything inside them that cannot survive a move
                (iframes, media) and would make react_autoinit tear down and remount React blocks.
                Empty regions are left out while a block is picked up for the same reason; the
                cells it would take are shown instead. */}
            {gridChildren}
            {prospective && <GridCell
                key="prospective"
                column={prospective.column}
                row={prospective.row}
                columns={prospective.columns}
                rows={prospective.rows}
                label=""
                addLabel=""
                prospective
            />}
        </div>
        {data.editing && !empty && <div className="core-my-dashboard-toolbar core-my-dashboard-toolbar--bottom">
            <Button
                variant="secondary"
                label={data.labels.addblock}
                startIcon={<i className="fa fa-plus" aria-hidden="true" />}
                onClick={() => setPalette({})}
            />
        </div>}
        {palette && <BlockBrowser
            labels={data.labels}
            blocks={data.availableblocks}
            targeted={palette.column !== undefined}
            discoverUrl={data.discoverurl}
            onInsert={block => void add(block)}
            onClose={() => setPalette(null)}
        />}
        {confirmAction && <ConfirmationDialog
            title={data.labels.resetheading}
            message={data.labels.confirmreset}
            confirmLabel={data.labels.confirm}
            cancelLabel={data.labels.cancel}
            onConfirm={() => {
                setConfirmAction(null);
                void reset();
            }}
            onCancel={() => setConfirmAction(null)}
        />}
        <Toast message={toast} closeLabel={data.labels.close} onClose={hideToast} />
    </div>;
};

export default Dashboard;
