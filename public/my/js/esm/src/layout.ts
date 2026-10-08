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
export const SIX_COLUMN_THRESHOLD = 1921;
export const FOUR_COLUMN_THRESHOLD = 920;
export const TWO_COLUMN_THRESHOLD = 690;

/** A size on the grid, in whole columns and rows. */
export interface GridSize {
    columns: number;
    rows: number;
}

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

interface GridRect {
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
 * Displace a colliding rect towards the empty grid space the collision came from, rather than
 * relocating it to the first free cell in reading order. A block sharing a row with whatever it
 * collided with is pushed right; a block sharing a column is pushed down.
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
        return pushDown(rect, occupied) ?? pushRight(rect, occupied, columnCount);
    }
    if (sameRow) {
        return pushRight(rect, occupied, columnCount) ?? pushDown(rect, occupied);
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
