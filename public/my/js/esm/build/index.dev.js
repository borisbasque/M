var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Flexible responsive dashboard React application.
 *
 * @module     core_my/index
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@moodlehq/design-system";
import { getString } from "@moodle/lms/core/stringUtils";
import { fetchOne, isMoodleAjaxError } from "@moodle/lms/core/ajax";
import config from "@moodle/lms/core/config";
import { requireManyAsync } from "@moodle/lms/core/amd";
import Pending from "@moodle/lms/core/pending";
import DashboardTile, { LANDING_ANIMATION_MS } from "./components/DashboardTile";
import DashboardEditBar from "./components/DashboardEditBar";
import AddBlocksDialog from "./components/AddBlocksDialog";
import ConfirmationDialog from "./components/ConfirmationDialog";
import Icon from "./components/Icon";
import GridCell from "./components/GridCell";
import DashboardLoading from "./components/DashboardLoading";
import DashboardEmpty from "./components/DashboardEmpty";
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
  writeBack
} from "./layout";
import {
  getDashboard,
  updateDashboard
} from "./repository";
import { useDashboardLabels } from "./strings";
import { openAddBlockForm } from "./addBlockModal";
class DashboardErrorBoundary extends React.Component {
  static {
    __name(this, "DashboardErrorBoundary");
  }
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    window.console.error("[core_my/dashboard] Rendering failed:", error);
  }
  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return /* @__PURE__ */ jsxDEV(
      Alert,
      {
        type: "danger",
        className: "core-my-dashboard-status",
        isDismissible: false,
        message: this.state.error.message,
        isActionable: Boolean(this.props.onReset && this.props.resetLabel),
        actionLabel: this.props.resetLabel,
        onAction: this.props.onReset
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 87,
        columnNumber: 16
      },
      this
    );
  }
}
const BoardCells = /* @__PURE__ */ __name(({
  rows,
  columnCount,
  layout,
  active,
  interaction,
  prospective,
  labels,
  addIcon,
  onActivate,
  onPlace
}) => {
  if (!active) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: emptyRegions(layout, columnCount, rows).map((region) => /* @__PURE__ */ jsxDEV(
      GridCell,
      {
        column: region.column,
        row: region.row,
        columns: region.columns,
        rows: region.rows,
        label: labels.addblockhere,
        addLabel: labels.addblockhere,
        addIcon,
        onActivate
      },
      `${region.column}:${region.row}`,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 148,
        columnNumber: 68
      }
    )) }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 147,
      columnNumber: 16
    });
  }
  const placing = interaction?.origin === "mouseclick";
  const footprint = prospective;
  const distance = /* @__PURE__ */ __name((column, row) => {
    if (!footprint) {
      return void 0;
    }
    const across = Math.max(footprint.column - column, column - (footprint.column + footprint.columns - 1), 0);
    const down = Math.max(footprint.row - row, row - (footprint.row + footprint.rows - 1), 0);
    return Math.max(across, down);
  }, "distance");
  return /* @__PURE__ */ jsxDEV(Fragment, { children: Array.from({ length: rows }, (_, row) => Array.from({ length: columnCount }, (__, column) => /* @__PURE__ */ jsxDEV(
    GridCell,
    {
      column,
      row,
      state: "active",
      previewDistance: distance(column, row),
      onPlace: placing ? onPlace : void 0
    },
    `${column}:${row}`,
    false,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 177,
      columnNumber: 99
    }
  ))) }, void 0, false, {
    fileName: "public/my/js/esm/src/index.tsx",
    lineNumber: 176,
    columnNumber: 12
  });
}, "BoardCells");
const EndOfGridCell = /* @__PURE__ */ __name(({ columnCount, moving, gridRows: gridRows2, prospective, label, addIcon, onActivate }) => {
  const distance = /* @__PURE__ */ __name((column) => {
    if (!prospective) {
      return void 0;
    }
    const across = Math.max(
      prospective.column - column,
      column - (prospective.column + prospective.columns - 1),
      0
    );
    return Math.max(across, gridRows2 - (prospective.row + prospective.rows - 1));
  }, "distance");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "core-my-dashboard-addblock",
      "data-region": "add-block-button",
      style: {
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gridTemplateRows: `${ROW_HEIGHT}px`
      },
      children: moving ? Array.from({ length: columnCount }, (_, column) => /* @__PURE__ */ jsxDEV(
        GridCell,
        {
          column,
          row: 0,
          state: "active",
          previewDistance: distance(column)
        },
        column,
        false,
        {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 227,
          columnNumber: 64
        }
      )) : /* @__PURE__ */ jsxDEV(
        GridCell,
        {
          column: 0,
          row: 0,
          columns: columnCount,
          label,
          addLabel: label,
          addIcon,
          hidePosition: true,
          onActivate: (_column, _row, trigger) => onActivate(trigger)
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 234,
          columnNumber: 15
        }
      )
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 218,
      columnNumber: 12
    }
  );
}, "EndOfGridCell");
const TOUCH_HOLD_MS = 300;
const TOUCH_HOLD_SLOP = 8;
const awaitTouchHold = /* @__PURE__ */ __name((event, onHold, onTap) => {
  const { pointerId, clientX: x, clientY: y } = event;
  let held = false;
  const blockScroll = /* @__PURE__ */ __name((touchEvent) => {
    if (held && touchEvent.cancelable) {
      touchEvent.preventDefault();
    }
  }, "blockScroll");
  const noMenu = /* @__PURE__ */ __name((menuEvent) => menuEvent.preventDefault(), "noMenu");
  const release = /* @__PURE__ */ __name(() => {
    window.removeEventListener("touchmove", blockScroll);
    window.removeEventListener("contextmenu", noMenu);
    window.removeEventListener("pointerup", releaseAfterHold);
    window.removeEventListener("pointercancel", releaseAfterHold);
  }, "release");
  const releaseAfterHold = /* @__PURE__ */ __name((pointerEvent) => {
    if (pointerEvent.pointerId === pointerId) {
      release();
    }
  }, "releaseAfterHold");
  const stopWaiting = /* @__PURE__ */ __name(() => {
    window.clearTimeout(timer);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", abandon);
  }, "stopWaiting");
  const abandon = /* @__PURE__ */ __name((pointerEvent) => {
    if (pointerEvent && pointerEvent.pointerId !== pointerId) {
      return;
    }
    stopWaiting();
    release();
  }, "abandon");
  const move = /* @__PURE__ */ __name((pointerEvent) => {
    if (pointerEvent.pointerId === pointerId && Math.hypot(pointerEvent.clientX - x, pointerEvent.clientY - y) >= TOUCH_HOLD_SLOP) {
      abandon();
    }
  }, "move");
  const up = /* @__PURE__ */ __name((pointerEvent) => {
    if (pointerEvent.pointerId === pointerId) {
      abandon();
      onTap();
    }
  }, "up");
  const timer = window.setTimeout(() => {
    held = true;
    stopWaiting();
    window.addEventListener("pointerup", releaseAfterHold);
    window.addEventListener("pointercancel", releaseAfterHold);
    navigator.vibrate?.(10);
    onHold(x, y);
  }, TOUCH_HOLD_MS);
  window.addEventListener("touchmove", blockScroll, { passive: false });
  window.addEventListener("contextmenu", noMenu);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", abandon);
  return () => {
    if (!held) {
      abandon();
    }
  };
}, "awaitTouchHold");
const useInteractionCursor = /* @__PURE__ */ __name((interaction) => {
  const mode = interaction?.origin === "pointer" ? interaction.mode : null;
  useEffect(() => {
    if (!mode) {
      return void 0;
    }
    const root = document.documentElement;
    root.dataset.coreMyPointer = mode;
    return () => {
      delete root.dataset.coreMyPointer;
    };
  }, [mode]);
}, "useInteractionCursor");
const UNDO_LIMIT = 20;
const DROP_FEEDBACK_MS = 1100 + LANDING_ANIMATION_MS;
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5e3;
let dashboardSettleCounter = 0;
const resolveSiteDefault = /* @__PURE__ */ __name((prop) => prop ?? window.location.pathname.endsWith("/my/indexsys.php"), "resolveSiteDefault");
const resolveLimits = /* @__PURE__ */ __name((data) => data?.limits ?? DEFAULT_LIMITS, "resolveLimits");
const DashboardPlaceholder = /* @__PURE__ */ __name(({ error, loadingLabel, initialLayout }) => error ? /* @__PURE__ */ jsxDEV(Alert, { type: "danger", className: "core-my-dashboard-status", isDismissible: false, message: error }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 406,
  columnNumber: 7
}) : /* @__PURE__ */ jsxDEV(DashboardLoading, { label: loadingLabel, layout: initialLayout }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 407,
  columnNumber: 7
}), "DashboardPlaceholder");
const describeError = /* @__PURE__ */ __name((caught) => {
  if (caught instanceof Error || isMoodleAjaxError(caught)) {
    return caught.message;
  }
  return String(caught);
}, "describeError");
const tileInteraction = /* @__PURE__ */ __name((interaction, id) => {
  const own = interaction?.id === id ? interaction : null;
  return {
    activeMode: own?.mode,
    drag: own?.drag,
    dragOrigin: own?.original,
    showControls: own?.origin === "mouseclick",
    shouldAnimatePosition: Boolean(interaction) && (interaction?.origin !== "pointer" || !own)
  };
}, "tileInteraction");
const prospectiveFor = /* @__PURE__ */ __name((interaction) => interaction?.origin === "pointer" ? interaction.draft : void 0, "prospectiveFor");
const gridRows = /* @__PURE__ */ __name((layout, interaction) => Math.max(1, maxRow(layout)) + (interaction?.mode === "move" && interaction.origin !== "keyboard" ? 1 : 0), "gridRows");
const isRtl = /* @__PURE__ */ __name((element) => Boolean(element) && getComputedStyle(element).direction === "rtl", "isRtl");
const layoutChanged = /* @__PURE__ */ __name((original, draft) => original.column !== draft.column || original.row !== draft.row || original.columns !== draft.columns || original.rows !== draft.rows, "layoutChanged");
const useCollectedBlockJavascript = /* @__PURE__ */ __name((data, gridRef) => {
  useEffect(() => {
    if (!data?.javascript) {
      return void 0;
    }
    let superseded = false;
    let settled = false;
    let quietTimer;
    let hardTimer;
    let observer;
    const pending = new Pending(`core_my/dashboard:settling:${dashboardSettleCounter++}`);
    const settle = /* @__PURE__ */ __name(() => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(quietTimer);
      clearTimeout(hardTimer);
      observer?.disconnect();
      pending.resolve();
    }, "settle");
    hardTimer = setTimeout(settle, DASHBOARD_SETTLE_TIMEOUT_MS);
    const grid = gridRef.current;
    if (grid) {
      observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(settle, DASHBOARD_SETTLE_QUIET_MS);
      });
      observer.observe(grid, { childList: true, subtree: true });
    }
    quietTimer = setTimeout(settle, DASHBOARD_SETTLE_QUIET_MS);
    void requireManyAsync(["core/fragment", "core/templates"]).then(([fragment, templates]) => {
      if (superseded) {
        return void 0;
      }
      const processed = fragment.processCollectedJavascript(data.javascript);
      templates.runTemplateJS(processed);
      return void 0;
    });
    return () => {
      superseded = true;
      settle();
    };
  }, [data]);
}, "useCollectedBlockJavascript");
const useResponsiveColumnCount = /* @__PURE__ */ __name((gridRef, mounted, data) => {
  const [columnCount, setColumnCount] = useState(1);
  const columnCountRef = useRef(1);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!mounted || !grid) {
      return void 0;
    }
    const measure = /* @__PURE__ */ __name(() => {
      const next = columnsForWidth(grid.getBoundingClientRect().width);
      columnCountRef.current = next;
      setColumnCount(next);
    }, "measure");
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    measure();
    return () => observer.disconnect();
  }, [mounted, data]);
  return [columnCount, columnCountRef];
}, "useResponsiveColumnCount");
const Dashboard = /* @__PURE__ */ __name(({
  loadingLabel = "",
  initialLayout = [],
  siteDefault: siteDefaultProp,
  pagehash = null
}) => {
  const [data, setData] = useState(null);
  const [canonical, setCanonical] = useState([]);
  const [interaction, setInteraction] = useState(null);
  useInteractionCursor(interaction);
  const [announcement, setAnnouncement] = useState("");
  const [justDropped, setJustDropped] = useState(null);
  const justDroppedTimer = useRef(void 0);
  const flagDropped = useCallback((id) => {
    window.clearTimeout(justDroppedTimer.current);
    setJustDropped({ id, key: Date.now() });
    justDroppedTimer.current = window.setTimeout(() => setJustDropped(null), DROP_FEEDBACK_MS);
  }, []);
  const clearDropped = useCallback(() => {
    window.clearTimeout(justDroppedTimer.current);
    setJustDropped(null);
  }, []);
  useEffect(() => () => window.clearTimeout(justDroppedTimer.current), []);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const gridRef = useRef(null);
  const pointerRef = useRef(null);
  const touchHoldRef = useRef(null);
  useEffect(() => () => touchHoldRef.current?.(), []);
  const interactionRef = useRef(null);
  const canonicalRef = useRef([]);
  const displayLayoutRef = useRef([]);
  const dataRef = useRef(null);
  const siteDefault = resolveSiteDefault(siteDefaultProp);
  const labels = useDashboardLabels();
  const limits = resolveLimits(data);
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const load = useCallback(async () => {
    const pending = new Pending("core_my/dashboard:load");
    try {
      const response = await getDashboard(siteDefault);
      setData(response);
      dataRef.current = response;
      setCanonical(response.layout);
      canonicalRef.current = response.layout;
      setHistory([]);
      setError("");
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
  const displayLayout = useMemo(
    () => riseToFill(packLayout(riseToFill(canonical), columnCount)),
    [canonical, columnCount]
  );
  displayLayoutRef.current = displayLayout;
  const previewLayout = useMemo(() => interaction ? packWithPinned(displayLayout, columnCount, interaction.draft, limits) : displayLayout, [columnCount, displayLayout, interaction, limits]);
  const bumpedBlockIds = useMemo(() => {
    if (interaction?.origin !== "pointer") {
      return /* @__PURE__ */ new Set();
    }
    const originalItems = new Map(displayLayout.map((item) => [item.id, item]));
    return new Set(previewLayout.filter((item) => {
      const original = originalItems.get(item.id);
      return item.id !== interaction.id && original && (item.column !== original.column || item.row !== original.row);
    }).map((item) => item.id));
  }, [displayLayout, interaction, previewLayout]);
  const blocksById = useMemo(() => new Map((data?.blocks ?? []).map((block) => [block.id, block])), [data]);
  const announce = useCallback(async (key, value) => {
    setAnnouncement(await getString(key, "my", value));
  }, []);
  const start = useCallback((id, mode, origin = "keyboard") => {
    const item = displayLayout.find((candidate) => candidate.id === id);
    const block = blocksById.get(id);
    if (!item || !block) {
      return;
    }
    const next = { id, mode, origin, original: item, draft: item, before: displayLayout };
    interactionRef.current = next;
    setInteraction(next);
    void announce(mode === "move" ? "dashboardmovebegin" : "dashboardresizebegin", block.title);
  }, [announce, blocksById, displayLayout]);
  const shift = useCallback((visualHorizontal, vertical) => {
    const current = interactionRef.current;
    if (!current) {
      return;
    }
    const horizontal = isRtl(gridRef.current) ? -visualHorizontal : visualHorizontal;
    const bounds = limitsRef.current;
    let draft = { ...current.draft };
    if (current.mode === "move") {
      draft.column += horizontal;
      draft.row += vertical;
    } else {
      const nextColumns = draft.columns + horizontal;
      const nextRows = draft.rows + vertical;
      if (nextColumns < bounds.mincolumns || nextRows < bounds.minrows) {
        void announce("dashboardminimumsize", `${bounds.mincolumns} \xD7 ${bounds.minrows}`);
        return;
      }
      draft.columns = nextColumns;
      draft.rows = nextRows;
    }
    draft = clampToGrid(draft, columnCount, bounds);
    if (!layoutChanged(current.draft, draft)) {
      if (current.mode === "move") {
        void announce("gridcellposition", { row: draft.row + 1, column: draft.column + 1 });
      }
      return;
    }
    const next = { ...current, draft };
    interactionRef.current = next;
    setInteraction(next);
    if (current.mode === "move") {
      void announce("gridcellposition", { row: draft.row + 1, column: draft.column + 1 });
    } else {
      void announce("dashboardresizesize", { columns: draft.columns, rows: draft.rows });
    }
  }, [announce, columnCount]);
  useEffect(() => {
    if (interaction?.origin !== "keyboard") {
      return;
    }
    gridRef.current?.querySelector(`.core-my-dashboard-tile[data-block-id="${interaction.id}"]`)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [interaction?.origin, interaction?.id, interaction?.draft]);
  const commit = useCallback(async () => {
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
    const landed = riseToFill(derived);
    const disturbed = disturbedCount(current.before, landed, current.id);
    const next = writeBack(currentCanonical, derived, current.id, bounds, currentColumns);
    setSaving(true);
    try {
      await updateDashboard("save", siteDefault, next);
      setHistory((previous) => [...previous, currentCanonical].slice(-UNDO_LIMIT));
      setCanonical(next);
      canonicalRef.current = next;
      const item = landed.find((candidate) => candidate.id === current.id);
      await announce(current.mode === "move" ? "dashboardmovecommitted" : "dashboardresizecommitted", {
        row: item.row + 1,
        column: item.column + 1,
        columns: item.columns,
        rows: item.rows,
        disturbed
      });
      if (current.mode === "move") {
        flagDropped(current.id);
      }
      interactionRef.current = null;
      setInteraction(null);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [announce, flagDropped, siteDefault]);
  const undo = useCallback(async () => {
    const previous = history[history.length - 1];
    if (!previous) {
      return;
    }
    setSaving(true);
    try {
      await updateDashboard("save", siteDefault, previous);
      setCanonical(previous);
      canonicalRef.current = previous;
      setHistory((current) => current.slice(0, -1));
      await announce("dashboardundone");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [announce, history, siteDefault]);
  const deleteBlock = useCallback(async (id, title) => {
    setSaving(true);
    try {
      await updateDashboard("remove", siteDefault, [], "", id);
      const response = await load();
      if (response) {
        const risen = riseToFill(response.layout);
        if (risen !== response.layout) {
          await updateDashboard("save", siteDefault, risen);
          setCanonical(risen);
          canonicalRef.current = risen;
        }
      }
      await announce("dashboardblockremoved", title);
      document.querySelector('[data-region="dashboard-edit-bar"] [data-action="add-block"]')?.focus();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [announce, load, siteDefault]);
  const cancel = useCallback(() => {
    if (interaction) {
      void announce("dashboardoperationdiscarded");
    }
    interactionRef.current = null;
    setInteraction(null);
  }, [announce, interaction]);
  const target = useCallback((column, row) => {
    const current = interactionRef.current;
    if (!current) {
      return null;
    }
    const draft = clampToGrid(current.mode === "move" ? { ...current.draft, column, row } : {
      ...current.draft,
      columns: column - current.original.column + 1,
      rows: row - current.original.row + 1
    }, columnCount, limitsRef.current);
    if (!layoutChanged(current.draft, draft)) {
      return current;
    }
    const next = { ...current, draft };
    interactionRef.current = next;
    setInteraction(next);
    return next;
  }, [columnCount]);
  const place = useCallback((column, row) => {
    if (target(column, row)) {
      void commit();
    }
  }, [commit, target]);
  const keyDown = useCallback((event, id, mode) => {
    if (!interaction && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      start(id, mode);
      return;
    }
    if (!interaction || interaction.id !== id || interaction.mode !== mode) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const directions = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      };
      shift(...directions[event.key]);
    }
  }, [cancel, commit, interaction, shift, start]);
  const beginPointerDrag = useCallback((x, y, id, mode) => {
    start(id, mode, "pointer");
    pointerRef.current = { x, y, moved: false };
    const origin = displayLayout.find((item) => item.id === id);
    if (!origin) {
      return;
    }
    const bounds = limitsRef.current;
    const grid = gridRef.current;
    const cellWidth = grid ? (grid.getBoundingClientRect().width - GRID_GAP * (columnCount - 1)) / columnCount : 1;
    const columnStride = cellWidth + GRID_GAP;
    const rowStride = ROW_HEIGHT + GRID_GAP;
    const originalWidth = origin.columns * cellWidth + (origin.columns - 1) * GRID_GAP;
    const originalHeight = origin.rows * ROW_HEIGHT + (origin.rows - 1) * GRID_GAP;
    const move = /* @__PURE__ */ __name((pointerEvent) => {
      const pointer = pointerRef.current;
      if (!pointer) {
        return;
      }
      const deltaX = pointerEvent.clientX - pointer.x;
      const deltaY = pointerEvent.clientY - pointer.y;
      pointer.moved = pointer.moved || Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4;
      const horizontal = Math.round(deltaX / columnStride);
      const vertical = Math.round(deltaY / rowStride);
      setInteraction((current) => {
        if (!current) {
          return current;
        }
        let draft = { ...origin };
        let drag;
        if (mode === "move") {
          draft.column = origin.column + horizontal;
          draft.row = origin.row + vertical;
          drag = {
            x: Math.max(
              -origin.column * columnStride,
              Math.min((columnCount - origin.column - origin.columns) * columnStride, deltaX)
            ),
            y: Math.max(
              -origin.row * rowStride,
              Math.min((bounds.maxrows - origin.row - origin.rows) * rowStride, deltaY)
            )
          };
        } else {
          draft.columns = origin.columns + horizontal;
          draft.rows = origin.rows + vertical;
          drag = {
            x: 0,
            y: 0,
            width: Math.max(cellWidth, Math.min(
              (columnCount - origin.column) * columnStride - GRID_GAP,
              originalWidth + deltaX
            )),
            height: Math.max(ROW_HEIGHT, Math.min(
              (bounds.maxrows - origin.row) * rowStride - GRID_GAP,
              originalHeight + deltaY
            )),
            shrinking: deltaX < 0 || deltaY < 0
          };
        }
        draft = clampToGrid(draft, columnCount, bounds);
        const next = { ...current, draft, drag };
        interactionRef.current = next;
        return next;
      });
    }, "move");
    const cleanup = /* @__PURE__ */ __name(() => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", abort);
      pointerRef.current = null;
    }, "cleanup");
    const up = /* @__PURE__ */ __name(() => {
      const current = interactionRef.current;
      if (pointerRef.current?.moved && current && layoutChanged(current.original, current.draft)) {
        void commit();
      } else if (!pointerRef.current?.moved) {
        setInteraction((previous) => {
          if (!previous) {
            return previous;
          }
          const next = { ...previous, origin: "mouseclick", drag: void 0, draft: previous.original };
          interactionRef.current = next;
          return next;
        });
      } else {
        cancel();
      }
      cleanup();
    }, "up");
    const abort = /* @__PURE__ */ __name(() => {
      cleanup();
      cancel();
    }, "abort");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", abort);
  }, [cancel, columnCount, commit, displayLayout, start]);
  const pointerDown = useCallback((event, id, mode) => {
    event.preventDefault();
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      touchHoldRef.current?.();
      touchHoldRef.current = awaitTouchHold(
        event,
        (x, y) => beginPointerDrag(x, y, id, mode),
        () => start(id, mode, "mouseclick")
      );
      return;
    }
    beginPointerDrag(event.clientX, event.clientY, id, mode);
  }, [beginPointerDrag, start]);
  const placeNewBlock = useCallback(async (blockid, target2, title) => {
    const previousIds = new Set((dataRef.current?.blocks ?? []).map((block) => block.id));
    const response = await load();
    if (!response) {
      return;
    }
    const bounds = response.limits;
    const currentColumns = columnCountRef.current;
    const item = blockid ? response.layout.find((candidate) => candidate.id === blockid) : response.layout.filter((candidate) => !previousIds.has(candidate.id)).sort((left, right) => right.id - left.id)[0];
    if (item) {
      const display = packLayout(response.layout, currentColumns);
      const others = display.filter((candidate) => candidate.id !== item.id);
      let pinned;
      if (target2.column !== void 0 && target2.row !== void 0) {
        const wanted = clampToGrid({ ...item, column: target2.column, row: target2.row }, currentColumns, bounds);
        const fitted = fitToFreeSpace(others, currentColumns, wanted, bounds);
        pinned = fitted ? { ...item, ...fitted } : wanted;
      } else if (target2.position === "start") {
        pinned = { ...item, column: 0, row: 0 };
      } else {
        pinned = { ...item, column: 0, row: maxRow(others) };
      }
      const next = writeBack(
        response.layout,
        packWithPinned(display, currentColumns, pinned, bounds),
        item.id,
        bounds,
        currentColumns
      );
      await updateDashboard("save", siteDefault, next);
      setCanonical(next);
      canonicalRef.current = next;
      flagDropped(item.id);
    }
    await announce("dashboardblockadded", title);
  }, [announce, columnCountRef, flagDropped, load, siteDefault]);
  const add = useCallback(async (block, target2) => {
    setSaving(true);
    try {
      const result = await updateDashboard("add", siteDefault, [], block.name);
      await placeNewBlock(result.blockid || null, target2, block.title);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [placeNewBlock, siteDefault]);
  const placeFormAdded = useCallback(async (block, target2) => {
    setSaving(true);
    try {
      await placeNewBlock(null, target2, block.title);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [placeNewBlock]);
  const [addBlocks, setAddBlocks] = useState(null);
  const openAddBlock = useCallback((target2, trigger) => {
    setAddBlocks({ target: target2, trigger: trigger ?? null });
  }, []);
  const closeAddBlocks = useCallback(() => setAddBlocks(null), []);
  const addBlocksTrigger = useRef(null);
  useEffect(() => {
    if (addBlocks) {
      addBlocksTrigger.current = addBlocks.trigger;
    } else {
      addBlocksTrigger.current?.focus?.();
      addBlocksTrigger.current = null;
    }
  }, [addBlocks]);
  const addBlockTo = useCallback((block, target2, trigger) => {
    if (block.blockform && pagehash) {
      openAddBlockForm(block, {
        pagehash,
        returnElement: trigger,
        onFormSubmitted: /* @__PURE__ */ __name((added) => void placeFormAdded(added, target2), "onFormSubmitted")
      }).catch((caught) => setError(describeError(caught)));
    } else {
      void add(block, target2);
    }
  }, [add, pagehash, placeFormAdded]);
  const addFromModal = useCallback((block) => {
    let target2 = addBlocks?.target ?? null;
    if (!target2) {
      const layout = displayLayoutRef.current;
      const region = emptyRegions(layout, columnCountRef.current, Math.max(1, maxRow(layout)))[0];
      target2 = region ? { column: region.column, row: region.row } : { position: "end" };
    }
    closeAddBlocks();
    addBlockTo(block, target2, addBlocks?.trigger);
  }, [addBlockTo, addBlocks, closeAddBlocks, columnCountRef]);
  const reset = useCallback(async () => {
    if (!data) {
      return;
    }
    setSaving(true);
    try {
      await updateDashboard("reset", false);
      window.location.reload();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [data]);
  if (!data || !labels) {
    return /* @__PURE__ */ jsxDEV(DashboardPlaceholder, { error, loadingLabel, initialLayout }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1278,
      columnNumber: 16
    });
  }
  const rows = gridRows(previewLayout, interaction);
  const prospective = prospectiveFor(interaction);
  const moving = Boolean(interaction);
  const requestReset = /* @__PURE__ */ __name(() => setConfirmAction({ type: "reset" }), "requestReset");
  const empty = !data.editing && previewLayout.length === 0;
  const customise = /* @__PURE__ */ __name(() => {
    fetchOne({ methodname: "core_change_editmode", args: { setmode: true, context: Number(config.contextid) } }).then(() => window.location.reload()).catch((caught) => setError(describeError(caught)));
  }, "customise");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: ["core-my-dashboard-app", data.editing && "core-my-dashboard-app--editing"].filter(Boolean).join(" "),
      "aria-busy": saving,
      children: [
        error && /* @__PURE__ */ jsxDEV(Alert, { type: "danger", isDismissible: false, message: error }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1298,
          columnNumber: 19
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "visually-hidden", "aria-live": "polite", "aria-atomic": "true", children: announcement }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1299,
          columnNumber: 9
        }),
        data.editing && /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-hint", children: [
          /* @__PURE__ */ jsxDEV(Icon, { markup: data.icons.move, className: "core-my-dashboard-hint__icon" }, void 0, false, {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1301,
            columnNumber: 13
          }),
          labels.edithint
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1300,
          columnNumber: 26
        }),
        /* @__PURE__ */ jsxDEV(
          DashboardErrorBoundary,
          {
            resetLabel: labels.reset,
            onReset: !siteDefault && data.canedit ? requestReset : void 0,
            children: [
              empty && /* @__PURE__ */ jsxDEV(
                DashboardEmpty,
                {
                  labels,
                  icons: data.icons,
                  canEdit: data.canedit,
                  onCustomise: customise,
                  onReset: siteDefault ? void 0 : requestReset
                },
                void 0,
                false,
                {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1308,
                  columnNumber: 23
                }
              ),
              /* @__PURE__ */ jsxDEV(
                "div",
                {
                  ref: gridRef,
                  hidden: empty || void 0,
                  className: "core-my-dashboard-grid",
                  style: {
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, ${ROW_HEIGHT}px)`
                  },
                  "data-columns": columnCount,
                  children: [
                    data.editing && /* @__PURE__ */ jsxDEV(
                      BoardCells,
                      {
                        rows,
                        columnCount,
                        layout: previewLayout,
                        active: moving,
                        interaction,
                        prospective,
                        labels,
                        addIcon: data.icons.add,
                        onActivate: (targetColumn, targetRow) => openAddBlock({ column: targetColumn, row: targetRow }),
                        onPlace: place
                      },
                      void 0,
                      false,
                      {
                        fileName: "public/my/js/esm/src/index.tsx",
                        lineNumber: 1325,
                        columnNumber: 34
                      }
                    ),
                    previewLayout.map((item) => {
                      const block = blocksById.get(item.id);
                      if (!block) {
                        return null;
                      }
                      return /* @__PURE__ */ jsxDEV(
                        DashboardTile,
                        {
                          block,
                          item,
                          labels,
                          icons: data.icons,
                          editing: data.editing,
                          ...tileInteraction(interaction, item.id),
                          isBumped: bumpedBlockIds.has(item.id),
                          justDropped: justDropped?.id === item.id ? justDropped.key : void 0,
                          onDropEnd: clearDropped,
                          onStart: start,
                          onKeyDown: keyDown,
                          onPointerDown: pointerDown,
                          onDirection: shift,
                          onCommit: () => void commit(),
                          onDelete: (id, title) => void deleteBlock(id, title)
                        },
                        item.id,
                        false,
                        {
                          fileName: "public/my/js/esm/src/index.tsx",
                          lineNumber: 1342,
                          columnNumber: 28
                        }
                      );
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1315,
                  columnNumber: 13
                }
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1304,
            columnNumber: 9
          }
        ),
        data.editing && /* @__PURE__ */ jsxDEV(
          EndOfGridCell,
          {
            columnCount,
            moving,
            gridRows: rows,
            prospective,
            label: labels.addblock,
            addIcon: data.icons.add,
            onActivate: (trigger) => openAddBlock({ position: "end" }, trigger)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1369,
            columnNumber: 26
          }
        ),
        data.editing && /* @__PURE__ */ jsxDEV(
          DashboardEditBar,
          {
            siteDefault,
            canEditDefault: data.caneditdefault,
            canUndo: history.length > 0 && !saving,
            labels,
            icons: data.icons,
            onReset: requestReset,
            onUndo: () => void undo(),
            onAdd: (trigger) => openAddBlock(null, trigger)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1378,
            columnNumber: 26
          }
        ),
        data.editing && addBlocks && /* @__PURE__ */ jsxDEV(
          AddBlocksDialog,
          {
            blocks: data.availableblocks,
            labels,
            icons: data.icons,
            onAdd: addFromModal,
            onClose: closeAddBlocks
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1388,
            columnNumber: 39
          }
        ),
        confirmAction && /* @__PURE__ */ jsxDEV(
          ConfirmationDialog,
          {
            title: labels.resetheading,
            message: labels.confirmreset,
            confirmLabel: labels.confirm,
            cancelLabel: labels.cancel,
            onConfirm: () => {
              setConfirmAction(null);
              void reset();
            },
            onCancel: () => setConfirmAction(null)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1395,
            columnNumber: 27
          }
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1294,
      columnNumber: 12
    }
  );
}, "Dashboard");
var index_default = Dashboard;
export {
  DashboardErrorBoundary,
  TOUCH_HOLD_MS,
  TOUCH_HOLD_SLOP,
  index_default as default,
  useInteractionCursor
};
//# sourceMappingURL=index.dev.js.map
