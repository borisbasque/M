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
 * Course overview React component — block root (MDL-88965).
 *
 * Mounted by core/react_autoinit at the @moodle/lms/block_myoverview/app mount
 * point. Owns all UI state and drives the web-service data pipeline: courses
 * are fetched one server-side page at a time (chained through the service's
 * nextoffset, with the next page silently prefetched — see the fetch effect),
 * a query change (filter, sort, custom-field value, debounced search, view)
 * resets the paged data, and preference changes are written back to the
 * server. Favourite/hidden toggles are optimistic with revert-on-error.
 *
 * @module     block_myoverview/app
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from "react";
import type {AppProps, Strings} from "./types";
import {loadErrorString, loadStrings} from "./strings";
import {
    setFavourite, setCourseHidden, setPreference,
    PREF_VIEW, PREF_FILTER, PREF_SORT, PREF_CFVALUE,
} from "./repository";
import {usePagedCourses} from "./hooks/usePagedCourses";
import {
    CourseCallbacksContext, CourseMembershipContext, StringsContext, hasNextPage, initState, reducer,
} from "./state";
import Toolbar from "@moodle/lms/block_myoverview/components/Toolbar";
import CourseList from "@moodle/lms/block_myoverview/components/CourseList";
import Pagination from "@moodle/lms/block_myoverview/components/Pagination";
import EmptyState from "@moodle/lms/block_myoverview/components/EmptyState";

const SEARCH_DEBOUNCE_MS = 300;

/** How many times a failed language-strings fetch is retried before giving up. */
const STRINGS_RETRY_ATTEMPTS = 3;
/** Delay between language-strings retries. */
const STRINGS_RETRY_DELAY_MS = 2000;

/**
 * Run `effect` on every dependency change EXCEPT the initial mount. Used for the
 * preference-write-back effects, which must not fire just because the component
 * mounted — only when the user actually changes a value.
 *
 * @param effect The effect to run after the first render.
 * @param deps The dependency list.
 */
function useSkipFirstEffect(effect: () => void, deps: unknown[]) {
    const isFirst = useRef(true);
    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }
        effect();
    }, deps);
}

// Container width breakpoints (px). Mobile-first: the base CSS is the narrowest layout and
// each class widens it. Used instead of CSS @container queries because Moodle's plugin CSS
// pipeline strips @container/container rules; see styles.css.
const WIDTH_BREAKPOINTS = [480, 576, 992];

/**
 * Observe an element's width and return the space-separated `courseoverview-min-<bp>` classes for every
 * breakpoint it currently meets, so the layout responds to the block's own width (e.g. the
 * narrow block drawer) rather than the viewport.
 *
 * @param ref A ref to the element to observe.
 * @returns The width-tier class string.
 */
function useContainerWidthClasses(ref: React.RefObject<HTMLElement | null>): string {
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return undefined;
        }
        setWidth(el.getBoundingClientRect().width);
        if (typeof ResizeObserver === "undefined") {
            return undefined;
        }
        const observer = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return WIDTH_BREAKPOINTS.filter((bp) => width >= bp).map((bp) => `courseoverview-min-${bp}`).join(" ");
}

type EmptyStateChoiceProps = {
    hasActiveQuery: boolean;
    isZeroState: boolean;
    zerostate: AppProps["zerostate"];
    illustrationurl: string;
};

/**
 * Pick the empty state for an empty course list.
 *
 * A search/filter that matches nothing gets the no-results copy; a user with no
 * enrolments gets the genuine zero-state; a user whose courses are all removed
 * from view gets pointed at the filter that restores them.
 *
 * @param props The narrowing flags, zero-state data and illustration URL.
 * @returns The empty-state element.
 */
function EmptyStateChoice({hasActiveQuery, isZeroState, zerostate, illustrationurl}: EmptyStateChoiceProps) {
    if (hasActiveQuery) {
        return <EmptyState variant="no-results" illustrationurl={illustrationurl} />;
    }
    if (isZeroState) {
        return <EmptyState zerostate={zerostate} illustrationurl={illustrationurl} />;
    }
    return <EmptyState variant="all-hidden" illustrationurl={illustrationurl} />;
}

/**
 * What renders before the language strings arrive: the loading indicator, or a
 * terminal error once every bounded retry has failed. The error text comes from
 * the cached lang string when one is available (see loadErrorString); the
 * untranslated literal is only the last resort when the string service is
 * unreachable AND nothing was ever cached.
 *
 * @param props Whether the bounded retries have been exhausted, and the resolved error text.
 * @returns The loading or error element.
 */
