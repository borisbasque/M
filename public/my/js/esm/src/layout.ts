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
export const MAX_ROWS = 500;
export const SIX_COLUMN_THRESHOLD = 1921;
export const FOUR_COLUMN_THRESHOLD = 920;
export const TWO_COLUMN_THRESHOLD = 690;
export const ROW_HEIGHT = 96;
export const GRID_GAP = 16;
export const MIN_COLUMNS = 1;
export const MIN_ROWS = 2;

/**
 * The grid's bounds. The server is the single authority for these (see
 * core_my\local\dashboard::get_minimum_size() and its MAX_* constants): every get_dashboard
 * response carries them as `limits`, and the application enforces whatever it was given. The
 * constants above are only the fallback used before a response has arrived (and by the pure
 * packing helpers below, which cannot see a response).
 */
export interface GridLimits {
    mincolumns: number;
    minrows: number;
    maxcolumns: number;
    maxrows: number;
}

export const DEFAULT_LIMITS: GridLimits = {
    mincolumns: MIN_COLUMNS,
    minrows: MIN_ROWS,
    maxcolumns: MAX_COLUMNS,
    maxrows: MAX_ROWS,
};

/**
 * Clamp a rectangle so that it sits inside the grid, both horizontally (within `columnCount`
 * columns) and vertically (within the row ceiling), and is no smaller than the minimum size.
 * Spans are clamped first, then the origin, so a rectangle at the grid's edge is pulled back in
 * rather than shrunk.
 *
 * @param rect The rectangle to clamp.
 * @param columnCount The current responsive column count.
 * @param limits The grid's bounds.
 */
