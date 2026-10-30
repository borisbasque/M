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
import { Button, Dropdown, DropdownItemAction } from "@moodlehq/design-system";
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
const BlockActionsMenu = /* @__PURE__ */ __name(({ label, icon, actions, onDelete }) => /* @__PURE__ */ jsxDEV(
  Dropdown,
  {
    className: "core-my-dashboard-tile__menu",
    label,
    iconOnly: true,
    startIcon: renderIcon(icon),
    appearance: "subtle",
    placement: "bottom-end",
    children: actions.map((action) => action.key === "delete" ? /* @__PURE__ */ jsxDEV(
      DropdownItemAction,
      {
        label: action.label,
        variant: "danger",
        startIcon: action.icon ? renderIcon(action.icon) : void 0,
        onClick: onDelete
      },
      action.key,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
        lineNumber: 55,
        columnNumber: 11
      }
    ) : /* @__PURE__ */ jsxDEV(
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
        lineNumber: 62,
        columnNumber: 11
      }
    ))
  },
  void 0,
  false,
  {
    fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
    lineNumber: 46,
    columnNumber: 87
  }
), "BlockActionsMenu");
const POSITION_ANIMATION_MS = 180;
const HEADER_CONTROLS = 'button, a, input, select, textarea, label, [role="button"], [data-bs-toggle]';
const HEADER_DRAG_THRESHOLD = 4;
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
  const deleteAction = block.actions.find((action) => action.key === "delete");
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
    editing ? "core-my-dashboard-tile--editing" : "",
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
            lineNumber: 292,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { id: resizeInstructionsId, className: "visually-hidden", children: labels.resizeinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 293,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 291,
          columnNumber: 21
        }),
        editing && deleteAction && /* @__PURE__ */ jsxDEV(
          Button,
          {
            variant: "secondary",
            className: "core-my-dashboard-tile__delete",
            "aria-label": deleteAction.label,
            startIcon: renderIcon(icons.remove),
            onClick: () => onDelete(block.id, titleText)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 296,
            columnNumber: 37
          }
        ),
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
              lineNumber: 304,
              columnNumber: 25
            }
          ),
          /* @__PURE__ */ jsxDEV("h2", { className: "core-my-dashboard-tile__title", dangerouslySetInnerHTML: titleHtml }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 320,
            columnNumber: 13
          }),
          editing && block.actions.length > 0 && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__actions", children: /* @__PURE__ */ jsxDEV(
            BlockActionsMenu,
            {
              label: actionsLabel || block.actions[0].label,
              icon: icons.menu,
              actions: block.actions,
              onDelete: () => onDelete(block.id, titleText)
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
              lineNumber: 322,
              columnNumber: 17
            }
          ) }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 321,
            columnNumber: 53
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 303,
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
            lineNumber: 330,
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
            lineNumber: 336,
            columnNumber: 13
          }
        ) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 335,
          columnNumber: 21
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 275,
      columnNumber: 12
    }
  );
}, "DashboardTile");
var DashboardTile_default = DashboardTile;
export {
  DashboardTile_default as default
};
//# sourceMappingURL=DashboardTile.dev.js.map
