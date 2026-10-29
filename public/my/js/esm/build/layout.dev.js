var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Pure responsive dashboard layout helpers.
 *
 * @module     core_my/layout
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const MAX_COLUMNS = 6;
const MAX_ROWS = 500;
const SIX_COLUMN_THRESHOLD = 1921;
const FOUR_COLUMN_THRESHOLD = 920;
const TWO_COLUMN_THRESHOLD = 690;
const ROW_HEIGHT = 96;
const GRID_GAP = 16;
const MIN_COLUMNS = 1;
const MIN_ROWS = 2;
const DEFAULT_LIMITS = {
  mincolumns: MIN_COLUMNS,
  minrows: MIN_ROWS,
  maxcolumns: MAX_COLUMNS,
  maxrows: MAX_ROWS
};
const clampToGrid = /* @__PURE__ */ __name((rect, columnCount, limits) => {
  const columns = Math.max(limits.mincolumns, Math.min(columnCount, rect.columns));
  const rows = Math.max(limits.minrows, Math.min(limits.maxrows, rect.rows));
  return {
    ...rect,
    columns,
    rows,
    column: Math.max(0, Math.min(columnCount - columns, rect.column)),
    row: Math.max(0, Math.min(limits.maxrows - rows, rect.row))
  };
}, "clampToGrid");
const NARROW_BLOCK_WIDTH = 480;
const columnsForWidth = /* @__PURE__ */ __name((width) => {
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
}, "columnsForWidth");
const fits = /* @__PURE__ */ __name((occupied, column, row, columns, rows) => {
  for (let y = row; y < row + rows; y++) {
    for (let x = column; x < column + columns; x++) {
      if (occupied.has(`${x}:${y}`)) {
        return false;
      }
    }
  }
  return true;
}, "fits");
const occupy = /* @__PURE__ */ __name((occupied, item) => {
  for (let y = item.row; y < item.row + item.rows; y++) {
    for (let x = item.column; x < item.column + item.columns; x++) {
      occupied.add(`${x}:${y}`);
    }
  }
}, "occupy");
const packByColumn = /* @__PURE__ */ __name((items, columnCount) => {
  const occupied = /* @__PURE__ */ new Set();
  let previous = null;
  return items.map((item) => {
    const columns = Math.min(item.columns, columnCount);
    const column = Math.max(0, Math.min(item.column, columnCount - columns));
    let floor = 0;
    if (previous !== null) {
      floor = column > previous.column ? previous.row : previous.row + 1;
    }
    let placed = null;
    for (let row = floor; row < 1e4 && !placed; row++) {
      if (fits(occupied, column, row, columns, item.rows)) {
        placed = { ...item, column, row, columns };
      }
    }
    if (!placed) {
      throw new Error("Unable to place dashboard block.");
    }
    occupy(occupied, placed);
    previous = placed;
    return placed;
  });
}, "packByColumn");
const packInOrder = /* @__PURE__ */ __name((items, columnCount) => {
  const occupied = /* @__PURE__ */ new Set();
  return items.map((item) => {
    const columns = Math.min(item.columns, columnCount);
    let placed = null;
    for (let row = 0; row < 1e4 && !placed; row++) {
      for (let column = 0; column + columns <= columnCount; column++) {
        if (fits(occupied, column, row, columns, item.rows)) {
          placed = {
            ...item,
            column,
            row,
            columns,
            sourceColumns: item.sourceColumns ?? item.columns
          };
          break;
        }
      }
    }
    if (!placed) {
      throw new Error("Unable to place dashboard block.");
    }
    occupy(occupied, placed);
    return placed;
  });
}, "packInOrder");
const fitShift = /* @__PURE__ */ __name((items, columnCount) => {
  if (items.length === 0) {
    return 0;
  }
  const minColumn = Math.min(...items.map((item) => item.column));
  const maxColumn = Math.max(...items.map((item) => item.column + item.columns));
  if (maxColumn > columnCount && maxColumn - minColumn > columnCount) {
    return null;
  }
  return Math.max(0, maxColumn - columnCount);
}, "fitShift");
const shiftToFit = /* @__PURE__ */ __name((items, columnCount) => {
  const shift = fitShift(items, columnCount);
  if (shift === null) {
    return null;
  }
  return [...items].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).map((item) => ({ ...item, column: item.column - shift, sourceColumns: item.sourceColumns ?? item.columns }));
}, "shiftToFit");
const packLayout = /* @__PURE__ */ __name((items, columnCount) => {
  const shifted = shiftToFit(items, columnCount);
  if (shifted) {
    return shifted;
  }
  const occupied = /* @__PURE__ */ new Set();
  return [...items].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).map((item) => {
    const columns = Math.min(item.columns, columnCount);
    const column = Math.max(0, Math.min(item.column, columnCount - columns));
    const row = Math.max(0, item.row);
    let placed = null;
    if (fits(occupied, column, row, columns, item.rows)) {
      placed = { ...item, column, row, columns, sourceColumns: item.sourceColumns ?? item.columns };
    } else {
      for (let nextrow = 0; nextrow < 1e4 && !placed; nextrow++) {
        for (let nextcolumn = 0; nextcolumn + columns <= columnCount; nextcolumn++) {
          if (fits(occupied, nextcolumn, nextrow, columns, item.rows)) {
            placed = {
              ...item,
              column: nextcolumn,
              row: nextrow,
              columns,
              sourceColumns: item.sourceColumns ?? item.columns
            };
            break;
          }
        }
      }
    }
    if (!placed) {
      throw new Error("Unable to place dashboard block.");
    }
    occupy(occupied, placed);
    return placed;
  });
}, "packLayout");
const rectsOverlap = /* @__PURE__ */ __name((left, right) => left.column < right.column + right.columns && left.column + left.columns > right.column && left.row < right.row + right.rows && left.row + left.rows > right.row, "rectsOverlap");
const pushRight = /* @__PURE__ */ __name((rect, occupied, columnCount) => {
  for (let column = rect.column + 1; column + rect.columns <= columnCount; column++) {
    if (fits(occupied, column, rect.row, rect.columns, rect.rows)) {
      return { ...rect, column };
    }
  }
  return null;
}, "pushRight");
const pushLeft = /* @__PURE__ */ __name((rect, occupied) => {
  for (let column = rect.column - 1; column >= 0; column--) {
    if (fits(occupied, column, rect.row, rect.columns, rect.rows)) {
      return { ...rect, column };
    }
  }
  return null;
}, "pushLeft");
const pushDown = /* @__PURE__ */ __name((rect, occupied) => {
  for (let row = rect.row + 1; row < 1e4; row++) {
    if (fits(occupied, rect.column, row, rect.columns, rect.rows)) {
      return { ...rect, row };
    }
  }
  return null;
}, "pushDown");
const pushUp = /* @__PURE__ */ __name((rect, occupied) => {
  for (let row = rect.row - 1; row >= 0; row--) {
    if (fits(occupied, rect.column, row, rect.columns, rect.rows)) {
      return { ...rect, row };
    }
  }
  return null;
}, "pushUp");
const displaceFromBlocker = /* @__PURE__ */ __name((rect, blocker, occupied, columnCount) => {
  const sameRow = rect.row === blocker.row;
  const sameColumn = rect.column === blocker.column;
  if (sameColumn && !sameRow) {
    return pushDown(rect, occupied) ?? pushUp(rect, occupied) ?? pushRight(rect, occupied, columnCount);
  }
  if (sameRow) {
    return pushRight(rect, occupied, columnCount) ?? pushLeft(rect, occupied) ?? pushDown(rect, occupied);
  }
  return null;
}, "displaceFromBlocker");
const fitToFreeSpace = /* @__PURE__ */ __name((items, columnCount, rect, limits = DEFAULT_LIMITS) => {
  const occupied = /* @__PURE__ */ new Set();
  items.forEach((item) => occupy(occupied, item));
  const widest = Math.min(rect.columns, columnCount - rect.column);
  const tallest = Math.min(rect.rows, limits.maxrows - rect.row);
  for (let columns = widest; columns >= limits.mincolumns; columns--) {
    for (let rows = tallest; rows >= limits.minrows; rows--) {
      if (fits(occupied, rect.column, rect.row, columns, rows)) {
        return { ...rect, columns, rows };
      }
    }
  }
  return null;
}, "fitToFreeSpace");
const firstFreeCell = /* @__PURE__ */ __name((rect, occupied, columnCount) => {
  for (let row = 0; row < 1e4; row++) {
    for (let column = 0; column + rect.columns <= columnCount; column++) {
      if (fits(occupied, column, row, rect.columns, rect.rows)) {
        return { ...rect, column, row };
      }
    }
  }
  return null;
}, "firstFreeCell");
const packWithPinned = /* @__PURE__ */ __name((items, columnCount, pinned, limits = DEFAULT_LIMITS) => {
  const safePinned = clampToGrid(pinned, columnCount, limits);
  const occupied = /* @__PURE__ */ new Set();
  occupy(occupied, safePinned);
  const result = [safePinned];
  const remaining = items.filter((item) => item.id !== pinned.id).sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id);
  for (const item of remaining) {
    const columns = Math.min(item.columns, columnCount);
    const column = Math.max(0, Math.min(item.column, columnCount - columns));
    const row = Math.max(0, item.row);
    const rect = { column, row, columns, rows: item.rows };
    let placed = null;
    if (fits(occupied, column, row, columns, item.rows)) {
      placed = { ...item, column, row, columns };
    } else {
      const blocker = result.find((candidate) => rectsOverlap(rect, candidate));
      const resolved = (blocker && displaceFromBlocker(rect, blocker, occupied, columnCount)) ?? firstFreeCell(rect, occupied, columnCount);
      if (resolved) {
        placed = { ...item, column: resolved.column, row: resolved.row, columns };
      }
    }
    if (!placed) {
      throw new Error("Unable to place dashboard block.");
    }
    occupy(occupied, placed);
    result.push(placed);
  }
  return result;
}, "packWithPinned");
const writeBack = /* @__PURE__ */ __name((canonical, derived, pinnedId, limits = DEFAULT_LIMITS, columnCount = limits.maxcolumns) => {
  const original = new Map(canonical.map((item) => [item.id, item]));
  const canonicalColumns = /* @__PURE__ */ __name((item) => item.sourceColumns ?? original.get(item.id)?.columns ?? item.columns, "canonicalColumns");
  const ordered = [...derived].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id);
  const shift = fitShift(canonical, columnCount);
  let packed;
  if (shift !== null) {
    const restored = ordered.map((item) => ({
      ...item,
      column: item.column + shift,
      columns: item.id === pinnedId ? item.columns : canonicalColumns(item),
      sourceColumns: void 0
    }));
    const pinned = restored.find((item) => item.id === pinnedId);
    packed = pinned ? packWithPinned(restored, limits.maxcolumns, pinned, limits) : packInOrder(restored, limits.maxcolumns);
  } else {
    const shownBefore = new Map(packLayout(canonical, columnCount).map((item) => [item.id, item.column]));
    const restored = ordered.map((item) => {
      const columns = canonicalColumns(item);
      const resized = item.id === pinnedId && item.columns !== Math.min(columns, columnCount);
      const width = resized ? item.columns : columns;
      const movedSideways = item.id === pinnedId && shownBefore.get(item.id) !== item.column;
      return {
        ...item,
        column: movedSideways ? Math.max(0, Math.min(limits.maxcolumns - width, item.column)) : original.get(item.id)?.column ?? item.column,
        columns: width,
        sourceColumns: void 0
      };
    });
    packed = packByColumn(restored, limits.maxcolumns);
  }
  return packed.map((item) => ({
    id: item.id,
    column: item.column,
    row: item.row,
    columns: item.columns,
    rows: item.rows
  }));
}, "writeBack");
const disturbedCount = /* @__PURE__ */ __name((before, after, activeId) => {
  const positions = new Map(before.map((item) => [item.id, `${item.column}:${item.row}`]));
  return after.filter((item) => item.id !== activeId && positions.get(item.id) !== `${item.column}:${item.row}`).length;
}, "disturbedCount");
const maxRow = /* @__PURE__ */ __name((items) => items.reduce(
  (maximum, item) => Math.max(maximum, item.row + item.rows),
  0
), "maxRow");
export {
  DEFAULT_LIMITS,
  FOUR_COLUMN_THRESHOLD,
  GRID_GAP,
  MAX_COLUMNS,
  MAX_ROWS,
  MIN_COLUMNS,
  MIN_ROWS,
  NARROW_BLOCK_WIDTH,
  ROW_HEIGHT,
  SIX_COLUMN_THRESHOLD,
  TWO_COLUMN_THRESHOLD,
  clampToGrid,
  columnsForWidth,
  disturbedCount,
  fitShift,
  fitToFreeSpace,
  maxRow,
  packByColumn,
  packInOrder,
  packLayout,
  packWithPinned,
  writeBack
};
//# sourceMappingURL=layout.dev.js.map
