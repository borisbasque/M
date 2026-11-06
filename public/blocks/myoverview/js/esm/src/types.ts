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
 * Shared types for the course overview React component.
 *
 * The Course shape mirrors the fields returned by the web service
 * core_course_get_enrolled_courses_by_timeline_classification, so the live data
 * layer (repository.ts) maps onto it directly.
 *
 * @module     block_myoverview/types
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** A single enrolled course, shaped like the web-service course summary export. */
export type Course = {
    id: number;
    fullname: string;
    fullnamedisplay: string;
    shortname: string;
    viewurl: string;
    /** Overview image URL, or null when no image is set (fallback rendered). */
    courseimage: string | null;
    /** Optional summary description, shown in summary view. Nullable in the WS export. */
    summary: string | null;
    coursecategory: string;
    showshortname: boolean;
    showcoursecategory: boolean;
    /** Whether the course is visible to students (false renders a hidden badge). */
    visible: boolean;
    isfavourite: boolean;
    /** Completion progress 0-100, or null when not tracked. */
    progress: number | null;
    hasprogress: boolean;
    /** Unix timestamps used by future/past/sort logic. */
    startdate: number;
    enddate: number;
    timeaccess: number;
};

/** The three layout modes (MDL-88966). */
export type View = "card" | "list" | "summary";

/**
 * Course groupings / filters (MDL-88972). 'all' excludes hidden courses;
 * 'allincludinghidden' is the "all (including removed from view)" grouping.
 */
export type Filter =
    "allincludinghidden" | "all" | "inprogress" | "future" | "past"
    | "favourites" | "hidden" | "customfield";

/** Sort orders. Default is "title" (A-Z) per MDL-88972. */
export type Sort = "title" | "shortname" | "lastaccessed" | "startdate";

/** All UI strings, fetched client-side in one batch (see strings.ts). */
export type Strings = {
    actionsfor: string;
    changelayout: string;
    clearsearch: string;
    courseactions: string;
    courseoverview: string;
    courseprogress: string;
    courseremoved: string;
    courserestored: string;
    createcourse: string;
    emptyallhiddenintro: string;
    emptyallhiddentitle: string;
    emptynoresults: string;
    emptynoresultstitle: string;
    errorloadingcourses: string;
    filterall: string;
    filterallincludinghidden: string;
    filtercustomfield: string;
    filterfavourites: string;
    filterfuture: string;
    filterhidden: string;
    filterinprogress: string;
    filterpast: string;
    filterresults: string;
    filters: string;
    hidecourse: string;
    loadingcourses: string;
    managecategories: string;
    managecourses: string;
    nextpage: string;
    percentcomplete: string;
    previouspage: string;
    removefromstarred: string;
    requestcoursebutton: string;
    search: string;
    searchcourses: string;
    showcourse: string;
    sortby: string;
    sortcoursename: string;
    sortcourses: string;
    sortlastaccessed: string;
    sortshortname: string;
    sortstartdate: string;
    starcourse: string;
    tooltipfilter: string;
    tooltipsort: string;
    tooltipview: string;
    viewcard: string;
    viewlabel: string;
    viewlist: string;
    viewsummary: string;
};

/**
 * Zero-state data for an empty course list — data only, no strings or HTML:
 * the server resolves which variant applies and the URLs it needs; EmptyState
 * composes the copy from language strings client-side.
 *
 * Variants mirror the server's capability checks: 'request' (user can request a
 * course), 'create' (user can create one; optional manage button), 'default'
 * (no capabilities — the not-enrolled message).
 */
export type ZeroStateData = {
    variant: "request" | "create" | "default";
    /** Whether the site has any courses at all — picks the create-variant copy and manage label. */
    sitehascourses: boolean;
    createurl?: string | null;
    manageurl?: string | null;
    /** Moodle documentation URL (already language-resolved server-side). */
    docsurl: string;
    /** Link target for the documentation links: '_blank' or '_self'. */
    docstarget: string;
    /** Quickstart guide URL when $CFG->coursecreationguide is set. */
    quickstarturl?: string | null;
};

/** Block configuration derived from admin settings and site config. */
export type Config = {
    enabledviews: View[];
    enabledfilters: Filter[];
    displaycategories: boolean;
    /** $CFG->courselistshortnames — gates the "Short name" sort option. */
    showshortname: boolean;
    /**
     * The site-level default sort ('shortname' when extended course names are shown, else
     * 'title'). The sort control's active state compares against this, so it is not lit
     * when the user has changed nothing.
     */
    defaultsort: Sort;
    /**
     * The grouping a preference-less user starts on (the server's fallback for the
     * enabled-groupings config). The zero-state/no-results choice and the visible
     * controls compare against this, so single-grouping admin configs (where the
     * fallback is not 'all') still reach the genuine zero-state.
     */
    defaultfilter: Filter;
    customfieldname?: string;
    customfieldvalues?: Array<{value: string; name: string}>;
};

/** Server-provided preferences seeding the initial reducer state. */
export type ServerPreferences = {
    view: View;
    filter: Filter;
    sort: Sort;
    customfieldvalue?: string;
};

/**
 * Props passed from the block's React mount point.
 *
 * Data only — no language strings (they are fetched client-side, see strings.ts)
 * and no HTML. The site root URL and session key are intentionally absent:
 * repository.ts reads them from @moodle/lms/core/config, the same as core/ajax
 * and core/fetch do internally.
 */
export type LiveAppProps = {
    preferences: ServerPreferences;
    config: Config;
    /**
     * Pre-computed server URLs for persistent toolbar actions (always available
     * regardless of course count, matching the pre-rewrite toolbar behaviour).
     */
    createcourseurl?: string | null;
    managecourseurl?: string | null;
    requestcourseurl?: string | null;
    /** Ids of courses the user has removed from view, to seed the hidden state. */
    hiddencourseids?: number[];
    /**
     * Pre-computed zero-state data for when the course list is empty. The
     * request-course button lives in the persistent toolbar (requestcourseurl),
     * not in zerostate.buttons.
     */
    zerostate?: ZeroStateData | null;
    /** URL of the shared empty-state illustration (block_myoverview/pix/courses.svg). */
    illustrationurl: string;
};

/** Props passed from the block's React mount point (see block_myoverview.php). */
export type AppProps = LiveAppProps;

/** Number of courses per page — 9 for the 3x3 grid (MDL-88977). */
export const PAGE_SIZE = 9;

/** Defaults (MDL-88972): filter = All, sort = A-Z, view = card. */
export const DEFAULT_VIEW: View = "card";
export const DEFAULT_FILTER: Filter = "all";
export const DEFAULT_SORT: Sort = "title";
