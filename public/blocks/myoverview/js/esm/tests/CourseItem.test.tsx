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
 * Tests for the course item's role-independent progress display.
 *
 * @module     block_myoverview/tests/CourseItem
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen} from "@testing-library/react";

// The design-system package is ESM-only, so Jest cannot require it — every suite
// shares the contract-faithful mock in helpers/dsMock.
jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});

import CourseItem from "../src/components/CourseItem";
import {CourseCallbacksContext, CourseMembershipContext, StringsContext} from "../src/state";
import {Course, Strings} from "../src/types";

const strings = new Proxy({}, {get: (_, key) => String(key)}) as Strings;

const noopCallbacks = {toggleFavourite: jest.fn(), toggleHidden: jest.fn()};
const memberships = {favourites: new Set<number>(), hidden: new Set<number>()};

/**
 * Render a CourseItem inside its required contexts.
 *
 * @param course The course to render.
 * @returns The render result.
 */
const renderItem = (course: Course) => render(
    <StringsContext.Provider value={strings}>
        <CourseCallbacksContext.Provider value={noopCallbacks}>
            <CourseMembershipContext.Provider value={memberships}>
                <CourseItem course={course} view="card" displaycategories />
            </CourseMembershipContext.Provider>
        </CourseCallbacksContext.Provider>
    </StringsContext.Provider>,
);

const course = (overrides: Partial<Course>): Course => ({
    id: 1,
    fullname: "Biology 101",
    fullnamedisplay: "Biology 101",
    shortname: "BIO101",
    coursecategory: "Science",
    courseimage: "",
    summary: "",
    hasprogress: true,
    progress: 40,
    isfavourite: false,
    visible: true,
    viewurl: "https://example.com/course/1",
    ...overrides,
} as Course);

describe("block_myoverview/components/CourseItem progress", () => {
    it("shows progress whenever the course reports it — no role gating (old-block parity)", () => {
        renderItem(course({}));
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("omits progress when the course has none to report", () => {
        renderItem(course({hasprogress: false, progress: null}));
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
});
