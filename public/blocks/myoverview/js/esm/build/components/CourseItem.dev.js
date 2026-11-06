var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * A single course as a card, list row or summary row (MDL-88966).
 *
 * One component renders all three views; CSS keys off the view modifier class
 * for layout. Anatomy (top to bottom in card view): image with star + ellipsis
 * at top-right, course name, category, then progress (when the course reports it).
 *
 * The whole surface is clickable (MDL-88971) via a stretched link on the title:
 * clicking anywhere navigates to the course, except on the star/ellipsis which
 * stop propagation. DOM order is body-first so tab order is link -> star ->
 * ellipsis (MDL-88978); CSS `order`/grid restores the visual layout.
 *
 * @module     block_myoverview/components/CourseItem
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import CourseImage from "@moodle/lms/block_myoverview/components/CourseImage";
import CourseControls from "@moodle/lms/block_myoverview/components/CourseControls";
import ProgressIndicator from "@moodle/lms/block_myoverview/components/ProgressIndicator";
function CourseItem({ course, view, displaycategories }) {
  const showProgress = course.hasprogress && course.progress !== null;
  const titleId = `co-title-${course.id}`;
  return /* @__PURE__ */ jsxDEV(
    "article",
    {
      className: `courseoverview-card courseoverview-card--${view}`,
      "data-courseid": course.id,
      "aria-labelledby": titleId,
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-card__body", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-card__text", children: [
            /* @__PURE__ */ jsxDEV("a", { id: titleId, className: "courseoverview-card__title stretched-link", href: course.viewurl, children: course.fullnamedisplay }, void 0, false, {
              fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
              lineNumber: 64,
              columnNumber: 21
            }, this),
            displaycategories && course.coursecategory && /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-card__category", children: course.coursecategory }, void 0, false, {
              fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
              lineNumber: 68,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
            lineNumber: 63,
            columnNumber: 17
          }, this),
          view === "summary" && !!course.summary && // The web service returns the summary as formatted, server-filtered HTML
          // (external_format_text with summaryformat), which the old template rendered
          // raw with {{{summary}}} — rendering it as text would show literal tags.
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "courseoverview-card__summary",
              dangerouslySetInnerHTML: { __html: course.summary }
            },
            void 0,
            false,
            {
              fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
              lineNumber: 75,
              columnNumber: 21
            },
            this
          ),
          showProgress && // Card is the narrow layout: label above the bar per MDS guidance;
          // list/summary rows are wide enough for the inline count.
          /* @__PURE__ */ jsxDEV(
            ProgressIndicator,
            {
              progress: course.progress,
              labelVariant: view === "card" ? "title" : "inline"
            },
            void 0,
            false,
            {
              fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
              lineNumber: 83,
              columnNumber: 21
            },
            this
          )
        ] }, void 0, true, {
          fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
          lineNumber: 62,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-card__media", children: [
          /* @__PURE__ */ jsxDEV(CourseImage, { src: course.courseimage }, void 0, false, {
            fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
            lineNumber: 90,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(CourseControls, { course }, void 0, false, {
            fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
            lineNumber: 91,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
          lineNumber: 89,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/CourseItem.tsx",
      lineNumber: 57,
      columnNumber: 9
    },
    this
  );
}
__name(CourseItem, "CourseItem");
export {
  CourseItem as default
};
//# sourceMappingURL=CourseItem.dev.js.map
