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

import {useState} from "react";
import {Dropdown, DropdownItemAction, Tooltip} from "@moodlehq/design-system";
import {useCourseCallbacks, useStrings} from "../state";
import {faIcon} from "@moodle/lms/block_myoverview/components/Icon";

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
    const [open, setOpen] = useState(false);
    const actionsLabel = strings.actionsfor.replace("{$a}", courseName);

    return (
        <Tooltip label={strings.courseactions}>
            <Dropdown
                className="courseoverview-menu"
                label={actionsLabel}
                iconOnly
                appearance="subtle"
                startIcon={faIcon("ellipsis-vertical")}
                placement="bottom-end"
                open={open}
                onOpenChange={setOpen}
                // The card is a stretched link: keep clicks on the menu from reaching it.
                onClick={(e) => e.stopPropagation()}
            >
                <DropdownItemAction
                    label={isHidden ? strings.showcourse : strings.hidecourse}
                    startIcon={faIcon(isHidden ? "eye" : "eye-slash")}
                    onClick={() => {
                        toggleHidden(courseId);
                        setOpen(false);
                    }}
                />
            </Dropdown>
        </Tooltip>
    );
}
