var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The course collection in the active layout (MDL-88966).
 *
 * Card view renders a responsive grid (1 column on mobile, 3 columns from
 * tablet up, max 9 per page); list and summary views render single-column rows.
 *
 * @module     block_myoverview/components/CourseList
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import CourseItem from "@moodle/lms/block_myoverview/components/CourseItem";
function CourseList({ courses, view, displaycategories }) {
  return /* @__PURE__ */ jsxDEV("div", { className: `courseoverview-list courseoverview-list--${view}`, children: courses.map((course) => /* @__PURE__ */ jsxDEV(
    CourseItem,
    {
      course,
      view,
      displaycategories
    },
    course.id,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/CourseList.tsx",
      lineNumber: 45,
      columnNumber: 17
    },
    this
  )) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/CourseList.tsx",
    lineNumber: 43,
    columnNumber: 9
  }, this);
}
__name(CourseList, "CourseList");
export {
  CourseList as default
};
//# sourceMappingURL=CourseList.dev.js.map
