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
 * Tests for the dropdown built on the design system Dropdown: menuitemradio
 * semantics, group dividers, closing on select, and the trigger's appearance.
 * Keyboard handling, focus return and tooltip dismissal belong to the design
 * system and are tested there.
 *
 * @module     block_myoverview/tests/Dropdown
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, fireEvent, within} from "@testing-library/react";

jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});

import Dropdown from "../src/components/Dropdown";

const OPTIONS = [
    {value: "a1", label: "Alpha one"},
    {value: "a2", label: "Alpha two"},
    {value: "b1", label: "Beta one"},
];

const renderDropdown = (props: Partial<Parameters<typeof Dropdown<string>>[0]> = {}) => render(
    <Dropdown<string>
        label="Filter"
        options={OPTIONS}
        current="a2"
        onSelect={() => undefined}
        active={false}
        {...props}
    />,
);

describe("block_myoverview/components/Dropdown menu semantics", () => {
    it("marks only the current option as checked", () => {
        renderDropdown();
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));

        expect(screen.getByRole("menuitemradio", {name: "Alpha two"})).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("menuitemradio", {name: "Alpha one"})).toHaveAttribute("aria-checked", "false");
    });

    it("draws a group divider only between groups", () => {
        renderDropdown({groupOf: (value: string) => value.charAt(0)});
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));

        const menu = screen.getByRole("menu");
        const roles = Array.from(menu.children).map((el) => el.getAttribute("role"));
        expect(roles).toEqual(["menuitemradio", "menuitemradio", "separator", "menuitemradio"]);
    });

    it("shows the menu title as a header", () => {
        renderDropdown({menuTitle: "Filters"});
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));

        expect(within(screen.getByRole("menu")).getByText("Filters")).toBeInTheDocument();
    });

    it("selecting an option reports it and closes the menu", () => {
        const onSelect = jest.fn();
        renderDropdown({onSelect});
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));
        fireEvent.click(screen.getByRole("menuitemradio", {name: "Beta one"}));

        expect(onSelect).toHaveBeenCalledWith("b1");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
});

describe("block_myoverview/components/Dropdown trigger", () => {
    it("uses the emphasis appearance only when the value is not the default", () => {
        const {rerender} = renderDropdown({icon: "sort"});
        expect(screen.getByRole("button", {name: "Filter"})).toHaveAttribute("data-appearance", "default");

        rerender(<Dropdown<string> label="Filter" icon="sort" options={OPTIONS} current="a2"
            onSelect={() => undefined} active />);
        expect(screen.getByRole("button", {name: "Filter"})).toHaveAttribute("data-appearance", "emphasis");
    });

    it("a labelled trigger shows the selection and keeps the fuller accessible name", () => {
        renderDropdown({showLabel: true, triggerAriaLabel: "Filter: Alpha two"});
        const trigger = screen.getByRole("button", {name: "Filter: Alpha two"});
        expect(trigger).toHaveTextContent("Alpha two");
    });

    it("names the trigger in a tooltip", () => {
        renderDropdown({tooltip: "Filter results"});
        expect(screen.getByRole("button", {name: "Filter"}).closest("[data-tooltip]"))
            .toHaveAttribute("data-tooltip", "Filter results");
    });
});