function StringsFallback({failed, errorText}: {failed: boolean; errorText: string | null}) {
    if (failed) {
        return (
            <p className="block-myoverview__error" role="alert">
                {errorText ?? "An error occurred while loading. Please reload the page."}
            </p>
        );
    }
    // Decorative only: with the strings unavailable there is no translated text to
    // announce yet; the post-strings loading state (in App's live region) is the
    // one that narrates loading to assistive tech.
    return <div className="block-myoverview__loading" aria-hidden="true" />;
}

type LiveRegionProps = {
    loading: boolean;
    error: string | null;
    announcement: string | null;
    strings: Strings;
};

/**
 * The block's single polite live region: loading, load errors, and hide/restore
 * feedback. The gradient bar is decorative (aria-hidden); the visually-hidden
 * text is what the region actually announces — an empty styled div would
 * announce nothing. No nested role="status": the region itself is the live
 * region.
 *
 * @param props The loading/error flags, the toggle announcement, and the strings.
 * @returns The live region element.
 */
function LiveRegion({loading, error, announcement, strings}: LiveRegionProps) {
    return (
        <div aria-live="polite">
            {loading && (
                <>
                    <div className="block-myoverview__loading" aria-hidden="true" />
                    <span className="visually-hidden">{strings.loadingcourses}</span>
                </>
            )}
            {error && (
                <p className="block-myoverview__error">{strings.errorloadingcourses}</p>
            )}
            {!loading && !error && announcement && (
                <span className="visually-hidden">{announcement}</span>
            )}
        </div>
    );
}

/**
 * Resolve the translated terminal-error text, best effort.
 *
 * Kept outside the retry chain so the promise handling is flat: the cached copy
 * of the string resolves without a request; when nothing is cached and the
 * service is down, the rejection is swallowed and the caller's fallback stands.
 *
 * @param onText Receives the translated text if it resolves.
 */
function fetchTerminalErrorText(onText: (text: string) => void): void {
    loadErrorString()
        .then((text) => {
            onText(text);
            return null;
        })
        .catch(() => undefined);
}

/**
 * The course overview application.
 *
 * @param props Mount props (preferences, config, URLs, hidden ids, zero-state).
 * @returns The rendered course overview.
 */
