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
 * Tests for the prev/next pagination wrapper around the DS component: the
 * totalPages contract is prefetch-driven (current page + 1 only once a next
 * page is confirmed), never a full count.
 *
 * @module     block_myoverview/tests/Pagination
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, fireEvent} from "@testing-library/react";

jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});

import Pagination from "../src/components/Pagination";
import {StringsContext} from "../src/state";
import {Strings} from "../src/types";

const strings = new Proxy({}, {get: (_, key) => String(key)}) as Strings;

const renderPagination = (page: number, hasNext: boolean, onPage: (p: number) => void = () => undefined) => render(
    <StringsContext.Provider value={strings}>
        <Pagination page={page} hasNext={hasNext} onPage={onPage} />
    </StringsContext.Provider>,
);

describe("block_myoverview/components/Pagination", () => {
    it("renders nothing on a single page with no confirmed next", () => {
        renderPagination(1, false);
        expect(screen.queryByRole("button", {name: "nextpage"})).not.toBeInTheDocument();
    });

    it("enables Next only when the prefetch confirmed a next page, and pages both ways", () => {
        const onPage = jest.fn();
        renderPagination(2, true, onPage);

        fireEvent.click(screen.getByRole("button", {name: "previouspage"}));
        expect(onPage).toHaveBeenCalledWith(1);
        fireEvent.click(screen.getByRole("button", {name: "nextpage"}));
        expect(onPage).toHaveBeenCalledWith(3);
    });

    it("disables Next on the last known page while keeping Previous available", () => {
        renderPagination(2, false);
        expect(screen.getByRole("button", {name: "nextpage"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "previouspage"})).toBeEnabled();
    });
});
