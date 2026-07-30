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
 * Server-side paging orchestration for the course overview block.
 *
 * Each page is fetched with limit PAGE_SIZE, chaining offsets through the web
 * service's returned nextoffset — the only offset arithmetic valid for every
 * classification (favourites/customfield filter after retrieval, so the number
 * of records kept is smaller than the number processed). Whenever the current
 * page is full, the next page is silently prefetched, matching the old AMD
 * block's two-pages-per-fetch model; "Next" only enables once that prefetch
 * confirms a non-empty page. A failed prefetch is retried a bounded number of
 * times so a transient error cannot permanently disable "Next".
 *
 * A search is mutually exclusive with the grouping filter (the search
 * classification overrides it, as the old block behaved) and never touches the
 * filter preference.
 *
 * Guards: queryKeyRef ignores responses that land after the query changed
 * (fetchOne has no per-call cancellation); generationRef ignores responses that
 * land after refetchAfterToggle() replaced the paged data; inflightRef prevents
 * duplicate fetches of the same page.
 *
 * @module     block_myoverview/hooks/usePagedCourses
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Dispatch, useCallback, useLayoutEffect, useRef, useState} from "react";
import {getCourses} from "../repository";
import type {Action, State} from "../state";
import type {Config, Course} from "../types";
import {PAGE_SIZE} from "../types";

/** How often a failed silent prefetch is retried before giving up. */
const MAX_PREFETCH_ATTEMPTS = 3;

type UsePagedCoursesArgs = {
    state: State;
    dispatch: Dispatch<Action>;
    config: Config;
    debouncedSearch: string;
};

type UsePagedCoursesResult = {
    /** Whether a search term is active (search overrides the grouping filter). */
    searching: boolean;
    /**
     * Silently reload every page up to the user's current one after a
     * hide/restore or star change made the cached pages stale, keeping the
     * user's position where it still exists.
     */
    refetchAfterToggle: () => void;
};

/**
 * Drive the paged course data for the current query.
 *
 * @param args The reducer state/dispatch, block config and debounced search term.
 * @returns The searching flag and the post-toggle refetch callback.
 */
