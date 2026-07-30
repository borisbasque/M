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

import type {Course, View} from "../types";
import CourseImage from "@moodle/lms/block_myoverview/components/CourseImage";
import CourseControls from "@moodle/lms/block_myoverview/components/CourseControls";
import ProgressIndicator from "@moodle/lms/block_myoverview/components/ProgressIndicator";

type CourseItemProps = {
    course: Course;
    view: View;
    displaycategories: boolean;
};

/**
 * Render one course in the active view.
 *
 * @param props The course, view mode and category display flag.
 * @returns The course item element.
 */
export default function CourseItem({course, view, displaycategories}: CourseItemProps) {
    // Progress is shown whenever the course reports it, regardless of role — parity with the
    // pre-React block, which gated only on hasprogress.
    const showProgress = course.hasprogress && course.progress !== null;

    const titleId = `co-title-${course.id}`;

    return (
        <article
            className={`courseoverview-card courseoverview-card--${view}`}
            data-courseid={course.id}
            aria-labelledby={titleId}
        >
            <div className="courseoverview-card__body">
                <div className="courseoverview-card__text">
                    <a id={titleId} className="courseoverview-card__title stretched-link" href={course.viewurl}>
                        {course.fullnamedisplay}
                    </a>
                    {displaycategories && course.coursecategory && (
                        <div className="courseoverview-card__category">{course.coursecategory}</div>
                    )}
                </div>
                {view === "summary" && !!course.summary && (
                    // The web service returns the summary as formatted, server-filtered HTML
                    // (external_format_text with summaryformat), which the old template rendered
                    // raw with {{{summary}}} — rendering it as text would show literal tags.
                    <div
                        className="courseoverview-card__summary"
                        dangerouslySetInnerHTML={{__html: course.summary}}
                    />
                )}
                {showProgress && (
                    // Card is the narrow layout: label above the bar per MDS guidance;
                    // list/summary rows are wide enough for the inline count.
                    <ProgressIndicator
                        progress={course.progress as number}
                        labelVariant={view === "card" ? "title" : "inline"}
                    />
                )}
            </div>
            <div className="courseoverview-card__media">
                <CourseImage src={course.courseimage} />
                <CourseControls course={course} />
            </div>
        </article>
    );
}
