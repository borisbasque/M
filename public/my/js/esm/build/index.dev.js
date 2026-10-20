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
import { createPortal } from "react-dom";
import { Badge, Button, Link } from "@moodlehq/design-system";
import { getString } from "@moodle/lms/core/stringUtils";
import { requireManyAsync } from "@moodle/lms/core/amd";
import Pending from "@moodle/lms/core/pending";
import { redirect } from "@moodle/lms/core/location";
import Toast from "@moodle/lms/core/Toast";
import DashboardTile from "./components/DashboardTile";
import ConfirmationDialog from "./components/ConfirmationDialog";
import BlockBrowser from "./components/BlockBrowser";
import GridCell from "./components/GridCell";
import DashboardLoading from "./components/DashboardLoading";
import {
  columnsForWidth,
  emptyRegions,
  applyRowSpans,
  firstFreeSpace,
  disturbedCount,
  fitMinimum,
  maxRow,
  measureNaturalHeight,
  packLayout,
  packWithPinned,
  stepDraft,
  readGridMetrics,
  riseToFill,
  rowsForHeight,
  writeBack
} from "./layout";
import {
  beaconRemoval,
  getDashboard,
  getDashboardBlock,
  updateDashboard
} from "./repository";
import { SaveQueue, isTransientError } from "./saveQueue";
import { BlockLoader } from "./blockLoader";
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
      lineNumber: 95,
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
      lineNumber: 101,
      columnNumber: 31
    }
  )
] }, void 0, true, {
  fileName: "public/my/js/esm/src/index.tsx",
  lineNumber: 94,
  columnNumber: 5
}), "DashboardScopeBanner");
const HISTORY_LIMIT = 50;
const LEAVE_TIMEOUT_MS = 5e3;
const EDIT_MODE_SET = "core/edit_switch/editModeSet";
const maximumRows = /* @__PURE__ */ __name((block, fallback) => {
  if (block.maxrows === void 0) {
    return fallback;
  }
  return block.maxrows ?? Infinity;
}, "maximumRows");
const DASHBOARD_SETTLE_QUIET_MS = 250;
const DASHBOARD_SETTLE_TIMEOUT_MS = 5e3;
const BLOCK_CONTENT_LOADED = "core_block/contentLoaded";
const AUTOSCROLL_EDGE_PX = 64;
const AUTOSCROLL_STEP_PX = 12;
const NEW_BLOCK_HIGHLIGHT_MS = 2e3;
let dashboardSettleCounter = 0;
const isSiteDefault = /* @__PURE__ */ __name(() => window.location.pathname.endsWith("/my/indexsys.php"), "isSiteDefault");
const isRtl = /* @__PURE__ */ __name((element) => window.getComputedStyle(element ?? document.documentElement).direction === "rtl", "isRtl");
const isTyping = /* @__PURE__ */ __name((target) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)), "isTyping");
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
const Dashboard = /* @__PURE__ */ __name(({ loadingLabel = "", initialLayout = [], openBrowser = false, initialData = null }) => {
  const [data, setData] = useState(null);
  const [canonical, setCanonical] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const [palette, setPalette] = useState(null);
  const browserRequestedRef = useRef(openBrowser);
  const [confirmAction, setConfirmAction] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [unsaved, setUnsaved] = useState(false);
  const [loadedScript, setLoadedScript] = useState(null);
  const [addedScripts, setAddedScripts] = useState([]);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const toastOnCloseRef = useRef(null);
  const toastCounterRef = useRef(0);
  const interactionToastRef = useRef(null);
  const historyRef = useRef([]);
  const [historySize, setHistorySize] = useState(0);
  const [hiddenIds, setHiddenIds] = useState(/* @__PURE__ */ new Set());
  const pendingRemovalRef = useRef(null);
  const focusAfterRef = useRef(null);
  const addButtonRef = useRef(null);
  const [footerTarget] = useState(
    () => document.querySelector('[data-region="core-my-dashboard-footer"]')
  );
  const [footerHeight, setFooterHeight] = useState(0);
  useLayoutEffect(() => {
    const footer = footerTarget?.closest(".stickyfooter");
    if (!footer || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    const measure = /* @__PURE__ */ __name(() => {
      const height = footer.getBoundingClientRect().height;
      setFooterHeight(height);
      document.body.style.setProperty("--sticky-footer-total-height", `${height}px`);
    }, "measure");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    return () => {
      observer.disconnect();
      document.body.style.removeProperty("--sticky-footer-total-height");
    };
  }, [footerTarget]);
  const saveStatusRef = useRef("idle");
  const gridRef = useRef(null);
  const pointerRef = useRef(null);
  const interactionRef = useRef(null);
  const canonicalRef = useRef([]);
  const displayLayoutRef = useRef([]);
  const dataRef = useRef(null);
  const unsentRemovalsRef = useRef(/* @__PURE__ */ new Set());
  const reloadingRef = useRef(false);
  const finishingRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const siteDefault = isSiteDefault();
  const revisionRef = useRef(null);
  const [send] = useState(() => async (action, layout = [], blockname = "", blockid = 0) => {
    const result = await updateDashboard(action, siteDefault, layout, blockname, blockid, revisionRef.current);
    if (typeof result.revision === "number") {
      revisionRef.current = result.revision;
    }
    return result;
  });
  const [queue] = useState(() => new SaveQueue({
    sendLayout: /* @__PURE__ */ __name((layout) => send("save", layout), "sendLayout"),
    onStatus: setSaveStatus
  }));
  const minimumSize = useCallback((id) => {
    const current = dataRef.current;
    return current?.blocks.find((block) => block.id === id)?.minsize ?? current?.grid.minsize ?? { columns: 1, rows: 1 };
  }, []);
  const initialDataRef = useRef(initialData);
  const load = useCallback(async () => {
    try {
      const response = initialDataRef.current ?? await getDashboard(siteDefault);
      initialDataRef.current = null;
      setData(response);
      dataRef.current = response;
      setCanonical(response.layout);
      canonicalRef.current = response.layout;
      revisionRef.current = response.revision;
      settledRef.current = /* @__PURE__ */ new Set();
      measuredRef.current = /* @__PURE__ */ new Set();
      unsentRemovalsRef.current = /* @__PURE__ */ new Set();
      pendingRemovalRef.current = null;
      setHiddenIds(/* @__PURE__ */ new Set());
      setUnsaved(false);
      setLoadedScript({
        source: response.javascript,
        asyncBlocks: response.blocks.filter((block) => block.asynccontent && block.loaded).map((block) => block.id)
      });
      startLoadingBlocks(response);
      setError("");
      return response;
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    }
  }, [siteDefault]);
  const loaderRef = useRef(null);
  const startLoadingBlocks = /* @__PURE__ */ __name((response) => {
    loaderRef.current?.stop();
    const loader = new BlockLoader({
      fetch: /* @__PURE__ */ __name((id) => {
        const pending = new Pending(`core_my/dashboard:block:${id}`);
        return getDashboardBlock(siteDefault, id).then(
          (result) => ({ ...result, pending }),
          (error2) => {
            pending.resolve();
            throw error2;
          }
        );
      }, "fetch"),
      onLoaded: /* @__PURE__ */ __name((id, { block, javascript, pending }) => {
        const current = dataRef.current;
        if (!current) {
          pending.resolve();
          return;
        }
        patchDataRef.current({ blocks: block ? current.blocks.map((existing) => existing.id === id ? { ...existing, ...block, loaded: true } : existing) : current.blocks.filter((existing) => existing.id !== id) });
        setAddedScripts((scripts) => [...scripts, {
          source: block ? javascript : "",
          asyncBlocks: block?.asynccontent ? [id] : [],
          blocks: [id],
          pending
        }]);
      }, "onLoaded"),
      onFailed: /* @__PURE__ */ __name((id) => {
        const current = dataRef.current;
        if (current) {
          patchDataRef.current({ blocks: current.blocks.map((existing) => existing.id === id ? { ...existing, content: "", footer: "", loaded: true, failed: true } : existing) });
        }
      }, "onFailed")
    });
    loaderRef.current = loader;
    const waiting = new Set(response.blocks.filter((block) => !block.loaded).map((block) => block.id));
    loader.enqueue(response.layout.map((item) => item.id).filter((id) => waiting.has(id)));
  }, "startLoadingBlocks");
  const patchData = useCallback((patch) => {
    const current = dataRef.current;
    if (!current) {
      return;
    }
    const next = { ...current, ...patch };
    dataRef.current = next;
    setData(next);
  }, []);
  const patchDataRef = useRef(patchData);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof IntersectionObserver === "undefined") {
      return void 0;
    }
    const observer = new IntersectionObserver((entries) => entries.filter((entry) => entry.isIntersecting).forEach((entry) => loaderRef.current?.prioritise(Number(entry.target.dataset.instanceId))));
    grid.querySelectorAll('.core-my-dashboard-tile[aria-busy="true"]').forEach((tile) => observer.observe(tile));
    return () => observer.disconnect();
  }, [data]);
  const updateCanonical = useCallback((next) => {
    canonicalRef.current = next;
    setCanonical(next);
  }, []);
  const showToast = useCallback((text, options = {}) => {
    const offline = saveStatusRef.current === "offline" && dataRef.current && text !== dataRef.current.labels.saveoffline ? ` ${dataRef.current.labels.saveoffline}` : "";
    const next = {
      id: ++toastCounterRef.current,
      text: text + offline,
      action: options.action,
      persist: options.persist
    };
    const previousClose = toastOnCloseRef.current;
    toastOnCloseRef.current = options.onClose ?? null;
    toastRef.current = next;
    setToast(next);
    previousClose?.();
    return next.id;
  }, []);
  const hideToast = useCallback(() => {
    const close = toastOnCloseRef.current;
    toastOnCloseRef.current = null;
    toastRef.current = null;
    setToast(null);
    close?.();
  }, []);
  const dropToast = useCallback((id) => {
    if (id !== null && toastRef.current?.id === id) {
      toastOnCloseRef.current = null;
      toastRef.current = null;
      setToast(null);
    }
  }, []);
  const announce = useCallback(async (key, value) => {
    const text = await getString(key, "my", value);
    if (toastRef.current?.text === text) {
      return;
    }
    setAnnouncement(text);
  }, []);
  const toastString = useCallback(async (key, value, options) => showToast(await getString(key, "my", value), options), [showToast]);
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
        await queue.call(() => send("remove", [], "", id), true);
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
    const beforeUnload = /* @__PURE__ */ __name((event) => {
      if (reloadingRef.current) {
        return;
      }
      if (!queue.busy && !unsaved) {
        const pending = pendingRemovalRef.current;
        if (pending) {
          pendingRemovalRef.current = null;
          beaconRemoval(siteDefault, pending.id, canonicalRef.current, revisionRef.current);
        }
        return;
      }
      event.preventDefault();
    }, "beforeUnload");
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [queue, siteDefault, unsaved]);
  useEffect(() => {
    void load().then((response) => {
      if (response?.editing && browserRequestedRef.current) {
        browserRequestedRef.current = false;
        setPalette({});
      }
      return void 0;
    });
  }, [load]);
  const wasOfflineRef = useRef(false);
  useEffect(() => {
    saveStatusRef.current = saveStatus;
    const labels = dataRef.current?.labels;
    if (!labels) {
      return;
    }
    if (saveStatus === "offline" && !wasOfflineRef.current) {
      wasOfflineRef.current = true;
      showToast(labels.saveoffline, { persist: true });
    } else if (saveStatus === "idle" && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      void toastString("dashboardsavedonline");
    }
  }, [saveStatus, showToast, toastString]);
  const settledRef = useRef(/* @__PURE__ */ new Set());
  const measuredRef = useRef(/* @__PURE__ */ new Set());
  const fitAutoHeights = useCallback((settled) => {
    const current = dataRef.current;
    const grid = gridRef.current;
    if (!current || !grid) {
      return;
    }
    (settled ?? current.blocks.filter((block) => block.loaded).map((block) => block.id)).forEach((id) => settledRef.current.add(id));
    if (interactionRef.current) {
      return;
    }
    const metrics = readGridMetrics(grid);
    const blocks = new Map(current.blocks.map((block) => [block.id, block]));
    const rows2 = /* @__PURE__ */ new Map();
    canonicalRef.current.forEach((item) => {
      const block = blocks.get(item.id);
      const tile = grid.querySelector(`.core-my-dashboard-tile[data-instance-id="${item.id}"]`);
      if (item.autorows === false || !block || !block.loaded || !tile || !settledRef.current.has(item.id) || measuredRef.current.has(item.id)) {
        return;
      }
      measuredRef.current.add(item.id);
      rows2.set(item.id, block.preferredrows ?? rowsForHeight(
        measureNaturalHeight(tile),
        metrics,
        block.minsize.rows,
        maximumRows(block, current.grid.autorowscap)
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
  const gridMounted = data !== null;
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return void 0;
    }
    const onContentLoaded = /* @__PURE__ */ __name((event) => {
      const id = Number(event.detail?.instanceId);
      const current = dataRef.current;
      const block = current?.blocks.find((candidate) => candidate.id === id);
      const item = canonicalRef.current.find((candidate) => candidate.id === id);
      const tile = grid.querySelector(`.core-my-dashboard-tile[data-instance-id="${id}"]`);
      if (!current || !block || !item || !tile || item.autorows === false || block.preferredrows !== null || !measuredRef.current.has(id) || interactionRef.current) {
        return;
      }
      const rows2 = rowsForHeight(
        measureNaturalHeight(tile),
        readGridMetrics(grid),
        block.minsize.rows,
        maximumRows(block, current.grid.autorowscap)
      );
      const next = applyRowSpans(canonicalRef.current, /* @__PURE__ */ new Map([[id, rows2]]));
      if (next !== canonicalRef.current) {
        canonicalRef.current = next;
        setCanonical(next);
      }
    }, "onContentLoaded");
    grid.addEventListener(BLOCK_CONTENT_LOADED, onContentLoaded);
    return () => grid.removeEventListener(BLOCK_CONTENT_LOADED, onContentLoaded);
  }, [gridMounted]);
  useEffect(() => {
    if (!addedScripts.length) {
      return;
    }
    addedScripts.forEach((script) => {
      runCollectedJavascript(script, gridRef.current, () => fitAutoHeights(script.blocks));
      script.pending?.resolve();
    });
    setAddedScripts([]);
  }, [addedScripts, fitAutoHeights]);
  const [columnCount, columnCountRef] = useResponsiveColumnCount(gridRef, data);
  const editing = Boolean(data?.editing);
  const displayLayout = useMemo(
    () => riseToFill(packLayout(riseToFill(canonical), columnCount)),
    [canonical, columnCount]
  );
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
  const flushRemoval = useCallback(async () => {
    const pending = pendingRemovalRef.current;
    const current = dataRef.current;
    if (!pending || !current) {
      return;
    }
    pendingRemovalRef.current = null;
    dropToast(pending.toastId);
    const { id } = pending;
    unsentRemovalsRef.current.add(id);
    const removed = queue.call(() => send("remove", [], "", id), true);
    const layout = queue.saveLayout(canonicalRef.current);
    patchData({ blocks: current.blocks.filter((block) => block.id !== id) });
    setHiddenIds((previous) => new Set([...previous].filter((hidden) => hidden !== id)));
    try {
      const result = await removed;
      unsentRemovalsRef.current.delete(id);
      if (result.availableblocks) {
        patchData({ availableblocks: result.availableblocks });
      }
      await layout;
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [dropToast, handleSyncFailure, patchData, queue, siteDefault]);
  const pushHistory = useCallback(() => {
    void flushRemoval();
    historyRef.current = [...historyRef.current, canonicalRef.current].slice(-HISTORY_LIMIT);
    setHistorySize(historyRef.current.length);
  }, [flushRemoval]);
  const finishEditing = useCallback(async (url) => {
    if (finishingRef.current) {
      return;
    }
    finishingRef.current = true;
    setFinishing(true);
    try {
      await flushRemoval();
      if (queue.busy) {
        await queue.saveLayout(canonicalRef.current);
      }
    } catch (caught) {
      finishingRef.current = false;
      setFinishing(false);
      handleSyncFailure(caught);
      return;
    }
    reloadingRef.current = true;
    redirect(url);
    window.setTimeout(() => {
      reloadingRef.current = false;
      finishingRef.current = false;
      setFinishing(false);
    }, LEAVE_TIMEOUT_MS);
  }, [flushRemoval, handleSyncFailure, queue]);
  useEffect(() => {
    if (!editing) {
      return void 0;
    }
    const onEditModeSet = /* @__PURE__ */ __name((event) => {
      if (event.detail?.editMode !== false) {
        return;
      }
      if (!queue.busy && !pendingRemovalRef.current) {
        return;
      }
      event.preventDefault();
      const urls = dataRef.current?.urls;
      const fallback = `${siteDefault ? urls?.sitedefault : urls?.ownpage}?edit=0`;
      const target = event.target instanceof HTMLElement ? event.target : null;
      void finishEditing(target?.dataset.pageurl || fallback);
    }, "onEditModeSet");
    document.addEventListener(EDIT_MODE_SET, onEditModeSet);
    return () => document.removeEventListener(EDIT_MODE_SET, onEditModeSet);
  }, [editing, finishEditing, queue, siteDefault]);
  const undo = useCallback(async () => {
    const previous = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    const current = dataRef.current;
    if (!previous || !current) {
      return;
    }
    interactionRef.current = null;
    setInteraction(null);
    const pending = pendingRemovalRef.current;
    const wanted = new Set(previous.map((item) => item.id));
    if (pending && wanted.has(pending.id)) {
      pendingRemovalRef.current = null;
      setHiddenIds((hidden) => new Set([...hidden].filter((id) => id !== pending.id)));
    }
    const existing = new Set(current.blocks.map((block) => block.id));
    const added = canonicalRef.current.filter((item) => !wanted.has(item.id)).map((item) => item.id);
    const layout = previous.filter((item) => existing.has(item.id));
    updateCanonical(layout);
    if (added.length) {
      patchData({ blocks: current.blocks.filter((block) => !added.includes(block.id)) });
    }
    hideToast();
    void announce("dashboardundone");
    try {
      const removals = added.map((id) => queue.call(() => send("remove", [], "", id), true));
      const saved = queue.saveLayout(layout);
      const results = await Promise.all(removals);
      const palette2 = results.reverse().find((result) => result.availableblocks)?.availableblocks;
      if (palette2) {
        patchData({ availableblocks: palette2 });
      }
      await saved;
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, handleSyncFailure, hideToast, patchData, queue, siteDefault, updateCanonical]);
  useEffect(() => {
    if (!data?.editing) {
      return void 0;
    }
    const onKeyDown = /* @__PURE__ */ __name((event) => {
      if (event.key.toLowerCase() !== "z" || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || isTyping(event.target) || interactionRef.current) {
        return;
      }
      event.preventDefault();
      void undo();
    }, "onKeyDown");
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [data?.editing, undo]);
  useEffect(() => {
    const target = focusAfterRef.current;
    if (target === null) {
      return;
    }
    focusAfterRef.current = null;
    if (target === "add") {
      addButtonRef.current?.focus();
      return;
    }
    gridRef.current?.querySelector(
      `.core-my-dashboard-tile[data-instance-id="${target}"] .core-my-dashboard-handle--move`
    )?.focus();
  }, [canonical]);
  const showInstructions = useCallback(async (title, mode, how) => {
    const labels = dataRef.current?.labels;
    if (!labels) {
      return;
    }
    const keys = {
      keyboard: { move: "dashboardkeyboardmove", resize: "dashboardkeyboardresize" },
      tap: { move: "dashboardtapmove", resize: "dashboardtapresize" },
      assistive: { move: "dashboardchoosemove", resize: "dashboardchooseresize" }
    };
    const key = keys[how][mode];
    const text = await getString(key, "my", title);
    if (!interactionRef.current) {
      return;
    }
    interactionToastRef.current = showToast(text, {
      persist: true,
      action: { label: labels.cancel, onClick: /* @__PURE__ */ __name(() => cancelRef.current(), "onClick") }
    });
  }, [showToast]);
  const endInteraction = useCallback(() => {
    interactionRef.current = null;
    setInteraction(null);
    dropToast(interactionToastRef.current);
    interactionToastRef.current = null;
  }, [dropToast]);
  const start = useCallback((id, mode, origin = "keyboard") => {
    const item = displayLayout.find((candidate) => candidate.id === id);
    const block = blocksById.get(id);
    if (!item || !block) {
      return;
    }
    const next = { id, mode, origin, original: item, draft: item, before: displayLayout };
    interactionRef.current = next;
    setInteraction(next);
    if (origin === "keyboard") {
      void showInstructions(block.title, mode, "keyboard");
    } else {
      void announce(mode === "move" ? "dashboardmovebegin" : "dashboardresizebegin", block.title);
    }
  }, [announce, blocksById, displayLayout, showInstructions]);
  const pickUp = useCallback((id, mode) => {
    const block = blocksById.get(id);
    start(id, mode, "mouseclick");
    if (block) {
      void showInstructions(block.title, mode, "assistive");
    }
  }, [blocksById, showInstructions, start]);
  const shift = useCallback((visualHorizontal, vertical) => {
    const current = interactionRef.current;
    if (!current) {
      return;
    }
    const horizontal = isRtl(gridRef.current) ? -visualHorizontal : visualHorizontal;
    const minimum = fitMinimum(minimumSize(current.id), columnCount);
    const result = stepDraft(current.draft, current.mode, horizontal, vertical, columnCount, minimum);
    if (result.blocker === "minimum") {
      void announce("dashboardminimumsize", `${minimum.columns} \xD7 ${minimum.rows}`);
      return;
    }
    if (!result.draft) {
      return;
    }
    const draft = result.draft;
    if (!layoutChanged(draft, current.draft)) {
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
    if (!layoutChanged(current.original, current.draft)) {
      endInteraction();
      void announce("dashboardnothingchanged");
      return;
    }
    pushHistory();
    const minimum = minimumSize(current.id);
    const derived = packWithPinned(currentDisplay, currentColumns, current.draft, fitMinimum(minimum, currentColumns));
    const disturbed = disturbedCount(current.before, derived, current.id);
    const settled = riseToFill(derived);
    const othersRose = current.mode === "move" && settled.some((item2) => {
      if (item2.id === current.id) {
        return false;
      }
      const prior = derived.find((candidate) => candidate.id === item2.id);
      return prior !== void 0 && item2.row < prior.row;
    });
    const next = writeBack(currentCanonical, derived, current.id, minimum).map((item2) => current.mode === "resize" && item2.id === current.id ? { ...item2, autorows: false } : item2);
    const item = settled.find((candidate) => candidate.id === current.id);
    const blockTitle = currentData.blocks.find((block) => block.id === current.id)?.title ?? "";
    updateCanonical(next);
    endInteraction();
    const committedKey = current.mode === "move" ? "dashboardmovecommitted" : "dashboardresizecommitted";
    const committedParams = {
      block: blockTitle,
      row: item.row + 1,
      column: item.column + 1,
      columns: item.columns,
      rows: item.rows,
      disturbed
    };
    if (othersRose) {
      void Promise.all([
        getString(committedKey, "my", committedParams),
        getString("dashboardblockplaced", "my", blockTitle)
      ]).then(([committed, placed]) => {
        const text = `${committed} ${placed}`;
        if (toastRef.current?.text !== text) {
          setAnnouncement(text);
        }
        return void 0;
      });
    } else {
      void announce(committedKey, committedParams);
    }
    try {
      await queue.saveLayout(next);
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, endInteraction, handleSyncFailure, pushHistory, queue, updateCanonical]);
  const cancel = useCallback(() => {
    if (interactionRef.current) {
      void announce("dashboardoperationdiscarded");
    }
    endInteraction();
  }, [announce, endInteraction]);
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  const commitRef = useRef(commit);
  commitRef.current = commit;
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
    if (interactionRef.current?.origin === "mouseclick") {
      return;
    }
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
    const direction = isRtl(grid) ? -1 : 1;
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
      const horizontal = Math.round(direction * deltaX / columnStride);
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
          const towardsStart = -origin.column * columnStride;
          const towardsEnd = (columnCount - origin.column - origin.columns) * columnStride;
          drag = {
            x: direction > 0 ? Math.max(towardsStart, Math.min(towardsEnd, deltaX)) : Math.max(-towardsEnd, Math.min(-towardsStart, deltaX)),
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
              originalWidth + direction * deltaX
            )),
            height: Math.max(rowHeight, originalHeight + deltaY),
            shrinking: direction * deltaX < 0 || deltaY < 0
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
      } else if (!pointerRef.current?.moved && current) {
        const next = { ...current, origin: "mouseclick", drag: void 0 };
        interactionRef.current = next;
        setInteraction(next);
        const block = dataRef.current?.blocks.find((candidate) => candidate.id === current.id);
        if (block) {
          void showInstructions(block.title, current.mode, "tap");
        }
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
  }, [cancel, columnCount, commit, displayLayout, minimumSize, showInstructions, start]);
  const tapKey = interaction?.origin === "mouseclick" ? `${interaction.id}:${interaction.mode}` : null;
  useEffect(() => {
    const grid = gridRef.current;
    if (!tapKey || !grid) {
      return void 0;
    }
    const draftForCell = /* @__PURE__ */ __name((column, row) => {
      const current = interactionRef.current;
      if (!current) {
        return null;
      }
      const columns = columnCountRef.current ?? 1;
      const { original } = current;
      const draft = { ...original };
      if (current.mode === "move") {
        draft.column = Math.min(column, columns - original.columns);
        draft.row = row;
      } else {
        const minimum = fitMinimum(minimumSize(current.id), columns);
        draft.columns = Math.min(columns - original.column, Math.max(minimum.columns, column - original.column + 1));
        draft.rows = Math.max(minimum.rows, row - original.row + 1);
      }
      return { ...current, draft };
    }, "draftForCell");
    const draftAt = /* @__PURE__ */ __name((x, y) => {
      const columns = columnCountRef.current ?? 1;
      const rect = grid.getBoundingClientRect();
      const { rowHeight, gap } = readGridMetrics(grid);
      const cellWidth = (rect.width - gap * (columns - 1)) / columns;
      const offset = isRtl(grid) ? rect.right - x : x - rect.left;
      const column = Math.max(0, Math.min(columns - 1, Math.floor(offset / (cellWidth + gap))));
      const row = Math.max(0, Math.floor((y - rect.top) / (rowHeight + gap)));
      return draftForCell(column, row);
    }, "draftAt");
    const onMove = /* @__PURE__ */ __name((event) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const next = draftAt(event.clientX, event.clientY);
      if (next && layoutChanged(next.draft, interactionRef.current.draft)) {
        interactionRef.current = next;
        setInteraction(next);
      }
    }, "onMove");
    const onClick = /* @__PURE__ */ __name((event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".core-toast")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!target || !grid.contains(target)) {
        cancelRef.current();
        return;
      }
      const current = interactionRef.current;
      if (event.detail === 0 && current) {
        const tile = target.closest(`.core-my-dashboard-tile[data-instance-id="${current.id}"]`);
        const place = target.closest("[data-grid-column][data-grid-row]");
        if (tile || !place) {
          void commitRef.current();
          return;
        }
        const next2 = draftForCell(Number(place.dataset.gridColumn), Number(place.dataset.gridRow));
        if (next2) {
          interactionRef.current = next2;
          void commitRef.current();
        }
        return;
      }
      const next = draftAt(event.clientX, event.clientY);
      if (next) {
        interactionRef.current = next;
        void commitRef.current();
      }
    }, "onClick");
    const onKeyDown = /* @__PURE__ */ __name((event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRef.current();
      }
    }, "onKeyDown");
    const timer = setTimeout(() => {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("click", onClick, true);
    });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [columnCountRef, minimumSize, tapKey]);
  const remove = useCallback(async (id) => {
    const current = dataRef.current;
    const block = current?.blocks.find((candidate) => candidate.id === id);
    if (!current || !block) {
      return;
    }
    pushHistory();
    const order = displayLayoutRef.current.map((item) => item.id);
    const index = order.indexOf(id);
    focusAfterRef.current = order[index + 1] ?? order[index - 1] ?? "add";
    setHiddenIds((hidden) => /* @__PURE__ */ new Set([...hidden, id]));
    const before = canonicalRef.current;
    const after = riseToFill(before.filter((item) => item.id !== id));
    updateCanonical(after);
    const text = await getString("dashboardblockremovednamed", "my", block.title);
    const pending = { id, toastId: 0 };
    pendingRemovalRef.current = pending;
    pending.toastId = showToast(text, {
      action: { label: current.labels.undo, onClick: /* @__PURE__ */ __name(() => void undo(), "onClick") },
      onClose: /* @__PURE__ */ __name(() => void flushRemoval(), "onClose")
    });
  }, [flushRemoval, pushHistory, showToast, undo, updateCanonical]);
  const add = useCallback(async (block) => {
    const target = palette;
    setPalette(null);
    pushHistory();
    let result;
    try {
      result = await queue.call(() => send("add", [], block.name), false);
    } catch (caught) {
      historyRef.current.pop();
      setHistorySize(historyRef.current.length);
      if (isTransientError(caught)) {
        if (await load()) {
          void toastString("dashboardaddunconfirmed");
        }
      } else {
        setError(errorMessage(caught));
      }
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
    setAddedScripts((scripts) => [...scripts, {
      source: result.javascript ?? "",
      asyncBlocks: added.asynccontent ? [added.id] : [],
      blocks: [added.id]
    }]);
    const columns = columnCountRef.current ?? 1;
    const others = canonicalRef.current.filter((existing) => existing.id !== item.id);
    const minimum = added.minsize ?? current.grid.minsize;
    const targeted = target?.column !== void 0 && target.row !== void 0;
    const width = Math.min(columns, targeted && target.columns ? Math.max(Math.min(target.columns, item.columns), minimum.columns) : item.columns);
    const place = targeted ? { column: Math.min(target.column, columns - width), row: target.row } : firstFreeSpace(packLayout(others, columns), columns, width, item.rows);
    const pinned = { ...item, ...place, columns: width };
    const appended = [...others, item];
    const next = writeBack(
      appended,
      packWithPinned(packLayout(appended, columns), columns, pinned, fitMinimum(minimum, columns)),
      item.id,
      minimum
    );
    updateCanonical(next);
    newBlockRef.current = { id: item.id, pickUp: !targeted };
    if (targeted) {
      void getString("dashboardblockadded", "my", block.title).then((text) => showToast(
        text,
        { action: { label: current.labels.undo, onClick: /* @__PURE__ */ __name(() => void undo(), "onClick") } }
      ));
    } else {
      void announce("dashboardblockadded", block.title);
    }
    try {
      await queue.saveLayout(next);
    } catch (caught) {
      handleSyncFailure(caught);
    }
  }, [announce, handleSyncFailure, load, palette, patchData, pushHistory, queue, send, showToast, toastString, undo, updateCanonical]);
  const newBlockRef = useRef(null);
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    const fresh = newBlockRef.current;
    if (!fresh) {
      return void 0;
    }
    const tile = gridRef.current?.querySelector(`.core-my-dashboard-tile[data-instance-id="${fresh.id}"]`);
    if (!tile) {
      return void 0;
    }
    newBlockRef.current = null;
    tile.scrollIntoView?.({ block: "nearest" });
    setHighlightId(fresh.id);
    if (fresh.pickUp) {
      tile.querySelector(".core-my-dashboard-handle--move")?.focus();
      start(fresh.id, "move", "keyboard");
    }
    const timer = setTimeout(() => setHighlightId(null), NEW_BLOCK_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [canonical, start]);
  const reset = useCallback(async () => {
    if (!data) {
      return;
    }
    historyRef.current = [];
    setHistorySize(0);
    pendingRemovalRef.current = null;
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
      lineNumber: 1783,
      columnNumber: 15
    }) : /* @__PURE__ */ jsxDEV(DashboardLoading, { label: loadingLabel, layout: initialLayout }, void 0, false, {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1784,
      columnNumber: 15
    });
  }
  const rows = Math.max(1, maxRow(previewLayout)) + (interaction ? 1 : 0);
  const prospective = interaction && (layoutChanged(interaction.original, interaction.draft) || interaction.origin === "pointer" && interaction.mode === "resize" && interaction.drag?.shrinking) ? interaction.draft : void 0;
  const renderTile = /* @__PURE__ */ __name((committed, hidden) => {
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
        hidden,
        tapping: interaction?.id === item.id && interaction.origin === "mouseclick",
        activeMode: interaction?.id === item.id ? interaction.mode : void 0,
        drag: interaction?.id === item.id ? interaction.drag : void 0,
        dragOrigin: interaction?.id === item.id ? interaction.original : void 0,
        shouldAnimatePosition: interaction?.origin === "pointer" && interaction.id !== item.id,
        isBumped: bumpedBlockIds.has(item.id),
        highlighted: highlightId === item.id,
        onStart: pickUp,
        onKeyDown: keyDown,
        onPointerDown: pointerDown,
        onCommit: () => void commit(),
        onRemove: (id) => void remove(id)
      },
      item.id,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1799,
        columnNumber: 16
      }
    );
  }, "renderTile");
  const placing = interaction?.origin === "mouseclick" ? interaction : null;
  const placingTitle = placing ? blocksById.get(placing.id)?.title ?? "" : "";
  const regions = !data.editing ? [] : placing ? emptyRegions(placing.before.filter((item) => item.id !== placing.id), columnCount, rows) : !interaction ? emptyRegions(displayLayout, columnCount, rows) : [];
  const gridChildren = [
    ...displayLayout.map((committed) => ({ row: committed.row, column: committed.column, node: renderTile(committed, false) })),
    ...regions.map((region) => ({ row: region.row, column: region.column, node: /* @__PURE__ */ jsxDEV(
      GridCell,
      {
        ...region,
        placing: Boolean(placing),
        label: placing ? (placing.mode === "move" ? data.labels.placemove : data.labels.placeresize).replace("{$a->block}", placingTitle) : data.labels.emptyregion,
        addLabel: placing ? placing.mode === "move" ? data.labels.movehere : data.labels.resizehere : data.labels.addblockhere,
        onActivate: placing ? void 0 : (column, row, columns, regionRows) => setPalette({ column, row, columns, rows: regionRows })
      },
      `region:${region.column}:${region.row}`,
      false,
      {
        fileName: "public/my/js/esm/src/index.tsx",
        lineNumber: 1831,
        columnNumber: 82
      }
    ) }))
  ].sort((left, right) => left.row - right.row || left.column - right.column).map((child) => child.node);
  hiddenIds.forEach((id) => gridChildren.push(renderTile({ id, column: 0, row: 0, columns: 1, rows: 1 }, true)));
  const empty = displayLayout.length === 0;
  const addBlockUrl = `${siteDefault ? data.urls.sitedefault : data.urls.ownpage}?edit=1&addblock=1`;
  const doneUrl = `${siteDefault ? data.urls.sitedefault : data.urls.ownpage}?edit=0`;
  const statusMessages = {
    idle: "",
    saving: "",
    offline: "",
    retrying: data.labels.saveretrying
  };
  const portalToFooter = /* @__PURE__ */ __name((controls) => footerTarget ? createPortal(controls, footerTarget) : controls, "portalToFooter");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "core-my-dashboard-app",
      "aria-busy": saveStatus !== "idle",
      "data-instructions": interaction && interaction.origin !== "pointer" ? true : void 0,
      style: footerHeight ? { "--core-my-dashboard-footer-height": `${footerHeight}px` } : void 0,
      children: [
        error && /* @__PURE__ */ jsxDEV("div", { className: "alert alert-danger", role: "alert", children: error }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1874,
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
              lineNumber: 1877,
              columnNumber: 13
            }
          )
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1875,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-savestatus", role: "status", children: statusMessages[saveStatus] }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1885,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "visually-hidden", "aria-live": "polite", "aria-atomic": "true", children: announcement }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1886,
          columnNumber: 9
        }),
        data.editing && portalToFooter(/* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar", children: [
          /* @__PURE__ */ jsxDEV(
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
              lineNumber: 1888,
              columnNumber: 13
            }
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar__actions", children: [
            !siteDefault && /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "lg",
                variant: "ghost",
                label: data.labels.reset,
                onClick: () => setConfirmAction({ type: "reset" })
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1895,
                columnNumber: 34
              }
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "lg",
                variant: "ghost",
                label: data.labels.undo,
                startIcon: /* @__PURE__ */ jsxDEV("i", { className: "fa fa-rotate-left", "aria-hidden": "true" }, void 0, false, {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1905,
                  columnNumber: 32
                }),
                disabled: historySize === 0,
                onClick: () => void undo()
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1901,
                columnNumber: 17
              }
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "lg",
                variant: "secondary",
                label: data.labels.done,
                disabled: finishing,
                onClick: () => void finishEditing(doneUrl)
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1909,
                columnNumber: 17
              }
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "lg",
                ref: addButtonRef,
                variant: "primary",
                label: data.labels.addblock,
                startIcon: /* @__PURE__ */ jsxDEV("i", { className: "fa fa-plus", "aria-hidden": "true" }, void 0, false, {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1921,
                  columnNumber: 32
                }),
                onClick: () => setPalette({})
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1916,
                columnNumber: 17
              }
            )
          ] }, void 0, true, {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1894,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1887,
          columnNumber: 41
        })),
        empty && data.canedit && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-empty", children: [
          /* @__PURE__ */ jsxDEV("p", { children: data.labels.empty }, void 0, false, {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1927,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-empty__actions", children: [
            data.editing ? /* @__PURE__ */ jsxDEV(Button, { variant: "primary", label: data.labels.addblock, onClick: () => setPalette({}) }, void 0, false, {
              fileName: "public/my/js/esm/src/index.tsx",
              lineNumber: 1930,
              columnNumber: 23
            }) : /* @__PURE__ */ jsxDEV("a", { className: "btn btn-primary", href: addBlockUrl, children: data.labels.addblock }, void 0, false, {
              fileName: "public/my/js/esm/src/index.tsx",
              lineNumber: 1931,
              columnNumber: 23
            }),
            !siteDefault && /* @__PURE__ */ jsxDEV(
              Button,
              {
                variant: "secondary",
                label: data.labels.restoredefault,
                onClick: () => setConfirmAction({ type: "reset" })
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1932,
                columnNumber: 34
              }
            )
          ] }, void 0, true, {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1928,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 1926,
          columnNumber: 35
        }),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: gridRef,
            hidden: empty || void 0,
            className: "core-my-dashboard-grid",
            role: "group",
            "aria-label": data.labels.dashboardblocks,
            style: {
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, var(--core-my-dashboard-row-height))`
            },
            "data-columns": columnCount,
            children: [
              gridChildren,
              prospective && /* @__PURE__ */ jsxDEV(
                GridCell,
                {
                  column: prospective.column,
                  row: prospective.row,
                  columns: prospective.columns,
                  rows: prospective.rows,
                  label: "",
                  addLabel: "",
                  prospective: true
                },
                "prospective",
                false,
                {
                  fileName: "public/my/js/esm/src/index.tsx",
                  lineNumber: 1960,
                  columnNumber: 29
                }
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1939,
            columnNumber: 9
          }
        ),
        data.editing && !empty && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "core-my-grid-cell core-my-grid-cell--available core-my-dashboard-add-below",
            "aria-label": data.labels.addblock,
            onClick: () => setPalette({}),
            children: /* @__PURE__ */ jsxDEV("span", { className: "core-my-grid-cell__label", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsxDEV("i", { className: "fa fa-plus core-my-grid-cell__icon", "aria-hidden": "true" }, void 0, false, {
                fileName: "public/my/js/esm/src/index.tsx",
                lineNumber: 1980,
                columnNumber: 17
              }),
              data.labels.addblock
            ] }, void 0, true, {
              fileName: "public/my/js/esm/src/index.tsx",
              lineNumber: 1979,
              columnNumber: 13
            })
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1973,
            columnNumber: 36
          }
        ),
        palette && /* @__PURE__ */ jsxDEV(
          BlockBrowser,
          {
            labels: data.labels,
            blocks: data.availableblocks,
            discoverUrl: data.discoverurl,
            onInsert: (block) => void add(block),
            onClose: () => setPalette(null)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/index.tsx",
            lineNumber: 1984,
            columnNumber: 21
          }
        ),
        confirmAction && /* @__PURE__ */ jsxDEV(
          ConfirmationDialog,
          {
            title: data.labels.resetheading,
            message: data.labels.confirmreset,
            confirmLabel: data.labels.confirm,
            cancelLabel: data.labels.cancel,
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
            lineNumber: 1991,
            columnNumber: 27
          }
        ),
        /* @__PURE__ */ jsxDEV(Toast, { message: toast, closeLabel: data.labels.close, onClose: hideToast }, void 0, false, {
          fileName: "public/my/js/esm/src/index.tsx",
          lineNumber: 2002,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/index.tsx",
      lineNumber: 1866,
      columnNumber: 12
    }
  );
}, "Dashboard");
var index_default = Dashboard;
export {
  DashboardScopeBanner,
  index_default as default,
  errorMessage
};
//# sourceMappingURL=index.dev.js.map