export function usePagedCourses(
    {state, dispatch, config, debouncedSearch}: UsePagedCoursesArgs,
): UsePagedCoursesResult {
    const {view, filter, sort, page, customfieldvalue, pages, pageOffsets} = state;
    const searching = debouncedSearch.trim() !== "";
    // Only the summary view changes the request shape (its rows need the extra
    // summary fields, see repository.ts requiredfields); card and list request
    // byte-identical data, so switching between them must NOT reset the loaded
    // pages or send the user back to page 1. Key on the boolean, not the view.
    const needsSummaryFields = view === "summary";
    const queryKey = JSON.stringify(
        searching
            ? ["search", sort, debouncedSearch, needsSummaryFields]
            : [filter, sort, customfieldvalue, needsSummaryFields],
    );

    const queryKeyRef = useRef<string | null>(null);
    const generationRef = useRef(0);
    const inflightRef = useRef<Set<number>>(new Set());
    // A failed silent prefetch changes none of the fetch effect's dependencies, so bumping
    // retryTick is what re-runs the effect for a bounded retry (attemptsRef counts per page).
    const attemptsRef = useRef<Map<number, number>>(new Map());
    const [retryTick, setRetryTick] = useState(0);

    // The latest query/page values, readable from callbacks without stale closures.
    const latestRef = useRef({page, filter, sort, view, customfieldvalue, searching, debouncedSearch});
    latestRef.current = {page, filter, sort, view, customfieldvalue, searching, debouncedSearch};

    /**
     * Build the getCourses() arguments for one page of the current query.
     *
     * @param offset The web-service offset to fetch from.
     * @returns The request arguments.
     */
    const buildArgs = (offset: number) => {
        const latest = latestRef.current;
        const isCustomField = !latest.searching && latest.filter === "customfield";
        return {
            classification: latest.searching ? "search" : latest.filter,
            sort: latest.sort,
            limit: PAGE_SIZE,
            offset,
            view: latest.view,
            customfieldname: isCustomField ? config.customfieldname : undefined,
            customfieldvalue: isCustomField ? (latest.customfieldvalue ?? undefined) : undefined,
            searchvalue: latest.searching ? latest.debouncedSearch : undefined,
        };
    };

    // A layout effect (not useEffect) so RESET_PAGES/SET_LOADING are committed before the
    // browser paints the render in which the query changed; it fires only when
    // debouncedSearch settles, so it never flashes the spinner mid-typing.
    useLayoutEffect(() => {
        if (queryKeyRef.current !== queryKey) {
            queryKeyRef.current = queryKey;
            generationRef.current++;
            inflightRef.current.clear();
            attemptsRef.current.clear();
            dispatch({type: "RESET_PAGES"});
            return;
        }

        const generation = generationRef.current;
        const fetchPage = async(index: number, silent: boolean) => {
            inflightRef.current.add(index);
            if (!silent) {
                dispatch({type: "SET_LOADING"});
            }
            try {
                const {courses: fetched, nextoffset} = await getCourses(buildArgs(pageOffsets[index] ?? 0));
                if (queryKeyRef.current !== queryKey || generationRef.current !== generation) {
                    return;
                }
                inflightRef.current.delete(index);
                attemptsRef.current.delete(index);
                dispatch({type: "PAGE_LOADED", index, courses: fetched, nextoffset});
            } catch {
                if (queryKeyRef.current !== queryKey || generationRef.current !== generation) {
                    return;
                }
                inflightRef.current.delete(index);
                if (!silent) {
                    // A sentinel, not user-facing text: the render resolves the message from
                    // the client-fetched strings, which may not have loaded yet.
                    dispatch({type: "SET_ERROR", error: "loadfailed"});
                    return;
                }
                // Bounded prefetch retry: without it a single transient failure would leave
                // "Next" disabled forever, because nothing else re-runs this effect.
                const attempts = (attemptsRef.current.get(index) ?? 0) + 1;
                attemptsRef.current.set(index, attempts);
                if (attempts < MAX_PREFETCH_ATTEMPTS) {
                    setRetryTick((t) => t + 1);
                }
            }
        };

        const current = page - 1;
        if (pages[current] === undefined) {
            if (!inflightRef.current.has(current)) {
                fetchPage(current, false);
            }
            return;
        }
        // Current page is loaded and full: silently prefetch the next unknown page so "Next"
        // can enable (a short page is the end of the set — nothing to prefetch).
        const next = current + 1;
        if (pages[current].length === PAGE_SIZE && pages[next] === undefined
                && !inflightRef.current.has(next)) {
            fetchPage(next, true);
        }
    }, [queryKey, page, pages, retryTick]);

    const refetchAfterToggle = useCallback(() => {
        const key = queryKeyRef.current;
        const generation = ++generationRef.current;
        inflightRef.current.clear();
        attemptsRef.current.clear();
        const targetPage = latestRef.current.page;

        (async() => {
            const collected: Course[][] = [];
            const offsets: number[] = [0];
            let offset = 0;
            try {
                for (let i = 0; i < targetPage; i++) {
                    const {courses, nextoffset} = await getCourses(buildArgs(offset));
                    if (queryKeyRef.current !== key || generationRef.current !== generation) {
                        return;
                    }
                    collected[i] = courses;
                    offsets[i + 1] = nextoffset;
                    offset = nextoffset;
                    if (courses.length < PAGE_SIZE) {
                        break;
                    }
                }
            } catch {
                if (queryKeyRef.current !== key || generationRef.current !== generation) {
                    return;
                }
                // The generation bump above may have discarded an in-flight page fetch
                // (leaving loading=true with nothing to resolve it), so a silent return
                // could wedge the spinner: reset instead — the fetch effect reloads the
                // current query cleanly and its resolution clears the loading state.
                dispatch({type: "RESET_PAGES"});
                return;
            }
            // If the user paged somewhere else while the chain ran, keep their position
            // and their (slightly stale) pages rather than yanking them back — the data
            // trues up on the next query change or toggle.
            if (latestRef.current.page !== targetPage) {
                return;
            }
            // Land on the nearest page that still exists (hiding the last course of the
            // final page shrinks the set) — never below page 1.
            let landing = Math.min(targetPage, collected.length);
            while (landing > 1 && (collected[landing - 1] ?? []).length === 0) {
                landing--;
            }
            dispatch({
                type: "REPLACE_PAGES",
                pages: collected,
                pageOffsets: offsets,
                page: Math.max(1, landing),
            });
        })();
    // BuildArgs reads everything through latestRef, so this callback is stable.
    }, [dispatch]);

    return {searching, refetchAfterToggle};
}
