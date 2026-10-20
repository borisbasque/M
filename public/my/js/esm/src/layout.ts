// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Pure responsive dashboard layout helpers.
 *
 * @module     core_my/layout
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const MAX_COLUMNS = 6;
// Six columns from a 1600px grid: a full HD screen gets six, each at least 253px; laptops get four.
export const SIX_COLUMN_THRESHOLD = 1600;
export const FOUR_COLUMN_THRESHOLD = 920;
export const TWO_COLUMN_THRESHOLD = 690;

/** A size on the grid, in whole columns and rows. */
export interface GridSize {
    columns: number;
    rows: number;
}

/**
 * Fit a block's minimum size to the grid's current column count.
 *
 * A block may declare a minimum wider than a narrow grid has columns (for example two columns on a
 * one-column phone layout). It then takes the full width rather than overflowing the grid.
 *
 * @param minimum The block's minimum size, as resolved by the server.
 * @param columnCount The grid's current column count.
 * @return The minimum, with its width capped at the column count.
 */
export const fitMinimum = (minimum: GridSize, columnCount: number): GridSize => ({
    columns: Math.max(1, Math.min(minimum.columns, columnCount)),
    rows: minimum.rows,
});

/** The grid's rendered row unit and gutter, in pixels. */
export interface GridMetrics {
    rowHeight: number;
    gap: number;
}

// Used only where the grid's computed style cannot be read (no element yet, or a test DOM without
// layout). The real values come from the --core-my-dashboard-row-height and
// --core-my-dashboard-gap custom properties in theme/boost/scss/moodle/my.scss.
const FALLBACK_GRID_METRICS: GridMetrics = {rowHeight: 96, gap: 16};

/**
 * Read the grid's actual row unit and gutter from its computed style.
 *
 * The SCSS is the single source of both values; reading them back keeps the editor's pointer
 * maths correct whatever they are set to, including when the rem-based row unit scales with the
 * user's text size.
 *
 * @param grid The rendered .core-my-dashboard-grid element.
 * @return The row height and gap in pixels.
 */
export const readGridMetrics = (grid: HTMLElement | null): GridMetrics => {
    if (!grid) {
        return FALLBACK_GRID_METRICS;
    }
    const style = window.getComputedStyle(grid);
    const rowHeight = parseFloat(style.gridAutoRows);
    const gap = parseFloat(style.rowGap);
    return {
        rowHeight: Number.isFinite(rowHeight) && rowHeight > 0 ? rowHeight : FALLBACK_GRID_METRICS.rowHeight,
        gap: Number.isFinite(gap) && gap >= 0 ? gap : FALLBACK_GRID_METRICS.gap,
    };
};

// Below this rendered width a tile is treated like a legacy narrow side-region block,
// so that block CSS designed around Boost's fixed-width sidebar keeps applying correctly.
export const NARROW_BLOCK_WIDTH = 480;

export interface LayoutItem {
    id: number;
    column: number;
    row: number;
    columns: number;
    rows: number;
    // Whether the row span follows the block's content; false once someone has resized it.
    autorows?: boolean;
    sourceColumns?: number;
}

export const columnsForWidth = (width: number): number => {
    if (width >= SIX_COLUMN_THRESHOLD) {
        return 6;
    }
    if (width >= FOUR_COLUMN_THRESHOLD) {
        return 4;
    }
    if (width >= TWO_COLUMN_THRESHOLD) {
        return 2;
    }
    return 1;
};

const fits = (occupied: Set<string>, column: number, row: number, columns: number, rows: number): boolean => {
    for (let y = row; y < row + rows; y++) {
        for (let x = column; x < column + columns; x++) {
            if (occupied.has(`${x}:${y}`)) {
                return false;
            }
        }
    }
    return true;
};

const occupy = (occupied: Set<string>, item: LayoutItem): void => {
    for (let y = item.row; y < item.row + item.rows; y++) {
        for (let x = item.column; x < item.column + item.columns; x++) {
            occupied.add(`${x}:${y}`);
        }
    }
};

