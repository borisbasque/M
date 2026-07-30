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
 * Data-access layer for the course overview block (MDL-88965).
 *
 * All AJAX calls live here — components never talk to @moodle/lms/core/ajax or
 * core/fetch directly (the block_timeline reference pattern, MDL-88287).
 *
 * Two mechanisms, matching the block's original AMD split:
 *  - Course data + favourites use classic web services via @moodle/lms/core/ajax's
 *    fetchOne (same request shape as amd/src/repository.js), which gives the
 *    platform's error shape, GET/POST fallback and session-timeout handling.
 *  - Preference writes use REST v2 via @moodle/lms/core/fetch, POSTing to
 *    current/preferences/{name} exactly as core_user/repository.js does. Passing
 *    `value: null` unsets the preference — essential for un-hiding a course, since
 *    course/lib.php reads the hidden preference with a plain PHP truthy check and a
 *    literal "false" string would read as truthy.
 *
 * The site root URL and session key are not read here: fetchOne and
 * Fetch.performPost both resolve them from @moodle/lms/core/config internally, so
 * they are neither props nor arguments.
 *
 * @module     block_myoverview/repository
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fetchOne} from "@moodle/lms/core/ajax";
import Fetch from "@moodle/lms/core/fetch";
import type {Course, Sort, View} from "./types";

// Summary view needs summary/summaryformat; card/list views omit them to keep the
// payload small. The web service intersects this list with the exporter's declared
// properties, so only names from course_summary_exporter::define_properties() belong
// here; computed "other" properties (fullnamedisplay, coursecategory, showshortname,
// courseimage, ...) are always exported and must not be listed — an all-invalid list
// would fall back to selecting every field.
const CARDLIST_REQUIRED_FIELDS = [
    "id", "fullname", "shortname", "visible", "enddate",
];
const SUMMARY_REQUIRED_FIELDS = [...CARDLIST_REQUIRED_FIELDS, "summary", "summaryformat"];

/** Map a React Sort constant to the ORDER BY string the web service expects. */
const SORT_SQL_MAP: Record<Sort, string> = {
    title: "fullname",
    shortname: "shortname",
    lastaccessed: "ul.timeaccess desc",
    startdate: "startdate",
};

/** Preference key constants — must match block_myoverview_user_preferences() in lib.php. */
export const PREF_VIEW = "block_myoverview_user_view_preference";
export const PREF_FILTER = "block_myoverview_user_grouping_preference";
export const PREF_SORT = "block_myoverview_user_sort_preference";
export const PREF_CFVALUE = "block_myoverview_user_grouping_customfieldvalue_preference";
export const hiddenPrefName = (courseId: number): string => `block_myoverview_hidden_course_${courseId}`;


type GetCoursesArgs = {
    classification: string;
    sort: Sort;
    limit: number;
    offset: number;
    view: View;
    customfieldname?: string;
    customfieldvalue?: string;
    searchvalue?: string;
};


/**
 * Decode the HTML entities the web service's string formatting produces.
 *
 * external_format_string() HTML-encodes course names and categories (e.g. & as
 * &amp;). The old Mustache templates rendered those fields raw; React escapes
 * text on render, so without decoding first the entities would display
 * double-encoded (MDL-79755). Decoding to plain text and letting React do the
 * escaping keeps the output safe.
 *
 * @param encoded The entity-encoded string from the web service.
 * @returns The decoded plain-text string.
 */
function decodeEntities(encoded: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = encoded;
    return textarea.value;
}

/**
 * Fetch a page of enrolled courses for the given classification.
 *
 * @param args The classification, sort, paging window, view and optional filters.
 * @returns The courses page (display fields entity-decoded) and the next offset.
 */
export async function getCourses(
    args: GetCoursesArgs,
): Promise<{courses: Course[]; nextoffset: number}> {
    const {sort, view, ...rest} = args;
    const response = await fetchOne<{courses: Course[]; nextoffset: number}>({
        methodname: "core_course_get_enrolled_courses_by_timeline_classification",
        args: {
            ...rest,
            sort: SORT_SQL_MAP[sort],
            requiredfields: view === "summary" ? SUMMARY_REQUIRED_FIELDS : CARDLIST_REQUIRED_FIELDS,
        },
    });
    return {
        ...response,
        courses: response.courses.map((c) => ({
            ...c,
            fullnamedisplay: decodeEntities(c.fullnamedisplay),
            coursecategory: decodeEntities(c.coursecategory ?? ""),
        })),
    };
}

/**
 * Set or unset a course as a favourite.
 *
 * @param courseId The course id.
 * @param favourite Whether the course should be a favourite.
 */
export async function setFavourite(courseId: number, favourite: boolean): Promise<void> {
    return fetchOne({
        methodname: "core_course_set_favourite_courses",
        args: {courses: [{id: courseId, favourite}]},
    });
}

/**
 * Write (or, with a null value, unset) a user preference via the REST v2 endpoint.
 *
 * @param name The preference name.
 * @param value The value to store, or null to unset it.
 */
async function writePreference(name: string, value: string | null): Promise<void> {
    await Fetch.performPost("core_user", `current/preferences/${name}`, {body: {value}});
}

/**
 * Persist a user preference.
 *
 * @param name The preference name.
 * @param value The value to store.
 */
export async function setPreference(name: string, value: string): Promise<void> {
    return writePreference(name, value);
}

/**
 * Hide or restore a course from the timeline. Restoring passes a null value so
 * the preference is unset rather than stored as a falsey string.
 *
 * @param courseId The course id.
 * @param hidden Whether the course should be hidden.
 */
export async function setCourseHidden(courseId: number, hidden: boolean): Promise<void> {
    return writePreference(hiddenPrefName(courseId), hidden ? "1" : null);
}
