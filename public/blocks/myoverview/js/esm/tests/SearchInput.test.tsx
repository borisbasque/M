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
 * Tests for the controlled search input and its clear button.
 *
 * @module     block_myoverview/tests/SearchInput
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, fireEvent} from "@testing-library/react";

jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});

import SearchInput from "../src/components/SearchInput";
import {StringsContext} from "../src/state";
import {Strings} from "../src/types";

const strings = new Proxy({}, {get: (_, key) => String(key)}) as Strings;

const renderInput = (value: string, onChange: (v: string) => void = () => undefined) => render(
    <StringsContext.Provider value={strings}>
        <SearchInput value={value} onChange={onChange} />
    </StringsContext.Provider>,
);

describe("block_myoverview/components/SearchInput", () => {
    it("is fully controlled: typing reports the value, the displayed value comes from props", () => {
        const onChange = jest.fn();
        renderInput("bio", onChange);

        const input = screen.getByRole("textbox", {name: "searchcourses"});
        expect(input).toHaveValue("bio");
        fireEvent.change(input, {target: {value: "biology"}});
        expect(onChange).toHaveBeenCalledWith("biology");
        // Still showing the prop value: the parent owns the state.
        expect(input).toHaveValue("bio");
    });

    it("shows the clear button only when there is text, and clearing reports an empty value", () => {
        const onChange = jest.fn();
        const {rerender} = renderInput("bio", onChange);

        fireEvent.click(screen.getByRole("button", {name: "clearsearch"}));
        expect(onChange).toHaveBeenCalledWith("");

        rerender(
            <StringsContext.Provider value={strings}>
                <SearchInput value="" onChange={onChange} />
            </StringsContext.Provider>,
        );
        expect(screen.queryByRole("button", {name: "clearsearch"})).not.toBeInTheDocument();
    });
});
