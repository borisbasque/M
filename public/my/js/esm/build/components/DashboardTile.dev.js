var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Responsive dashboard tile.
 *
 * @module     core_my/components/DashboardTile
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NARROW_BLOCK_WIDTH } from "../layout";
import { useString } from "../strings";
import { htmlToText } from "../utils";
import DashboardHandle from "./DashboardHandle";
const DashboardTile = /* @__PURE__ */ __name(({
  block,
  item,
  labels,
  icons,
  editing,
  activeMode,
  showControls,
  drag,
  dragOrigin,
  shouldAnimatePosition = false,
  isBumped = false,
  onStart,
  onKeyDown,
  onPointerDown,
  onDirection,
  onCommit
}) => {
  const tileRef = useRef(null);
  const contentRef = useRef(null);
  const previousPosition = useRef(null);
  const positionAnimation = useRef(null);
  const [narrow, setNarrow] = useState(false);
  const moveInstructionsId = `core-my-dashboard-move-instructions-${block.id}`;
  const resizeInstructionsId = `core-my-dashboard-resize-instructions-${block.id}`;
  const titleText = useMemo(() => htmlToText(block.title), [block.title]);
  const tileLabel = useString("dashboardtile", "my", titleText);
  const moveLabel = useString("moveblock", "block", titleText);
  const controlsHtml = useMemo(() => block.controls ? { __html: block.controls } : null, [block.controls]);
  const displayItem = drag && dragOrigin ? dragOrigin : item;
  const titleHtml = useMemo(() => ({ __html: block.title }), [block.title]);
  const contentHtml = useMemo(() => ({
    __html: block.content + (block.footer ? `<div class="footer">${block.footer}</div>` : "")
  }), [block.content, block.footer]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") {
      return void 0;
    }
    const measure = /* @__PURE__ */ __name(() => setNarrow(content.getBoundingClientRect().width < NARROW_BLOCK_WIDTH), "measure");
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) {
      return;
    }
    const scripts = tile.querySelectorAll(".core-my-dashboard-tile__content script");
    scripts.forEach((stale) => {
      const script = document.createElement("script");
      Array.from(stale.attributes).forEach((attribute) => script.setAttribute(attribute.name, attribute.value));
      script.text = stale.textContent ?? "";
      stale.replaceWith(script);
    });
  }, [block.content, block.footer]);
  useLayoutEffect(() => {
    const tile = tileRef.current;
    if (!tile) {
      return;
    }
    positionAnimation.current?.cancel();
    const currentPosition = tile.getBoundingClientRect();
    const priorPosition = previousPosition.current;
    previousPosition.current = currentPosition;
    if (!shouldAnimatePosition || !priorPosition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !tile.animate) {
      return;
    }
    const horizontal = priorPosition.left - currentPosition.left;
    const vertical = priorPosition.top - currentPosition.top;
    if (!horizontal && !vertical) {
      return;
    }
    positionAnimation.current = tile.animate([
      { transform: `translate3d(${horizontal}px, ${vertical}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration: 180,
      easing: "cubic-bezier(.2, 0, 0, 1)"
    });
  }, [item.column, item.columns, item.row, item.rows, shouldAnimatePosition]);
  const classes = [
    "core-my-dashboard-tile",
    // Hidden through the standard menu: still shown while editing, muted, with Show on offer.
    ...block.visible ? [] : ["core-my-dashboard-tile--hidden"],
    activeMode ? "core-my-dashboard-tile--active" : "",
    drag ? "core-my-dashboard-tile--pointer-dragging" : "",
    isBumped ? "core-my-dashboard-tile--bumped" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: tileRef,
      className: classes,
      style: {
        gridColumn: `${displayItem.column + 1} / span ${displayItem.columns}`,
        gridRow: `${displayItem.row + 1} / span ${displayItem.rows}`,
        transform: drag && activeMode === "move" ? `translate3d(${drag.x}px, ${drag.y}px, 0)` : void 0,
        width: drag?.width ? `${drag.width}px` : void 0,
        height: drag?.height ? `${drag.height}px` : void 0
      },
      "aria-label": tileLabel || titleText,
      "data-block": block.name,
      "data-block-id": block.id,
      "data-blockregion": narrow ? "side-pre" : "content",
      "data-bumped": isBumped || void 0,
      children: [
        editing && /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV("span", { id: moveInstructionsId, className: "visually-hidden", children: labels.moveinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 190,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { id: resizeInstructionsId, className: "visually-hidden", children: labels.resizeinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 191,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 189,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("header", { className: "core-my-dashboard-tile__header", children: [
          editing && /* @__PURE__ */ jsxDEV(
            DashboardHandle,
            {
              mode: "move",
              label: moveLabel,
              labels,
              icons,
              instructionsId: moveInstructionsId,
              active: activeMode === "move",
              showControls,
              onStart: () => onStart(block.id, "move"),
              onKeyDown: (event) => onKeyDown(event, block.id, "move"),
              onPointerDown: (event) => onPointerDown(event, block.id, "move"),
              onDirection,
              onCommit
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
              lineNumber: 194,
              columnNumber: 25
            }
          ),
          /* @__PURE__ */ jsxDEV("h2", { className: "core-my-dashboard-tile__title", dangerouslySetInnerHTML: titleHtml }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 210,
            columnNumber: 13
          }),
          editing && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__actions", children: controlsHtml && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__menu", dangerouslySetInnerHTML: controlsHtml }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 215,
            columnNumber: 34
          }) }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 211,
            columnNumber: 25
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 193,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            ref: contentRef,
            className: `core-my-dashboard-tile__content block block_${block.name}`,
            dangerouslySetInnerHTML: contentHtml
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 218,
            columnNumber: 9
          }
        ),
        editing && /* @__PURE__ */ jsxDEV("footer", { className: "core-my-dashboard-tile__dashboard-footer", children: /* @__PURE__ */ jsxDEV(
          DashboardHandle,
          {
            mode: "resize",
            label: labels.resize,
            labels,
            icons,
            instructionsId: resizeInstructionsId,
            active: activeMode === "resize",
            showControls,
            onStart: () => onStart(block.id, "resize"),
            onKeyDown: (event) => onKeyDown(event, block.id, "resize"),
            onPointerDown: (event) => onPointerDown(event, block.id, "resize"),
            onDirection,
            onCommit
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 224,
            columnNumber: 13
          }
        ) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 223,
          columnNumber: 21
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 173,
      columnNumber: 12
    }
  );
}, "DashboardTile");
var DashboardTile_default = DashboardTile;
export {
  DashboardTile_default as default
};
//# sourceMappingURL=DashboardTile.dev.js.map
