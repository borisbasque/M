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
 * Tests for the reducer's paged-course state.
 *
 * @module     block_myoverview/tests/state
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {hasNextPage, initState, reducer, State} from "../src/state";
import {Course, PAGE_SIZE} from "../src/types";

/**
 * Build a minimal course record.
 *
 * @param id The course id.
 * @param isfavourite Whether the course is a favourite.
 * @returns A course fixture.
 */
const course = (id: number, isfavourite = false): Course => ({
    id,
    fullname: `Course ${id}`,
    fullnamedisplay: `Course ${id}`,
    shortname: `C${id}`,
    coursecategory: "Category 1",
    courseimage: "",
    summary: "",
    hasprogress: false,
    progress: null,
    isfavourite,
    visible: true,
    viewurl: `https://example.com/course/${id}`,
} as unknown as Course);

const fullPage = (startId: number): Course[] =>
    Array.from({length: PAGE_SIZE}, (_, i) => course(startId + i));

const base = (): State => initState({view: "card", filter: "all", sort: "title"}, [5, 6]);

describe("block_myoverview/state paging", () => {
    it("seeds hidden ids and starts with one unknown page", () => {
        const state = base();
        expect(state.hidden.has(5)).toBe(true);
        expect(state.hidden.has(6)).toBe(true);
        expect(state.pages).toEqual([]);
        expect(state.pageOffsets).toEqual([0]);
        expect(state.page).toBe(1);
    });

    it("PAGE_LOADED stores the page, chains the next offset and clears loading for the current page", () => {
        let state = reducer(base(), {type: "SET_LOADING"});
        expect(state.loading).toBe(true);

        state = reducer(state, {type: "PAGE_LOADED", index: 0, courses: fullPage(1), nextoffset: 9});
        expect(state.pages[0]).toHaveLength(PAGE_SIZE);
        expect(state.pageOffsets[1]).toBe(9);
        expect(state.loading).toBe(false);
    });

    it("a silently prefetched page does not clear the current page's loading state", () => {
        let state = reducer(base(), {type: "SET_LOADING"});
        state = reducer(state, {type: "PAGE_LOADED", index: 1, courses: fullPage(10), nextoffset: 18});
        expect(state.loading).toBe(true);
    });

    it("PAGE_LOADED reseeds favourites from server truth without clobbering other pages", () => {
        let state = reducer(base(), {type: "PAGE_LOADED", index: 0, courses: [course(1, true), course(2)], nextoffset: 2});
        expect(state.favourites.has(1)).toBe(true);

        // Page 2 loads: course 3 is a favourite, page 1's entry survives.
        state = reducer(state, {type: "PAGE_LOADED", index: 1, courses: [course(3, true)], nextoffset: 3});
        expect(state.favourites.has(1)).toBe(true);
        expect(state.favourites.has(3)).toBe(true);

        // A reload of page 1 where course 1 is no longer a favourite removes it.
        state = reducer(state, {type: "PAGE_LOADED", index: 0, courses: [course(1, false), course(2)], nextoffset: 2});
        expect(state.favourites.has(1)).toBe(false);
        expect(state.favourites.has(3)).toBe(true);
    });

    it("RESET_PAGES drops all paged data and returns to page 1", () => {
        let state = reducer(base(), {type: "PAGE_LOADED", index: 0, courses: fullPage(1), nextoffset: 9});
        state = reducer(state, {type: "SET_PAGE", page: 2});
        state = reducer(state, {type: "RESET_PAGES"});
        expect(state.page).toBe(1);
        expect(state.pages).toEqual([]);
        expect(state.pageOffsets).toEqual([0]);
    });

    it("hasNextPage is true only when the next page is loaded and non-empty", () => {
        let state = base();
        expect(hasNextPage(state)).toBe(false);

        // Current page full but next page unknown: not yet.
        state = reducer(state, {type: "PAGE_LOADED", index: 0, courses: fullPage(1), nextoffset: 9});
        expect(hasNextPage(state)).toBe(false);

        // Prefetched next page is empty: end of set.
        state = reducer(state, {type: "PAGE_LOADED", index: 1, courses: [], nextoffset: 9});
        expect(hasNextPage(state)).toBe(false);

        // Prefetched next page has courses: pageable.
        state = reducer(state, {type: "PAGE_LOADED", index: 1, courses: [course(10)], nextoffset: 10});
        expect(hasNextPage(state)).toBe(true);

        // Moving onto the last page: nothing beyond it.
        state = reducer(state, {type: "SET_PAGE", page: 2});
        expect(hasNextPage(state)).toBe(false);
    });

    it("hiding a course keeps the user on their current page", () => {
        // The optimistic filter gives instant feedback and the post-toggle refetch
        // trues the pages up — no page-1 bounce.
        let state = reducer(base(), {type: "SET_PAGE", page: 3});
        state = reducer(state, {type: "TOGGLE_HIDDEN", id: 42});
        expect(state.page).toBe(3);
        expect(state.hidden.has(42)).toBe(true);
    });

    it("REPLACE_PAGES swaps the paged data, lands on the given page and reseeds favourites", () => {
        let state = reducer(base(), {type: "SET_PAGE", page: 2});
        state = reducer(state, {type: "TOGGLE_FAVOURITE", id: 99});
        state = reducer(state, {
            type: "REPLACE_PAGES",
            pages: [[{...course(1), isfavourite: true}, course(2)]],
            pageOffsets: [0, 2],
            page: 1,
        });
        expect(state.page).toBe(1);
        expect(state.pages).toHaveLength(1);
        expect(state.pageOffsets).toEqual([0, 2]);
        // Favourites reseeded from the replaced pages' server truth; entries for courses
        // not in the replaced pages (id 99) are preserved.
        expect(state.favourites.has(1)).toBe(true);
        expect(state.favourites.has(2)).toBe(false);
        expect(state.favourites.has(99)).toBe(true);
        expect(state.loading).toBe(false);
    });
});
