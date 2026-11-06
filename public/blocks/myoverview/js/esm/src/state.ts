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
 * Reducer, state shape and actions context for the course overview component.
 *
 * View, filter, sort and search are stored as independent slices; none of them
 * clears another (MDL-88973). Course data is paged server-side:
 * `pages` accumulates the loaded pages for the current query and
 * `pageOffsets` records the web service offset each page was (or will be)
 * fetched from, chained through the service's returned nextoffset. Any change
 * to the query resets the paged data via RESET_PAGES, dispatched by the fetch
 * orchestration in app.tsx when its query key changes.
 *
 * @module     block_myoverview/state
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {createContext, useContext} from "react";
import type {Course, Filter, ServerPreferences, Sort, Strings, View} from "./types";
import {DEFAULT_FILTER, DEFAULT_SORT, DEFAULT_VIEW} from "./types";

/** The full UI state. */
export type State = {
    view: View;
    filter: Filter;
    sort: Sort;
    search: string;
    /** Current page, 1-based. */
    page: number;
    /** Loaded pages for the current query; index 0 = page 1. Holes = not yet loaded. */
    pages: Course[][];
    /** The WS offset each page is fetched from, chained nextoffsets; index i = page i+1. */
    pageOffsets: number[];
    favourites: Set<number>;
    /**
     * Course ids with an in-flight favourite write. The per-page favourites
     * reseed skips these so a fetch processed before the write commits cannot
     * silently revert an optimistic star (it settles when the write resolves).
     */
    pendingfavourites: Set<number>;
    hidden: Set<number>;
    loading: boolean;
    error: string | null;
    customfieldvalue: string | null;
};


/** All reducer actions. */
export type Action =
    | {type: "SET_VIEW"; view: View}
    | {type: "SET_FILTER"; filter: Filter}
    | {type: "SET_SORT"; sort: Sort}
    | {type: "SET_SEARCH"; search: string}
    | {type: "SET_PAGE"; page: number}
    | {type: "SET_CUSTOMFIELDVALUE"; value: string}
    | {type: "RESET_PAGES"}
    | {type: "PAGE_LOADED"; index: number; courses: Course[]; nextoffset: number}
    | {type: "REPLACE_PAGES"; pages: Course[][]; pageOffsets: number[]; page: number}
    | {type: "SET_LOADING"}
    | {type: "SET_ERROR"; error: string}
    | {type: "TOGGLE_FAVOURITE"; id: number}
    | {type: "FAVOURITE_SETTLED"; id: number}
    | {type: "TOGGLE_HIDDEN"; id: number};


/**
 * Build the initial state from the server-provided preferences.
 *
 * @param prefs The user's stored view/filter/sort/customfield preferences.
 * @param hiddenids Ids of the user's hidden courses, seeded server-side.
 * @returns The initial reducer state.
 */
export const initState = (prefs: ServerPreferences, hiddenids: number[] = []): State => ({
    view: prefs.view ?? DEFAULT_VIEW,
    filter: prefs.filter ?? DEFAULT_FILTER,
    sort: prefs.sort ?? DEFAULT_SORT,
    search: "",
    page: 1,
    pages: [],
    pageOffsets: [0],
    favourites: new Set<number>(),
    pendingfavourites: new Set<number>(),
    hidden: new Set<number>(hiddenids),
    loading: false,
    error: null,
    customfieldvalue: prefs.customfieldvalue ?? null,
});

/**
 * Whether a loaded, non-empty page exists after the current one.
 *
 * Strictly prefetch-confirmed: the next page must actually have been loaded
 * (app.tsx prefetches it whenever the current page is full), so "Next" never
 * navigates onto an empty page.
 *
 * @param state The current state.
 * @returns True when the user can page forward.
 */
export const hasNextPage = (state: State): boolean =>
    (state.pages[state.page] ?? []).length > 0;

/**
 * Reseed the favourites set from server course records.
 *
 * Ids with an in-flight favourite write (pendingfavourites) are skipped so a
 * page reseed cannot clobber the optimistic value before the server settles.
 *
 * @param favourites The set to update in place.
 * @param courses The server course records to reseed from.
 * @param pending Ids owned by an in-flight favourite write.
 */
const reseedFavourites = (favourites: Set<number>, courses: Course[], pending: Set<number>): void => {
    courses.forEach((c) => {
        if (pending.has(c.id)) {
            return; // An in-flight write owns this id; keep the optimistic value.
        }
        if (c.isfavourite) {
            favourites.add(c.id);
        } else {
            favourites.delete(c.id);
        }
    });
};

/**
 * Reducer for all course overview state transitions.
 *
 * @param state The current state.
 * @param action The action to apply.
 * @returns The next state.
 */
