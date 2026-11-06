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
 * Tests for the block's string module: the STRING_MAP identifier/component
 * attributions, the zero-state copy resolution, and the terminal-error string.
 *
 * These run against the REAL stringUtils path (no module mock): the global
 * Jest setup's core-string mock resolves unregistered strings to
 * "[identifier, component]", which pins exactly which lang string and
 * component every entry requests — a wrong attribution changes the value.
 *
 * @module     block_myoverview/tests/strings
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {loadStrings, loadErrorString, resolveZeroStateCopy} from "../src/strings";
import {ZeroStateData} from "../src/types";

const zerostate = (overrides: Partial<ZeroStateData>): ZeroStateData => ({
    variant: "default",
    sitehascourses: true,
    docsurl: "https://docs.example.com/en/course",
    docstarget: "_blank",
    ...overrides,
});

describe("block_myoverview/strings STRING_MAP attributions", () => {
    it("requests every UI string from the correct lang identifier and component", async() => {
        // No strings registered: each value echoes the (identifier, component)
        // actually requested, so this pins the whole map.
        await expect(loadStrings()).resolves.toEqual({
            actionsfor: "[aria:courseactionsfor, block_myoverview]",
            changelayout: "[aria:displaydropdown, block_myoverview]",
            clearsearch: "[clear, core]",
            courseactions: "[aria:courseactions, block_myoverview]",
            courseoverview: "[pluginname, block_myoverview]",
            courseprogress: "[courseprogress, block_myoverview]",
            courseremoved: "[aria:courseremoved, block_myoverview]",
            courserestored: "[aria:courserestored, block_myoverview]",
            createcourse: "[createcourse, block_myoverview]",
            emptyallhiddenintro: "[allhidden_intro, block_myoverview]",
            emptyallhiddentitle: "[allhidden_title, block_myoverview]",
            emptynoresults: "[noresults_intro, block_myoverview]",
            emptynoresultstitle: "[noresults_title, block_myoverview]",
            errorloadingcourses: "[errorloadingcourses, block_myoverview]",
            filterall: "[allcourses, block_myoverview]",
            filterallincludinghidden: "[allincludinghidden, block_myoverview]",
            filtercustomfield: "[customfield, block_myoverview]",
            filterfavourites: "[favourites, block_myoverview]",
            filterfuture: "[future, block_myoverview]",
            filterhidden: "[hiddencourses, block_myoverview]",
            filterinprogress: "[inprogress, block_myoverview]",
            filterpast: "[past, block_myoverview]",
            filterresults: "[aria:groupingdropdown, block_myoverview]",
            filters: "[filters, core]",
            hidecourse: "[hidecourse, block_myoverview]",
            loadingcourses: "[loadingcourses, block_myoverview]",
            managecategories: "[managecategories, core]",
            managecourses: "[managecourses, core]",
            nextpage: "[nextpage, core]",
            percentcomplete: "[completepercent, block_myoverview]",
            previouspage: "[previouspage, core]",
            removefromstarred: "[aria:removefromfavouritesfor, block_myoverview]",
            requestcoursebutton: "[requestcoursebutton, block_myoverview]",
            search: "[search, core]",
            searchcourses: "[searchcourses, block_myoverview]",
            showcourse: "[show, block_myoverview]",
            sortby: "[sortby, core]",
            sortcoursename: "[title, block_myoverview]",
            sortcourses: "[aria:sortingdropdown, block_myoverview]",
            sortlastaccessed: "[lastaccessed, block_myoverview]",
            sortshortname: "[shortname, block_myoverview]",
            sortstartdate: "[startdate, core]",
            starcourse: "[aria:addtofavouritesfor, block_myoverview]",
            tooltipfilter: "[filter, core]",
            tooltipsort: "[sort, core]",
            tooltipview: "[view, core]",
            viewcard: "[card, block_myoverview]",
            viewlabel: "[view, core]",
            viewlist: "[list, block_myoverview]",
            viewsummary: "[summary, block_myoverview]",
        });
    });

    it("resolves registered strings through the documented mockString helper", async() => {
        mockString("createcourse", "block_myoverview", "Create course");
        mockString("clear", "core", "Clear");

        const strings = await loadStrings();
        expect(strings.createcourse).toBe("Create course");
        expect(strings.clearsearch).toBe("Clear");
    });

    it("loadErrorString resolves the block's own error string", async() => {
        await expect(loadErrorString()).resolves.toBe("[errorloadingcourses, block_myoverview]");
    });
});

describe("block_myoverview/strings resolveZeroStateCopy", () => {
    it("request variant uses the short request copy", async() => {
        await expect(resolveZeroStateCopy(zerostate({variant: "request"}))).resolves.toEqual({
            title: "[zero_request_title, block_myoverview]",
            intro: "[zero_request_intro_short, block_myoverview]",
        });
    });

    it("create variant on a site with courses uses the default copy", async() => {
        await expect(resolveZeroStateCopy(zerostate({variant: "create", sitehascourses: true}))).resolves.toEqual({
            title: "[zero_default_title, block_myoverview]",
            intro: "[zero_default_intro, block_myoverview]",
        });
    });

    it("create variant on an empty site picks the docs intro, or the quickstart intro when configured", async() => {
        await expect(resolveZeroStateCopy(zerostate({variant: "create", sitehascourses: false}))).resolves.toEqual({
            title: "[zero_nocourses_title, block_myoverview]",
            intro: "[zero_nocourses_intro, block_myoverview]",
        });

        const withQuickstart = zerostate({
            variant: "create",
            sitehascourses: false,
            quickstarturl: "https://example.com/quickstart",
        });
        await expect(resolveZeroStateCopy(withQuickstart)).resolves.toMatchObject({
            intro: "[zero_request_intro, block_myoverview]",
        });
    });

    it("default variant uses the not-enrolled copy", async() => {
        await expect(resolveZeroStateCopy(zerostate({variant: "default"}))).resolves.toEqual({
            title: "[zero_default_title, block_myoverview]",
            intro: "[zero_default_intro, block_myoverview]",
        });
    });
});