/**
 * Lay every item out fresh in reading order (top-to-bottom, left-to-right), ignoring each item's
 * existing column/row entirely and only respecting its size - the first free cell (scanning row
 * by row) that fits each item's (possibly narrowed) column span wins. Used by writeBack() as the
 * fallback when there is no pinned item to pack around: e.g. after a remove, where the simplest
 * correct layout is just "every remaining block, in the same relative order as before".
 */
export const packInOrder = (items: LayoutItem[], columnCount: number): LayoutItem[] => {
    const occupied = new Set<string>();
    return items.map(item => {
        const columns = Math.min(item.columns, columnCount);
        let placed: LayoutItem | null = null;
        for (let row = 0; row < 10000 && !placed; row++) {
            for (let column = 0; column + columns <= columnCount; column++) {
                if (fits(occupied, column, row, columns, item.rows)) {
                    placed = {
                        ...item,
                        column,
                        row,
                        columns,
                        sourceColumns: item.sourceColumns ?? item.columns,
                    };
                    break;
                }
            }
        }
        if (!placed) {
            throw new Error('Unable to place dashboard block.');
        }
        occupy(occupied, placed);
        return placed;
    });
};

/**
 * When every block's existing column span already fits inside a narrower column count, keep
 * every block's row/column exactly as-is (if it already fits) or shift the whole layout left by
 * only as much as needed to bring it back in bounds, rather than reflowing block-by-block. This
 * keeps blocks in place (relative to each other) when a narrower breakpoint only clips empty
 * margin columns, and falls through to full reflow only once real content would overflow.
 */
const shiftToFit = (items: LayoutItem[], columnCount: number): LayoutItem[] | null => {
    if (items.length === 0) {
        return items;
    }
    const minColumn = Math.min(...items.map(item => item.column));
    const maxColumn = Math.max(...items.map(item => item.column + item.columns));
    if (maxColumn > columnCount && maxColumn - minColumn > columnCount) {
        return null;
    }
    const shift = Math.max(0, maxColumn - columnCount);
    return [...items]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .map(item => ({...item, column: item.column - shift, sourceColumns: item.sourceColumns ?? item.columns}));
};

/**
 * Resolve the canonical (persisted, up-to-MAX_COLUMNS-wide) layout into one that fits the grid's
 * current responsive column count, for display.
 *
 * Tries shiftToFit() first (see its own comment) so that narrowing the viewport only reflows
 * blocks when their content would actually be clipped, not merely when empty margin columns
 * would be. Only once that is not possible does this fall back to placing every item at its
 * clamped size (`Math.min(item.columns, columnCount)`) as close to its original column/row as
 * a free cell allows, scanning in row-major reading order from there if the original spot is
 * already taken. Every clamped item's original (canonical) column count survives in
 * `sourceColumns`, so writeBack() can restore it once the interaction that produced a new
 * `displayLayout` is saved back at full width.
 */
export const packLayout = (items: LayoutItem[], columnCount: number): LayoutItem[] => {
    const shifted = shiftToFit(items, columnCount);
    if (shifted) {
        return shifted;
    }
    const occupied = new Set<string>();
    return [...items]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .map(item => {
            const columns = Math.min(item.columns, columnCount);
            const column = Math.max(0, Math.min(item.column, columnCount - columns));
            const row = Math.max(0, item.row);
            let placed: LayoutItem | null = null;
            if (fits(occupied, column, row, columns, item.rows)) {
                placed = {...item, column, row, columns, sourceColumns: item.sourceColumns ?? item.columns};
            } else {
                for (let nextrow = 0; nextrow < 10000 && !placed; nextrow++) {
                    for (let nextcolumn = 0; nextcolumn + columns <= columnCount; nextcolumn++) {
                        if (fits(occupied, nextcolumn, nextrow, columns, item.rows)) {
                            placed = {
                                ...item,
                                column: nextcolumn,
                                row: nextrow,
                                columns,
                                sourceColumns: item.sourceColumns ?? item.columns,
                            };
                            break;
                        }
                    }
                }
            }
            if (!placed) {
                throw new Error('Unable to place dashboard block.');
            }
            occupy(occupied, placed);
            return placed;
        });
};

