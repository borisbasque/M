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
const GridCell = /* @__PURE__ */ __name(({
  column,
  row,
  columns = 1,
  rows = 1,
  label,
  addLabel,
  placing = false,
  prospective = false,
  onActivate
}) => {
  const style = {
    gridColumn: `${column + 1} / span ${columns}`,
    gridRow: `${row + 1} / span ${rows}`
  };
  if (prospective) {
    return /* @__PURE__ */ jsxDEV("div", { className: "core-my-grid-cell core-my-grid-cell--prospective", style, "aria-hidden": "true" }, void 0, false, {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 57,
      columnNumber: 16
    });
  }
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "core-my-grid-cell core-my-grid-cell--available",
      style,
      "data-grid-column": column,
      "data-grid-row": row,
      "aria-label": label.replace("{$a->row}", String(row + 1)).replace("{$a->column}", String(column + 1)),
      onClick: () => onActivate?.(column, row, columns, rows),
      children: /* @__PURE__ */ jsxDEV("span", { className: "core-my-grid-cell__label", "aria-hidden": "true", children: [
        !placing && /* @__PURE__ */ jsxDEV("i", { className: "fa fa-plus core-my-grid-cell__icon", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/my/js/esm/src/components/GridCell.tsx",
          lineNumber: 69,
          columnNumber: 26
        }),
        addLabel
      ] }, void 0, true, {
        fileName: "public/my/js/esm/src/components/GridCell.tsx",
        lineNumber: 68,
        columnNumber: 9
      })
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/GridCell.tsx",
      lineNumber: 59,
      columnNumber: 12
    }
  );
}, "GridCell");
var GridCell_default = GridCell;
export {
  GridCell_default as default
};
//# sourceMappingURL=GridCell.dev.js.map