export const clampToGrid = <T extends GridRect>(rect: T, columnCount: number, limits: GridLimits): T => {
    const columns = Math.max(limits.mincolumns, Math.min(columnCount, rect.columns));
    const rows = Math.max(limits.minrows, Math.min(limits.maxrows, rect.rows));
    return {
        ...rect,
        columns,
        rows,
        column: Math.max(0, Math.min(columnCount - columns, rect.column)),
        row: Math.max(0, Math.min(limits.maxrows - rows, rect.row)),
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
 * Place each item, in the order given, at its own column (pulled in only if its span would
 * overhang the grid) in the first row from the top where it fits AND where it still reads after
 * the item before it (a later row, or the same row further right). The result's reading order
 * is therefore the order given, whatever the column count it is later displayed at: a stack
 * built in a one-column view comes back in that order on a phone, and spread across its
 * columns on a desktop. Used by writeBack() to carry an edit made at a reflowed, narrower width
 * back to canonical coordinates, where only the order of the blocks - never a column - can have
 * been the user's intent.
 */
export const packByColumn = (items: LayoutItem[], columnCount: number): LayoutItem[] => {
    const occupied = new Set<string>();
    let previous: LayoutItem | null = null;
    return items.map(item => {
        const columns = Math.min(item.columns, columnCount);
        const column = Math.max(0, Math.min(item.column, columnCount - columns));
        let floor = 0;
        if (previous !== null) {
            floor = column > previous.column ? previous.row : previous.row + 1;
        }
        let placed: LayoutItem | null = null;
        for (let row = floor; row < 10000 && !placed; row++) {
            if (fits(occupied, column, row, columns, item.rows)) {
                placed = {...item, column, row, columns};
            }
        }
        if (!placed) {
            throw new Error('Unable to place dashboard block.');
        }
        occupy(occupied, placed);
        previous = placed;
        return placed;
    });
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
 * How far left the whole canonical layout must shift to fit a narrower column count without
 * reflowing any block: 0 when it already fits, a positive number when only empty margin columns
 * need clipping, or null when real content would overflow and a block-by-block reflow is needed.
 * This is the single decision packLayout() and writeBack() share, so that an edit made at a
 * narrower width is mapped back to canonical coordinates by exactly the rule that produced the
 * on-screen layout it was made on.
 */
export const fitShift = (items: LayoutItem[], columnCount: number): number | null => {
    if (items.length === 0) {
        return 0;
    }
    const minColumn = Math.min(...items.map(item => item.column));
    const maxColumn = Math.max(...items.map(item => item.column + item.columns));
    if (maxColumn > columnCount && maxColumn - minColumn > columnCount) {
        return null;
    }
    return Math.max(0, maxColumn - columnCount);
};

/**
 * When every block's existing column span already fits inside a narrower column count, keep
 * every block's row/column exactly as-is (if it already fits) or shift the whole layout left by
 * only as much as needed to bring it back in bounds, rather than reflowing block-by-block. This
 * keeps blocks in place (relative to each other) when a narrower breakpoint only clips empty
 * margin columns, and falls through to full reflow only once real content would overflow.
 */
const shiftToFit = (items: LayoutItem[], columnCount: number): LayoutItem[] | null => {
    const shift = fitShift(items, columnCount);
    if (shift === null) {
        return null;
    }
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
 * Slide a rect rightwards, in its own row, to the nearest free columns.
 */
const pushRight = (rect: GridRect, occupied: Set<string>, columnCount: number): GridRect | null => {
    for (let column = rect.column + 1; column + rect.columns <= columnCount; column++) {
        if (fits(occupied, column, rect.row, rect.columns, rect.rows)) {
            return {...rect, column};
        }
    }
    return null;
};

/**
 * Slide a rect leftwards, in its own row, to the nearest free columns.
 */
const pushLeft = (rect: GridRect, occupied: Set<string>): GridRect | null => {
    for (let column = rect.column - 1; column >= 0; column--) {
        if (fits(occupied, column, rect.row, rect.columns, rect.rows)) {
            return {...rect, column};
        }
    }
    return null;
};

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
 * Slide a rect upwards, in its own column, to the nearest free rows.
 */
const pushUp = (rect: GridRect, occupied: Set<string>): GridRect | null => {
    for (let row = rect.row - 1; row >= 0; row--) {
        if (fits(occupied, rect.column, row, rect.columns, rect.rows)) {
            return {...rect, row};
        }
    }
    return null;
};

/**
 * Displace a colliding rect towards the empty grid space the collision came from, rather than
 * relocating it to the first free cell in reading order. A block sharing a row with whatever it
 * collided with slides sideways - to the right if there is room, else to the left, which is where
 * a block that was just moved or widened towards it came from, so the two effectively swap
 * places - and only then down. A block sharing a column is pushed down, or failing that up into
 * the space the other block vacated.
 */
const displaceFromBlocker = (
    rect: GridRect,
    blocker: GridRect,
    occupied: Set<string>,
    columnCount: number,
): GridRect | null => {
    const sameRow = rect.row === blocker.row;
    const sameColumn = rect.column === blocker.column;
    if (sameColumn && !sameRow) {
        return pushDown(rect, occupied) ?? pushUp(rect, occupied) ?? pushRight(rect, occupied, columnCount);
    }
    if (sameRow) {
        return pushRight(rect, occupied, columnCount) ?? pushLeft(rect, occupied) ?? pushDown(rect, occupied);
    }
    return null;
};

/**
 * The largest rectangle, no bigger than `rect`, that fits the free space at rect's own
 * column/row - trying the full width first and shrinking the width before the height, down to
 * the grid's minimum tile size - or null when not even the minimum fits there.
 *
 * Used when a block is added into a specific empty cell: sizing it to the room that is actually
 * there means nothing else has to move to make way for it, which is what clicking an empty
 * cell asks for. When the hole is smaller than the minimum tile, the caller falls back to pinning
 * the block at its default size and letting its neighbours be displaced.
 *
 * @param items The layout the rectangle must fit into, at `columnCount` columns.
 * @param columnCount The current responsive column count.
 * @param rect The rectangle wanted: its origin is kept, its size is the most it may take.
 * @param limits The grid's bounds.
 */
export const fitToFreeSpace = (
    items: LayoutItem[],
    columnCount: number,
    rect: GridRect,
    limits: GridLimits = DEFAULT_LIMITS,
): GridRect | null => {
    const occupied = new Set<string>();
    items.forEach(item => occupy(occupied, item));
    const widest = Math.min(rect.columns, columnCount - rect.column);
    const tallest = Math.min(rect.rows, limits.maxrows - rect.row);
    for (let columns = widest; columns >= limits.mincolumns; columns--) {
        for (let rows = tallest; rows >= limits.minrows; rows--) {
            if (fits(occupied, rect.column, rect.row, columns, rows)) {
                return {...rect, columns, rows};
            }
        }
    }
    return null;
};

/**
 * Fall back to the first free cell in reading order, used when directional displacement finds
 * no room in either direction.
 */
const firstFreeCell = (rect: GridRect, occupied: Set<string>, columnCount: number): GridRect | null => {
    for (let row = 0; row < 10000; row++) {
        for (let column = 0; column + rect.columns <= columnCount; column++) {
            if (fits(occupied, column, row, rect.columns, rect.rows)) {
                return {...rect, column, row};
            }
        }
    }
    return null;
};

export const packWithPinned = (
    items: LayoutItem[],
    columnCount: number,
    pinned: LayoutItem,
    limits: GridLimits = DEFAULT_LIMITS,
): LayoutItem[] => {
    const safePinned = clampToGrid(pinned, columnCount, limits);
    const occupied = new Set<string>();
    occupy(occupied, safePinned);
    const result: LayoutItem[] = [safePinned];
    const remaining = items
        .filter(item => item.id !== pinned.id)
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id);
    for (const item of remaining) {
        const columns = Math.min(item.columns, columnCount);
        const column = Math.max(0, Math.min(item.column, columnCount - columns));
        const row = Math.max(0, item.row);
        const rect: GridRect = {column, row, columns, rows: item.rows};
        let placed: LayoutItem | null = null;
        if (fits(occupied, column, row, columns, item.rows)) {
            placed = {...item, column, row, columns};
        } else {
            const blocker = result.find(candidate => rectsOverlap(rect, candidate));
            const resolved = (blocker && displaceFromBlocker(rect, blocker, occupied, columnCount))
                ?? firstFreeCell(rect, occupied, columnCount);
            if (resolved) {
                placed = {...item, column: resolved.column, row: resolved.row, columns};
            }
        }
        if (!placed) {
            throw new Error('Unable to place dashboard block.');
        }
        occupy(occupied, placed);
        result.push(placed);
    }
    return result;
};

/**
 * Turn a `derived` layout - produced by packLayout()/packWithPinned() at the current, possibly
 * narrowed, responsive column count - back into a canonical layout safe to persist at the full
 * MAX_COLUMNS width the server always stores.
 *
 * Column spans that packLayout() narrowed for display are restored from `sourceColumns` (falling
 * back to the item's width in the previous canonical layout, or its current width as a last
 * resort). The item the caller is actively editing (`pinnedId`) keeps its new width only when
 * the user actually changed it - a resize - and otherwise gets its canonical width back too, so
 * that moving a block in a one-column view never shrinks it to one column on a wide screen.
 *
 * How the positions map back depends on how the on-screen layout was produced from the
 * canonical one (see fitShift()):
 *
 * - When the canonical layout fitted the display width up to a constant shift (only empty
 *   margin columns were clipped), display coordinates are canonical coordinates minus that
 *   shift, so every item is shifted back and the set is re-packed at full width - around the
 *   pinned item if there is one (packWithPinned, so the rest of the layout displaces around it
 *   exactly as it did on-screen), or in reading order if not (packInOrder, e.g. after a remove).
 * - When the display was a genuine reflow (blocks were clamped and restacked, as in a one- or
 *   two-column view), display coordinates mean nothing at full width: the narrow stack must not
 *   be persisted as the wide layout. Every item instead returns to its canonical column, and the
 *   derived reading order - the only thing a narrow-width move or resize can have changed for
 *   the other blocks - is re-packed column by column in that order (packByColumn), so the stack
 *   the user built is the stack they get back at that width, and each block keeps its column at
 *   full width. A block the user dragged sideways is the exception: it takes the column it was
 *   put in on-screen (the narrow view shows the left part of the full-width grid, so a column
 *   there is a column at full width too), as it would be perverse for a drag to the right to
 *   save the block back on the left. A block only moved up or down, or resized, keeps its
 *   canonical column, since the narrow view may have had to pull it in from a column it cannot
 *   show at all. Deliberate vertical gaps in the canonical layout are
 *   compacted by this, and honouring the new order can open small gaps at full width; both are
 *   the price of a narrow-width edit remaining faithful on the screen it was made on.
 *
 * @param canonical The layout before the edit, at full width.
 * @param derived The layout after the edit, at `columnCount` columns.
 * @param pinnedId The item being moved or resized, if any.
 * @param limits The grid's bounds.
 * @param columnCount The responsive column count `derived` was produced at; defaults to full width.
 */
export const writeBack = (
    canonical: LayoutItem[],
    derived: LayoutItem[],
    pinnedId?: number,
    limits: GridLimits = DEFAULT_LIMITS,
    columnCount: number = limits.maxcolumns,
): LayoutItem[] => {
    const original = new Map(canonical.map(item => [item.id, item]));
    const canonicalColumns = (item: LayoutItem): number =>
        item.sourceColumns ?? original.get(item.id)?.columns ?? item.columns;
    const ordered = [...derived]
        .sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id);
    const shift = fitShift(canonical, columnCount);
    let packed: LayoutItem[];
    if (shift !== null) {
        const restored = ordered.map(item => ({
            ...item,
            column: item.column + shift,
            columns: item.id === pinnedId ? item.columns : canonicalColumns(item),
            sourceColumns: undefined,
        }));
        const pinned = restored.find(item => item.id === pinnedId);
        packed = pinned
            ? packWithPinned(restored, limits.maxcolumns, pinned, limits)
            : packInOrder(restored, limits.maxcolumns);
    } else {
        const shownBefore = new Map(packLayout(canonical, columnCount).map(item => [item.id, item.column]));
        const restored = ordered.map(item => {
            const columns = canonicalColumns(item);
            const resized = item.id === pinnedId && item.columns !== Math.min(columns, columnCount);
            const width = resized ? item.columns : columns;
            const movedSideways = item.id === pinnedId && shownBefore.get(item.id) !== item.column;
            return {
                ...item,
                column: movedSideways
                    ? Math.max(0, Math.min(limits.maxcolumns - width, item.column))
                    : original.get(item.id)?.column ?? item.column,
                columns: width,
                sourceColumns: undefined,
            };
        });
        packed = packByColumn(restored, limits.maxcolumns);
    }
    return packed.map(item => ({
        id: item.id,
        column: item.column,
        row: item.row,
        columns: item.columns,
        rows: item.rows,
    }));
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
