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
 * Tests for the toolbar: custom-field filter encode/decode, filter option
 * gating by admin config, and the zero-state CTA rules.
 *
 * @module     block_myoverview/tests/Toolbar
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, fireEvent} from "@testing-library/react";

jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});

import Toolbar from "../src/components/Toolbar";
import {StringsContext} from "../src/state";
import {Config, Strings} from "../src/types";

const strings = new Proxy({}, {get: (_, key) => String(key)}) as Strings;

const config = (overrides: Partial<Config> = {}): Config => ({
    enabledviews: ["card", "list", "summary"],
    enabledfilters: ["all", "inprogress", "customfield"],
    displaycategories: true,
    showshortname: false,
    defaultsort: "title",
    defaultfilter: "all",
    customfieldname: "Faculty",
    customfieldvalues: [{value: "science", name: "Science"}, {value: "arts", name: "Arts"}],
    ...overrides,
});

const noop = () => undefined;

const renderToolbar = (props: Partial<Parameters<typeof Toolbar>[0]> = {}) => render(
    <StringsContext.Provider value={strings}>
        <Toolbar
            showControls
            iszerostate={false}
            view="card"
            filter="all"
            sort="title"
            search=""
            config={config()}
            onView={noop}
            onFilter={noop}
            onSort={noop}
            onSearch={noop}
            onCustomFieldValue={noop}
            {...props}
        />
    </StringsContext.Provider>,
);

describe("block_myoverview/components/Toolbar custom-field filter", () => {
    it("encodes custom-field values as cf:<value> options and decodes a selection back into filter + value", () => {
        const onFilter = jest.fn();
        const onCustomFieldValue = jest.fn();
        renderToolbar({onFilter, onCustomFieldValue});

        fireEvent.click(screen.getByRole("button", {name: /filterresults/}));
        fireEvent.click(screen.getByRole("menuitemradio", {name: "Science"}));

        expect(onCustomFieldValue).toHaveBeenCalledWith("science");
        expect(onFilter).toHaveBeenCalledWith("customfield");
    });

    it("marks the active custom-field value as checked when the customfield grouping is current", () => {
        renderToolbar({filter: "customfield", customfieldvalue: "arts"});

        fireEvent.click(screen.getByRole("button", {name: /filterresults/}));
        expect(screen.getByRole("menuitemradio", {name: "Arts"})).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("menuitemradio", {name: "Science"})).toHaveAttribute("aria-checked", "false");
    });

    it("selecting a plain grouping does not touch the custom-field value", () => {
        const onFilter = jest.fn();
        const onCustomFieldValue = jest.fn();
        renderToolbar({onFilter, onCustomFieldValue});

        fireEvent.click(screen.getByRole("button", {name: /filterresults/}));
        fireEvent.click(screen.getByRole("menuitemradio", {name: "filterinprogress"}));

        expect(onFilter).toHaveBeenCalledWith("inprogress");
        expect(onCustomFieldValue).not.toHaveBeenCalled();
    });
});

describe("block_myoverview/components/Toolbar option gating", () => {
    it("only offers the filters, views and sorts the admin config enables", () => {
        renderToolbar({config: config({enabledfilters: ["all", "inprogress"], enabledviews: ["card", "list"]})});

        fireEvent.click(screen.getByRole("button", {name: /filterresults/}));
        expect(screen.queryByRole("menuitemradio", {name: "filterpast"})).not.toBeInTheDocument();
        expect(screen.queryByRole("menuitemradio", {name: "Science"})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: /tooltipview/}));
        expect(screen.getByRole("menuitemradio", {name: "viewlist"})).toBeInTheDocument();
        expect(screen.queryByRole("menuitemradio", {name: "viewsummary"})).not.toBeInTheDocument();

        // Short-name sort is gated on $CFG->courselistshortnames (showshortname).
        fireEvent.click(screen.getByRole("button", {name: /tooltipsort/}));
        expect(screen.queryByRole("menuitemradio", {name: "sortshortname"})).not.toBeInTheDocument();
    });

    it("hides the view dropdown entirely when only one layout is enabled", () => {
        renderToolbar({config: config({enabledviews: ["card"]})});
        expect(screen.queryByRole("button", {name: /tooltipview/})).not.toBeInTheDocument();
    });
});

describe("block_myoverview/components/Toolbar zero-state CTAs", () => {
    const urls = {
        createcourseurl: "https://example.com/create",
        managecourseurl: "https://example.com/manage",
        requestcourseurl: "https://example.com/request",
    };

    it("keeps all action links outside the zero-state", () => {
        renderToolbar({...urls});
        expect(screen.getByRole("link", {name: /createcourse/})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "managecourses"})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "requestcoursebutton"})).toBeInTheDocument();
    });

    it("drops Create/Manage (owned by the zero-state card) but keeps Request in a genuine zero-state", () => {
        renderToolbar({...urls, iszerostate: true, showControls: false});
        expect(screen.queryByRole("link", {name: /createcourse/})).not.toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "managecourses"})).not.toBeInTheDocument();
        expect(screen.getByRole("link", {name: "requestcoursebutton"})).toBeInTheDocument();
    });
});
