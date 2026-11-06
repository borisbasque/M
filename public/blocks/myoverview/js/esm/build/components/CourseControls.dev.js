var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Adjacent star + ellipsis controls (MDL-88968, MDL-88969).
 *
 * In card view this group is positioned at the top-right of the image; in list
 * and summary views the same group sits next to the ellipsis (CSS handles
 * placement). The star precedes the ellipsis in DOM order for correct tabbing.
 *
 * Reads live membership sets here (one subscription per card) and passes the
 * resolved booleans as props so StarButton and EllipsisMenu subscribe only to
 * the stable callbacks context and do not re-render for unrelated card toggles.
 *
 * @module     block_myoverview/components/CourseControls
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCourseMemberships } from "../state";
import StarButton from "@moodle/lms/block_myoverview/components/StarButton";
import EllipsisMenu from "@moodle/lms/block_myoverview/components/EllipsisMenu";
function CourseControls({ course }) {
  const { favourites, hidden } = useCourseMemberships();
  return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-controls", children: [
    /* @__PURE__ */ jsxDEV(
      StarButton,
      {
        courseId: course.id,
        courseName: course.fullnamedisplay,
        isFavourite: favourites.has(course.id)
      },
      void 0,
      false,
      {
        fileName: "public/blocks/myoverview/js/esm/src/components/CourseControls.tsx",
        lineNumber: 50,
        columnNumber: 13
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      EllipsisMenu,
      {
        courseId: course.id,
        courseName: course.fullnamedisplay,
        isHidden: hidden.has(course.id)
      },
      void 0,
      false,
      {
        fileName: "public/blocks/myoverview/js/esm/src/components/CourseControls.tsx",
        lineNumber: 55,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "public/blocks/myoverview/js/esm/src/components/CourseControls.tsx",
    lineNumber: 49,
    columnNumber: 9
  }, this);
}
__name(CourseControls, "CourseControls");
export {
  CourseControls as default
};
//# sourceMappingURL=CourseControls.dev.js.map
