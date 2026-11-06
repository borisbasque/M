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

import type {Course} from "../types";
import {useCourseMemberships} from "../state";
import StarButton from "@moodle/lms/block_myoverview/components/StarButton";
import EllipsisMenu from "@moodle/lms/block_myoverview/components/EllipsisMenu";

type CourseControlsProps = {
    course: Course;
};

/**
 * Render the card's interactive controls.
 *
 * @param props The course.
 * @returns The controls group.
 */
export default function CourseControls({course}: CourseControlsProps) {
    const {favourites, hidden} = useCourseMemberships();
    return (
        <div className="courseoverview-controls">
            <StarButton
                courseId={course.id}
                courseName={course.fullnamedisplay}
                isFavourite={favourites.has(course.id)}
            />
            <EllipsisMenu
                courseId={course.id}
                courseName={course.fullnamedisplay}
                isHidden={hidden.has(course.id)}
            />
        </div>
    );
}
