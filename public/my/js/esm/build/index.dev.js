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
import ConfirmationDialog from "./components/ConfirmationDialog";
import Icon, { renderIcon } from "./components/Icon";
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
  maxRow,
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
const DashboardScopeBanner = /* @__PURE__ */ __name(({ siteDefault, labels }) => /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-scope", children: siteDefault ? labels.scopesitedefault : labels.scopeown }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 61,
  columnNumber: 5
}), "DashboardScopeBanner");
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
        lineNumber: 94,
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
          lineNumber: 95,
          columnNumber: 61
        },
        this
      )
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 93,
      columnNumber: 16
    }, this);
  }
}
const EditToolbar = /* @__PURE__ */ __name(({ siteDefault, labels, addIcon, onAdd, onReset }) => /* @__PURE__ */ jsxDEV(
  "div",
  {
    className: "core-my-dashboard-toolbar",
    children: [
      /* @__PURE__ */ jsxDEV(DashboardScopeBanner, { siteDefault, labels }, void 0, false, {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 128,
        columnNumber: 5
      }),
      /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar__actions", children: [
        !siteDefault && /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: labels.reset, onClick: onReset }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 130,
          columnNumber: 26
        }),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            variant: "primary",
            label: labels.addblock,
            "aria-label": labels.addblocktop,
            startIcon: renderIcon(addIcon),
            onClick: (event) => onAdd(event.currentTarget)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 131,
            columnNumber: 9
          }
        )
      ] }, void 0, true, {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 129,
        columnNumber: 5
      })
    ]
  },
  void 0,
  true,
  {
    fileName: "public/my/js/esm/src/index.tsx",
    lineNumber: 125,
    columnNumber: 91
  }
), "EditToolbar");
const EmptyCells = /* @__PURE__ */ __name(({ rows, columnCount, layout, prospective, labels, addIcon, onActivate }) => /* @__PURE__ */ jsxDEV(Fragment, { children: Array.from(
  { length: rows },
  (_, row) => Array.from({ length: columnCount }, (__, column) => {
    const isProspective = Boolean(prospective && column >= prospective.column && column < prospective.column + prospective.columns && row >= prospective.row && row < prospective.row + prospective.rows);
    const isOccupied = layout.some(
      (item) => column >= item.column && column < item.column + item.columns && row >= item.row && row < item.row + item.rows
    );
    return !isOccupied || isProspective ? /* @__PURE__ */ jsxDEV(
      GridCell,
      {
        column,
        row,
        label: labels.emptycell,
        addLabel: labels.addblock,
        addIcon,
        prospective: isProspective,
        onActivate
      },
      `${column}:${row}`,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 166,
        columnNumber: 51
      }
    ) : null;
  })
) }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 156,
  columnNumber: 112
}), "EmptyCells");
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5e3;
let dashboardSettleCounter = 0;
const resolveSiteDefault = /* @__PURE__ */ __name((prop) => prop ?? window.location.pathname.endsWith("/my/indexsys.php"), "resolveSiteDefault");
const resolveLimits = /* @__PURE__ */ __name((data) => data?.limits ?? DEFAULT_LIMITS, "resolveLimits");
const DashboardPlaceholder = /* @__PURE__ */ __name(({ error, loadingLabel, initialLayout }) => error ? /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-status alert alert-danger", role: "alert", children: error }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 224,
  columnNumber: 7
}) : /* @__PURE__ */ jsxDEV(DashboardLoading, { label: loadingLabel, layout: initialLayout }, void 0, false, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 225,
  columnNumber: 7
}), "DashboardPlaceholder");
const describeError = /* @__PURE__ */ __name((caught) => {
  if (caught instanceof Error || isMoodleAjaxError(caught)) {
    return caught.message;
  }
  return String(caught);
}, "describeError");
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
  const displayLayout = useMemo(() => packLayout(canonical, columnCount), [canonical, columnCount]);
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
  const shift = useCallback((horizontal, vertical) => {
    setInteraction((current) => {
      if (!current) {
        return current;
      }
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
          return current;
        }
        draft.columns = nextColumns;
        draft.rows = nextRows;
      }
      draft = clampToGrid(draft, columnCount, bounds);
      const next = { ...current, draft };
      interactionRef.current = next;
      return next;
    });
  }, [announce, columnCount]);
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
  const cancel = useCallback(() => {
    if (interaction) {
      void announce("dashboardoperationdiscarded");
    }
    interactionRef.current = null;
    setInteraction(null);
  }, [announce, interaction]);
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
  const placeNewBlock = useCallback(async (blockid, target, title) => {
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
      if (target.column !== void 0 && target.row !== void 0) {
        const wanted = clampToGrid({ ...item, column: target.column, row: target.row }, currentColumns, bounds);
        const fitted = fitToFreeSpace(others, currentColumns, wanted, bounds);
        pinned = fitted ? { ...item, ...fitted } : wanted;
      } else if (target.position === "start") {
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
  const add = useCallback(async (block, target) => {
    setSaving(true);
    try {
      const result = await updateDashboard("add", siteDefault, [], block.name);
      await placeNewBlock(result.blockid || null, target, block.title);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [placeNewBlock, siteDefault]);
  const placeFormAdded = useCallback(async (block, target) => {
    setSaving(true);
    try {
      await placeNewBlock(null, target, block.title);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSaving(false);
    }
  }, [placeNewBlock]);
  const openAddBlock = useCallback((target, trigger) => {
    const current = dataRef.current;
    if (!current || !labels) {
      return;
    }
    openAddBlockModal({
      blocks: current.availableblocks,
      title: labels.addblock,
      pagehash,
      returnElement: trigger,
      onSelect: /* @__PURE__ */ __name((block) => void add(block, target), "onSelect"),
      onFormSubmitted: /* @__PURE__ */ __name((block) => void placeFormAdded(block, target), "onFormSubmitted")
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
      lineNumber: 854,
      columnNumber: 16
    });
  }
  const rows = Math.max(1, maxRow(previewLayout));
  const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) || interaction.origin === "pointer" && interaction.mode === "resize" && interaction.drag?.shrinking) ? interaction.draft : void 0;
  const requestReset = /* @__PURE__ */ __name(() => setConfirmAction({ type: "reset" }), "requestReset");
  return /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-app", "aria-busy": saving, children: [
    error && /* @__PURE__ */ jsxDEV("div", { className: "alert alert-danger", role: "alert", children: error }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 863,
      columnNumber: 19
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "visually-hidden", "aria-live": "polite", "aria-atomic": "true", children: announcement }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 864,
      columnNumber: 9
    }),
    data.editing && /* @__PURE__ */ jsxDEV(
      EditToolbar,
      {
        siteDefault,
        labels,
        addIcon: data.icons.add,
        onAdd: (trigger) => openAddBlock({ position: "start" }, trigger),
        onReset: requestReset
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 865,
        columnNumber: 26
      }
    ),
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
                EmptyCells,
                {
                  rows,
                  columnCount,
                  layout: previewLayout,
                  prospective,
                  labels,
                  addIcon: data.icons.add,
                  onActivate: (targetColumn, targetRow) => openAddBlock({ column: targetColumn, row: targetRow })
                },
                void 0,
                false,
                {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 885,
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
                    showControls: interaction?.id === item.id && interaction.origin !== "pointer",
                    drag: interaction?.id === item.id ? interaction.drag : void 0,
                    dragOrigin: interaction?.id === item.id ? interaction.original : void 0,
                    shouldAnimatePosition: interaction?.origin === "pointer" && interaction.id !== item.id,
                    isBumped: bumpedBlockIds.has(item.id),
                    onStart: start,
                    onKeyDown: keyDown,
                    onPointerDown: pointerDown,
                    onDirection: shift,
                    onCommit: () => void commit()
                  },
                  item.id,
                  false,
                  {
                    fileName: "public/my/js/esm/src/index.tsx",
                    lineNumber: 899,
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
            lineNumber: 876,
            columnNumber: 13
          }
        )
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 872,
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
            lineNumber: 938,
            columnNumber: 17
          }),
          labels.addblock
        ]
      },
      void 0,
      true,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 930,
        columnNumber: 13
      }
    ) }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 929,
      columnNumber: 26
    }),
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
        lineNumber: 941,
        columnNumber: 27
      }
    )
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/index.tsx",
    lineNumber: 862,
    columnNumber: 12
  });
}, "Dashboard");
var index_default = Dashboard;
export {
  DashboardErrorBoundary,
  DashboardScopeBanner,
  index_default as default
};
//# sourceMappingURL=index.dev.js.map
