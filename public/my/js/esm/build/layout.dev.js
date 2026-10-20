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
const SIX_COLUMN_THRESHOLD = 1600;
const FOUR_COLUMN_THRESHOLD = 920;
const TWO_COLUMN_THRESHOLD = 690;
const fitMinimum = /* @__PURE__ */ __name((minimum, columnCount) => ({
  columns: Math.max(1, Math.min(minimum.columns, columnCount)),
  rows: minimum.rows
}), "fitMinimum");
const FALLBACK_GRID_METRICS = { rowHeight: 96, gap: 16 };
const readGridMetrics = /* @__PURE__ */ __name((grid) => {
  if (!grid) {
    return FALLBACK_GRID_METRICS;
  }
  const style = window.getComputedStyle(grid);
  const rowHeight = parseFloat(style.gridAutoRows);
  const gap = parseFloat(style.rowGap);
  return {
    rowHeight: Number.isFinite(rowHeight) && rowHeight > 0 ? rowHeight : FALLBACK_GRID_METRICS.rowHeight,
    gap: Number.isFinite(gap) && gap >= 0 ? gap : FALLBACK_GRID_METRICS.gap
  };
}, "readGridMetrics");
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
const shiftToFit = /* @__PURE__ */ __name((items, columnCount) => {
  if (items.length === 0) {
    return items;
  }
  const minColumn = Math.min(...items.map((item) => item.column));
  const maxColumn = Math.max(...items.map((item) => item.column + item.columns));
  if (maxColumn > columnCount && maxColumn - minColumn > columnCount) {
    return null;
  }
  const shift = Math.max(0, maxColumn - columnCount);
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
const pushDown = /* @__PURE__ */ __name((rect, occupied) => {
  for (let row = rect.row + 1; row < 1e4; row++) {
    if (fits(occupied, rect.column, row, rect.columns, rect.rows)) {
      return { ...rect, row };
    }
  }
  return null;
}, "pushDown");
const displaceFromBlocker = /* @__PURE__ */ __name((rect, blocker, occupied, columnCount) => {
  const column = blocker.column + blocker.columns;
  if (rect.row <= blocker.row && column + rect.columns <= columnCount && fits(occupied, column, rect.row, rect.columns, rect.rows)) {
    return { ...rect, column };
  }
  return pushDown(rect, occupied);
}, "displaceFromBlocker");
const packWithPinned = /* @__PURE__ */ __name((items, columnCount, pinned, minimum = { columns: 1, rows: 1 }) => {
  const columns = Math.min(Math.max(minimum.columns, pinned.columns), columnCount);
  const safePinned = {
    ...pinned,
    column: Math.max(0, Math.min(pinned.column, columnCount - columns)),
    row: Math.max(0, pinned.row),
    columns,
    rows: Math.max(minimum.rows, pinned.rows)
  };
  const occupied = /* @__PURE__ */ new Set();
  occupy(occupied, safePinned);
  const result = [safePinned];
  const clamped = items.filter((item) => item.id !== pinned.id).sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).map((item) => {
    const columns2 = Math.min(item.columns, columnCount);
    return {
      ...item,
      column: Math.max(0, Math.min(item.column, columnCount - columns2)),
      row: Math.max(0, item.row),
      columns: columns2
    };
  });
  const displaced = [];
  for (const item of clamped) {
    if (fits(occupied, item.column, item.row, item.columns, item.rows)) {
      occupy(occupied, item);
      result.push(item);
    } else {
      displaced.push(item);
    }
  }
  for (const item of displaced) {
    const blocker = result.find((candidate) => rectsOverlap(item, candidate)) ?? safePinned;
    const resolved = displaceFromBlocker(item, blocker, occupied, columnCount);
    const placed = { ...item, column: resolved.column, row: resolved.row };
    occupy(occupied, placed);
    result.push(placed);
  }
  return result;
}, "packWithPinned");
const stepDraft = /* @__PURE__ */ __name((draft, mode, horizontal, vertical, columnCount, minimum) => {
  if (mode === "move") {
    const column = draft.column + horizontal;
    const row = draft.row + vertical;
    if (column < 0 || column + draft.columns > columnCount || row < 0) {
      return { blocker: "edge" };
    }
    return { draft: { ...draft, column, row } };
  }
  const columns = draft.columns + horizontal;
  const rows = draft.rows + vertical;
  if (columns < minimum.columns || rows < minimum.rows) {
    return { blocker: "minimum" };
  }
  if (draft.column + columns > columnCount) {
    return { blocker: "edge" };
  }
  return { draft: { ...draft, columns, rows } };
}, "stepDraft");
const riseToFill = /* @__PURE__ */ __name((items) => {
  if (items.length === 0) {
    return items;
  }
  const occupied = /* @__PURE__ */ new Set();
  const placed = /* @__PURE__ */ new Map();
  let moved = false;
  [...items].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).forEach((item) => {
    let row = Math.max(0, item.row);
    while (row > 0 && fits(occupied, item.column, row - 1, item.columns, item.rows)) {
      row--;
    }
    const next = row === item.row ? item : { ...item, row };
    if (next !== item) {
      moved = true;
    }
    occupy(occupied, next);
    placed.set(item.id, next);
  });
  if (!moved) {
    return items;
  }
  return items.map((item) => placed.get(item.id) ?? item);
}, "riseToFill");
const writeBack = /* @__PURE__ */ __name((canonical, derived, pinnedId, minimum) => {
  const original = new Map(canonical.map((item) => [item.id, item]));
  const restored = [...derived].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).map((item) => ({
    ...item,
    columns: item.id === pinnedId ? item.columns : item.sourceColumns ?? original.get(item.id)?.columns ?? item.columns,
    sourceColumns: void 0
  }));
  const pinned = restored.find((item) => item.id === pinnedId);
  const packed = pinned ? packWithPinned(restored, MAX_COLUMNS, pinned, minimum) : packInOrder(restored, MAX_COLUMNS);
  return riseToFill(packed).map((item) => ({
    id: item.id,
    column: item.column,
    row: item.row,
    columns: item.columns,
    rows: item.rows,
    autorows: item.autorows ?? true
  }));
}, "writeBack");
const collapseEmptyRows = /* @__PURE__ */ __name((items) => {
  const rows = maxRow(items);
  const shift = [];
  let empty = 0;
  for (let row = 0; row < rows; row++) {
    shift.push(empty);
    if (!items.some((item) => row >= item.row && row < item.row + item.rows)) {
      empty++;
    }
  }
  if (empty === 0 || items.every((item) => !shift[item.row])) {
    return items;
  }
  return items.map((item) => shift[item.row] ? { ...item, row: item.row - shift[item.row] } : item);
}, "collapseEmptyRows");
const firstFreeSpace = /* @__PURE__ */ __name((items, columnCount, columns, rows) => {
  const width = Math.min(columns, columnCount);
  const occupied = /* @__PURE__ */ new Set();
  items.forEach((item) => occupy(occupied, item));
  for (let row = 0; ; row++) {
    for (let column = 0; column + width <= columnCount; column++) {
      if (fits(occupied, column, row, width, rows)) {
        return { column, row };
      }
    }
  }
}, "firstFreeSpace");
const emptyRegions = /* @__PURE__ */ __name((items, columnCount, rowCount) => {
  const taken = /* @__PURE__ */ new Set();
  items.forEach((item) => occupy(taken, item));
  const regions = [];
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
      const region = { column, row, columns, rows };
      occupy(taken, { id: -1, ...region });
      regions.push(region);
    }
  }
  return regions;
}, "emptyRegions");
const disturbedCount = /* @__PURE__ */ __name((before, after, activeId) => {
  const positions = new Map(before.map((item) => [item.id, `${item.column}:${item.row}`]));
  return after.filter((item) => item.id !== activeId && positions.get(item.id) !== `${item.column}:${item.row}`).length;
}, "disturbedCount");
const maxRow = /* @__PURE__ */ __name((items) => items.reduce(
  (maximum, item) => Math.max(maximum, item.row + item.rows),
  0
), "maxRow");
const AUTO_ROWS_CAP = 8;
const rowsForHeight = /* @__PURE__ */ __name((height, metrics, minimumRows, cap = AUTO_ROWS_CAP) => {
  const fitted = Math.ceil((Math.max(0, height) + metrics.gap) / (metrics.rowHeight + metrics.gap));
  return Math.max(minimumRows, Math.min(cap, fitted));
}, "rowsForHeight");
const applyRowSpans = /* @__PURE__ */ __name((layout, rows) => {
  if (!layout.some((item) => rows.has(item.id) && rows.get(item.id) !== item.rows)) {
    return layout;
  }
  const occupied = /* @__PURE__ */ new Set();
  return [...layout].sort((left, right) => left.row - right.row || left.column - right.column || left.id - right.id).map((item) => {
    const placed = { ...item, rows: rows.get(item.id) ?? item.rows };
    while (!fits(occupied, placed.column, placed.row, placed.columns, placed.rows)) {
      placed.row++;
    }
    occupy(occupied, placed);
    return placed;
  });
}, "applyRowSpans");
const measureNaturalHeight = /* @__PURE__ */ __name((tile) => {
  const content = tile.querySelector(".core-my-dashboard-tile__content");
  if (!content) {
    return 0;
  }
  const contentStyle = window.getComputedStyle(content);
  const top = content.getBoundingClientRect().top + (parseFloat(contentStyle.paddingTop) || 0);
  let bottom = top;
  Array.from(content.children).forEach((child) => {
    const margin = parseFloat(window.getComputedStyle(child).marginBottom) || 0;
    bottom = Math.max(bottom, child.getBoundingClientRect().bottom + margin);
  });
  const contentHeight = bottom - top + (parseFloat(contentStyle.paddingTop) || 0) + (parseFloat(contentStyle.paddingBottom) || 0);
  const tileStyle = window.getComputedStyle(tile);
  const chrome = Array.from(tile.children).filter((child) => child !== content && window.getComputedStyle(child).position !== "absolute").reduce((total, child) => total + child.getBoundingClientRect().height, 0);
  return Math.ceil(contentHeight + chrome + (parseFloat(tileStyle.borderTopWidth) || 0) + (parseFloat(tileStyle.borderBottomWidth) || 0));
}, "measureNaturalHeight");
export {
  AUTO_ROWS_CAP,
  FOUR_COLUMN_THRESHOLD,
  MAX_COLUMNS,
  NARROW_BLOCK_WIDTH,
  SIX_COLUMN_THRESHOLD,
  TWO_COLUMN_THRESHOLD,
  applyRowSpans,
  collapseEmptyRows,
  columnsForWidth,
  disturbedCount,
  emptyRegions,
  firstFreeSpace,
  fitMinimum,
  maxRow,
  measureNaturalHeight,
  packInOrder,
  packLayout,
  packWithPinned,
  readGridMetrics,
  riseToFill,
  rowsForHeight,
  stepDraft,
  writeBack
};
//# sourceMappingURL=layout.dev.js.map
