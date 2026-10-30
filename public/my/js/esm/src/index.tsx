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
import {Button} from '@moodlehq/design-system';
import {getString} from '@moodle/lms/core/stringUtils';
import {isMoodleAjaxError} from '@moodle/lms/core/ajax';
import {requireManyAsync} from '@moodle/lms/core/amd';
import Pending from '@moodle/lms/core/pending';
import DashboardTile from './components/DashboardTile';
import DashboardEditBar from './components/DashboardEditBar';
import ConfirmationDialog from './components/ConfirmationDialog';
import Icon, {renderIcon} from './components/Icon';
import GridCell from './components/GridCell';
import DashboardLoading from './components/DashboardLoading';
import {
    DEFAULT_LIMITS,
    GRID_GAP,
    ROW_HEIGHT,
    clampToGrid,
    fitToFreeSpace,
    columnsForWidth,
    disturbedCount,
    emptyRegions,
    maxRow,
    riseToFill,
    packLayout,
    packWithPinned,
    writeBack,
    type GridLimits,
    type LayoutItem,
} from './layout';
import {
    getDashboard,
    updateDashboard,
    type AvailableBlock,
    type DashboardData,
} from './repository';
import {useDashboardLabels, type DashboardLabels} from './strings';
import {addBlockFallbackUrl, openAddBlockModal} from './addBlockModal';

interface DashboardErrorBoundaryProps {
    children: React.ReactNode;
    resetLabel?: string;
    onReset?: () => void;
}

interface DashboardErrorBoundaryState {
    error: Error | null;
}

/**
 * Keep a rendering failure (for instance a saved layout the packing helpers cannot place) from
 * taking the whole page down with it: report it, and keep the way out - resetting the dashboard to
 * the site default - reachable, since there is no legacy dashboard to fall back to.
 */
export class DashboardErrorBoundary extends React.Component<DashboardErrorBoundaryProps, DashboardErrorBoundaryState> {
    state: DashboardErrorBoundaryState = {error: null};

    static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
        return {error};
    }

    componentDidCatch(error: Error): void {
        window.console.error('[core_my/dashboard] Rendering failed:', error);
    }

    render(): React.ReactNode {
        if (!this.state.error) {
            return this.props.children;
        }
        return <div className="core-my-dashboard-status alert alert-danger" role="alert">
            <p>{this.state.error.message}</p>
            {this.props.onReset && this.props.resetLabel && <Button
                variant="outline-danger"
                label={this.props.resetLabel}
                onClick={this.props.onReset}
            />}
        </div>;
    }
}

interface Interaction {
    id: number;
    mode: 'move' | 'resize';
    origin: 'keyboard' | 'mouseclick' | 'pointer';
    original: LayoutItem;
    draft: LayoutItem;
    before: LayoutItem[];
    drag?: PointerDrag;
}

interface BoardCellsProps {
    rows: number;
    columnCount: number;
    layout: LayoutItem[];
    interaction: Interaction | null;
    prospective?: LayoutItem;
    labels: DashboardLabels;
    addIcon: string;
    onActivate: (column: number, row: number) => void;
    onPlace: (column: number, row: number) => void;
    onPreview: (column: number, row: number) => void;
}

/**
 * The grid's empty space in edit mode, in one of two shapes.
 *
 * At rest, the empty cells are merged into regions (see emptyRegions), each one button that adds a
 * block there. While a block is being moved or resized, every grid unit shows as an active cell so
 * all the snap points are visible, with the footprint the block would take on commit drawn over
 * them as one prospective cell. After a click or tap on a handle (origin 'mouseclick'), choosing
 * an active cell previews and places the block there.
 */
const BoardCells = ({
    rows,
    columnCount,
    layout,
    interaction,
    prospective,
    labels,
    addIcon,
    onActivate,
    onPlace,
    onPreview,
}: BoardCellsProps) => {
    if (!interaction) {
        return <>
            {emptyRegions(layout, columnCount, rows).map(region => <GridCell
                key={`${region.column}:${region.row}`}
                column={region.column}
                row={region.row}
                columns={region.columns}
                rows={region.rows}
                label={labels.addblockhere}
                addLabel={labels.addblockhere}
                addIcon={addIcon}
                onActivate={onActivate}
            />)}
        </>;
    }
    const placing = interaction.origin === 'mouseclick';
    return <>
        {Array.from({length: rows}, (_, row) => Array.from({length: columnCount}, (__, column) => <GridCell
            key={`${column}:${row}`}
            column={column}
            row={row}
            state="active"
            onPlace={placing ? onPlace : undefined}
            onPreview={placing ? onPreview : undefined}
        />))}
        {prospective && <GridCell
            column={prospective.column}
            row={prospective.row}
            columns={prospective.columns}
            rows={prospective.rows}
            state="prospective"
        />}
    </>;
};

