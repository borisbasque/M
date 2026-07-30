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
 * Client-side language strings for the course overview block.
 *
 * The UI strings are fetched here via @moodle/lms/core/stringUtils rather than
 * being serialised into the mount props, keeping the props minimal as the
 * frontend docs require. One batched request resolves every string the block
 * needs; the results are cached by core (M.str / localStorage), so this costs at
 * most one round trip per session.
 *
 * @module     block_myoverview/strings
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getString, getStrings} from "@moodle/lms/core/stringUtils";
import type {Strings, ZeroStateData} from "./types";

const COMPONENT = "block_myoverview";

// Each Strings key mapped to its lang string identifier and component. The values
// mirror the map the PHP layer previously serialised into the props, so the same
// language strings (and translations) are used.
const STRING_MAP: Record<keyof Strings, {key: string; component?: string}> = {
    actionsfor: {key: "aria:courseactionsfor", component: COMPONENT},
    changelayout: {key: "aria:displaydropdown", component: COMPONENT},
    clearsearch: {key: "clear", component: "core"},
    courseactions: {key: "aria:courseactions", component: COMPONENT},
    courseoverview: {key: "pluginname", component: COMPONENT},
    courseprogress: {key: "courseprogress", component: COMPONENT},
    courseremoved: {key: "aria:courseremoved", component: COMPONENT},
    courserestored: {key: "aria:courserestored", component: COMPONENT},
    createcourse: {key: "createcourse", component: COMPONENT},
    emptyallhiddenintro: {key: "allhidden_intro", component: COMPONENT},
    emptyallhiddentitle: {key: "allhidden_title", component: COMPONENT},
    emptynoresults: {key: "noresults_intro", component: COMPONENT},
    emptynoresultstitle: {key: "noresults_title", component: COMPONENT},
    errorloadingcourses: {key: "errorloadingcourses", component: COMPONENT},
    filterall: {key: "allcourses", component: COMPONENT},
    filterallincludinghidden: {key: "allincludinghidden", component: COMPONENT},
    filtercustomfield: {key: "customfield", component: COMPONENT},
    filterfavourites: {key: "favourites", component: COMPONENT},
    filterfuture: {key: "future", component: COMPONENT},
    filterhidden: {key: "hiddencourses", component: COMPONENT},
    filterinprogress: {key: "inprogress", component: COMPONENT},
    filterpast: {key: "past", component: COMPONENT},
    filterresults: {key: "aria:groupingdropdown", component: COMPONENT},
    filters: {key: "filters", component: "core"},
    hidecourse: {key: "hidecourse", component: COMPONENT},
    loadingcourses: {key: "loadingcourses", component: COMPONENT},
    managecategories: {key: "managecategories", component: "core"},
    managecourses: {key: "managecourses", component: "core"},
    nextpage: {key: "nextpage", component: "core"},
    percentcomplete: {key: "completepercent", component: COMPONENT},
    previouspage: {key: "previouspage", component: "core"},
    removefromstarred: {key: "aria:removefromfavouritesfor", component: COMPONENT},
    requestcoursebutton: {key: "requestcoursebutton", component: COMPONENT},
    search: {key: "search", component: "core"},
    searchcourses: {key: "searchcourses", component: COMPONENT},
    showcourse: {key: "show", component: COMPONENT},
    sortby: {key: "sortby", component: "core"},
    sortcoursename: {key: "title", component: COMPONENT},
    sortcourses: {key: "aria:sortingdropdown", component: COMPONENT},
    sortlastaccessed: {key: "lastaccessed", component: COMPONENT},
    sortshortname: {key: "shortname", component: COMPONENT},
    sortstartdate: {key: "startdate", component: "core"},
    starcourse: {key: "aria:addtofavouritesfor", component: COMPONENT},
    tooltipfilter: {key: "filter", component: "core"},
    tooltipsort: {key: "sort", component: "core"},
    tooltipview: {key: "view", component: "core"},
    viewcard: {key: "card", component: COMPONENT},
    viewlabel: {key: "view", component: "core"},
    viewlist: {key: "list", component: COMPONENT},
    viewsummary: {key: "summary", component: COMPONENT},
};

/**
 * Load every UI string the block needs in one batched request.
 *
 * @returns The resolved Strings map.
 */
export async function loadStrings(): Promise<Strings> {
    const keys = Object.keys(STRING_MAP) as Array<keyof Strings>;
    const values = await getStrings(keys.map((k) => STRING_MAP[k]));
    const strings = {} as Record<keyof Strings, string>;
    keys.forEach((k, i) => {
        strings[k] = values[i];
    });
    return strings;
}

/**
 * Resolve a translated terminal-error message after the batched load has failed.
 *
 * getString reads the M.str / localStorage caches before going to the network, so
 * on any site the user has visited before this resolves without a request even
 * while the string service is unreachable. Rejects when nothing is cached and the
 * service is still down; the caller keeps its last-resort text in that case.
 *
 * @returns The translated error message.
 */
export function loadErrorString(): Promise<string> {
    return getString("errorloadingcourses", COMPONENT);
}

/**
 * Resolve the zero-state title and intro copy for the given data.
 *
 * Mirrors the variant logic the PHP layer used when it pre-rendered this copy:
 * 'request' and 'default' have fixed strings; 'create' picks its title/intro by
 * whether the site has courses yet, and the intro embeds documentation links
 * via the string's {$a} placeholders. Lives here rather than in EmptyState so
 * every lang-string lookup in the block goes through this module.
 *
 * @param zerostate The zero-state data from the mount props.
 * @returns The resolved title and intro (intro may contain lang-string HTML).
 */
export async function resolveZeroStateCopy(zerostate: ZeroStateData): Promise<{title: string; intro: string}> {
    if (zerostate.variant === "request") {
        return {
            title: await getString("zero_request_title", COMPONENT),
            intro: await getString("zero_request_intro_short", COMPONENT),
        };
    }
    if (zerostate.variant === "create") {
        const titlekey = zerostate.sitehascourses ? "zero_default_title" : "zero_nocourses_title";
        let introkey = "zero_default_intro";
        if (!zerostate.sitehascourses) {
            introkey = zerostate.quickstarturl ? "zero_request_intro" : "zero_nocourses_intro";
        }
        const docparams: Record<string, string> = {
            dochref: zerostate.docsurl,
            doctitle: await getString("documentation", "core"),
            doctarget: zerostate.docstarget,
        };
        if (zerostate.quickstarturl) {
            docparams.quickhref = zerostate.quickstarturl;
            docparams.quicktitle = await getString("viewquickstart", COMPONENT);
            docparams.quicktarget = "_blank";
        }
        return {
            title: await getString(titlekey, COMPONENT),
            intro: await getString(introkey, COMPONENT, docparams),
        };
    }
    return {
        title: await getString("zero_default_title", COMPONENT),
        intro: await getString("zero_default_intro", COMPONENT),
    };
}
