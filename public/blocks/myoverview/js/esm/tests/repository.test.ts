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
 * Tests for the repository's web-service argument mapping and preference
 * semantics.
 *
 * @module     block_myoverview/tests/repository
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const mockFetchOne = jest.fn();
const mockPerformPost = jest.fn();
jest.mock("@moodle/lms/core/ajax", () => ({
    fetchOne: (...args: unknown[]) => mockFetchOne(...args),
}));
jest.mock("@moodle/lms/core/fetch", () => ({
    __esModule: true,
    "default": {performPost: (...args: unknown[]) => mockPerformPost(...args)},
}));

import {getCourses, setCourseHidden, setPreference, PREF_SORT} from "../src/repository";

describe("block_myoverview/repository", () => {
    beforeEach(() => {
        mockFetchOne.mockResolvedValue({courses: [], nextoffset: 0});
        mockPerformPost.mockResolvedValue(undefined);
    });

    it("maps the sort constant to the web service ORDER BY and passes the paging window", async() => {
        await getCourses({classification: "all", sort: "lastaccessed", limit: 9, offset: 18, view: "card"});
        expect(mockFetchOne).toHaveBeenCalledWith(expect.objectContaining({
            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
            args: expect.objectContaining({
                classification: "all",
                sort: "ul.timeaccess desc",
                limit: 9,
                offset: 18,
            }),
        }));
    });

    it("decodes the entity-encoded display fields the web service returns (MDL-79755)", async() => {
        mockFetchOne.mockResolvedValue({
            courses: [{
                id: 1,
                fullnamedisplay: "Course 1 &amp; &lt; &#039; &quot; &gt;",
                coursecategory: "Cats &amp; Dogs",
            }],
            nextoffset: 1,
        });
        const {courses} = await getCourses({classification: "all", sort: "title", limit: 9, offset: 0, view: "card"});
        expect(courses[0].fullnamedisplay).toBe("Course 1 & < ' \" >");
        expect(courses[0].coursecategory).toBe("Cats & Dogs");
    });

    it("requests summary fields only for the summary view", async() => {
        await getCourses({classification: "all", sort: "title", limit: 9, offset: 0, view: "card"});
        const cardfields = mockFetchOne.mock.calls[0][0].args.requiredfields;
        expect(cardfields).not.toContain("summary");

        await getCourses({classification: "all", sort: "title", limit: 9, offset: 0, view: "summary"});
        const summaryfields = mockFetchOne.mock.calls[1][0].args.requiredfields;
        expect(summaryfields).toContain("summary");
        expect(summaryfields).toContain("summaryformat");
    });

    it("writes preferences to the REST v2 per-preference endpoint", async() => {
        await setPreference(PREF_SORT, "shortname");
        expect(mockPerformPost).toHaveBeenCalledWith(
            "core_user",
            `current/preferences/${PREF_SORT}`,
            {body: {value: "shortname"}},
        );
    });

    it("unsets (not stores a falsey string) when a course is restored to view", async() => {
        // The hidden preference is read with a plain truthy check in course/lib.php, so a
        // literal "false"/"0" string would still read as hidden — restoring must send null.
        await setCourseHidden(42, false);
        expect(mockPerformPost).toHaveBeenCalledWith(
            "core_user",
            "current/preferences/block_myoverview_hidden_course_42",
            {body: {value: null}},
        );

        await setCourseHidden(42, true);
        expect(mockPerformPost).toHaveBeenLastCalledWith(
            "core_user",
            "current/preferences/block_myoverview_hidden_course_42",
            {body: {value: "1"}},
        );
    });
});
