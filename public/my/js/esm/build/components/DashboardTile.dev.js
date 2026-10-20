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
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  DropdownItemAction
} from "@moodlehq/design-system";
import { NARROW_BLOCK_WIDTH } from "../layout";
import DashboardHandle from "./DashboardHandle";
const BlockActionsMenu = /* @__PURE__ */ __name(({
  blockId,
  actions,
  label
}) => {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxDEV(
    Dropdown,
    {
      className: "core-my-dashboard-block-actions",
      label,
      iconOnly: true,
      appearance: "subtle",
      size: "md",
      startIcon: /* @__PURE__ */ jsxDEV("i", { className: "fa fa-ellipsis-vertical", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
        lineNumber: 52,
        columnNumber: 20
      }),
      placement: "bottom-end",
      open,
      onOpenChange: setOpen,
      children: actions.map((action) => /* @__PURE__ */ jsxDEV(
        DropdownItemAction,
        {
          label: action.label,
          href: action.url,
          "data-action": action.modalform ? "editblock" : void 0,
          "data-blockid": action.modalform ? blockId : void 0,
          "data-blockform": action.modalform || void 0,
          "data-header": action.modalform ? action.label : void 0,
          onClick: () => setOpen(false)
        },
        action.id,
        false,
        {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 57,
          columnNumber: 32
        }
      ))
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 46,
      columnNumber: 12
    }
  );
}, "BlockActionsMenu");
const DashboardTile = /* @__PURE__ */ __name(({
  block,
  item,
  labels,
  editing,
  hidden = false,
  tapping = false,
  activeMode,
  drag,
  dragOrigin,
  shouldAnimatePosition = false,
  isBumped = false,
  highlighted = false,
  onStart,
  onKeyDown,
  onPointerDown,
  onCommit,
  onRemove
}) => {
  const tileRef = useRef(null);
  const contentRef = useRef(null);
  const footerRef = useRef(null);
  const previousPosition = useRef(null);
  const positionAnimation = useRef(null);
  const [narrow, setNarrow] = useState(false);
  const moveInstructionsId = `core-my-dashboard-move-instructions-${block.id}`;
  const resizeInstructionsId = `core-my-dashboard-resize-instructions-${block.id}`;
  const displayItem = drag && dragOrigin ? dragOrigin : item;
  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.content]);
  useLayoutEffect(() => {
    if (footerRef.current) {
      footerRef.current.innerHTML = block.footer;
    }
  }, [block.footer]);
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
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: tileRef,
      className: [
        "core-my-dashboard-tile",
        activeMode && "core-my-dashboard-tile--active",
        drag && "core-my-dashboard-tile--pointer-dragging",
        isBumped && "core-my-dashboard-tile--bumped",
        highlighted && "core-my-dashboard-tile--new"
      ].filter(Boolean).join(" "),
      style: {
        gridColumn: `${displayItem.column + 1} / span ${displayItem.columns}`,
        gridRow: `${displayItem.row + 1} / span ${displayItem.rows}`,
        transform: drag && activeMode === "move" ? `translate3d(${drag.x}px, ${drag.y}px, 0)` : void 0,
        width: drag?.width ? `${drag.width}px` : void 0,
        height: drag?.height ? `${drag.height}px` : void 0
      },
      "aria-label": labels.tile.replace("{$a}", block.title),
      "data-block": block.name,
      "data-block-id": block.id,
      "data-instance-id": block.id,
      "data-blockregion": narrow ? "side-pre" : "content",
      "data-bumped": isBumped || void 0,
      "data-grid-column": displayItem.column,
      "data-grid-row": displayItem.row,
      hidden: hidden || void 0,
      "aria-busy": !block.loaded || void 0,
      children: [
        editing && /* @__PURE__ */ jsxDEV(Fragment, { children: [
          /* @__PURE__ */ jsxDEV("span", { id: moveInstructionsId, className: "visually-hidden", children: labels.moveinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 223,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { id: resizeInstructionsId, className: "visually-hidden", children: labels.resizeinstructions }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 224,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 222,
          columnNumber: 21
        }),
        /* @__PURE__ */ jsxDEV("header", { className: "core-my-dashboard-tile__header", children: [
          editing && /* @__PURE__ */ jsxDEV(
            DashboardHandle,
            {
              mode: "move",
              label: labels.move.replace("{$a}", block.title),
              instructionsId: moveInstructionsId,
              active: activeMode === "move",
              tapping,
              onStart: () => onStart(block.id, "move"),
              onKeyDown: (event) => onKeyDown(event, block.id, "move"),
              onPointerDown: (event) => onPointerDown(event, block.id, "move"),
              onCommit
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
              lineNumber: 227,
              columnNumber: 25
            }
          ),
          /* @__PURE__ */ jsxDEV("h2", { className: "core-my-dashboard-tile__title", title: block.title, children: block.title }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 239,
            columnNumber: 13
          }),
          editing && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__actions", children: [
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                size: "md",
                variant: "ghost",
                className: "core-my-dashboard-remove",
                "aria-label": labels.remove.replace("{$a}", block.title),
                title: labels.remove.replace("{$a}", block.title),
                startIcon: /* @__PURE__ */ jsxDEV("i", { className: "fa fa-xmark", "aria-hidden": "true" }, void 0, false, {
                  fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
                  lineNumber: 247,
                  columnNumber: 32
                }),
                onClick: () => onRemove(block.id)
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
                lineNumber: 241,
                columnNumber: 17
              }
            ),
            /* @__PURE__ */ jsxDEV(
              BlockActionsMenu,
              {
                blockId: block.id,
                actions: block.actions,
                label: labels.blockactions.replace("{$a}", block.title)
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
                lineNumber: 250,
                columnNumber: 17
              }
            )
          ] }, void 0, true, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 240,
            columnNumber: 25
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 226,
          columnNumber: 9
        }),
        !block.loaded && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__placeholder", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-loading__line" }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 258,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-loading__line" }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 259,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-loading__line" }, void 0, false, {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 260,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 257,
          columnNumber: 27
        }),
        block.failed && /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-tile__failed", children: labels.blockfailed }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 262,
          columnNumber: 26
        }),
        /* @__PURE__ */ jsxDEV("div", { ref: contentRef, className: `core-my-dashboard-tile__content block block_${block.name}` }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 263,
          columnNumber: 9
        }),
        block.footer && /* @__PURE__ */ jsxDEV("div", { ref: footerRef, className: "core-my-dashboard-tile__block-footer" }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 264,
          columnNumber: 26
        }),
        editing && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-tile__resize", children: /* @__PURE__ */ jsxDEV(
          DashboardHandle,
          {
            mode: "resize",
            label: labels.resize.replace("{$a}", block.title),
            instructionsId: resizeInstructionsId,
            active: activeMode === "resize",
            tapping,
            onStart: () => onStart(block.id, "resize"),
            onKeyDown: (event) => onKeyDown(event, block.id, "resize"),
            onPointerDown: (event) => onPointerDown(event, block.id, "resize"),
            onCommit
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
            lineNumber: 268,
            columnNumber: 13
          }
        ) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
          lineNumber: 267,
          columnNumber: 21
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/DashboardTile.tsx",
      lineNumber: 193,
      columnNumber: 12
    }
  );
}, "DashboardTile");
var DashboardTile_default = DashboardTile;
export {
  BlockActionsMenu,
  DashboardTile_default as default
};
//# sourceMappingURL=DashboardTile.dev.js.map
