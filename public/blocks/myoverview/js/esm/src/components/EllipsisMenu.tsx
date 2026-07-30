// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Card overflow (ellipsis) menu (MDL-88968).
 *
 * Always visible (not hover-reveal). Opens on click/tap, closes on outside
 * click or Escape, and returns focus to the trigger on close. The star/favourite
 * action is intentionally NOT here (it is the standalone StarButton, MDL-88969);
 * the menu retains Hide/Show course, which drives the "removed from view" filter.
 *
 * Keyboard: Tab closes the menu; Escape closes and returns focus to trigger.
 * Roving focus is provided by the shared useDismissableMenu hook.
 *
 * Receives isHidden as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/EllipsisMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useDismissableMenu} from "../hooks/useDismissableMenu";
import {useDismissableTooltip} from "../hooks/useDismissableTooltip";
import {useCourseCallbacks, useStrings} from "../state";
import Icon from "@moodle/lms/block_myoverview/components/Icon";

type EllipsisMenuProps = {
    courseId: number;
    courseName: string;
    isHidden: boolean;
};

/**
 * Render the per-card overflow menu.
 *
 * @param props The course id, name, and current hidden state.
 * @returns The ellipsis trigger and (when open) its menu.
 */
export default function EllipsisMenu({courseId, courseName, isHidden}: EllipsisMenuProps) {
    const {toggleHidden} = useCourseCallbacks();
    const strings = useStrings();
    const {open, setOpen, containerRef, triggerRef, menuRef, handleMenuKeyDown} =
        useDismissableMenu("menuitem");
    const {tooltipAttr, tooltipTriggerProps} = useDismissableTooltip();

    const stop = (e: {preventDefault: () => void; stopPropagation: () => void}) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const actionsLabel = strings.actionsfor.replace("{$a}", courseName);

    return (
        <div className="courseoverview-menu" ref={containerRef}>
            <button
                type="button"
                ref={triggerRef}
                className="courseoverview-iconbtn"
                aria-haspopup="menu"
                aria-expanded={open}
                data-tooltip={tooltipAttr(strings.courseactions)}
                onClick={(e) => {
                    stop(e);
                    setOpen((v) => !v);
                }}
                {...tooltipTriggerProps}
            >
                <Icon name="ellipsis-vertical" />
                {/* The accessible name, as visually-hidden text rather than an aria-label: the
                    same pattern the pre-React block used (MDL-79755), which also keeps the
                    decoded course name findable as text by the Behat encoding scenarios. */}
                <span className="visually-hidden">{actionsLabel}</span>
            </button>
            {open && (
                <div
                    className="courseoverview-menu__list"
                    role="menu"
                    aria-label={actionsLabel}
                    ref={menuRef}
                    onKeyDown={handleMenuKeyDown}
                >
                    <button
                        type="button"
                        role="menuitem"
                        className="courseoverview-menu__item"
                        onClick={(e) => {
                            stop(e);
                            toggleHidden(courseId);
                            setOpen(false);
                            triggerRef.current?.focus();
                        }}
                    >
                        <Icon name={isHidden ? "eye" : "eye-slash"} className="courseoverview-menu__icon" />
                        {isHidden ? strings.showcourse : strings.hidecourse}
                    </button>
                </div>
            )}
        </div>
    );
}
