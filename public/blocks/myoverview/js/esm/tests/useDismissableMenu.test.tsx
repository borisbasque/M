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
 * Tests for the shared dismissable-menu hook.
 *
 * @module     block_myoverview/tests/useDismissableMenu
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fireEvent, render, screen} from "@testing-library/react";
import {useDismissableMenu} from "../src/hooks/useDismissableMenu";

/**
 * Minimal component wiring the hook to a trigger and an N-item menu.
 *
 * @param props The item role and how many menu items to render.
 * @returns The harness element.
 */
function Harness({itemRole, count = 3}: {itemRole: "menuitem" | "menuitemradio"; count?: number}) {
    const {open, setOpen, containerRef, triggerRef, menuRef, handleMenuKeyDown} = useDismissableMenu(itemRole);
    return (
        <div>
            <div ref={containerRef}>
                <button type="button" ref={triggerRef} data-testid="trigger" onClick={() => setOpen((v) => !v)}>
                    Toggle
                </button>
                {open && (
                    <div role="menu" ref={menuRef} onKeyDown={handleMenuKeyDown}>
                        {Array.from({length: count}).map((_, i) => (
                            <button type="button" role={itemRole} key={i} data-testid={`item-${i}`}>
                                Item {i}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button type="button" data-testid="outside">Outside</button>
        </div>
    );
}

describe("block_myoverview/hooks/useDismissableMenu", () => {
    it("focuses the first item when the menu opens", () => {
        render(<Harness itemRole="menuitem" />);
        fireEvent.click(screen.getByTestId("trigger"));
        expect(screen.getByTestId("item-0")).toHaveFocus();
    });

    it("moves focus with ArrowDown/ArrowUp and wraps at the ends", () => {
        render(<Harness itemRole="menuitem" count={3} />);
        fireEvent.click(screen.getByTestId("trigger"));
        const menu = screen.getByRole("menu");

        fireEvent.keyDown(menu, {key: "ArrowDown"});
        expect(screen.getByTestId("item-1")).toHaveFocus();

        fireEvent.keyDown(menu, {key: "ArrowUp"});
        expect(screen.getByTestId("item-0")).toHaveFocus();

        // Wrap from the first item back to the last.
        fireEvent.keyDown(menu, {key: "ArrowUp"});
        expect(screen.getByTestId("item-2")).toHaveFocus();

        fireEvent.keyDown(menu, {key: "End"});
        expect(screen.getByTestId("item-2")).toHaveFocus();
        fireEvent.keyDown(menu, {key: "Home"});
        expect(screen.getByTestId("item-0")).toHaveFocus();
    });

    it("closes on Escape and returns focus to the trigger", () => {
        render(<Harness itemRole="menuitemradio" />);
        fireEvent.click(screen.getByTestId("trigger"));
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.keyDown(document, {key: "Escape"});
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(screen.getByTestId("trigger")).toHaveFocus();
    });

    it("closes when clicking outside the container", () => {
        render(<Harness itemRole="menuitem" />);
        fireEvent.click(screen.getByTestId("trigger"));
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("outside"));
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes even when the outside click's handler stops propagation", () => {
        // The card controls call stopPropagation so clicks don't trigger the card's stretched
        // link. That swallowed bubble-phase clicks: opening a second card's menu left the first
        // menu open. The hook listens in the capture phase, so it must close regardless.
        render(
            <div>
                <Harness itemRole="menuitem" />
                <button
                    type="button"
                    data-testid="swallowing-trigger"
                    onClick={(e) => e.stopPropagation()}
                >
                    Other card's menu button
                </button>
            </div>,
        );
        fireEvent.click(screen.getByTestId("trigger"));
        expect(screen.getByRole("menu")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("swallowing-trigger"));
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("keeps exactly one menu open when two menus' triggers are clicked in turn", () => {
        render(
            <div>
                <div data-testid="menu-a"><Harness itemRole="menuitem" /></div>
                <div data-testid="menu-b"><Harness itemRole="menuitem" /></div>
            </div>,
        );
        const [triggerA, triggerB] = screen.getAllByTestId("trigger");

        fireEvent.click(triggerA);
        expect(screen.getAllByRole("menu")).toHaveLength(1);

        fireEvent.click(triggerB);
        const menus = screen.getAllByRole("menu");
        expect(menus).toHaveLength(1);
        expect(screen.getByTestId("menu-b").contains(menus[0])).toBe(true);
    });
});
