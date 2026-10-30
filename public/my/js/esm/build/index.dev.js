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
import { Button } from "@moodlehq/design-system";
import { getString } from "@moodle/lms/core/stringUtils";
import { isMoodleAjaxError } from "@moodle/lms/core/ajax";
import { requireManyAsync } from "@moodle/lms/core/amd";
import Pending from "@moodle/lms/core/pending";
import DashboardTile from "./components/DashboardTile";
import DashboardEditBar from "./components/DashboardEditBar";
import ConfirmationDialog from "./components/ConfirmationDialog";
import Icon from "./components/Icon";
import GridCell from "./components/GridCell";
import DashboardLoading from "./components/DashboardLoading";
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
import { addBlockFallbackUrl, openAddBlockModal } from "./addBlockModal";
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
    return /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-status alert alert-danger", role: "alert", children: [
      /* @__PURE__ */ jsxDEV("p", { children: this.state.error.message }, void 0, false, {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 85,
        columnNumber: 13
      }, this),
      this.props.onReset && this.props.resetLabel && /* @__PURE__ */ jsxDEV(
        Button,
        {
          variant: "outline-danger",
          label: this.props.resetLabel,
          onClick: this.props.onReset
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 86,
          columnNumber: 61
        },
        this
      )
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 84,
      columnNumber: 16
    }, this);
  }
}
const BoardCells = /* @__PURE__ */ __name(({
  rows,
  columnCount,
  layout,
  interaction,
  prospective,
  labels,
  addIcon,
  onActivate,
  onPlace,
  onPreview
}) => {
  if (!interaction) {
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
        lineNumber: 141,
        columnNumber: 68
      }
    )) }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 140,
      columnNumber: 16
    });
  }
  const placing = interaction.origin === "mouseclick";
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    Array.from({ length: rows }, (_, row) => Array.from({ length: columnCount }, (__, column) => /* @__PURE__ */ jsxDEV(
      GridCell,
      {
        column,
        row,
        state: "active",
        onPlace: placing ? onPlace : void 0,
        onPreview: placing ? onPreview : void 0
      },
      `${column}:${row}`,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 156,
        columnNumber: 99
      }
    ))),
    prospective && /* @__PURE__ */ jsxDEV(
      GridCell,
      {
        column: prospective.column,
        row: prospective.row,
        columns: prospective.columns,
        rows: prospective.rows,
        state: "prospective"
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 164,
        columnNumber: 25
      }
    )
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/index.tsx",
    lineNumber: 155,
    columnNumber: 12
  });
}, "BoardCells");
const UNDO_LIMIT = 20;
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5e3;
let dashboardSettleCounter = 0;
const resolveSiteDefault = /* @__PURE__ */ __name((prop) => prop ?? window.location.pathname.endsWith("/my/indexsys.php"), "resolveSiteDefault");
const resolveLimits = /* @__PURE__ */ __name((data) => data?.limits ?? DEFAULT_LIMITS, "resolveLimits");
const DashboardPlaceholder = /* @__PURE__ */ __name(({ error, loadingLabel, initialLayout }) => error ? /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-status alert alert-danger", role: "alert", children: error }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 228,
  columnNumber: 7
}) : /* @__PURE__ */ jsxDEV(DashboardLoading, { label: loadingLabel, layout: initialLayout }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 229,
  columnNumber: 7
}), "DashboardPlaceholder");
const describeError = /* @__PURE__ */ __name((caught) => {
  if (caught instanceof Error || isMoodleAjaxError(caught)) {
    return caught.message;
  }
  return String(caught);
}, "describeError");
const tileMotion = /* @__PURE__ */ __name((interaction, id) => ({
  showControls: interaction?.id === id && interaction.origin === "mouseclick",
  shouldAnimatePosition: Boolean(interaction) && (interaction?.origin !== "pointer" || interaction.id !== id)
}), "tileMotion");
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
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const gridRef = useRef(null);
  const pointerRef = useRef(null);
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
    const disturbed = disturbedCount(current.before, derived, current.id);
    const next = writeBack(currentCanonical, derived, current.id, bounds, currentColumns);
    setSaving(true);
    try {
      await updateDashboard("save", siteDefault, next);
      setHistory((previous) => [...previous, currentCanonical].slice(-UNDO_LIMIT));
      setCanonical(next);
      canonicalRef.current = next;
      const item = derived.find((candidate) => candidate.id === current.id);
      await announce(current.mode === "move" ? "dashboardmovecommitted" : "dashboardresizecommitted", {
        row: item.row + 1,
        column: item.column + 1,
        columns: item.columns,
        rows: item.rows,
        disturbed
      });
      interactionRef.current = null;
      setInteraction(null);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [announce, siteDefault]);
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
  const askToDelete = useCallback(async (id, title) => {
    const [heading, message, confirmLabel] = await Promise.all([
      getString("deletecheck", "block", title),
      getString("deleteblockcheck", "block", title),
      getString("delete", "core")
    ]);
    setConfirmAction({ type: "delete", id, title, heading, message, confirmLabel });
  }, []);
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
  const pointerDown = useCallback((event, id, mode) => {
    event.preventDefault();
    start(id, mode, "pointer");
    pointerRef.current = { x: event.clientX, y: event.clientY, moved: false };
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
          const next = { ...previous, origin: "mouseclick" };
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
    }
    await announce("dashboardblockadded", title);
  }, [announce, columnCountRef, load, siteDefault]);
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
  const openAddBlock = useCallback((target2, trigger) => {
    const current = dataRef.current;
    if (!current || !labels) {
      return;
    }
    openAddBlockModal({
      blocks: current.availableblocks,
      title: labels.addblock,
      pagehash,
      returnElement: trigger,
      onSelect: /* @__PURE__ */ __name((block) => void add(block, target2), "onSelect"),
      onFormSubmitted: /* @__PURE__ */ __name((block) => void placeFormAdded(block, target2), "onFormSubmitted")
    }).catch((caught) => setError(describeError(caught)));
  }, [add, labels, pagehash, placeFormAdded]);
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
      lineNumber: 1006,
      columnNumber: 16
    });
  }
  const rows = gridRows(previewLayout, interaction);
  const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) || interaction.origin === "pointer" && interaction.mode === "resize" && interaction.drag?.shrinking) ? interaction.draft : void 0;
  const requestReset = /* @__PURE__ */ __name(() => setConfirmAction({ type: "reset" }), "requestReset");
  const requestDelete = /* @__PURE__ */ __name((id, title) => void askToDelete(id, title), "requestDelete");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `core-my-dashboard-app${data.editing ? " core-my-dashboard-app--editing" : ""}`,
      "aria-busy": saving,
      children: [
        error && /* @__PURE__ */ jsxDEV("div", { className: "alert alert-danger", role: "alert", children: error }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1020,
          columnNumber: 19
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "visually-hidden", "aria-live": "polite", "aria-atomic": "true", children: announcement }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1021,
          columnNumber: 9
        }),
        data.editing && /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-hint", children: [
          /* @__PURE__ */ jsxDEV(Icon, { markup: data.icons.move, className: "core-my-dashboard-hint__icon" }, void 0, false, {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1023,
            columnNumber: 13
          }),
          labels.edithint
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1022,
          columnNumber: 26
        }),
        /* @__PURE__ */ jsxDEV(
          DashboardErrorBoundary,
          {
            resetLabel: labels.reset,
            onReset: !siteDefault && data.canedit ? requestReset : void 0,
            children: /* @__PURE__ */ jsxDEV(
              "div",
              {
                ref: gridRef,
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
                      interaction,
                      prospective,
                      labels,
                      addIcon: data.icons.add,
                      onActivate: (targetColumn, targetRow) => openAddBlock({ column: targetColumn, row: targetRow }),
                      onPlace: place,
                      onPreview: (targetColumn, targetRow) => void target(targetColumn, targetRow)
                    },
                    void 0,
                    false,
                    {
                      fileName: "public/my/js/esm/src/index.tsx",
                      lineNumber: 1039,
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
                        activeMode: interaction?.id === item.id ? interaction.mode : void 0,
                        ...tileMotion(interaction, item.id),
                        drag: interaction?.id === item.id ? interaction.drag : void 0,
                        dragOrigin: interaction?.id === item.id ? interaction.original : void 0,
                        isBumped: bumpedBlockIds.has(item.id),
                        onStart: start,
                        onKeyDown: keyDown,
                        onPointerDown: pointerDown,
                        onDirection: shift,
                        onCommit: () => void commit(),
                        onDelete: requestDelete
                      },
                      item.id,
                      false,
                      {
                        fileName: "public/my/js/esm/src/index.tsx",
                        lineNumber: 1056,
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
                lineNumber: 1030,
                columnNumber: 13
              }
            )
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1026,
            columnNumber: 9
          }
        ),
        data.editing && /* @__PURE__ */ jsxDEV("div", { className: "d-grid core-my-dashboard-addblock", "data-region": "add-block-button", children: /* @__PURE__ */ jsxDEV(
          "a",
          {
            href: addBlockFallbackUrl(),
            className: "btn btn-add-content mb-3",
            onClick: (event) => {
              event.preventDefault();
              openAddBlock({ position: "end" }, event.currentTarget);
            },
            children: [
              /* @__PURE__ */ jsxDEV(Icon, { markup: data.icons.add, className: "py-2 me-2" }, void 0, false, {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1095,
                columnNumber: 17
              }),
              labels.addblock
            ]
          },
          void 0,
          true,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1087,
            columnNumber: 13
          }
        ) }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1086,
          columnNumber: 26
        }),
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
            onAdd: (trigger) => openAddBlock({ position: "start" }, trigger)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1098,
            columnNumber: 26
          }
        ),
        confirmAction && /* @__PURE__ */ jsxDEV(
          ConfirmationDialog,
          {
            title: confirmAction.type === "delete" ? confirmAction.heading : labels.resetheading,
            message: confirmAction.type === "delete" ? confirmAction.message : labels.confirmreset,
            confirmLabel: confirmAction.type === "delete" ? confirmAction.confirmLabel : labels.confirm,
            cancelLabel: labels.cancel,
            danger: confirmAction.type === "delete",
            onConfirm: () => {
              setConfirmAction(null);
              void (confirmAction.type === "delete" ? deleteBlock(confirmAction.id, confirmAction.title) : reset());
            },
            onCancel: () => setConfirmAction(null)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1108,
            columnNumber: 27
          }
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1016,
      columnNumber: 12
    }
  );
}, "Dashboard");
var index_default = Dashboard;
export {
  DashboardErrorBoundary,
  index_default as default
};
//# sourceMappingURL=index.dev.js.map
