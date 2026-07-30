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
 * Tests for the empty/no-results/zero states: variant rendering, the async
 * zero-state copy (including the lang-string HTML path), CTA rules, and the
 * failure path.
 *
 * @module     block_myoverview/tests/EmptyState
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, screen, waitFor} from "@testing-library/react";

const mockResolveZeroStateCopy = jest.fn();
jest.mock("../src/strings", () => ({
    resolveZeroStateCopy: (...args: unknown[]) => mockResolveZeroStateCopy(...args),
}));

import EmptyState from "../src/components/EmptyState";
import {StringsContext} from "../src/state";
import {Strings, ZeroStateData} from "../src/types";

const strings = new Proxy({}, {get: (_, key) => String(key)}) as Strings;

const renderState = (props: Partial<Parameters<typeof EmptyState>[0]> = {}) => render(
    <StringsContext.Provider value={strings}>
        <EmptyState illustrationurl="https://example.com/courses.svg" {...props} />
    </StringsContext.Provider>,
);

const zerostate = (overrides: Partial<ZeroStateData> = {}): ZeroStateData => ({
    variant: "create",
    sitehascourses: true,
    createurl: "https://example.com/create",
    manageurl: "https://example.com/manage",
    docsurl: "https://docs.example.com/en/course",
    docstarget: "_blank",
    ...overrides,
});

describe("block_myoverview/components/EmptyState variants", () => {
    beforeEach(() => {
        mockResolveZeroStateCopy.mockReset();
        mockResolveZeroStateCopy.mockResolvedValue({title: "Zero title", intro: "Zero intro"});
    });

    it("renders the no-results copy for an active query", () => {
        renderState({variant: "no-results"});
        expect(screen.getByRole("heading", {name: "emptynoresultstitle"})).toBeInTheDocument();
        expect(screen.getByText("emptynoresults")).toBeInTheDocument();
    });

    it("renders the all-hidden copy pointing at the restore filter", () => {
        renderState({variant: "all-hidden"});
        expect(screen.getByRole("heading", {name: "emptyallhiddentitle"})).toBeInTheDocument();
        expect(screen.getByText("emptyallhiddenintro")).toBeInTheDocument();
    });

    it("exposes the illustration as decorative only", () => {
        renderState({variant: "no-results"});
        const img = document.querySelector(".courseoverview-empty__illustration img");
        expect(img).toHaveAttribute("alt", "");
    });
});

describe("block_myoverview/components/EmptyState zero-state", () => {
    beforeEach(() => {
        mockResolveZeroStateCopy.mockReset();
    });

    it("renders the stable card immediately and fills the async copy in, HTML intro included", async() => {
        mockResolveZeroStateCopy.mockResolvedValue({
            title: "Create your first course",
            intro: 'Check out the <a href="https://docs.example.com/en/course">Moodle documentation</a>.',
        });
        renderState({zerostate: zerostate()});

        await waitFor(() => expect(screen.getByRole("heading", {name: "Create your first course"})).toBeInTheDocument());
        // The intro is server/lang-string HTML rendered as markup, not text.
        expect(screen.getByRole("link", {name: "Moodle documentation"}))
            .toHaveAttribute("href", "https://docs.example.com/en/course");
    });

    it("shows Create and Manage CTAs for the create variant, with the manage label following sitehascourses", async() => {
        mockResolveZeroStateCopy.mockResolvedValue({title: "t", intro: "i"});
        renderState({zerostate: zerostate({sitehascourses: false})});

        await waitFor(() => expect(screen.getByRole("link", {name: "createcourse"})).toBeInTheDocument());
        // Empty site: the manage CTA points at category management.
        expect(screen.getByRole("link", {name: "managecategories"})).toHaveAttribute("href", "https://example.com/manage");
    });

    it("renders no CTAs for the request variant (the toolbar owns the Request link)", async() => {
        mockResolveZeroStateCopy.mockResolvedValue({title: "t", intro: "i"});
        renderState({zerostate: zerostate({variant: "request"})});

        await waitFor(() => expect(screen.getByRole("heading", {name: "t"})).toBeInTheDocument());
        expect(screen.queryByRole("link", {name: "createcourse"})).not.toBeInTheDocument();
    });

    it("logs and renders the stable parts without copy when resolution fails", async() => {
        const consoleError = jest.spyOn(window.console, "error").mockImplementation(() => undefined);
        try {
            mockResolveZeroStateCopy.mockRejectedValue(new Error("strings down"));
            renderState({zerostate: zerostate()});

            await waitFor(() => expect(consoleError).toHaveBeenCalled());
            expect(screen.queryByRole("heading")).not.toBeInTheDocument();
            // The card and its illustration still render.
            expect(document.querySelector('[data-variant="zerostate"]')).toBeInTheDocument();
        } finally {
            consoleError.mockRestore();
        }
    });
});