export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "SET_VIEW":
            return {...state, view: action.view};
        case "SET_FILTER":
            return {...state, filter: action.filter};
        case "SET_SORT":
            return {...state, sort: action.sort};
        case "SET_SEARCH":
            return {...state, search: action.search};
        case "SET_PAGE":
            return {...state, page: action.page};
        case "SET_CUSTOMFIELDVALUE":
            return {...state, customfieldvalue: action.value};
        case "RESET_PAGES":
            // The query changed (filter/sort/search/custom-field/view): drop all paged data
            // and return to page 1. Dispatched from the fetch orchestration, which is the
            // only place that knows the effective (debounced) query actually changed.
            return {...state, page: 1, pages: [], pageOffsets: [0]};
        case "PAGE_LOADED": {
            const pages = state.pages.slice();
            pages[action.index] = action.courses;
            const pageOffsets = state.pageOffsets.slice();
            pageOffsets[action.index + 1] = action.nextoffset;
            // Reseed favourites from this page's server truth: each course carries its own
            // isfavourite flag, so stars reflect what the server returned, while entries
            // from other loaded pages are preserved.
            const favourites = new Set(state.favourites);
            reseedFavourites(favourites, action.courses, state.pendingfavourites);
            const iscurrent = action.index === state.page - 1;
            return {
                ...state,
                pages,
                pageOffsets,
                favourites,
                loading: iscurrent ? false : state.loading,
                error: iscurrent ? null : state.error,
            };
        }
        case "REPLACE_PAGES": {
            // A post-toggle refetch swaps the whole paged dataset silently (no loading
            // state) and lands the user on the nearest page that still exists. Favourites
            // are reseeded from every replaced page's server truth.
            const favourites = new Set(state.favourites);
            action.pages.forEach(
                (pagecourses) => reseedFavourites(favourites, pagecourses, state.pendingfavourites));
            return {
                ...state,
                pages: action.pages,
                pageOffsets: action.pageOffsets,
                page: action.page,
                favourites,
                loading: false,
                error: null,
            };
        }
        case "SET_LOADING":
            return {...state, loading: true, error: null};
        case "SET_ERROR":
            return {...state, error: action.error, loading: false};
        case "TOGGLE_FAVOURITE": {
            const favourites = new Set(state.favourites);
            if (favourites.has(action.id)) {
                favourites.delete(action.id);
            } else {
                favourites.add(action.id);
            }
            const pendingfavourites = new Set(state.pendingfavourites);
            pendingfavourites.add(action.id);
            return {...state, favourites, pendingfavourites};
        }
        case "FAVOURITE_SETTLED": {
            const pendingfavourites = new Set(state.pendingfavourites);
            pendingfavourites.delete(action.id);
            return {...state, pendingfavourites};
        }
        case "TOGGLE_HIDDEN": {
            // No page reset: the user stays where they are (the optimistic filter gives
            // instant feedback and the post-toggle refetch trues up the pages).
            const hidden = new Set(state.hidden);
            if (hidden.has(action.id)) {
                hidden.delete(action.id);
            } else {
                hidden.add(action.id);
            }
            return {...state, hidden};
        }
        default:
            return state;
    }
};


/** Stable dispatch-bound callbacks — reference never changes after mount. */
export type CourseCallbacks = {
    toggleFavourite: (id: number) => void;
    toggleHidden: (id: number) => void;
};

/** Live membership sets — reference changes on each star or hide action. */
export type CourseMemberships = {
    favourites: ReadonlySet<number>;
    hidden: ReadonlySet<number>;
};


export const CourseCallbacksContext = createContext<CourseCallbacks | null>(null);
export const CourseMembershipContext = createContext<CourseMemberships | null>(null);

/**
 * Access the stable toggle callbacks.
 *
 * @returns The CourseCallbacks provided by the app root.
 */
export const useCourseCallbacks = (): CourseCallbacks => {
    const ctx = useContext(CourseCallbacksContext);
    if (ctx === null) {
        throw new Error("useCourseCallbacks must be used within CourseCallbacksContext");
    }
    return ctx;
};

/**
 * Access the live starred/hidden membership sets.
 *
 * @returns The CourseMemberships provided by the app root.
 */
export const useCourseMemberships = (): CourseMemberships => {
    const ctx = useContext(CourseMembershipContext);
    if (ctx === null) {
        throw new Error("useCourseMemberships must be used within CourseMembershipContext");
    }
    return ctx;
};

export const StringsContext = createContext<Strings | null>(null);

/**
 * Access the UI strings context.
 *
 * @returns The Strings provided by the app root.
 */
export const useStrings = (): Strings => {
    const ctx = useContext(StringsContext);
    if (ctx === null) {
        throw new Error("useStrings must be used within StringsContext");
    }
    return ctx;
};