export interface GridRect {
    column: number;
    row: number;
    columns: number;
    rows: number;
}

const rectsOverlap = (left: GridRect, right: GridRect): boolean =>
    left.column < right.column + right.columns && left.column + left.columns > right.column &&
    left.row < right.row + right.rows && left.row + left.rows > right.row;

/**
 * Slide a rect downwards, in its own column, to the nearest free rows.
 */
const pushDown = (rect: GridRect, occupied: Set<string>): GridRect | null => {
    for (let row = rect.row + 1; row < 10000; row++) {
        if (fits(occupied, rect.column, row, rect.columns, rect.rows)) {
            return {...rect, row};
        }
    }
    return null;
};

/**
 * Move a block that is in the way just far enough to clear the block it collided with.
 *
 * A block level with or above the one in its way moves to just past that block's right edge, if
 * that space is free; otherwise, or if it was below the block in its way, it moves down within its
 * own columns to the first rows that are free. It never moves up, never jumps over other blocks to
 * a distant cell, and never pushes anything else, so the rest of the dashboard stays where its
 * owner left it.
 */
const displaceFromBlocker = (
    rect: GridRect,
    blocker: GridRect,
    occupied: Set<string>,
    columnCount: number,
): GridRect => {
    const column = blocker.column + blocker.columns;
    if (rect.row <= blocker.row && column + rect.columns <= columnCount
            && fits(occupied, column, rect.row, rect.columns, rect.rows)) {
        return {...rect, column};
    }
    // Always succeeds: there is always free space below the layout.
    return pushDown(rect, occupied)!;
};

/**
 * Pack a layout around one item held at its (draft) position, displacing whatever it overlaps.
 *
 * @param items Layout to pack.
 * @param columnCount Current responsive column count.
 * @param pinned The item being moved or resized, at its draft rectangle.
 * @param minimum The smallest size the pinned item may take, as sent by the server. Callers
 *     already refuse to go below it; this is a safety floor so a stale draft can never persist
 *     a block smaller than the server will accept.
 * @return The packed layout, pinned item first.
 */
export const packWithPinned = (
    items: LayoutItem[],
    columnCount: number,
    pinned: LayoutItem,
    minimum: GridSize = {columns: 1, rows: 1},
): LayoutItem[] => {
    const columns = Math.min(Math.max(minimum.columns, pinned.columns), columnCount);
    const safePinned = {
        ...pinned,
        column: Math.max(0, Math.min(pinned.column, columnCount - columns)),
        row: Math.max(0, pinned.row),
        columns,
        rows: Math.max(minimum.rows, pinned.rows),
    };
    const occupied = new Set<string>();
    occupy(occupied, safePinned);
    const result: LayoutItem[] = [safePinned];
    const clamped = items
        .filter(item => item.id !== pinned.id)
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .map(item => {
            const columns = Math.min(item.columns, columnCount);
            return {
                ...item,
                column: Math.max(0, Math.min(item.column, columnCount - columns)),
                row: Math.max(0, item.row),
                columns,
            };
        });
    // Every block the pinned one does not overlap stays exactly where it is. Only then are the
    // blocks it does overlap moved, into space that is free, so nothing else is pushed along.
    const displaced: LayoutItem[] = [];
    for (const item of clamped) {
        if (fits(occupied, item.column, item.row, item.columns, item.rows)) {
            occupy(occupied, item);
            result.push(item);
        } else {
            displaced.push(item);
        }
    }
    for (const item of displaced) {
        const blocker = result.find(candidate => rectsOverlap(item, candidate)) ?? safePinned;
        const resolved = displaceFromBlocker(item, blocker, occupied, columnCount);
        const placed = {...item, column: resolved.column, row: resolved.row};
        occupy(occupied, placed);
        result.push(placed);
    }
    return result;
};

/** Why a one-cell step cannot be taken: the grid's edge, or the block's minimum size. */
export type StepBlocker = 'edge' | 'minimum';

/** The result of trying to step a block one cell: its new rectangle, or why it cannot go. */
export type StepResult = {draft: LayoutItem; blocker?: undefined} | {draft?: undefined; blocker: StepBlocker};

