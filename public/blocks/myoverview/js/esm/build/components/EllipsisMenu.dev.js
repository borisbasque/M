var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Card overflow (ellipsis) menu (MDL-88968).
 *
 * A design system Dropdown with an icon-only subtle trigger, always visible (not
 * hover-reveal). The design system handles opening, Escape, outside clicks,
 * keyboard movement and returning focus to the trigger. The star/favourite
 * action is intentionally NOT here (it is the standalone StarButton, MDL-88969);
 * the menu retains Hide/Show course, which drives the "removed from view" filter.
 *
 * Receives isHidden as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/EllipsisMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useState } from "react";
import { Dropdown, DropdownItemAction, Tooltip } from "@moodlehq/design-system";
import { useCourseCallbacks, useStrings } from "../state";
import { faIcon } from "@moodle/lms/block_myoverview/components/Icon";
function EllipsisMenu({ courseId, courseName, isHidden }) {
  const { toggleHidden } = useCourseCallbacks();
  const strings = useStrings();
  const [open, setOpen] = useState(false);
  const actionsLabel = strings.actionsfor.replace("{$a}", courseName);
  return /* @__PURE__ */ jsxDEV(Tooltip, { label: strings.courseactions, children: /* @__PURE__ */ jsxDEV(
    Dropdown,
    {
      className: "courseoverview-menu",
      label: actionsLabel,
      iconOnly: true,
      appearance: "subtle",
      startIcon: faIcon("ellipsis-vertical"),
      placement: "bottom-end",
      open,
      onOpenChange: setOpen,
      onClick: (e) => e.stopPropagation(),
      children: /* @__PURE__ */ jsxDEV(
        DropdownItemAction,
        {
          label: isHidden ? strings.showcourse : strings.hidecourse,
          startIcon: faIcon(isHidden ? "eye" : "eye-slash"),
          onClick: () => {
            toggleHidden(courseId);
            setOpen(false);
          }
        },
        void 0,
        false,
        {
          fileName: "public/blocks/myoverview/js/esm/src/components/EllipsisMenu.tsx",
          lineNumber: 70,
          columnNumber: 17
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/EllipsisMenu.tsx",
      lineNumber: 58,
      columnNumber: 13
    },
    this
  ) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/EllipsisMenu.tsx",
    lineNumber: 57,
    columnNumber: 9
  }, this);
}
__name(EllipsisMenu, "EllipsisMenu");
export {
  EllipsisMenu as default
};
//# sourceMappingURL=EllipsisMenu.dev.js.map
