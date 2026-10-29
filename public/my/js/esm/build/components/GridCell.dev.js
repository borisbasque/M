var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useString } from "../strings";
import Icon from "./Icon";
const GridCell = /* @__PURE__ */ __name(({ column, row, label, addLabel, addIcon, prospective = false, onActivate }) => {
  const position = useString("gridcellposition", "my", { row: row + 1, column: column + 1 });
  const style = {
    gridColumn: `${column + 1}`,
    gridRow: `${row + 1}`
  };
  if (prospective) {
    return /* @__PURE__ */ jsxDEV("div", { className: "core-my-grid-cell core-my-grid-cell--prospective", style, "aria-hidden": "true" }, void 0, false, {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 39,
      columnNumber: 16
    });
  }
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "core-my-grid-cell core-my-grid-cell--available",
      style,
      "aria-label": position ? `${label}, ${position}` : label,
      onClick: () => onActivate?.(column, row),
      children: [
        /* @__PURE__ */ jsxDEV(Icon, { markup: addIcon, className: "core-my-grid-cell__icon" }, void 0, false, {
          fileName: "public/my/js/esm/src/components/GridCell.tsx",
          lineNumber: 48,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("span", { className: "core-my-grid-cell__label", "aria-hidden": "true", children: addLabel }, void 0, false, {
          fileName: "public/my/js/esm/src/components/GridCell.tsx",
          lineNumber: 49,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 41,
      columnNumber: 12
    }
  );
}, "GridCell");
var GridCell_default = GridCell;
export {
  GridCell_default as default
};
//# sourceMappingURL=GridCell.dev.js.map