/**
 * Step a block's draft rectangle by one cell, or say why it cannot be.
 *
 * The single source of truth for one-cell moves and resizes: the arrow keys and the Move and
 * Resize dialogs both use it, so they always agree. Other blocks never block a step. Like a drag,
 * the step takes the space and whatever is there moves aside (see packWithPinned()), so only the
 * grid's edges and the block's minimum size can stop it. Moving down, or making it taller, always
 * succeeds: the grid grows.
 *
 * @param draft The block's current rectangle.
 * @param mode Whether it is moving or resizing.
 * @param horizontal Logical columns to step: +1 towards the end of the row, -1 towards its start.
 * @param vertical Rows to step: +1 down, -1 up.
 * @param columnCount The grid's current column count.
 * @param minimum The block's minimum size, already fitted to the column count.
 * @return The new rectangle, or the reason there is none.
 */
export const stepDraft = (
    draft: LayoutItem,
    mode: 'move' | 'resize',
    horizontal: number,
    vertical: number,
    columnCount: number,
    minimum: GridSize,
): StepResult => {
    if (mode === 'move') {
        const column = draft.column + horizontal;
        const row = draft.row + vertical;
        if (column < 0 || column + draft.columns > columnCount || row < 0) {
            return {blocker: 'edge'};
        }
        return {draft: {...draft, column, row}};
    }
    const columns = draft.columns + horizontal;
    const rows = draft.rows + vertical;
    if (columns < minimum.columns || rows < minimum.rows) {
        return {blocker: 'minimum'};
    }
    if (draft.column + columns > columnCount) {
        return {blocker: 'edge'};
    }
    return {draft: {...draft, columns, rows}};
};

/**
 * Raise every block as far as it can go, filling empty space above it.
 *
 * Vertical only, and only within the block's own column span: it keeps its column and width, and
 * stops when a block already placed in that span, or the top of the grid, is in the way. Nothing
 * moves sideways, so a right-to-left grid is unaffected. Blocks are placed from the top down, so
 * one never rises through a block that started above it, and a block never moves up while another
 * is still being moved: callers run this when a block is dropped, added, removed or hidden, not
 * during the move itself (see packWithPinned()).
 *
 * @param items Layout items, none overlapping.
 * @return The risen layout, in the same order, or the same array when nothing moved.
 */
export const riseToFill = <T extends LayoutItem>(items: T[]): T[] => {
    if (items.length === 0) {
        return items;
    }
    const occupied = new Set<string>();
    const placed = new Map<number, T>();
    let moved = false;
    [...items]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .forEach(item => {
            let row = Math.max(0, item.row);
            while (row > 0 && fits(occupied, item.column, row - 1, item.columns, item.rows)) {
                row--;
            }
            const next = row === item.row ? item : {...item, row};
            if (next !== item) {
                moved = true;
            }
            occupy(occupied, next);
            placed.set(item.id, next);
        });
    if (!moved) {
        return items;
    }
    return items.map(item => placed.get(item.id) ?? item);
};

/**
 * Turn a `derived` layout - produced by packLayout()/packWithPinned() at the current, possibly
 * narrowed, responsive column count - back into a canonical layout safe to persist at the full
 * MAX_COLUMNS width the server always stores.
 *
 * Column spans that packLayout() narrowed for display are restored from `sourceColumns` (falling
 * back to the item's width in the previous canonical layout, or its current width as a last
 * resort) for every item except the one the caller is actively resizing (`pinnedId`), whose new
 * width is the whole point of the change and must be kept as-is. Once every item's width is back
 * to canonical, the set is re-packed at MAX_COLUMNS - around the pinned item if there is one
 * (packWithPinned, so the rest of the layout displaces around it exactly as it did on-screen), or
 * in reading order if not (packInOrder, e.g. after a remove) - because restoring widths alone can
 * reintroduce overlaps a narrower layout had already resolved away.
 */
