var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * One component for all of the grid's empty space, after the board placeholder states of
 * Cloudscape (default, active and hover):
 *
 * - rest: a merged run of empty cells in edit mode, a button that adds a block there. Its cue
 *   shows on hover and keyboard focus only, so the grid does not fill with plus signs.
 * - active: one grid unit while a block is being moved or resized, so every snap point shows.
 *   After a click or tap on a handle, choosing one places the block there; keyboard users have the
 *   arrow keys instead, so it is hidden from assistive technology.
 * - prospective: where the block will land, one cell per grid unit it covers, at full size in the
 *   preview's tint. While a block moves, it is the active cells themselves that become the preview
 *   (previewDistance 0), and the others shrink back from it (previewDistance above 0).
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useString } from "../strings";
import Icon from "./Icon";
const GridCell = /* @__PURE__ */ __name(({
  column,
  row,
  columns = 1,
  rows = 1,
  state = "rest",
  label = "",
  addLabel = "",
  addIcon = "",
  hidePosition = false,
  previewDistance,
  onActivate,
  onPlace
}) => {
  const position = useString("gridcellposition", "my", { row: row + 1, column: column + 1 });
  const style = {
    gridColumn: `${column + 1} / span ${columns}`,
    gridRow: `${row + 1} / span ${rows}`
  };
  if (state === "prospective") {
    return /* @__PURE__ */ jsxDEV("div", { className: "core-my-grid-cell core-my-grid-cell--prospective", style, "aria-hidden": "true" }, void 0, false, {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 76,
      columnNumber: 16
    });
  }
  if (state === "active") {
    const placing = Boolean(onPlace);
    const previewing = previewDistance !== void 0;
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: [
          "core-my-grid-cell core-my-grid-cell--active",
          placing && "core-my-grid-cell--placing",
          previewDistance === 0 && "core-my-grid-cell--prospective",
          previewing && previewDistance > 0 && "core-my-grid-cell--receded"
        ].filter(Boolean).join(" "),
        style: previewing ? { ...style, "--core-my-preview-distance": previewDistance } : style,
        "aria-hidden": "true",
        onMouseDown: placing ? (event) => event.preventDefault() : void 0,
        onClick: placing ? () => onPlace?.(column, row) : void 0
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/GridCell.tsx",
        lineNumber: 81,
        columnNumber: 16
      }
    );
  }
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "core-my-grid-cell core-my-grid-cell--available",
      style,
      "aria-label": position && !hidePosition ? `${label}, ${position}` : label,
      onClick: (event) => onActivate?.(column, row, event.currentTarget),
      children: /* @__PURE__ */ jsxDEV("span", { className: "core-my-grid-cell__label", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxDEV(Icon, { markup: addIcon, className: "core-my-grid-cell__icon" }, void 0, false, {
          fileName: "public/my/js/esm/src/components/GridCell.tsx",
          lineNumber: 104,
          columnNumber: 13
        }),
        addLabel
      ] }, void 0, true, {
        fileName: "public/my/js/esm/src/components/GridCell.tsx",
        lineNumber: 103,
        columnNumber: 9
      })
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 96,
      columnNumber: 12
    }
  );
}, "GridCell");
var GridCell_default = GridCell;
export {
  GridCell_default as default
};
//# sourceMappingURL=GridCell.dev.js.map