interface PointerDrag {
    x: number;
    y: number;
    width?: number;
    height?: number;
    shrinking?: boolean;
}

/** Where a newly-added block should go: a specific empty cell, or the start or end of the grid. */
interface AddTarget {
    column?: number;
    row?: number;
    position?: 'start' | 'end';
}

type ConfirmAction = {type: 'reset'} | {
    type: 'delete';
    id: number;
    title: string;
    heading: string;
    message: string;
    confirmLabel: string;
};

// How many moves and resizes Undo can step back through.
const UNDO_LIMIT = 20;

// See the settling MutationObserver in the collected-JS effect below for what these guard.
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5000;
let dashboardSettleCounter = 0;

/**
 * Whether this is the site-default dashboard. The page passes it as a prop (see
 * dashboard::render_mount_point()); the URL is only consulted when the component is mounted some
 * other way.
 */
const resolveSiteDefault = (prop?: boolean): boolean =>
    prop ?? window.location.pathname.endsWith('/my/indexsys.php');

/**
 * The grid's bounds come from the server with every payload (see layout.ts); the defaults only
 * stand in until the first one arrives.
 */
const resolveLimits = (data: DashboardData | null): GridLimits => data?.limits ?? DEFAULT_LIMITS;

interface DashboardPlaceholderProps {
    error: string;
    loadingLabel: string;
    initialLayout: LayoutItem[];
}

/** What stands in for the dashboard until its data and strings have loaded, or if loading failed. */
const DashboardPlaceholder = ({error, loadingLabel, initialLayout}: DashboardPlaceholderProps) => error
    ? <div className="core-my-dashboard-status alert alert-danger" role="alert">{error}</div>
    : <DashboardLoading label={loadingLabel} layout={initialLayout} />;

/**
 * The message to show for a failed request: a web service error (a plain object carrying the
 * server's message and error code, not an Error instance) reads as its message, never as
 * "[object Object]".
 */
const describeError = (caught: unknown): string => {
    if (caught instanceof Error || isMoodleAjaxError(caught)) {
        return caught.message;
    }
    return String(caught);
};

/**
 * How a tile takes part in the interaction in progress. The on-screen direction controls are for a
 * block picked up by a click or a tap; the keyboard has its own arrow keys. Tiles glide from cell to
 * cell rather than jumping, except a dragged tile, which already follows the pointer.
 */
const tileMotion = (interaction: Interaction | null, id: number) => ({
    showControls: interaction?.id === id && interaction.origin === 'mouseclick',
    shouldAnimatePosition: Boolean(interaction) && (interaction?.origin !== 'pointer' || interaction.id !== id),
});

/**
 * How many rows the grid shows: enough for the layout, plus one spare row while a block is moved by
 * pointer, click or tap, so it can be put below everything else. The arrow keys need none: moving
 * down grows the grid by itself.
 */
const gridRows = (layout: LayoutItem[], interaction: Interaction | null): number =>
    Math.max(1, maxRow(layout)) + (interaction?.mode === 'move' && interaction.origin !== 'keyboard' ? 1 : 0);

/** Whether an element is laid out right to left, where the grid's first column is on the right. */
const isRtl = (element: Element | null): boolean =>
    Boolean(element) && getComputedStyle(element as Element).direction === 'rtl';

const layoutChanged = (original: LayoutItem, draft: LayoutItem): boolean =>
    original.column !== draft.column || original.row !== draft.row ||
    original.columns !== draft.columns || original.rows !== draft.rows;

