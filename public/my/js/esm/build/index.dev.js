var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Flexible responsive dashboard React application.
 *
 * @module     core_my/index
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Link } from "@moodlehq/design-system";
import { getString } from "@moodle/lms/core/stringUtils";
import { requireManyAsync } from "@moodle/lms/core/amd";
import Pending from "@moodle/lms/core/pending";
import DashboardTile from "./components/DashboardTile";
import ConfirmationDialog from "./components/ConfirmationDialog";
import BlockPalette from "./components/BlockPalette";
import GridCell from "./components/GridCell";
import DashboardLoading from "./components/DashboardLoading";
import {
  columnsForWidth,
  applyRowSpans,
  collapseEmptyRows,
  disturbedCount,
  fitMinimum,
  maxRow,
  measureNaturalHeight,
  packLayout,
  packWithPinned,
  readGridMetrics,
  rowsForHeight,
  writeBack
} from "./layout";
import {
  getDashboard,
  updateDashboard
} from "./repository";
import { SaveQueue, isTransientError } from "./saveQueue";
const errorMessage = /* @__PURE__ */ __name((caught) => {
  if (caught instanceof Error) {
    return caught.message;
  }
  if (caught && typeof caught === "object" && typeof caught.message === "string") {
    return caught.message;
  }
  return String(caught);
}, "errorMessage");
const DashboardScopeBanner = /* @__PURE__ */ __name(({ siteDefault, caneditotherscope, urls, labels }) => /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-scope", children: [
  /* @__PURE__ */ jsxDEV(
    Badge,
    {
      variant: siteDefault ? "warning" : "info",
      subtle: true,
      pill: true,
      label: siteDefault ? labels.scopesitedefault : labels.scopeown
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 84,
      columnNumber: 9
    }
  ),
  caneditotherscope && /* @__PURE__ */ jsxDEV(
    Link,
    {
      variant: "secondary",
      href: siteDefault ? urls.ownpage : urls.sitedefault,
      label: siteDefault ? labels.switchtoown : labels.switchtositedefault
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 90,
      columnNumber: 31
    }
  )
] }, void 0, true, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 83,
  columnNumber: 5
}), "DashboardScopeBanner");
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5e3;
const BLOCK_CONTENT_LOADED = "core_block/contentLoaded";
const AUTOSCROLL_EDGE_PX = 64;
const AUTOSCROLL_STEP_PX = 12;
let dashboardSettleCounter = 0;
const isSiteDefault = /* @__PURE__ */ __name(() => window.location.pathname.endsWith("/my/indexsys.php"), "isSiteDefault");
const layoutChanged = /* @__PURE__ */ __name((original, draft) => original.column !== draft.column || original.row !== draft.row || original.columns !== draft.columns || original.rows !== draft.rows, "layoutChanged");
const runCollectedJavascript = /* @__PURE__ */ __name((script, grid, onSettled) => {
  let superseded = false;
  let settled = false;
  let quiet = false;
  let quietTimer;
  let observer;
  const pending = new Pending(`core_my/dashboard:settling:${dashboardSettleCounter++}`);
  const awaiting = new Set(script.asyncBlocks);
  const onContentLoaded = /* @__PURE__ */ __name((event) => {
    awaiting.delete(Number(event.detail?.instanceId));
    settleIfDone();
  }, "onContentLoaded");
  const settle = /* @__PURE__ */ __name(() => {
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
  }, "settle");
  const settleIfDone = /* @__PURE__ */ __name(() => {
    if (awaiting.size === 0 && quiet) {
      settle();
    }
  }, "settleIfDone");
  const startQuietWindow = /* @__PURE__ */ __name(() => {
    quiet = false;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      quiet = true;
      settleIfDone();
    }, DASHBOARD_SETTLE_QUIET_MS);
  }, "startQuietWindow");
  const hardTimer = setTimeout(settle, DASHBOARD_SETTLE_TIMEOUT_MS);
  if (grid) {
    grid.addEventListener(BLOCK_CONTENT_LOADED, onContentLoaded);
    observer = new MutationObserver(startQuietWindow);
    observer.observe(grid, { childList: true, subtree: true });
  }
  startQuietWindow();
  if (script.source) {
    void requireManyAsync(["core/fragment", "core/templates", "core_filters/events"]).then(
      ([fragment, templates, filterEvents]) => {
        if (superseded) {
          return void 0;
        }
        const processed = fragment.processCollectedJavascript(script.source);
        templates.runTemplateJS(processed);
        const selector = script.blocks ? script.blocks.map((id) => `.core-my-dashboard-tile[data-instance-id="${id}"] .core-my-dashboard-tile__content`).join(", ") : ".core-my-dashboard-tile__content";
        const tiles = selector ? grid?.querySelectorAll(selector) : void 0;
        if (tiles?.length) {
          filterEvents.notifyFilterContentUpdated(tiles);
        }
        return void 0;
      }
    );
  }
  return () => {
    superseded = true;
    settle();
  };
}, "runCollectedJavascript");
const useCollectedBlockJavascript = /* @__PURE__ */ __name((script, gridRef, onSettled) => {
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  useEffect(() => {
    if (!script) {
      return void 0;
    }
    return runCollectedJavascript(script, gridRef.current, () => onSettledRef.current());
  }, [script]);
}, "useCollectedBlockJavascript");
const useResponsiveColumnCount = /* @__PURE__ */ __name((gridRef, data) => {
  const [columnCount, setColumnCount] = useState(1);
  const columnCountRef = useRef(1);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
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
  }, [data]);
  return [columnCount, columnCountRef];
}, "useResponsiveColumnCount");
const Dashboard = /* @__PURE__ */ __name(({ loadingLabel = "", initialLayout = [] }) => {
  const [data, setData] = useState(null);
  const [canonical, setCanonical] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const [palette, setPalette] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [unsaved, setUnsaved] = useState(false);
  const [loadedScript, setLoadedScript] = useState(null);
  const [addedScripts, setAddedScripts] = useState([]);
  const gridRef = useRef(null);
  const pointerRef = useRef(null);
  const interactionRef = useRef(null);
  const canonicalRef = useRef([]);
  const displayLayoutRef = useRef([]);
  const dataRef = useRef(null);
  const unsentRemovalsRef = useRef(/* @__PURE__ */ new Set());
  const reloadingRef = useRef(false);
  const siteDefault = isSiteDefault();
  const [queue] = useState(() => new SaveQueue({
    sendLayout: /* @__PURE__ */ __name((layout) => updateDashboard("save", siteDefault, layout), "sendLayout"),
    onStatus: setSaveStatus
  }));
  const minimumSize = useCallback((id) => {
    const current = dataRef.current;
    return current?.blocks.find((block) => block.id === id)?.minsize ?? current?.grid.minsize ?? { columns: 1, rows: 1 };
  }, []);
  const load = useCallback(async () => {
    try {
      const response = await getDashboard(siteDefault);
      setData(response);
      dataRef.current = response;
      setCanonical(response.layout);
      canonicalRef.current = response.layout;
      unsentRemovalsRef.current = /* @__PURE__ */ new Set();
      setUnsaved(false);
      setLoadedScript({
        source: response.javascript,
        asyncBlocks: response.blocks.filter((block) => block.asynccontent).map((block) => block.id)
      });
      setError("");
      return response;
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    }
  }, [siteDefault]);
  const patchData = useCallback((patch) => {
    const current = dataRef.current;
    if (!current) {
      return;
    }
    const next = { ...current, ...patch };
    dataRef.current = next;
    setData(next);
  }, []);
  const updateCanonical = useCallback((next) => {
    canonicalRef.current = next;
    setCanonical(next);
  }, []);
  const handleSyncFailure = useCallback((caught) => {
    if (isTransientError(caught)) {
      setUnsaved(true);
      return;
    }
    const message = errorMessage(caught);
    void load().then((response) => {
      if (response) {
        setError(message);
      }
      return void 0;
    });
  }, [load]);
  const retryUnsaved = useCallback(async () => {
    setUnsaved(false);
    try {
      for (const id of [...unsentRemovalsRef.current]) {
        await queue.call(() => updateDashboard("remove", siteDefault, [], "", id), true);
        unsentRemovalsRef.current.delete(id);
      }
      await queue.saveLayout(canonicalRef.current);
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [handleSyncFailure, queue, siteDefault]);
  useEffect(() => {
    if (!unsaved) {
      return void 0;
    }
    const online = /* @__PURE__ */ __name(() => void retryUnsaved(), "online");
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [retryUnsaved, unsaved]);
  useEffect(() => {
    if (saveStatus === "idle" && !unsaved) {
      return void 0;
    }
    const beforeUnload = /* @__PURE__ */ __name((event) => {
      if (!reloadingRef.current) {
        event.preventDefault();
      }
    }, "beforeUnload");
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveStatus, unsaved]);
  useEffect(() => {
    void load();
  }, [load]);
  const fittedFor = useRef(null);
  const fitAutoHeights = useCallback(() => {
    const current = dataRef.current;
    const grid = gridRef.current;
    if (!current || !grid || fittedFor.current === current || interactionRef.current) {
      return;
    }
    fittedFor.current = current;
    const metrics = readGridMetrics(grid);
    const blocks = new Map(current.blocks.map((block) => [block.id, block]));
    const rows2 = /* @__PURE__ */ new Map();
    canonicalRef.current.forEach((item) => {
      const block = blocks.get(item.id);
      const tile = grid.querySelector(`.core-my-dashboard-tile[data-instance-id="${item.id}"]`);
      if (item.autorows === false || !block || !tile) {
        return;
      }
      rows2.set(item.id, block.preferredrows ?? rowsForHeight(
        measureNaturalHeight(tile),
        metrics,
        block.minsize.rows,
        current.grid.autorowscap
      ));
    });
    const next = applyRowSpans(canonicalRef.current, rows2);
    if (next === canonicalRef.current) {
      return;
    }
    setCanonical(next);
    canonicalRef.current = next;
    if (current.ownlayout && current.canedit && !siteDefault) {
      void queue.saveLayout(next).catch(() => null);
    }
  }, [queue, siteDefault]);
  useCollectedBlockJavascript(loadedScript, gridRef, fitAutoHeights);
  useEffect(() => {
    if (!addedScripts.length) {
      return;
    }
    addedScripts.forEach((script) => runCollectedJavascript(script, gridRef.current, fitAutoHeights));
    setAddedScripts([]);
  }, [addedScripts, fitAutoHeights]);
  const [columnCount, columnCountRef] = useResponsiveColumnCount(gridRef, data);
  const displayLayout = useMemo(() => packLayout(canonical, columnCount), [canonical, columnCount]);
  displayLayoutRef.current = displayLayout;
  const previewLayout = useMemo(() => interaction ? packWithPinned(
    displayLayout,
    columnCount,
    interaction.draft,
    fitMinimum(minimumSize(interaction.id), columnCount)
  ) : displayLayout, [columnCount, displayLayout, interaction, minimumSize]);
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
  const previewById = useMemo(() => new Map(previewLayout.map((item) => [item.id, item])), [previewLayout]);
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
      const draft = { ...current.draft };
      if (current.mode === "move") {
        draft.column = Math.max(0, Math.min(columnCount - draft.columns, draft.column + horizontal));
        draft.row = Math.max(0, draft.row + vertical);
      } else {
        const nextColumns = draft.columns + horizontal;
        const nextRows = draft.rows + vertical;
        const minimum = fitMinimum(minimumSize(current.id), columnCount);
        if (nextColumns < minimum.columns || nextRows < minimum.rows) {
          void announce("dashboardminimumsize", `${minimum.columns} \xD7 ${minimum.rows}`);
          return current;
        }
        draft.columns = Math.min(columnCount - draft.column, nextColumns);
        draft.rows = nextRows;
      }
      const next = { ...current, draft };
      interactionRef.current = next;
      return next;
    });
  }, [announce, columnCount, minimumSize]);
  const commit = useCallback(async () => {
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
    const next = writeBack(currentCanonical, derived, current.id, minimum).map((item2) => current.mode === "resize" && item2.id === current.id ? { ...item2, autorows: false } : item2);
    const item = derived.find((candidate) => candidate.id === current.id);
    updateCanonical(next);
    interactionRef.current = null;
    setInteraction(null);
    void announce(current.mode === "move" ? "dashboardmovecommitted" : "dashboardresizecommitted", {
      row: item.row + 1,
      column: item.column + 1,
      columns: item.columns,
      rows: item.rows,
      disturbed
    });
    try {
      await queue.saveLayout(next);
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, handleSyncFailure, queue, updateCanonical]);
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
    const grid = gridRef.current;
    const { rowHeight, gap } = readGridMetrics(grid);
    const minimum = fitMinimum(minimumSize(id), columnCount);
    const cellWidth = grid ? (grid.getBoundingClientRect().width - gap * (columnCount - 1)) / columnCount : 1;
    const columnStride = cellWidth + gap;
    const rowStride = rowHeight + gap;
    const originalWidth = origin.columns * cellWidth + (origin.columns - 1) * gap;
    const originalHeight = origin.rows * rowHeight + (origin.rows - 1) * gap;
    const startScroll = window.scrollY;
    let lastPointer = null;
    let scrollFrame = 0;
    const autoScroll = /* @__PURE__ */ __name(() => {
      scrollFrame = 0;
      if (!lastPointer || !pointerRef.current) {
        return;
      }
      const edge = Math.min(AUTOSCROLL_EDGE_PX, window.innerHeight / 4);
      const step = lastPointer.clientY < edge ? -AUTOSCROLL_STEP_PX : lastPointer.clientY > window.innerHeight - edge ? AUTOSCROLL_STEP_PX : 0;
      if (!step) {
        return;
      }
      const before = window.scrollY;
      window.scrollBy(0, step);
      if (window.scrollY !== before) {
        move(lastPointer);
      }
    }, "autoScroll");
    const move = /* @__PURE__ */ __name((pointerEvent) => {
      const pointer = pointerRef.current;
      if (!pointer) {
        return;
      }
      lastPointer = { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY };
      if (!scrollFrame) {
        scrollFrame = window.requestAnimationFrame(autoScroll);
      }
      const deltaX = pointerEvent.clientX - pointer.x;
      const deltaY = pointerEvent.clientY - pointer.y + window.scrollY - startScroll;
      pointer.moved = pointer.moved || Math.abs(deltaX) >= 4 || Math.abs(deltaY) >= 4;
      const horizontal = Math.round(deltaX / columnStride);
      const vertical = Math.round(deltaY / rowStride);
      setInteraction((current) => {
        if (!current) {
          return current;
        }
        const draft = { ...origin };
        let drag;
        if (mode === "move") {
          draft.column = Math.max(0, Math.min(columnCount - draft.columns, origin.column + horizontal));
          draft.row = Math.max(0, origin.row + vertical);
          drag = {
            x: Math.max(
              -origin.column * columnStride,
              Math.min((columnCount - origin.column - origin.columns) * columnStride, deltaX)
            ),
            y: Math.max(-origin.row * rowStride, deltaY)
          };
        } else {
          draft.columns = Math.max(
            minimum.columns,
            Math.min(columnCount - draft.column, origin.columns + horizontal)
          );
          draft.rows = Math.max(minimum.rows, origin.rows + vertical);
          drag = {
            x: 0,
            y: 0,
            width: Math.max(cellWidth, Math.min(
              (columnCount - origin.column) * columnStride - gap,
              originalWidth + deltaX
            )),
            height: Math.max(rowHeight, originalHeight + deltaY),
            shrinking: deltaX < 0 || deltaY < 0
          };
        }
        const next = { ...current, draft, drag };
        interactionRef.current = next;
        return next;
      });
    }, "move");
    const cleanup = /* @__PURE__ */ __name(() => {
      window.cancelAnimationFrame(scrollFrame);
      lastPointer = null;
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
  const remove = useCallback(async (id) => {
    const current = dataRef.current;
    if (!current) {
      return;
    }
    patchData({ blocks: current.blocks.filter((block) => block.id !== id) });
    const remaining = canonicalRef.current.filter((item) => item.id !== id);
    const collapsed = collapseEmptyRows(remaining);
    updateCanonical(collapsed);
    void announce("dashboardblockremoved");
    unsentRemovalsRef.current.add(id);
    try {
      const result = await queue.call(() => updateDashboard("remove", siteDefault, [], "", id), true);
      unsentRemovalsRef.current.delete(id);
      if (result.availableblocks) {
        patchData({ availableblocks: result.availableblocks });
      }
      if (collapsed !== remaining) {
        await queue.saveLayout(canonicalRef.current);
      }
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, handleSyncFailure, patchData, queue, siteDefault, updateCanonical]);
  const add = useCallback(async (block) => {
    const target = palette;
    setPalette(null);
    let result;
    try {
      result = await queue.call(() => updateDashboard("add", siteDefault, [], block.name), false);
    } catch (caught) {
      setError(errorMessage(caught));
      return;
    }
    const current = dataRef.current;
    if (!current || !result.block || !result.layoutitem) {
      await load();
      return;
    }
    const added = result.block;
    const item = result.layoutitem;
    patchData({
      blocks: [...current.blocks.filter((existing) => existing.id !== added.id), added],
      availableblocks: result.availableblocks ?? current.availableblocks
    });
    const appended = [...canonicalRef.current.filter((existing) => existing.id !== item.id), item];
    updateCanonical(appended);
    setAddedScripts((scripts) => [...scripts, {
      source: result.javascript ?? "",
      asyncBlocks: added.asynccontent ? [added.id] : [],
      blocks: [added.id]
    }]);
    void announce("dashboardblockadded", block.title);
    const columns = columnCountRef.current;
    let pinned = null;
    if (target?.column !== void 0 && target.row !== void 0) {
      pinned = {
        ...item,
        column: Math.min(target.column, columns - Math.min(item.columns, columns)),
        row: target.row,
        columns: Math.min(item.columns, columns)
      };
    } else if (target?.position === "start") {
      pinned = { ...item, column: 0, row: 0 };
    }
    if (!pinned) {
      return;
    }
    const minimum = added.minsize ?? current.grid.minsize;
    const next = writeBack(
      appended,
      packWithPinned(packLayout(appended, columns), columns, pinned, fitMinimum(minimum, columns)),
      item.id,
      minimum
    );
    updateCanonical(next);
    try {
      await queue.saveLayout(next);
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, handleSyncFailure, load, palette, patchData, queue, siteDefault, updateCanonical]);
  const reset = useCallback(async () => {
    if (!data) {
      return;
    }
    try {
      await queue.call(() => updateDashboard("reset", false), false);
      reloadingRef.current = true;
      window.location.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [data, queue]);
  if (!data) {
    return error ? /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-status alert alert-danger", role: "alert", children: error }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 983,
      columnNumber: 15
    }) : /* @__PURE__ */ jsxDEV(DashboardLoading, { label: loadingLabel, layout: initialLayout }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 984,
      columnNumber: 15
    });
  }
  const rows = Math.max(1, maxRow(previewLayout));
  const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) || interaction.origin === "pointer" && interaction.mode === "resize" && interaction.drag?.shrinking) ? interaction.draft : void 0;
  const statusMessages = {
    idle: "",
    saving: "",
    offline: data.labels.saveoffline,
    retrying: data.labels.saveretrying
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-app", "aria-busy": saveStatus !== "idle", children: [
    error && /* @__PURE__ */ jsxDEV("div", { className: "alert alert-danger", role: "alert", children: error }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 998,
      columnNumber: 19
    }),
    unsaved && /* @__PURE__ */ jsxDEV("div", { className: "alert alert-warning core-my-dashboard-unsaved", role: "alert", children: [
      data.labels.savefailed,
      /* @__PURE__ */ jsxDEV(
        Button,
        {
          className: "ms-2",
          variant: "secondary",
          size: "sm",
          label: data.labels.retry,
          onClick: () => void retryUnsaved()
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1001,
          columnNumber: 13
        }
      )
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 999,
      columnNumber: 21
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-savestatus", role: "status", children: statusMessages[saveStatus] }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1009,
      columnNumber: 9
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "visually-hidden", "aria-live": "polite", "aria-atomic": "true", children: announcement }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1010,
      columnNumber: 9
    }),
    data.editing && /* @__PURE__ */ jsxDEV(
      DashboardScopeBanner,
      {
        siteDefault,
        caneditotherscope: data.caneditotherscope,
        urls: data.urls,
        labels: data.labels
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1011,
        columnNumber: 26
      }
    ),
    data.editing && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar", children: [
      /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: data.labels.addblocktop, onClick: () => setPalette({ position: "start" }) }, void 0, false, {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1018,
        columnNumber: 13
      }),
      !siteDefault && /* @__PURE__ */ jsxDEV(
        Button,
        {
          variant: "outline-danger",
          label: data.labels.reset,
          onClick: () => setConfirmAction({ type: "reset" })
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1019,
          columnNumber: 30
        }
      )
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1017,
      columnNumber: 26
    }),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        ref: gridRef,
        className: "core-my-dashboard-grid",
        style: {
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, var(--core-my-dashboard-row-height))`
        },
        "data-columns": columnCount,
        children: [
          data.editing && Array.from(
            { length: rows },
            (_, row) => Array.from({ length: columnCount }, (__, column) => {
              const isProspective = Boolean(prospective && column >= prospective.column && column < prospective.column + prospective.columns && row >= prospective.row && row < prospective.row + prospective.rows);
              const isOccupied = previewLayout.some(
                (item) => column >= item.column && column < item.column + item.columns && row >= item.row && row < item.row + item.rows
              );
              return !isOccupied || isProspective ? /* @__PURE__ */ jsxDEV(
                GridCell,
                {
                  column,
                  row,
                  label: data.labels.emptycell,
                  positionLabel: data.labels.gridcell,
                  addLabel: data.labels.addblock,
                  prospective: isProspective,
                  onActivate: (targetColumn, targetRow) => setPalette({ column: targetColumn, row: targetRow })
                },
                `${column}:${row}`,
                false,
                {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1043,
                  columnNumber: 59
                }
              ) : null;
            })
          ),
          displayLayout.map((committed) => {
            const item = previewById.get(committed.id) ?? committed;
            const block = blocksById.get(item.id);
            if (!block) {
              return null;
            }
            return /* @__PURE__ */ jsxDEV(
              DashboardTile,
              {
                block,
                item,
                labels: data.labels,
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
                onCommit: () => void commit(),
                onRemove: (id) => setConfirmAction({ type: "remove", id })
              },
              item.id,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1066,
                columnNumber: 24
              }
            );
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1025,
        columnNumber: 9
      }
    ),
    data.editing && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar core-my-dashboard-toolbar--bottom", children: /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: data.labels.addblockbottom, onClick: () => setPalette({ position: "end" }) }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1088,
      columnNumber: 13
    }) }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1087,
      columnNumber: 26
    }),
    palette && /* @__PURE__ */ jsxDEV(
      BlockPalette,
      {
        title: data.labels.addblock,
        closeLabel: data.labels.close,
        blocks: data.availableblocks,
        onSelect: (block) => void add(block),
        onClose: () => setPalette(null)
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1090,
        columnNumber: 21
      }
    ),
    confirmAction && /* @__PURE__ */ jsxDEV(
      ConfirmationDialog,
      {
        title: confirmAction.type === "remove" ? data.labels.removeheading : data.labels.resetheading,
        message: confirmAction.type === "remove" ? data.labels.confirmremove : data.labels.confirmreset,
        confirmLabel: data.labels.confirm,
        cancelLabel: data.labels.cancel,
        onConfirm: () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action.type === "remove") {
            void remove(action.id);
          } else {
            void reset();
          }
        },
        onCancel: () => setConfirmAction(null)
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1097,
        columnNumber: 27
      }
    )
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/index.tsx",
    lineNumber: 997,
    columnNumber: 12
  });
}, "Dashboard");
var index_default = Dashboard;
export {
  DashboardScopeBanner,
  index_default as default,
  errorMessage
};
//# sourceMappingURL=index.dev.js.map
