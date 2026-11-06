var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Course list pagination (MDL-88977, reworked for server-side paging).
 *
 * The design-system Pagination in its 'grouped' variant: previous/next controls
 * without page numbers, because the timeline web service returns no total count,
 * so the number of pages is unknowable without fetching the entire course set
 * (which would need an unbounded fetch). The component receives
 * totalPages = current page + 1 whenever the app's silent prefetch has confirmed
 * a non-empty next page, so "Next" never navigates onto an empty page, and the
 * DS component hides itself entirely on a single-page result.
 *
 * @module     block_myoverview/components/Pagination
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Pagination as DSPagination } from "@moodlehq/design-system";
import { useStrings } from "../state";
function Pagination({ page, hasNext, onPage }) {
  const strings = useStrings();
  return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-pagination", children: /* @__PURE__ */ jsxDEV(
    DSPagination,
    {
      variant: "grouped",
      totalPages: hasNext ? page + 1 : page,
      currentPage: page,
      onPageChange: onPage,
      ariaLabel: strings.courseoverview,
      previousPageLabel: strings.previouspage,
      nextPageLabel: strings.nextpage
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/Pagination.tsx",
      lineNumber: 52,
      columnNumber: 13
    },
    this
  ) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/Pagination.tsx",
    lineNumber: 51,
    columnNumber: 9
  }, this);
}
__name(Pagination, "Pagination");
export {
  Pagination as default
};
//# sourceMappingURL=Pagination.dev.js.map