/**
 * Run a freshly loaded dashboard's collected block JavaScript, and report the dashboard as
 * pending (via core/pending) until any resulting DOM churn settles.
 *
 * A block's own async fetch-and-replace of its rendered content (e.g. Course overview, Recently
 * accessed items) is invisible to anything watching M.util.pending_js - Behat's
 * wait_for_pending_js() included - unless that block's own code says so, which this project's
 * acceptance criteria rules out asking every block to do (a backwards-compatible block API
 * extension to do this properly is filed as a follow-up on the parent epic). Detect it
 * generically instead: such a replacement is always a structural (childList) DOM mutation
 * somewhere under the grid, so treat the dashboard as still settling from the moment this
 * reload's collected JS starts running until the grid goes quiet for a short window - bounded by
 * a hard ceiling in case some future block's own mutations (or a genuine failure) never quiesce,
 * so this can never hang a caller indefinitely. Only childList is watched (not
 * attributes/characterData), so unrelated noise - drag positioning, resize-driven style changes -
 * never resets it.
 *
 * @param data The current dashboard payload, or null before the first load resolves.
 * @param gridRef The grid element to watch for mutations under.
 */
const useCollectedBlockJavascript = (
    data: DashboardData | null,
    gridRef: React.RefObject<HTMLDivElement>,
): void => {
    useEffect(() => {
        if (!data?.javascript) {
            return undefined;
        }
        // Each dashboard reload re-renders blocks with fresh DOM ids and JS initialisers.
        // Guard against a superseded reload's async script running after a newer one has
        // already replaced the tile content it was written to target.
        let superseded = false;

        let settled = false;
        let quietTimer: ReturnType<typeof setTimeout> | undefined;
        let hardTimer: ReturnType<typeof setTimeout> | undefined;
        let observer: MutationObserver | undefined;
        const pending = new Pending(`core_my/dashboard:settling:${dashboardSettleCounter++}`);
        const settle = () => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(quietTimer);
            clearTimeout(hardTimer);
            observer?.disconnect();
            pending.resolve();
        };
        hardTimer = setTimeout(settle, DASHBOARD_SETTLE_TIMEOUT_MS);
        const grid = gridRef.current;
        if (grid) {
            observer = new MutationObserver(() => {
                clearTimeout(quietTimer);
                quietTimer = setTimeout(settle, DASHBOARD_SETTLE_QUIET_MS);
            });
            observer.observe(grid, {childList: true, subtree: true});
        }
        // Nothing may ever mutate at all (every block already rendered its final content
        // server-side) - start the quiet window immediately too, not only on the observer's
        // first callback.
        quietTimer = setTimeout(settle, DASHBOARD_SETTLE_QUIET_MS);

        void requireManyAsync(['core/fragment', 'core/templates']).then(([fragment, templates]) => {
            if (superseded) {
                return undefined;
            }
            const processed = (fragment as {processCollectedJavascript: (source: string) => string})
                .processCollectedJavascript(data.javascript);
            (templates as {runTemplateJS: (source: string) => void}).runTemplateJS(processed);
            return undefined;
        });
        return () => {
            superseded = true;
            settle();
        };
    }, [data]);
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
 * @param mounted Whether the grid is rendered at all: the measurement is (re)attached whenever
 *     this changes, and whenever a fresh payload loads.
 * @param data The current dashboard payload; re-measures whenever a fresh one loads.
 * @return A tuple of [columnCount, columnCountRef].
 */
const useResponsiveColumnCount = (
    gridRef: React.RefObject<HTMLDivElement>,
    mounted: boolean,
    data: DashboardData | null,
): [number, React.RefObject<number>] => {
    const [columnCount, setColumnCount] = useState(1);
    const columnCountRef = useRef(1);

    // UseLayoutEffect, not useEffect: the initial columnCount=1 default must be corrected
    // before the browser paints, not after - otherwise the grid visibly repacks from one
    // column to the real column count on every load, a large, confirmed layout shift.
    // The grid only exists once both the payload and the strings have arrived, in either
    // order, so `mounted` is a dependency too: without it, a payload that lands before the
    // strings would run this while the loading placeholder is still showing, find no grid, and
    // never look again.
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!mounted || !grid) {
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
    }, [mounted, data]);

    return [columnCount, columnCountRef];
};

interface DashboardProps {
    loadingLabel?: string;
    initialLayout?: LayoutItem[];
    /** Whether this is the site-default dashboard (my/indexsys.php) rather than the user's own. */
    siteDefault?: boolean;
    /**
     * The page's edited-page hash (see moodle_page::get_edited_page_hash()), which a block type's
     * own add form needs to find this page again; null when the page is not being edited.
     */
    pagehash?: string | null;
}

