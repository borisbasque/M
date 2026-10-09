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
import DashboardTile from './components/DashboardTile';
import ConfirmationDialog from './components/ConfirmationDialog';
import BlockPalette from './components/BlockPalette';
import GridCell from './components/GridCell';
import DashboardLoading from './components/DashboardLoading';
import {
    columnsForWidth,
    applyRowSpans,
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
    getDashboard,
    updateDashboard,
    type AvailableBlock,
    type DashboardData,
    type DashboardLabels,
    type DashboardUrls,
} from './repository';
import {SaveQueue, isTransientError, type SaveStatus} from './saveQueue';

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

interface PaletteTarget {
    column?: number;
    row?: number;
    position?: 'start' | 'end';
}

type ConfirmAction = {type: 'remove'; id: number} | {type: 'reset'};

// See the settling MutationObserver in the collected-JS effect below for what these guard.
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5000;
// Fired by blocks that declare asynchronous content: eventTypes.blockContentLoaded in core_block/events.
const BLOCK_CONTENT_LOADED = 'core_block/contentLoaded';
let dashboardSettleCounter = 0;

const isSiteDefault = (): boolean => window.location.pathname.endsWith('/my/indexsys.php');

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
}

const Dashboard = ({loadingLabel = '', initialLayout = []}: DashboardProps) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [canonical, setCanonical] = useState<LayoutItem[]>([]);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const [error, setError] = useState('');
    const [palette, setPalette] = useState<PaletteTarget | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    // Set when changes could not be sent even after retrying; the banner offers to try again.
    const [unsaved, setUnsaved] = useState(false);
    const [loadedScript, setLoadedScript] = useState<CollectedScript | null>(null);
    const [addedScripts, setAddedScripts] = useState<CollectedScript[]>([]);
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
    // Every change to the dashboard goes through this one queue: in order, merged, and retried
    // across dropped connections (see saveQueue.ts).
    const [queue] = useState(() => new SaveQueue({
        sendLayout: layout => updateDashboard('save', siteDefault, layout),
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
    const load = useCallback(async() => {
        try {
            const response = await getDashboard(siteDefault);
            setData(response);
            dataRef.current = response;
            setCanonical(response.layout);
            canonicalRef.current = response.layout;
            unsentRemovalsRef.current = new Set();
            setUnsaved(false);
            setLoadedScript({
                source: response.javascript,
                asyncBlocks: response.blocks.filter(block => block.asynccontent).map(block => block.id),
            });
            setError('');
            return response;
        } catch (caught) {
            setError(errorMessage(caught));
            return null;
        }
    }, [siteDefault]);

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

    /** Replace the canonical layout, in state and in the ref callbacks read it from. */
    const updateCanonical = useCallback((next: LayoutItem[]) => {
        canonicalRef.current = next;
        setCanonical(next);
    }, []);

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
                await queue.call(() => updateDashboard('remove', siteDefault, [], '', id), true);
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

    // Leaving the page with changes still unsent would lose them: ask first.
    useEffect(() => {
        if (saveStatus === 'idle' && !unsaved) {
            return undefined;
        }
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!reloadingRef.current) {
                event.preventDefault();
            }
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [saveStatus, unsaved]);

    useEffect(() => {
        void load();
    }, [load]);

    // Size every block that follows its content (MDL-89635 auto height) once per load, after its
    // content is in place: at its current width, rounded up to whole rows, between its minimum and
    // the cap. A declared preferred height wins over measuring. Only blocks in the way move, and only
    // down. The result is saved only to the viewer's own stored dashboard, and only when it changed.
    const fittedFor = useRef<DashboardData | null>(null);
    const fitAutoHeights = useCallback(() => {
        const current = dataRef.current;
        const grid = gridRef.current;
        if (!current || !grid || fittedFor.current === current || interactionRef.current) {
            return;
        }
        fittedFor.current = current;
        const metrics = readGridMetrics(grid);
        const blocks = new Map(current.blocks.map(block => [block.id, block]));
        const rows = new Map<number, number>();
        canonicalRef.current.forEach(item => {
            const block = blocks.get(item.id);
            const tile = grid.querySelector<HTMLElement>(`.core-my-dashboard-tile[data-instance-id="${item.id}"]`);
            if (item.autorows === false || !block || !tile) {
                return;
            }
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
        addedScripts.forEach(script => runCollectedJavascript(script, gridRef.current, fitAutoHeights));
        setAddedScripts([]);
    }, [addedScripts, fitAutoHeights]);
    const [columnCount, columnCountRef] = useResponsiveColumnCount(gridRef, data);

    const displayLayout = useMemo(() => packLayout(canonical, columnCount), [canonical, columnCount]);
    displayLayoutRef.current = displayLayout;
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

    /** Set the live region's text so screen readers announce a move/resize outcome. */
    const announce = useCallback(async(key: string, value?: string | Record<string, unknown>) => {
        setAnnouncement(await getString(key, 'my', value));
    }, []);

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
        void announce(mode === 'move' ? 'dashboardmovebegin' : 'dashboardresizebegin', block.title);
    }, [announce, blocksById, displayLayout]);

    /**
     * Nudge the in-progress interaction's draft rectangle by whole grid cells - one keypress, one
     * cell. (pointerDown's own `move` handler needs sub-cell drag position for the tile to track
     * the pointer smoothly, so it recomputes the equivalent clamping itself rather than reusing
     * this; see the comment there.) A resize that would fall below the minimum tile size is
     * rejected (with an announcement) rather than clamped, so the keyboard controls never go
     * silently unresponsive at the limit.
     */
    const shift = useCallback((horizontal: number, vertical: number) => {
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
        interactionRef.current = null;
        setInteraction(null);
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
    }, [announce, handleSyncFailure, queue, updateCanonical]);

    /** Abandon the in-progress interaction, discarding its draft rectangle unsaved. */
    const cancel = useCallback(() => {
        if (interaction) {
            void announce('dashboardoperationdiscarded');
        }
        interactionRef.current = null;
        setInteraction(null);
    }, [announce, interaction]);

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
        const originalWidth = origin.columns * cellWidth + (origin.columns - 1) * gap;
        const originalHeight = origin.rows * rowHeight + (origin.rows - 1) * gap;
        const move = (pointerEvent: PointerEvent) => {
            const pointer = pointerRef.current;
            if (!pointer) {
                return;
            }
            const deltaX = pointerEvent.clientX - pointer.x;
            const deltaY = pointerEvent.clientY - pointer.y;
            pointer.moved = pointer.moved || Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4;
            const horizontal = Math.round(deltaX / columnStride);
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
                    drag = {
                        x: Math.max(-origin.column * columnStride,
                            Math.min((columnCount - origin.column - origin.columns) * columnStride, deltaX)),
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
                            originalWidth + deltaX,
                        )),
                        height: Math.max(rowHeight, originalHeight + deltaY),
                        shrinking: deltaX < 0 || deltaY < 0,
                    };
                }
                const next = {...current, draft, drag};
                interactionRef.current = next;
                return next;
            });
        };
        const cleanup = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', abort);
            pointerRef.current = null;
        };
        const up = () => {
            const current = interactionRef.current;
            if (pointerRef.current?.moved && current && layoutChanged(current.original, current.draft)) {
                void commit();
            } else if (!pointerRef.current?.moved) {
                setInteraction(previous => {
                    if (!previous) {
                        return previous;
                    }
                    const next = {...previous, origin: 'mouseclick' as const};
                    interactionRef.current = next;
                    return next;
                });
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
    }, [cancel, columnCount, commit, displayLayout, start]);

    /**
     * Delete a block instance, after the caller has already confirmed.
     *
     * Optimistic, like a move: the tile goes straight away and nothing else on the dashboard is
     * reloaded or re-rendered. The server's reply only refreshes the palette, since removing a
     * block that allows one instance per page makes it addable again.
     */
    const remove = useCallback(async(id: number) => {
        const current = dataRef.current;
        if (!current) {
            return;
        }
        patchData({blocks: current.blocks.filter(block => block.id !== id)});
        updateCanonical(canonicalRef.current.filter(item => item.id !== id));
        void announce('dashboardblockremoved');

        unsentRemovalsRef.current.add(id);
        try {
            const result = await queue.call(() => updateDashboard('remove', siteDefault, [], '', id), true);
            unsentRemovalsRef.current.delete(id);
            if (result.availableblocks) {
                patchData({availableblocks: result.availableblocks});
            }
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [announce, handleSyncFailure, patchData, queue, siteDefault, updateCanonical]);

    /**
     * Add a new block instance, then, if the palette was opened from a specific empty cell or
     * from the top toolbar button, place it there instead of wherever the server appended it.
     *
     * A new block's id, default size and rendered content are only known once the server
     * responds, so this cannot be drawn optimistically. But the same response carries everything
     * needed to insert just that block (see dashboard::get_added_block()), so nothing else on the
     * dashboard is reloaded, re-rendered or has its JavaScript run again. Opening the palette
     * from the bottom toolbar button needs no second save: the block already lands at the
     * bottom, which is where dashboard::add() (server side) puts it by default.
     *
     * Adding is the one change that is never retried automatically: if the connection drops after
     * the server added the block but before the reply arrives, a retry would add a second one.
     */
    const add = useCallback(async(block: AvailableBlock) => {
        const target = palette;
        setPalette(null);
        let result;
        try {
            result = await queue.call(() => updateDashboard('add', siteDefault, [], block.name), false);
        } catch (caught) {
            setError(errorMessage(caught));
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
        const appended = [...canonicalRef.current.filter(existing => existing.id !== item.id), item];
        updateCanonical(appended);
        // Always queued, even with no JavaScript, so the new block is measured once it settles.
        setAddedScripts(scripts => [...scripts, {
            source: result.javascript ?? '',
            asyncBlocks: added.asynccontent ? [added.id] : [],
            blocks: [added.id],
        }]);
        void announce('dashboardblockadded', block.title);

        const columns = columnCountRef.current;
        let pinned: LayoutItem | null = null;
        if (target?.column !== undefined && target.row !== undefined) {
            pinned = {
                ...item,
                column: Math.min(target.column, columns - Math.min(item.columns, columns)),
                row: target.row,
                columns: Math.min(item.columns, columns),
            };
        } else if (target?.position === 'start') {
            pinned = {...item, column: 0, row: 0};
        }
        if (!pinned) {
            return;
        }
        const minimum = added.minsize ?? current.grid.minsize;
        const next = writeBack(appended,
            packWithPinned(packLayout(appended, columns), columns, pinned, fitMinimum(minimum, columns)), item.id, minimum);
        updateCanonical(next);
        try {
            await queue.saveLayout(next);
        } catch (caught) {
            handleSyncFailure(caught);
        }
    }, [announce, handleSyncFailure, load, palette, patchData, queue, siteDefault, updateCanonical]);

    /**
     * Discard the user's own dashboard customisation and revert to the site default.
     * Own dashboard only - see the 'reset' case in update_dashboard.php.
     */
    const reset = useCallback(async() => {
        if (!data) {
            return;
        }
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
    const statusMessages: Record<SaveStatus, string> = {
        idle: '',
        saving: '',
        offline: data.labels.saveoffline,
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
            <Button variant="secondary" label={data.labels.addblocktop} onClick={() => setPalette({position: 'start'})} />
            {!siteDefault && <Button
                variant="outline-danger"
                label={data.labels.reset}
                onClick={() => setConfirmAction({type: 'reset'})}
            />}
        </div>}
        <div
            ref={gridRef}
            className="core-my-dashboard-grid"
            style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, var(--core-my-dashboard-row-height))`,
            }}
            data-columns={columnCount}
        >
            {data.editing && Array.from({length: rows}, (_, row) =>
                Array.from({length: columnCount}, (__, column) => {
                    const isProspective = Boolean(prospective
                        && column >= prospective.column && column < prospective.column + prospective.columns
                        && row >= prospective.row && row < prospective.row + prospective.rows);
                    const isOccupied = previewLayout.some(item =>
                        column >= item.column && column < item.column + item.columns
                        && row >= item.row && row < item.row + item.rows
                    );
                    return !isOccupied || isProspective ? <GridCell
                        key={`${column}:${row}`}
                        column={column}
                        row={row}
                        label={data.labels.emptycell}
                        positionLabel={data.labels.gridcell}
                        addLabel={data.labels.addblock}
                        prospective={isProspective}
                        onActivate={(targetColumn, targetRow) => setPalette({column: targetColumn, row: targetRow})}
                    /> : null;
                })
            )}
            {/* Tiles stay in committed (reading) order while a drag previews other positions: grid
                placement comes from each tile's own style, so DOM order need not follow the
                preview. Reordering the DOM on every pointer move would detach and reattach tiles,
                which restarts anything inside them that cannot survive a move (iframes, media)
                and would make react_autoinit tear down and remount React blocks. */}
            {displayLayout.map(committed => {
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
                    activeMode={interaction?.id === item.id ? interaction.mode : undefined}
                    showControls={interaction?.id === item.id && interaction.origin !== 'pointer'}
                    drag={interaction?.id === item.id ? interaction.drag : undefined}
                    dragOrigin={interaction?.id === item.id ? interaction.original : undefined}
                    shouldAnimatePosition={interaction?.origin === 'pointer' && interaction.id !== item.id}
                    isBumped={bumpedBlockIds.has(item.id)}
                    onStart={start}
                    onKeyDown={keyDown}
                    onPointerDown={pointerDown}
                    onDirection={shift}
                    onCommit={() => void commit()}
                    onRemove={id => setConfirmAction({type: 'remove', id})}
                />;
            })}
        </div>
        {data.editing && <div className="core-my-dashboard-toolbar core-my-dashboard-toolbar--bottom">
            <Button variant="secondary" label={data.labels.addblockbottom} onClick={() => setPalette({position: 'end'})} />
        </div>}
        {palette && <BlockPalette
            title={data.labels.addblock}
            closeLabel={data.labels.close}
            blocks={data.availableblocks}
            onSelect={block => void add(block)}
            onClose={() => setPalette(null)}
        />}
        {confirmAction && <ConfirmationDialog
            title={confirmAction.type === 'remove' ? data.labels.removeheading : data.labels.resetheading}
            message={confirmAction.type === 'remove' ? data.labels.confirmremove : data.labels.confirmreset}
            confirmLabel={data.labels.confirm}
            cancelLabel={data.labels.cancel}
            onConfirm={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action.type === 'remove') {
                    void remove(action.id);
                } else {
                    void reset();
                }
            }}
            onCancel={() => setConfirmAction(null)}
        />}
    </div>;
};

export default Dashboard;
