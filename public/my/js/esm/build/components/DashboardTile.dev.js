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
import { Badge, Button, Dropdown, DropdownItemAction } from "@moodlehq/design-system";
import { NARROW_BLOCK_WIDTH } from "../layout";
import { useString } from "../strings";
import { htmlToText } from "../utils";
import DashboardHandle from "./DashboardHandle";
import { renderIcon } from "./Icon";
const actionAttributes = /* @__PURE__ */ __name((action) => {
  try {
    return JSON.parse(action.attributes);
  } catch {
    return {};
  }
}, "actionAttributes");
const BlockActionsMenu = /* @__PURE__ */ __name(({ label, icon, actions }) => /* @__PURE__ */ jsxDEV(
  Dropdown,
  {
    className: "core-my-dashboard-tile__menu",
    label,
    iconOnly: true,
    startIcon: renderIcon(icon),
    appearance: "subtle",
    placement: "bottom-end",
    children: actions.map((action) => /* @__PURE__ */ jsxDEV(
      DropdownItemAction,
      {
        href: action.url,
        label: action.label,
        variant: action.danger ? "danger" : "default",
        startIcon: action.icon ? renderIcon(action.icon) : void 0,
        ...actionAttributes(action)
      },
      action.key,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
        lineNumber: 53,
        columnNumber: 28
      }
    ))
  },
  void 0,
  false,
  {
    fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
    lineNumber: 45,
    columnNumber: 77
  }
), "BlockActionsMenu");
const TileActions = /* @__PURE__ */ __name(({ block, icons, menuLabel, onDelete }) => {
  const deleteAction = block.actions.find((action) => action.key === "delete");
  const menuActions = block.actions.filter((action) => action.key !== "delete");
  if (!block.actions.length) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__actions", children: [
    deleteAction && /* @__PURE__ */ jsxDEV(
      Button,
      {
        variant: "secondary",
        size: "lg",
        className: "core-my-dashboard-tile__delete",
        "aria-label": deleteAction.label,
        startIcon: renderIcon(icons.remove),
        onClick: onDelete
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
        lineNumber: 82,
        columnNumber: 26
      }
    ),
    menuActions.length > 0 && /* @__PURE__ */ jsxDEV(
      BlockActionsMenu,
      {
        label: menuLabel || menuActions[0].label,
        icon: icons.menu,
        actions: menuActions
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
        lineNumber: 90,
        columnNumber: 36
      }
    )
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
    lineNumber: 81,
    columnNumber: 12
  });
}, "TileActions");
const POSITION_ANIMATION_MS = 180;
const LANDING_ANIMATION_MS = 280;
const HEADER_CONTROLS = 'button, a, input, select, textarea, label, [role="button"], [data-bs-toggle]';
const HEADER_DRAG_THRESHOLD = 4;
const outlinePath = /* @__PURE__ */ __name((w, h, r) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const inset = radius * (1 - Math.SQRT1_2);
  const arc = /* @__PURE__ */ __name((x, y) => `A ${radius} ${radius} 0 0 1 ${x} ${y}`, "arc");
  return [
    `M ${inset} ${inset} ${arc(radius, 0)}`,
    `H ${w - radius} ${arc(w, radius)}`,
    `V ${h - radius} ${arc(w - radius, h)}`,
    `H ${radius} ${arc(0, h - radius)}`,
    `V ${radius} ${arc(inset, inset)}`
  ].join(" ");
}, "outlinePath");
const OutlineSvg = /* @__PURE__ */ __name(({ onEnd }) => {
  const svgRef = useRef(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const tile = svg?.parentElement;
    if (!svg || !tile) {
      return;
    }
    const style = window.getComputedStyle(tile);
    const shift = style.transform && style.transform !== "none" ? new DOMMatrixReadOnly(style.transform) : null;
    const box = tile.getBoundingClientRect();
    const left = box.left - (shift?.e ?? 0);
    const top = box.top - (shift?.f ?? 0);
    const ratio = window.devicePixelRatio || 1;
    const snap = /* @__PURE__ */ __name((value) => Math.round(value * ratio) / ratio, "snap");
    const width = snap(left + box.width) - snap(left);
    const height = snap(top + box.height) - snap(top);
    const border = parseFloat(style.borderTopWidth) || 0;
    const innerWidth = width - 2 * border;
    const innerHeight = height - 2 * border;
    svg.style.width = `${innerWidth}px`;
    svg.style.height = `${innerHeight}px`;
    svg.style.transform = `translate(${snap(left) - left}px, ${snap(top) - top}px)`;
    const d = outlinePath(innerWidth, innerHeight, (parseFloat(style.borderTopLeftRadius) || 0) - border);
    svg.querySelectorAll("path").forEach((path) => path.setAttribute("d", d));
  }, []);
  return /* @__PURE__ */ jsxDEV(
    "svg",
    {
      ref: svgRef,
      className: "core-my-dashboard-tile__drop-outline",
      "aria-hidden": "true",
      focusable: "false",
      onAnimationEnd: (event) => {
        if (event.animationName === "core-my-dashboard-drop-spin-2") {
          onEnd?.();
        }
      },
      children: [
        /* @__PURE__ */ jsxDEV("path", { className: "core-my-dashboard-tile__drop-outline-path", pathLength: 1 }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 217,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("path", { className: "core-my-dashboard-tile__drop-outline-path", pathLength: 1 }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 218,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 205,
      columnNumber: 12
    }
  );
}, "OutlineSvg");
const DropOutline = /* @__PURE__ */ __name(({ dropKey, waiting, onEnd }) => dropKey === void 0 || waiting ? null : /* @__PURE__ */ jsxDEV(OutlineSvg, { onEnd }, dropKey, false, {
  fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
  lineNumber: 224,
  columnNumber: 48
}), "DropOutline");
const useLanding = /* @__PURE__ */ __name((tileRef, positionAnimation, drag, activeMode) => {
  const pointerMoving = Boolean(drag) && activeMode === "move";
  const dragRect = useRef(null);
  const [landing, setLanding] = useState(false);
  useLayoutEffect(() => {
    const tile = tileRef.current;
    if (!tile) {
      return void 0;
    }
    if (pointerMoving) {
      dragRect.current = tile.getBoundingClientRect();
      return void 0;
    }
    const from = dragRect.current;
    dragRect.current = null;
    if (!from || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !tile.animate) {
      return void 0;
    }
    const to = tile.getBoundingClientRect();
    const horizontal = from.left - to.left;
    const vertical = from.top - to.top;
    if (!horizontal && !vertical) {
      return void 0;
    }
    positionAnimation.current?.cancel();
    const animation = tile.animate([
      { transform: `translate3d(${horizontal}px, ${vertical}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration: LANDING_ANIMATION_MS,
      easing: "cubic-bezier(.2, 0, 0, 1)"
    });
    positionAnimation.current = animation;
    setLanding(true);
    const land = /* @__PURE__ */ __name(() => setLanding(false), "land");
    animation.addEventListener("finish", land);
    animation.addEventListener("cancel", land);
    const settle = window.setTimeout(() => {
      if (animation.playState !== "finished") {
        animation.finish();
      }
    }, LANDING_ANIMATION_MS * 2);
    return () => window.clearTimeout(settle);
  }, [positionAnimation, tileRef, pointerMoving, drag?.x, drag?.y]);
  return landing ? "core-my-dashboard-tile--landing" : void 0;
}, "useLanding");
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
  justDropped,
  onDropEnd,
  onStart,
  onKeyDown,
  onPointerDown,
  onDirection,
  onCommit,
  onDelete
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
  const actionsLabel = useString("actionsfor", "core", titleText);
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
      return void 0;
    }
    positionAnimation.current?.cancel();
    const currentPosition = tile.getBoundingClientRect();
    const priorPosition = previousPosition.current;
    previousPosition.current = currentPosition;
    if (!shouldAnimatePosition || !priorPosition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !tile.animate) {
      return void 0;
    }
    const horizontal = priorPosition.left - currentPosition.left;
    const vertical = priorPosition.top - currentPosition.top;
    if (!horizontal && !vertical) {
      return void 0;
    }
    const animation = tile.animate([
      { transform: `translate3d(${horizontal}px, ${vertical}px, 0)` },
      { transform: "translate3d(0, 0, 0)" }
    ], {
      duration: POSITION_ANIMATION_MS,
      easing: "cubic-bezier(.2, 0, 0, 1)"
    });
    positionAnimation.current = animation;
    const settle = window.setTimeout(() => {
      if (animation.playState !== "finished") {
        animation.finish();
      }
    }, POSITION_ANIMATION_MS * 2);
    return () => window.clearTimeout(settle);
  }, [item.column, item.columns, item.row, item.rows, shouldAnimatePosition]);
  const landingClass = useLanding(tileRef, positionAnimation, drag, activeMode);
  const headerPointerDown = /* @__PURE__ */ __name((event) => {
    if (!editing || event.button !== 0 || event.target.closest(HEADER_CONTROLS)) {
      return;
    }
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const begin = { clientX: startX, clientY: startY, preventDefault: /* @__PURE__ */ __name(() => void 0, "preventDefault") };
    const stop = /* @__PURE__ */ __name(() => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }, "stop");
    const move = /* @__PURE__ */ __name((moveEvent) => {
      if (Math.abs(moveEvent.clientX - startX) < HEADER_DRAG_THRESHOLD && Math.abs(moveEvent.clientY - startY) < HEADER_DRAG_THRESHOLD) {
        return;
      }
      stop();
      onPointerDown(begin, block.id, "move");
    }, "move");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }, "headerPointerDown");
  const classes = [
    "core-my-dashboard-tile",
    editing && "core-my-dashboard-tile--editing",
    // Hidden through the standard menu: still shown while editing, muted, with Show on offer.
    !block.visible && "core-my-dashboard-tile--hidden",
    activeMode && "core-my-dashboard-tile--active",
    landingClass,
    drag && "core-my-dashboard-tile--pointer-dragging",
    isBumped && "core-my-dashboard-tile--bumped"
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
            lineNumber: 472,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { id: resizeInstructionsId, className: "visually-hidden", children: labels.resizeinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 473,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 471,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("header", { className: "core-my-dashboard-tile__header", onPointerDown: headerPointerDown, children: [
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
              lineNumber: 476,
              columnNumber: 25
            }
          ),
          /* @__PURE__ */ jsxDEV("h2", { className: "core-my-dashboard-tile__title", dangerouslySetInnerHTML: titleHtml }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 492,
            columnNumber: 13
          }),
          !block.visible && /* @__PURE__ */ jsxDEV(
            Badge,
            {
              className: "core-my-dashboard-tile__badge",
              label: labels.hiddenfromstudents,
              variant: "secondary",
              subtle: true,
              pill: true,
              startIcon: renderIcon(icons.hidden)
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
              lineNumber: 494,
              columnNumber: 32
            }
          ),
          editing && /* @__PURE__ */ jsxDEV(
            TileActions,
            {
              block,
              icons,
              menuLabel: actionsLabel,
              onDelete: () => onDelete(block.id, titleText)
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
              lineNumber: 502,
              columnNumber: 25
            }
          )
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 475,
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
            lineNumber: 509,
            columnNumber: 9
          }
        ),
        /* @__PURE__ */ jsxDEV(DropOutline, { dropKey: justDropped, waiting: Boolean(landingClass), onEnd: onDropEnd }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 514,
          columnNumber: 9
        }),
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
            lineNumber: 516,
            columnNumber: 13
          }
        ) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 515,
          columnNumber: 21
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 455,
      columnNumber: 12
    }
  );
}, "DashboardTile");
var DashboardTile_default = DashboardTile;
export {
  LANDING_ANIMATION_MS,
  DashboardTile_default as default,
  outlinePath
};
//# sourceMappingURL=DashboardTile.dev.js.map
