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
 * The course collection in the active layout (MDL-88966).
 *
 * Card view renders a responsive grid (1 column on mobile, 3 columns from
 * tablet up, max 9 per page); list and summary views render single-column rows.
 *
 * @module     block_myoverview/components/CourseList
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {Course, View} from "../types";
import CourseItem from "@moodle/lms/block_myoverview/components/CourseItem";

type CourseListProps = {
    courses: Course[];
    view: View;
    displaycategories: boolean;
};

/**
 * Render the page of courses in the active view.
 *
 * @param props The (already paginated) courses, view mode and category display flag.
 * @returns The list container.
 */
export default function CourseList({courses, view, displaycategories}: CourseListProps) {
    return (
        <div className={`courseoverview-list courseoverview-list--${view}`}>
            {courses.map((course) => (
                <CourseItem
                    key={course.id}
                    course={course}
                    view={view}
                    displaycategories={displaycategories}
                />
            ))}
        </div>
    );
}
