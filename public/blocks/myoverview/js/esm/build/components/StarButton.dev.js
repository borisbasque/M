var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Standalone star/favourite control (MDL-88969).
 *
 * Delegates to the DS FavouriteButton — selected/unselected icon state,
 * aria-pressed, focus ring, and hover/active colours are all owned by the DS.
 *
 * Receives isFavourite as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/StarButton
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { FavouriteButton } from "@moodlehq/design-system";
import { useCourseCallbacks, useStrings } from "../state";
function StarButton({ courseId, courseName, isFavourite }) {
  const { toggleFavourite } = useCourseCallbacks();
  const strings = useStrings();
  const label = isFavourite ? strings.removefromstarred.replace("{$a}", courseName) : strings.starcourse.replace("{$a}", courseName);
  return /* @__PURE__ */ jsxDEV(
    FavouriteButton,
    {
      selected: isFavourite,
      "aria-label": label,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavourite(courseId);
      }
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/StarButton.tsx",
      lineNumber: 53,
      columnNumber: 9
    },
    this
  );
}
__name(StarButton, "StarButton");
export {
  StarButton as default
};
//# sourceMappingURL=StarButton.dev.js.map