const Dashboard = ({
    loadingLabel = '',
    initialLayout = [],
    siteDefault: siteDefaultProp,
    pagehash = null,
}: DashboardProps) => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [canonical, setCanonical] = useState<LayoutItem[]>([]);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const [error, setError] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [saving, setSaving] = useState(false);
    // Layouts before each move or resize, newest last, for Undo. A reload (after adding, removing or
    // resetting blocks) clears it, since an older layout may name blocks that no longer exist.
    const [history, setHistory] = useState<LayoutItem[][]>([]);
    const gridRef = useRef<HTMLDivElement>(null);
    const pointerRef = useRef<{x: number; y: number; moved: boolean} | null>(null);
    const interactionRef = useRef<Interaction | null>(null);
    const canonicalRef = useRef<LayoutItem[]>([]);
    const displayLayoutRef = useRef<LayoutItem[]>([]);
    const dataRef = useRef<DashboardData | null>(null);
    const siteDefault = resolveSiteDefault(siteDefaultProp);
    const labels = useDashboardLabels();
    const limits = resolveLimits(data);
    const limitsRef = useRef<GridLimits>(limits);
    limitsRef.current = limits;

    /**
     * Fetch a full dashboard payload and reset the canonical layout to match it.
     *
     * Called on mount and after any server-side mutation the client cannot safely predict the
     * result of (adding a block, removing one, resetting to the site default) - see get_dashboard.
     */
    const load = useCallback(async() => {
        // Reported as pending JavaScript (core/pending) so that anything waiting for the page to
        // settle - Behat's wait_for_pending_js() above all - waits for the payload too, rather than
        // looking for blocks while the loading skeleton is still up.
        const pending = new Pending('core_my/dashboard:load');
        try {
            const response = await getDashboard(siteDefault);
            setData(response);
            dataRef.current = response;
            setCanonical(response.layout);
            canonicalRef.current = response.layout;
            setHistory([]);
            setError('');
            return response;
        } catch (caught) {
            setError(describeError(caught));
            return null;
        } finally {
            pending.resolve();
        }
    }, [siteDefault]);

    useEffect(() => {
        void load();
    }, [load]);

    useCollectedBlockJavascript(data, gridRef);
    const [columnCount, columnCountRef] = useResponsiveColumnCount(gridRef, Boolean(data && labels), data);

    // Shown risen, in Edit mode and out of it: empty space above a block closes, including a gap left
    // by a block this person can't see. Nothing is saved here; a drop, resize, add or remove saves the
    // risen layout (see writeBack). Risen at full width first, so a narrower grid keeps that order,
    // then again in case packing left a gap. A move in progress does not rise: packWithPinned()
    // never moves a block up.
    const displayLayout = useMemo(
        () => riseToFill(packLayout(riseToFill(canonical), columnCount)),
        [canonical, columnCount],
    );
    displayLayoutRef.current = displayLayout;
    const previewLayout = useMemo(() => interaction
        ? packWithPinned(displayLayout, columnCount, interaction.draft, limits)
        : displayLayout, [columnCount, displayLayout, interaction, limits]);
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
     * silently unresponsive at the limit; every other edge (the grid's right edge and its row
     * ceiling) simply stops the nudge. Directions are visual, as the arrow keys and controls are:
     * in a right-to-left grid, right is towards the first column. Each step is announced - where
     * the block now is, or its new size - so a screen reader follows it as a sighted person does.
     */
    const shift = useCallback((visualHorizontal: number, vertical: number) => {
        const current = interactionRef.current;
        if (!current) {
            return;
        }
        const horizontal = isRtl(gridRef.current) ? -visualHorizontal : visualHorizontal;
        const bounds = limitsRef.current;
        let draft = {...current.draft};
        if (current.mode === 'move') {
            draft.column += horizontal;
            draft.row += vertical;
        } else {
            const nextColumns = draft.columns + horizontal;
            const nextRows = draft.rows + vertical;
            if (nextColumns < bounds.mincolumns || nextRows < bounds.minrows) {
                void announce('dashboardminimumsize', `${bounds.mincolumns} × ${bounds.minrows}`);
                return;
            }
            draft.columns = nextColumns;
            draft.rows = nextRows;
        }
        draft = clampToGrid(draft, columnCount, bounds);
        if (!layoutChanged(current.draft, draft)) {
            return;
        }
        const next = {...current, draft};
        interactionRef.current = next;
        setInteraction(next);
        if (current.mode === 'move') {
            void announce('gridcellposition', {row: draft.row + 1, column: draft.column + 1});
        } else {
            void announce('dashboardresizesize', {columns: draft.columns, rows: draft.rows});
        }
    }, [announce, columnCount]);

    // Keep a block moved or resized with the keyboard in view, step by step, as a pointer drag does
    // by following the pointer. 'nearest' scrolls only when it has left the screen.
    useEffect(() => {
        if (interaction?.origin !== 'keyboard') {
            return;
        }
        gridRef.current?.querySelector<HTMLElement>(`.core-my-dashboard-tile[data-block-id="${interaction.id}"]`)
            ?.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
    }, [interaction?.origin, interaction?.id, interaction?.draft]);

    /**
     * Persist the in-progress interaction's draft rectangle as the new canonical layout.
     *
     * Reads from refs (currentData/currentDisplay/currentCanonical/currentColumns), not state,
     * because this can be invoked from a pointerup listener registered once per drag in
     * pointerDown's closure - by the time the user releases, several renders may have happened
     * and captured state there would be stale. packWithPinned resolves any other tiles the
     * committed rectangle now overlaps (recorded in `disturbed`, purely for the a11y announcement);
     * writeBack then maps the result back to the full-width canonical layout: restoring every
     * item's canonical column span, undoing any margin shift the current column count applied,
     * or - when the current width is a genuine reflow, as on a phone - carrying over only the
     * new block order, so the persisted layout matches what was just resolved on-screen rather
     * than persisting the narrow stack as the wide layout (see the writeBack/packLayout comments
     * in layout.ts).
     */
    const commit = useCallback(async() => {
        const current = interactionRef.current;
        const currentData = dataRef.current;
        const currentDisplay = displayLayoutRef.current;
        const currentCanonical = canonicalRef.current;
        const currentColumns = columnCountRef.current;
        const bounds = limitsRef.current;
        if (!current || !currentData) {
            return;
        }
        const derived = packWithPinned(currentDisplay, currentColumns, current.draft, bounds);
        const disturbed = disturbedCount(current.before, derived, current.id);
        const next = writeBack(currentCanonical, derived, current.id, bounds, currentColumns);
        setSaving(true);
        try {
            await updateDashboard('save', siteDefault, next);
            setHistory(previous => [...previous, currentCanonical].slice(-UNDO_LIMIT));
            setCanonical(next);
            canonicalRef.current = next;
            const item = derived.find(candidate => candidate.id === current.id)!;
            await announce(current.mode === 'move' ? 'dashboardmovecommitted' : 'dashboardresizecommitted', {
                row: item.row + 1,
                column: item.column + 1,
                columns: item.columns,
                rows: item.rows,
                disturbed,
            });
            interactionRef.current = null;
            setInteraction(null);
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [announce, siteDefault]);

    /** Put back the layout from before the last move or resize, and save it. */
    const undo = useCallback(async() => {
        const previous = history[history.length - 1];
        if (!previous) {
            return;
        }
        setSaving(true);
        try {
            await updateDashboard('save', siteDefault, previous);
            setCanonical(previous);
            canonicalRef.current = previous;
            setHistory(current => current.slice(0, -1));
            await announce('dashboardundone');
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [announce, history, siteDefault]);

    /**
     * Ask before deleting a block, in the words core uses for it everywhere else ("Delete Timeline
     * block?"). Deleting cannot be undone, so it is confirmed rather than offered for Undo.
     */
    const askToDelete = useCallback(async(id: number, title: string) => {
        const [heading, message, confirmLabel] = await Promise.all([
            getString('deletecheck', 'block', title),
            getString('deleteblockcheck', 'block', title),
            getString('delete', 'core'),
        ]);
        setConfirmAction({type: 'delete', id, title, heading, message, confirmLabel});
    }, []);

    /**
     * Delete a block in place, without a page reload: remove it, reload the dashboard, and save it
     * with the gap the block left closed (see riseToFill), as any other change is saved. Focus goes
     * to the edit bar's Add block button, since the block that held it is gone.
     */
    const deleteBlock = useCallback(async(id: number, title: string) => {
        setSaving(true);
        try {
            await updateDashboard('remove', siteDefault, [], '', id);
            const response = await load();
            if (response) {
                const risen = riseToFill(response.layout);
                if (risen !== response.layout) {
                    await updateDashboard('save', siteDefault, risen);
                    setCanonical(risen);
                    canonicalRef.current = risen;
                }
            }
            await announce('dashboardblockremoved', title);
            document.querySelector<HTMLElement>('[data-region="dashboard-edit-bar"] [data-action="add-block"]')?.focus();
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [announce, load, siteDefault]);

    /** Abandon the in-progress interaction, discarding its draft rectangle unsaved. */
    const cancel = useCallback(() => {
        if (interaction) {
            void announce('dashboardoperationdiscarded');
        }
        interactionRef.current = null;
        setInteraction(null);
    }, [announce, interaction]);

    /**
     * Point the in-progress interaction at a grid cell, as when a block picked up by a click or a
     * tap is shown over the cell under the pointer: a move puts the block's corner there, a resize
     * stretches the block to reach it. Returns the interaction it set, or null when there is none.
     */
    const target = useCallback((column: number, row: number): Interaction | null => {
        const current = interactionRef.current;
        if (!current) {
            return null;
        }
        const draft = clampToGrid(current.mode === 'move'
            ? {...current.draft, column, row}
            : {
                ...current.draft,
                columns: column - current.original.column + 1,
                rows: row - current.original.row + 1,
            }, columnCount, limitsRef.current);
        if (!layoutChanged(current.draft, draft)) {
            return current;
        }
        const next = {...current, draft};
        interactionRef.current = next;
        setInteraction(next);
        return next;
    }, [columnCount]);

    /** Place a block picked up by a click or a tap in the chosen cell, and save. */
    const place = useCallback((column: number, row: number) => {
        if (target(column, row)) {
            void commit();
        }
    }, [commit, target]);

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
     * rectangle - not just its origin corner - stays on the grid, horizontally and vertically (the
     * row ceiling the server also enforces); a resize is capped so it never shrinks below the
     * minimum tile size and never grows past the grid's right edge or its row ceiling.
     * `pointer.moved` (a small 4px threshold, to absorb hand tremor on a click that was never
     * meant to be a drag) is what pointerup below uses to decide whether this was a genuine drag
     * to commit, or a plain click that should instead just reveal the on-screen move/resize
     * controls (see the `up` handler and Interaction.origin).
     */
    const pointerDown = useCallback((event: React.PointerEvent, id: number, mode: 'move' | 'resize') => {
        event.preventDefault();
        start(id, mode, 'pointer');
        pointerRef.current = {x: event.clientX, y: event.clientY, moved: false};
        const origin = displayLayout.find(item => item.id === id);
        if (!origin) {
            return;
        }
        const bounds = limitsRef.current;
        const grid = gridRef.current;
        const cellWidth = grid
            ? (grid.getBoundingClientRect().width - GRID_GAP * (columnCount - 1)) / columnCount
            : 1;
        const columnStride = cellWidth + GRID_GAP;
        const rowStride = ROW_HEIGHT + GRID_GAP;
        const originalWidth = origin.columns * cellWidth + (origin.columns - 1) * GRID_GAP;
        const originalHeight = origin.rows * ROW_HEIGHT + (origin.rows - 1) * GRID_GAP;
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
                let draft = {...origin};
                let drag: PointerDrag;
                if (mode === 'move') {
                    draft.column = origin.column + horizontal;
                    draft.row = origin.row + vertical;
                    drag = {
                        x: Math.max(-origin.column * columnStride,
                            Math.min((columnCount - origin.column - origin.columns) * columnStride, deltaX)),
                        y: Math.max(-origin.row * rowStride,
                            Math.min((bounds.maxrows - origin.row - origin.rows) * rowStride, deltaY)),
                    };
                } else {
                    draft.columns = origin.columns + horizontal;
                    draft.rows = origin.rows + vertical;
                    drag = {
                        x: 0,
                        y: 0,
                        width: Math.max(cellWidth, Math.min(
                            (columnCount - origin.column) * columnStride - GRID_GAP,
                            originalWidth + deltaX,
                        )),
                        height: Math.max(ROW_HEIGHT, Math.min(
                            (bounds.maxrows - origin.row) * rowStride - GRID_GAP,
                            originalHeight + deltaY,
                        )),
                        shrinking: deltaX < 0 || deltaY < 0,
                    };
                }
                draft = clampToGrid(draft, columnCount, bounds);
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
     * Place a block that has just been added where the user asked for it.
     *
     * A newly-added block's id (when it came through its own add form), default size and rendered
     * content are only known once the server has it, so this cannot be done optimistically: it
     * reloads via load() first, finds the new block in the fresh layout (by id when known,
     * otherwise as the one block the previous payload did not have), then places it in the
     * on-screen layout and saves again:
     *
     * - into a specific empty cell (target.column/row), sized to the free space there
     *   (fitToFreeSpace) so that none of its neighbours has to move - or, when not even the
     *   smallest tile fits that hole, pinned there at its default size with the neighbours
     *   displaced around it, as a move would;
     * - at the start of the grid (target.position === 'start'), pinned at the top-left corner;
     * - at the end (target.position === 'end'), pinned below everything else, in the first column.
     *
     * The end case is pinned too, rather than left where the server appended it, so that the
     * saved column is always one the user can see at the current width: the server does not know
     * that width, and a block saved outside the window of columns the user is looking at would
     * turn their whole view into a reflow (see writeBack()).
     *
     * Reads the column count from its ref, not state: this runs from the add modal's callbacks,
     * created when the modal opened, and the grid may have been re-measured since.
     */
    const placeNewBlock = useCallback(async(blockid: number | null, target: AddTarget, title: string) => {
        const previousIds = new Set((dataRef.current?.blocks ?? []).map(block => block.id));
        const response = await load();
        if (!response) {
            return;
        }
        const bounds = response.limits;
        const currentColumns = columnCountRef.current;
        const item = blockid
            ? response.layout.find(candidate => candidate.id === blockid)
            : response.layout.filter(candidate => !previousIds.has(candidate.id))
                .sort((left, right) => right.id - left.id)[0];
        if (item) {
            const display = packLayout(response.layout, currentColumns);
            const others = display.filter(candidate => candidate.id !== item.id);
            let pinned: LayoutItem;
            if (target.column !== undefined && target.row !== undefined) {
                const wanted = clampToGrid({...item, column: target.column, row: target.row}, currentColumns, bounds);
                const fitted = fitToFreeSpace(others, currentColumns, wanted, bounds);
                pinned = fitted ? {...item, ...fitted} : wanted;
            } else if (target.position === 'start') {
                pinned = {...item, column: 0, row: 0};
            } else {
                pinned = {...item, column: 0, row: maxRow(others)};
            }
            const next = writeBack(response.layout, packWithPinned(display, currentColumns, pinned, bounds),
                item.id, bounds, currentColumns);
            await updateDashboard('save', siteDefault, next);
            setCanonical(next);
            canonicalRef.current = next;
        }
        await announce('dashboardblockadded', title);
    }, [announce, columnCountRef, load, siteDefault]);

    /** Add a block type with no add form of its own over the web service, then place it. */
    const add = useCallback(async(block: AvailableBlock, target: AddTarget) => {
        setSaving(true);
        try {
            const result = await updateDashboard('add', siteDefault, [], block.name);
            await placeNewBlock(result.blockid || null, target, block.title);
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [placeNewBlock, siteDefault]);

    /** A block added through its own form (see addBlockModal.ts) already exists: reload and place it. */
    const placeFormAdded = useCallback(async(block: AvailableBlock, target: AddTarget) => {
        setSaving(true);
        try {
            await placeNewBlock(null, target, block.title);
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [placeNewBlock]);

    /**
     * Open the standard "Add a block" modal (see addBlockModal.ts) for a target position: an empty
     * cell, the start of the grid, or its end.
     */
    const openAddBlock = useCallback((target: AddTarget, trigger?: Element | null) => {
        const current = dataRef.current;
        if (!current || !labels) {
            return;
        }
        openAddBlockModal({
            blocks: current.availableblocks,
            title: labels.addblock,
            pagehash,
            returnElement: trigger,
            onSelect: block => void add(block, target),
            onFormSubmitted: block => void placeFormAdded(block, target),
        }).catch(caught => setError(describeError(caught)));
    }, [add, labels, pagehash, placeFormAdded]);

    /**
     * Discard the user's own dashboard customisation and revert to the site default.
     * Own dashboard only - see the 'reset' case in update_dashboard.php.
     */
    const reset = useCallback(async() => {
        if (!data) {
            return;
        }
        setSaving(true);
        try {
            await updateDashboard('reset', false);
            // Reset replaces the user's page with a fresh copy of the site default. Reload the
            // document so the server-rendered page chrome is set up for that new page; Edit mode
            // stays on across the reload, so the user can carry on arranging it.
            window.location.reload();
        } catch (caught) {
            setError(describeError(caught));
        } finally {
            setSaving(false);
        }
    }, [data]);

    if (!data || !labels) {
        return <DashboardPlaceholder error={error} loadingLabel={loadingLabel} initialLayout={initialLayout} />;
    }

    // One spare row while a block moves, so it can be put below everything else.
    const rows = gridRows(previewLayout, interaction);
    const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) ||
        (interaction.origin === 'pointer' && interaction.mode === 'resize' && interaction.drag?.shrinking))
        ? interaction.draft : undefined;
    const requestReset = () => setConfirmAction({type: 'reset'});
    const requestDelete = (id: number, title: string) => void askToDelete(id, title);
    return <div
        className={`core-my-dashboard-app${data.editing ? ' core-my-dashboard-app--editing' : ''}`}
        aria-busy={saving}
    >
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
        {data.editing && <p className="core-my-dashboard-hint">
            <Icon markup={data.icons.move} className="core-my-dashboard-hint__icon" />
            {labels.edithint}
        </p>}
        <DashboardErrorBoundary
            resetLabel={labels.reset}
            onReset={!siteDefault && data.canedit ? requestReset : undefined}
        >
            <div
                ref={gridRef}
                className="core-my-dashboard-grid"
                style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, ${ROW_HEIGHT}px)`,
                }}
                data-columns={columnCount}
            >
                {data.editing && <BoardCells
                    rows={rows}
                    columnCount={columnCount}
                    layout={previewLayout}
                    interaction={interaction}
                    prospective={prospective}
                    labels={labels}
                    addIcon={data.icons.add}
                    onActivate={(targetColumn, targetRow) => openAddBlock({column: targetColumn, row: targetRow})}
                    onPlace={place}
                    onPreview={(targetColumn, targetRow) => void target(targetColumn, targetRow)}
                />}
                {previewLayout.map(item => {
                    const block = blocksById.get(item.id);
                    if (!block) {
                        return null;
                    }
                    return <DashboardTile
                        key={item.id}
                        block={block}
                        item={item}
                        labels={labels}
                        icons={data.icons}
                        editing={data.editing}
                        activeMode={interaction?.id === item.id ? interaction.mode : undefined}
                        {...tileMotion(interaction, item.id)}
                        drag={interaction?.id === item.id ? interaction.drag : undefined}
                        dragOrigin={interaction?.id === item.id ? interaction.original : undefined}
                        isBumped={bumpedBlockIds.has(item.id)}
                        onStart={start}
                        onKeyDown={keyDown}
                        onPointerDown={pointerDown}
                        onDirection={shift}
                        onCommit={() => void commit()}
                        onDelete={requestDelete}
                    />;
                })}
            </div>
        </DashboardErrorBoundary>
        {/*
            The end-of-grid control is the same "Add a block" button core/add_block_button renders
            under every other block region (same markup, classes and wrapper), so it reads, and is
            found by the standard Behat steps, exactly as on any other page. It deliberately carries
            no data-key="addblock": that is core_block/add_modal's hook, which is not loaded on the
            dashboard pages, and the grid opens the modal itself (see openAddBlock) so that the
            chosen block is placed without a page reload.
        */}
        {data.editing && <div className="d-grid core-my-dashboard-addblock" data-region="add-block-button">
            <a
                href={addBlockFallbackUrl()}
                className="btn btn-add-content mb-3"
                onClick={event => {
                    event.preventDefault();
                    openAddBlock({position: 'end'}, event.currentTarget);
                }}
            >
                <Icon markup={data.icons.add} className="py-2 me-2" />{labels.addblock}
            </a>
        </div>}
        {data.editing && <DashboardEditBar
            siteDefault={siteDefault}
            canEditDefault={data.caneditdefault}
            canUndo={history.length > 0 && !saving}
            labels={labels}
            icons={data.icons}
            onReset={requestReset}
            onUndo={() => void undo()}
            onAdd={trigger => openAddBlock({position: 'start'}, trigger)}
        />}
        {confirmAction && <ConfirmationDialog
            title={confirmAction.type === 'delete' ? confirmAction.heading : labels.resetheading}
            message={confirmAction.type === 'delete' ? confirmAction.message : labels.confirmreset}
            confirmLabel={confirmAction.type === 'delete' ? confirmAction.confirmLabel : labels.confirm}
            cancelLabel={labels.cancel}
            danger={confirmAction.type === 'delete'}
            onConfirm={() => {
                setConfirmAction(null);
                void (confirmAction.type === 'delete' ? deleteBlock(confirmAction.id, confirmAction.title) : reset());
            }}
            onCancel={() => setConfirmAction(null)}
        />}
    </div>;
};

export default Dashboard;
