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

import {FavouriteButton} from "@moodlehq/design-system";
import {useCourseCallbacks, useStrings} from "../state";

type StarButtonProps = {
    courseId: number;
    courseName: string;
    isFavourite: boolean;
};

/**
 * Render the star/unstar toggle for a course card.
 *
 * @param props The course id, name (for the accessible label) and current state.
 * @returns The favourite button.
 */
export default function StarButton({courseId, courseName, isFavourite}: StarButtonProps) {
    const {toggleFavourite} = useCourseCallbacks();
    const strings = useStrings();
    const label = isFavourite
        ? strings.removefromstarred.replace("{$a}", courseName)
        : strings.starcourse.replace("{$a}", courseName);

    return (
        <FavouriteButton
            selected={isFavourite}
            aria-label={label}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavourite(courseId);
            }}
        />
    );
}