export const writeBack = (
    canonical: LayoutItem[],
    derived: LayoutItem[],
    pinnedId?: number,
    minimum?: GridSize,
): LayoutItem[] => {
    const original = new Map(canonical.map(item => [item.id, item]));
    const restored = [...derived]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .map(item => ({
            ...item,
            columns: item.id === pinnedId
                ? item.columns
                : (item.sourceColumns ?? original.get(item.id)?.columns ?? item.columns),
            sourceColumns: undefined,
        }));
    const pinned = restored.find(item => item.id === pinnedId);
    const packed = pinned
        ? packWithPinned(restored, MAX_COLUMNS, pinned, minimum)
        : packInOrder(restored, MAX_COLUMNS);
    // Compaction is a separate step from the move: packWithPinned() never moves a block up.
    return riseToFill(packed).map(item => ({
        id: item.id,
        column: item.column,
        row: item.row,
        columns: item.columns,
        rows: item.rows,
        autorows: item.autorows ?? true,
    }));
};

/**
 * Close up rows that no block occupies, moving everything below them up by as many rows.
 *
 * Blocks keep their columns and their order. A gap that another block still occupies in a
 * different column is left as it is; {@link riseToFill} closes those too, one column span at a time.
 *
 * @param items Layout items.
 * @return The layout with empty rows removed, or the same array when there were none.
 */
export const collapseEmptyRows = <T extends LayoutItem>(items: T[]): T[] => {
    const rows = maxRow(items);
    const shift: number[] = [];
    let empty = 0;
    for (let row = 0; row < rows; row++) {
        shift.push(empty);
        if (!items.some(item => row >= item.row && row < item.row + item.rows)) {
            empty++;
        }
    }
    if (empty === 0 || items.every(item => !shift[item.row])) {
        return items;
    }
    return items.map(item => shift[item.row] ? {...item, row: item.row - shift[item.row]} : item);
};

/**
 * The first space, in reading order, where a block of the given size fits without moving anything.
 *
 * @param items The layout to fit into.
 * @param columnCount The grid's column count.
 * @param columns The block's width, narrowed to the grid if wider.
 * @param rows The block's height.
 * @return The top-left cell of that space.
 */
export const firstFreeSpace = (
    items: LayoutItem[],
    columnCount: number,
    columns: number,
    rows: number,
): {column: number; row: number} => {
    const width = Math.min(columns, columnCount);
    const occupied = new Set<string>();
    items.forEach(item => occupy(occupied, item));
    for (let row = 0; ; row++) {
        for (let column = 0; column + width <= columnCount; column++) {
            if (fits(occupied, column, row, width, rows)) {
                return {column, row};
            }
        }
    }
};

/**
 * Group the grid's empty cells into rectangles, so each empty region is one target, not one per cell.
 *
 * Scans in reading order: each empty cell not yet in a region starts one, which grows right while
 * the cells are empty, then down while the whole width of the next row is.
 *
 * @param items The layout.
 * @param columnCount The grid's column count.
 * @param rowCount How many rows the grid shows.
 * @return The regions, in reading order.
 */
export const emptyRegions = (items: LayoutItem[], columnCount: number, rowCount: number): GridRect[] => {
    const taken = new Set<string>();
    items.forEach(item => occupy(taken, item));
    const regions: GridRect[] = [];
    for (let row = 0; row < rowCount; row++) {
        for (let column = 0; column < columnCount; column++) {
            if (taken.has(`${column}:${row}`)) {
                continue;
            }
            let columns = 1;
            while (column + columns < columnCount && !taken.has(`${column + columns}:${row}`)) {
                columns++;
            }
            let rows = 1;
            while (row + rows < rowCount && fits(taken, column, row + rows, columns, 1)) {
                rows++;
            }
            const region = {column, row, columns, rows};
            occupy(taken, {id: -1, ...region});
            regions.push(region);
        }
    }
    return regions;
};

export const disturbedCount = (before: LayoutItem[], after: LayoutItem[], activeId: number): number => {
    const positions = new Map(before.map(item => [item.id, `${item.column}:${item.row}`]));
    return after.filter(item => item.id !== activeId
        && positions.get(item.id) !== `${item.column}:${item.row}`).length;
};