export default function App(props: AppProps) {
    const {
        preferences, config,
        createcourseurl, managecourseurl, requestcourseurl, hiddencourseids, zerostate,
        illustrationurl,
    } = props;

    // UI strings are fetched client-side in one batch (props carry no
    // strings). Until they resolve, the block renders its loading state — core caches the
    // strings, so this is one round trip on first view and instant afterwards. A failed
    // fetch is retried with backoff: without it one transient error would leave the
    // spinner forever (there is no fallback text to show — the strings ARE the text).
    // When every retry fails, the loading state ends in a terminal error instead of an
    // eternal spinner, translated via the string cache when one is available.
    const [strings, setStrings] = useState<Strings | null>(null);
    const [stringsFailed, setStringsFailed] = useState(false);
    const [stringsErrorText, setStringsErrorText] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const attempt = (retriesLeft: number) => {
            loadStrings()
                .then((loaded) => {
                    if (!cancelled) {
                        setStrings(loaded);
                    }
                    return null;
                })
                .catch(() => {
                    if (cancelled) {
                        return;
                    }
                    if (retriesLeft > 0) {
                        timer = setTimeout(() => attempt(retriesLeft - 1), STRINGS_RETRY_DELAY_MS);
                    } else {
                        setStringsFailed(true);
                        fetchTerminalErrorText((text) => {
                            if (!cancelled) {
                                setStringsErrorText(text);
                            }
                        });
                    }
                });
        };
        attempt(STRINGS_RETRY_ATTEMPTS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    const [state, dispatch] = useReducer(
        reducer, preferences, (prefs) => initState(prefs, hiddencourseids ?? []));

    // Width-tier classes so the layout responds to the block's own width (e.g. the block drawer).
    const rootRef = useRef<HTMLElement>(null);
    const widthClasses = useContainerWidthClasses(rootRef);

    const {
        view, filter, sort, search, page, favourites, hidden,
        loading, error, customfieldvalue,
    } = state;

    // Debounce the value that triggers a fetch — search itself stays in state
    // immediately so the input stays responsive, but the fetch effect only
    // reacts once typing pauses. Clearing the field skips the debounce so the
    // full list reloads at once (and the empty-state variant, keyed off
    // debouncedSearch below, never flips through the zero-state on the way).
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        if (search === "") {
            setDebouncedSearch("");
            return undefined;
        }
        const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    // Server-side paging lives in usePagedCourses: page fetches chained through nextoffset,
    // silent next-page prefetch with bounded retry, search/filter exclusivity, and the
    // post-toggle refetch that trues the cached pages up after a hide/star change.
    const {searching, refetchAfterToggle} = usePagedCourses({state, dispatch, config, debouncedSearch});

    // Write preferences back to the server on real changes only — useSkipFirstEffect
    // prevents these from firing on initial mount (they would just re-write the value
    // the server already sent).
    useSkipFirstEffect(() => {
        setPreference(PREF_VIEW, view);
    }, [view]);
    useSkipFirstEffect(() => {
        setPreference(PREF_FILTER, filter);
    }, [filter]);
    useSkipFirstEffect(() => {
        setPreference(PREF_SORT, sort);
    }, [sort]);
    useSkipFirstEffect(() => {
        if (customfieldvalue !== null) {
            setPreference(PREF_CFVALUE, customfieldvalue);
        }
    }, [customfieldvalue]);

    // Toggles are optimistic (instant client-side effect, revert on error). On success the
    // cached pages are refetched silently where the toggle changed what the current view
    // contains: hiding/restoring affects every grouping, starring only the Starred one.
    // Without the refetch, page boundaries drift (the server re-paginates without the
    // course) and the current page stays one card short until the next query change.
    const toggleFavourite = useCallback((id: number) => {
        const nowFav = !favourites.has(id);
        dispatch({type: "TOGGLE_FAVOURITE", id});
        setFavourite(id, nowFav)
            .then(() => {
                dispatch({type: "FAVOURITE_SETTLED", id});
                if (filter === "favourites" && !searching) {
                    refetchAfterToggle();
                }
                return null;
            })
            .catch(() => {
                dispatch({type: "TOGGLE_FAVOURITE", id});
                dispatch({type: "FAVOURITE_SETTLED", id});
            });
    }, [favourites, filter, searching, refetchAfterToggle]);

    // Announced through the aria-live region after a hide/restore. The action can
    // unmount the card the user was operating on, so it must be narrated (and the
    // lost focus caught) rather than silently changing the list.
    const [announcement, setAnnouncement] = useState<string | null>(null);

    const toggleHidden = useCallback((id: number) => {
        const nowHidden = !hidden.has(id);
        dispatch({type: "TOGGLE_HIDDEN", id});
        setAnnouncement((nowHidden ? strings?.courseremoved : strings?.courserestored) ?? null);
        setCourseHidden(id, nowHidden)
            .then(() => refetchAfterToggle())
            .catch(() => dispatch({type: "TOGGLE_HIDDEN", id}));
    }, [hidden, refetchAfterToggle, strings]);

    useEffect(() => {
        if (!announcement) {
            return undefined;
        }
        // Hiding/restoring can unmount the card whose menu had focus (the course is
        // filtered out of the current view), dropping focus to <body>. When that
        // happened, catch it on the block root so keyboard users stay in the block.
        // (EllipsisMenu's focus-return to its trigger still wins whenever the card
        // survives, e.g. hiding under "All (including removed from view)".)
        if (document.activeElement === document.body) {
            rootRef.current?.focus();
        }
        // Clear after the announcement has been made so a second identical action
        // re-announces (live regions only fire on content change).
        const timer = setTimeout(() => setAnnouncement(null), 3000);
        return () => clearTimeout(timer);
    }, [announcement]);

    const callbacks = useMemo(() => ({toggleFavourite, toggleHidden}), [toggleFavourite, toggleHidden]);
    const memberships = useMemo(() => ({favourites, hidden}), [favourites, hidden]);

    // The server owns membership filtering (each classification excludes/includes hidden courses
    // itself, favourites returns only starred courses). This client-side pass exists purely for
    // instant feedback between a star/hide toggle and the next fetch: 'hidden' shows only hidden
    // courses, 'allincludinghidden' shows everything, 'favourites' shows only starred courses, a
    // search and every other filter exclude hidden (the search classification is the one path the
    // web service does not hidden-filter server-side).
    const pageCourses = (state.pages[page - 1] ?? []).filter((c) => {
        const isHidden = hidden.has(c.id);
        if (searching) {
            return !isHidden;
        }
        if (filter === "hidden") {
            return isHidden;
        }
        if (filter === "allincludinghidden") {
            return true;
        }
        if (filter === "favourites") {
            return favourites.has(c.id);
        }
        return !isHidden;
    });

    const hasNoCourses = !loading && !error && page === 1 && pageCourses.length === 0;
    // An active search term or non-default filter is narrowing the list. Used both to keep the
    // controls visible and to pick the "no results" empty state over the genuine zero-state.
    // Keyed off debouncedSearch (not the live input) so it stays in step with the loaded results:
    // otherwise clearing a no-results search would briefly select the zero-state before the refetch.
    const hasActiveQuery = debouncedSearch !== "" || filter !== config.defaultfilter;
    // The server only builds zero-state data when the user has no enrolments at all, so a null
    // zerostate is positive proof the user HAS courses — they may just all be removed from view.
    const userhascourses = !zerostate;
    // A genuine zero-state is no enrolments AND no active query — the case where the empty-state
    // card renders its own Create/Manage CTAs, so the toolbar hides its duplicates. An empty list
    // for a user who has courses (all removed from view) is NOT a zero-state.
    const isZeroState = hasNoCourses && !hasActiveQuery && !userhascourses;
    // Hide the search/filter/sort/view controls only in a genuine zero-state. A user whose
    // courses are all removed from view must keep the controls — the "Removed from view"
    // filter is their only way to restore anything.
    const showControls = loading || state.pages.some((p) => p.length > 0) || hasActiveQuery
        || userhascourses;
    const hasNext = hasNextPage(state);

    // The <section> is the SAME root element in both the strings-loading and loaded renders —
    // if the gate returned a different tree shape, React would remount the section and the
    // width hook's ResizeObserver would keep watching the detached old node, freezing the
    // courseoverview-min-* width tiers (seen as a permanently single-column card grid).
    // Strings are fetched client-side; until they arrive only the loading indicator renders.
    return (
        <section ref={rootRef} tabIndex={-1} className={`block-myoverview ${widthClasses}`.trim()}>
            {!strings && <StringsFallback failed={stringsFailed} errorText={stringsErrorText} />}
            {strings && (
        <StringsContext.Provider value={strings}>
            <CourseCallbacksContext.Provider value={callbacks}>
                <CourseMembershipContext.Provider value={memberships}>
                    {/* No aria-label on the section: the Moodle block wrapper is already a
                        "Course overview" region landmark, so naming it too would create a
                        duplicate landmark (axe landmark-unique). */}
                    <>
                        <Toolbar
                            showControls={showControls}
                            iszerostate={isZeroState}
                            view={view}
                            filter={filter}
                            sort={sort}
                            search={search}
                            config={config}
                            createcourseurl={createcourseurl}
                            managecourseurl={managecourseurl}
                            requestcourseurl={requestcourseurl}
                            customfieldvalue={customfieldvalue}
                            onView={(v) => dispatch({type: "SET_VIEW", view: v})}
                            onFilter={(f) => dispatch({type: "SET_FILTER", filter: f})}
                            onSort={(s) => dispatch({type: "SET_SORT", sort: s})}
                            onSearch={(s) => dispatch({type: "SET_SEARCH", search: s})}
                            onCustomFieldValue={(v) => dispatch({type: "SET_CUSTOMFIELDVALUE", value: v})}
                        />
                        <LiveRegion
                            loading={loading}
                            error={error}
                            announcement={announcement}
                            strings={strings}
                        />
                        {hasNoCourses && (
                            <EmptyStateChoice
                                hasActiveQuery={hasActiveQuery}
                                isZeroState={isZeroState}
                                zerostate={zerostate}
                                illustrationurl={illustrationurl}
                            />
                        )}
                        {!hasNoCourses && !loading && !error && (
                            <>
                                <CourseList
                                    courses={pageCourses}
                                    view={view}
                                    displaycategories={config.displaycategories}
                                />
                                <Pagination
                                    page={page}
                                    hasNext={hasNext}
                                    onPage={(p) => dispatch({type: "SET_PAGE", page: p})}
                                />
                            </>
                        )}
                    </>
                </CourseMembershipContext.Provider>
            </CourseCallbacksContext.Provider>
        </StringsContext.Provider>
            )}
        </section>
    );
}
