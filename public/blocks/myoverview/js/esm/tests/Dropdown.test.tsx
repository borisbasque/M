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
 * Tests for the dropdown: menuitemradio semantics, group dividers, and the
 * Escape-dismissable CSS tooltip (WCAG 2.1 1.4.13).
 *
 * @module     block_myoverview/tests/Dropdown
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, fireEvent} from "@testing-library/react";

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

    it("draws a group divider only after the last item of each group", () => {
        renderDropdown({groupOf: (value: string) => value.charAt(0)});
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));

        expect(screen.getByRole("menuitemradio", {name: "Alpha two"}))
            .toHaveClass("courseoverview-menu__item--group-end");
        expect(screen.getByRole("menuitemradio", {name: "Alpha one"}))
            .not.toHaveClass("courseoverview-menu__item--group-end");
        // No divider after the final item.
        expect(screen.getByRole("menuitemradio", {name: "Beta one"}))
            .not.toHaveClass("courseoverview-menu__item--group-end");
    });

    it("selecting an option closes the menu and returns focus to the trigger", () => {
        const onSelect = jest.fn();
        renderDropdown({onSelect});
        const trigger = screen.getByRole("button", {name: "Filter"});
        fireEvent.click(trigger);
        fireEvent.click(screen.getByRole("menuitemradio", {name: "Beta one"}));

        expect(onSelect).toHaveBeenCalledWith("b1");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });
});

describe("block_myoverview/components/Dropdown tooltip dismissal", () => {
    it("drops the tooltip on Escape while hovered and restores it on re-entry", () => {
        renderDropdown({tooltip: "Filter results"});
        const trigger = screen.getByRole("button", {name: "Filter"});
        expect(trigger).toHaveAttribute("data-tooltip", "Filter results");

        // Escape during hover suppresses the CSS tooltip (the attribute is its content).
        fireEvent.mouseEnter(trigger);
        fireEvent.keyDown(document, {key: "Escape"});
        expect(trigger).not.toHaveAttribute("data-tooltip");

        // Leaving and re-entering shows it again: 1.4.13 dismissal, not removal.
        fireEvent.mouseLeave(trigger);
        fireEvent.mouseEnter(trigger);
        expect(trigger).toHaveAttribute("data-tooltip", "Filter results");
    });

    it("Escape with focus elsewhere does not affect an unhovered trigger", () => {
        renderDropdown({tooltip: "Filter results"});
        const trigger = screen.getByRole("button", {name: "Filter"});
        fireEvent.keyDown(document, {key: "Escape"});
        expect(trigger).toHaveAttribute("data-tooltip", "Filter results");
    });
});