export const maxRow = (items: LayoutItem[]): number => items.reduce(
    (maximum, item) => Math.max(maximum, item.row + item.rows),
    0,
);

/** The tallest a block opens at when sized to its content, unless the server says otherwise. */
export const AUTO_ROWS_CAP = 8;

/**
 * Convert a block's natural height to a whole number of grid rows.
 *
 * A tile spanning `n` rows is `n * rowHeight + (n - 1) * gap` tall, so the smallest span that
 * fits `height` is ceil((height + gap) / (rowHeight + gap)). The result is kept between the
 * block's minimum and the auto-height cap; when the minimum is above the cap (a block may declare
 * up to 12 rows) the minimum wins.
 *
 * @param height The block's natural height in pixels: header, content and footer.
 * @param metrics The grid's row unit and gap.
 * @param minimumRows The block's minimum row span.
 * @param cap The most rows an auto-height block opens at.
 * @return The row span.
 */
export const rowsForHeight = (
    height: number,
    metrics: GridMetrics,
    minimumRows: number,
    cap: number = AUTO_ROWS_CAP,
): number => {
    const fitted = Math.ceil((Math.max(0, height) + metrics.gap) / (metrics.rowHeight + metrics.gap));
    return Math.max(minimumRows, Math.min(cap, fitted));
};

/**
 * Give some blocks new row spans, moving only what they now overlap, and only downwards.
 *
 * Blocks are re-placed in reading order: each keeps its column and row unless a block placed before
 * it now covers one of its cells, in which case it moves down to the nearest free rows. A block
 * that shrinks leaves the space it gave up empty rather than pulling others up, so content does not
 * jump around under the reader.
 *
 * @param layout The canonical layout.
 * @param rows New row spans, by block id.
 * @return The new layout, or the same array when no span changed.
 */
export const applyRowSpans = (layout: LayoutItem[], rows: Map<number, number>): LayoutItem[] => {
    if (!layout.some(item => rows.has(item.id) && rows.get(item.id) !== item.rows)) {
        return layout;
    }
    const occupied = new Set<string>();
    return [...layout]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id)
        .map(item => {
            const placed = {...item, rows: rows.get(item.id) ?? item.rows};
            while (!fits(occupied, placed.column, placed.row, placed.columns, placed.rows)) {
                placed.row++;
            }
            occupy(occupied, placed);
            return placed;
        });
};

/**
 * Measure how tall a tile would be if it showed all of its block's content.
 *
 * A tile's content area scrolls, so its own scrollHeight only reports overflow, never content that
 * is shorter than the tile. Instead the extent of the content's children is measured directly - so
 * the measurement does not depend on the tile's current height - and the tile's header, footers,
 * padding and border are added.
 *
 * @param tile The rendered .core-my-dashboard-tile element.
 * @return The natural height in pixels.
 */
export const measureNaturalHeight = (tile: HTMLElement): number => {
    const content = tile.querySelector<HTMLElement>('.core-my-dashboard-tile__content');
    if (!content) {
        return 0;
    }
    const contentStyle = window.getComputedStyle(content);
    const top = content.getBoundingClientRect().top + (parseFloat(contentStyle.paddingTop) || 0);
    let bottom = top;
    Array.from(content.children).forEach(child => {
        const margin = parseFloat(window.getComputedStyle(child).marginBottom) || 0;
        bottom = Math.max(bottom, child.getBoundingClientRect().bottom + margin);
    });
    const contentHeight = bottom - top
        + (parseFloat(contentStyle.paddingTop) || 0) + (parseFloat(contentStyle.paddingBottom) || 0);
    const tileStyle = window.getComputedStyle(tile);
    const chrome = Array.from(tile.children)
        .filter(child => child !== content && window.getComputedStyle(child).position !== 'absolute')
        .reduce((total, child) => total + child.getBoundingClientRect().height, 0);
    return Math.ceil(contentHeight + chrome
        + (parseFloat(tileStyle.borderTopWidth) || 0) + (parseFloat(tileStyle.borderBottomWidth) || 0));
};
