var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Lines the page heading up with the dashboard's blocks.
 *
 * The heading spans the same width as the grid. When the outer columns hold no block - as in the
 * default layout at six columns - it would otherwise reach further out than anything below it. This
 * insets it to run from the leftmost to the rightmost column that has a block, by setting two custom
 * properties on the page, which the theme applies to the page header (my.scss). It follows the
 * committed layout only, never a drag in progress, so the heading moves once, when a block lands.
 *
 * @module     core_my/headingAlignment
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useLayoutEffect } from "react";
import { readGridMetrics, unusedEdgeColumns } from "./layout";
const HEADING_INSET_START = "--core-my-dashboard-heading-inset-start";
const HEADING_INSET_END = "--core-my-dashboard-heading-inset-end";
const useHeadingAlignment = /* @__PURE__ */ __name((gridRef, layout, columnCount) => {
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return void 0;
    }
    const { start, end } = unusedEdgeColumns(layout, columnCount);
    const apply = /* @__PURE__ */ __name(() => {
      const { gap } = readGridMetrics(grid);
      const stride = (grid.getBoundingClientRect().width - gap * (columnCount - 1)) / columnCount + gap;
      document.body.style.setProperty(HEADING_INSET_START, `${Math.max(0, start * stride)}px`);
      document.body.style.setProperty(HEADING_INSET_END, `${Math.max(0, end * stride)}px`);
    }, "apply");
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(grid);
    return () => observer?.disconnect();
  }, [gridRef, layout, columnCount]);
  useLayoutEffect(() => () => {
    document.body.style.removeProperty(HEADING_INSET_START);
    document.body.style.removeProperty(HEADING_INSET_END);
  }, []);
}, "useHeadingAlignment");
export {
  HEADING_INSET_END,
  HEADING_INSET_START,
  useHeadingAlignment
};
//# sourceMappingURL=headingAlignment.dev.js.map
