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
 * Tests for the app root's server-side paging orchestration and the
 * search/filter exclusivity.
 *
 * @module     block_myoverview/tests/app
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {act, render, screen, waitFor, fireEvent} from "@testing-library/react";

// The design-system package is ESM-only, so Jest cannot require it — every suite
// shares the contract-faithful mock in helpers/dsMock.
jest.mock("@moodlehq/design-system", () => require("./helpers/dsMock"), {virtual: true});


const mockGetCourses = jest.fn();
const mockSetPreference = jest.fn();
jest.mock("../src/repository", () => {
    const actual = jest.requireActual("../src/repository");
    return {
        ...actual,
        getCourses: (...args: unknown[]) => mockGetCourses(...args),
        setPreference: (...args: unknown[]) => mockSetPreference(...args),
        setFavourite: jest.fn().mockResolvedValue(undefined),
        setCourseHidden: jest.fn().mockResolvedValue(undefined),
    };
});

// Resolve every UI string to its key so assertions are locale-independent.
// Routed through a jest.fn so individual tests can make the fetch fail.
const mockLoadStrings = jest.fn();
const mockLoadErrorString = jest.fn();
jest.mock("../src/strings", () => ({
    loadStrings: () => mockLoadStrings(),
    loadErrorString: () => mockLoadErrorString(),
}));
const stringsResolvingToKeys = () => Promise.resolve(new Proxy({}, {
    get: (_, key) => String(key),
}));
jest.mock("@moodle/lms/core/stringUtils", () => ({
    getString: (identifier: string) => Promise.resolve(identifier),
    getStrings: (requests: Array<{key: string}>) => Promise.resolve(requests.map((r) => r.key)),
}));

import App from "../src/app";
import {AppProps, PAGE_SIZE} from "../src/types";

/**
 * Build a minimal course record.
 *
 * @param id The course id.
 * @returns A course fixture.
 */
const course = (id: number) => ({
    id,
    fullname: `Course ${id}`,
    fullnamedisplay: `Course ${id}`,
    shortname: `C${id}`,
    coursecategory: "Category 1",
    courseimage: "",
    summary: "",
    hasprogress: false,
    progress: null,
    isfavourite: false,
    visible: true,
    viewurl: `https://example.com/course/${id}`,
});

const PROPS: AppProps = {
    preferences: {view: "card", filter: "all", sort: "title"},
    config: {
        enabledviews: ["card", "list", "summary"],
        enabledfilters: ["allincludinghidden", "all", "inprogress", "future", "past", "favourites", "hidden"],
        displaycategories: true,
        showshortname: false,
        defaultsort: "title",
        defaultfilter: "all",
    },
    hiddencourseids: [],
    zerostate: null,
    illustrationurl: "https://example.com/courses.svg",
};

/** Pages served by the mocked repository, keyed by offset. */
const pageAt = (offset: number, count: number) => ({
    courses: Array.from({length: count}, (_, i) => course(offset + i + 1)),
    nextoffset: offset + count,
});

describe("block_myoverview/app paging orchestration", () => {
    beforeEach(() => {
        mockGetCourses.mockReset();
        mockSetPreference.mockReset();
        mockLoadStrings.mockReset();
        mockLoadStrings.mockImplementation(stringsResolvingToKeys);
        mockLoadErrorString.mockReset();
        mockLoadErrorString.mockImplementation(() => Promise.reject(new Error("nothing cached")));
    });

    it("fetches page 1 then silently prefetches page 2 from the returned nextoffset", async() => {
        mockGetCourses.mockImplementation(({offset}) =>
            Promise.resolve(offset === 0 ? pageAt(0, PAGE_SIZE) : pageAt(offset, 3)));

        render(<App {...PROPS} />);

        await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());
        await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));

        expect(mockGetCourses.mock.calls[0][0]).toMatchObject({limit: PAGE_SIZE, offset: 0, classification: "all"});
        expect(mockGetCourses.mock.calls[1][0]).toMatchObject({limit: PAGE_SIZE, offset: PAGE_SIZE});

        // Only page 1 is displayed.
        expect(screen.getByText(`Course ${PAGE_SIZE}`)).toBeInTheDocument();
        expect(screen.queryByText(`Course ${PAGE_SIZE + 1}`)).not.toBeInTheDocument();
    });

    it("enables Next only once the prefetch confirms a non-empty page, and pages onto it", async() => {
        mockGetCourses.mockImplementation(({offset}) =>
            Promise.resolve(offset === 0 ? pageAt(0, PAGE_SIZE) : pageAt(offset, 3)));

        render(<App {...PROPS} />);
        await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));

        const next = await screen.findByRole("button", {name: "nextpage"});
        await waitFor(() => expect(next).toBeEnabled());
        expect(screen.getByRole("button", {name: "previouspage"})).toBeDisabled();

        fireEvent.click(next);
        await waitFor(() => expect(screen.getByText(`Course ${PAGE_SIZE + 1}`)).toBeInTheDocument());
        // The short page 2 is the end of the set: Next disabled, no further prefetch.
        expect(screen.getByRole("button", {name: "nextpage"})).toBeDisabled();
        expect(mockGetCourses).toHaveBeenCalledTimes(2);
    });

    it("keeps the loaded pages and current position when toggling card and list layouts", async() => {
        mockGetCourses.mockImplementation(({offset}) =>
            Promise.resolve(offset === 0 ? pageAt(0, PAGE_SIZE) : pageAt(offset, 3)));

        render(<App {...PROPS} />);
        await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));

        const next = await screen.findByRole("button", {name: "nextpage"});
        await waitFor(() => expect(next).toBeEnabled());
        fireEvent.click(next);
        await waitFor(() => expect(screen.getByText(`Course ${PAGE_SIZE + 1}`)).toBeInTheDocument());

        // Card and list request identical data: switching must not refetch or reset paging.
        fireEvent.click(screen.getByRole("button", {name: /tooltipview/}));
        fireEvent.click(screen.getByRole("menuitemradio", {name: /viewlist/}));
        await waitFor(() => expect(screen.getByText(`Course ${PAGE_SIZE + 1}`)).toBeInTheDocument());
        expect(mockGetCourses).toHaveBeenCalledTimes(2);

        // Summary needs extra fields, so that switch DOES reset and refetch from page 1.
        fireEvent.click(screen.getByRole("button", {name: /tooltipview/}));
        fireEvent.click(screen.getByRole("menuitemradio", {name: /viewsummary/}));
        await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());
        expect(mockGetCourses.mock.calls.length).toBeGreaterThan(2);
    });

    it("hides the pagination entirely on a single short page", async() => {
        mockGetCourses.mockResolvedValue(pageAt(0, 3));

        render(<App {...PROPS} />);
        await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());

        expect(screen.queryByRole("button", {name: "nextpage"})).not.toBeInTheDocument();
        expect(mockGetCourses).toHaveBeenCalledTimes(1);
    });

    it("search overrides the grouping and never writes the filter preference", async() => {
        jest.useFakeTimers();
        try {
            mockGetCourses.mockResolvedValue(pageAt(0, 2));

            render(<App {...PROPS} />);
            await act(async() => {
                await Promise.resolve();
            });
            await act(async() => {
                jest.runOnlyPendingTimers();
            });
            expect(mockGetCourses).toHaveBeenCalled();
            mockGetCourses.mockClear();

            const input = screen.getByLabelText("searchcourses");
            fireEvent.change(input, {target: {value: "Biology"}});
            await act(async() => {
                jest.advanceTimersByTime(400);
            });
            await act(async() => {
                await Promise.resolve();
            });

            expect(mockGetCourses).toHaveBeenCalledWith(expect.objectContaining({
                classification: "search",
                searchvalue: "Biology",
                limit: PAGE_SIZE,
                offset: 0,
            }));
            // Search is a display-time override: the stored grouping preference is untouched.
            expect(mockSetPreference).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });

    it("retries a failed silent prefetch so Next is not permanently disabled", async() => {
        let prefetchcalls = 0;
        mockGetCourses.mockImplementation(({offset}) => {
            if (offset === 0) {
                return Promise.resolve(pageAt(0, PAGE_SIZE));
            }
            // First prefetch attempt fails transiently; the retry succeeds.
            prefetchcalls++;
            return prefetchcalls === 1
                ? Promise.reject(new Error("network"))
                : Promise.resolve(pageAt(offset, 2));
        });

        render(<App {...PROPS} />);
        await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());

        const next = await screen.findByRole("button", {name: "nextpage"});
        await waitFor(() => expect(next).toBeEnabled());
        expect(prefetchcalls).toBe(2);
    });

    it("refetches the pages after hiding a course, keeping the user's position", async() => {
        mockGetCourses.mockResolvedValue(pageAt(0, PAGE_SIZE - 1));

        render(<App {...PROPS} />);
        await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());
        expect(mockGetCourses).toHaveBeenCalledTimes(1);

        // Open the first card's menu and remove the course from view.
        fireEvent.click(screen.getAllByRole("button", {name: /actionsfor/})[0]);
        fireEvent.click(screen.getByRole("menuitem", {name: "hidecourse"}));

        // The optimistic filter removes the card at once, and the successful write
        // triggers a silent refetch of the current query's pages.
        await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
        expect(mockGetCourses.mock.calls[1][0]).toMatchObject({classification: "all", offset: 0});
    });

    it("keeps observing the LIVE root element after strings load, so width tiers update", async() => {
        // Regression: the strings-loading gate used to return a different top-level
        // element than the loaded render; React remounted the section and the
        // ResizeObserver kept watching the detached node, freezing the
        // courseoverview-min-* classes (seen as a permanently single-column grid).
        const observers: Array<{cb: (e: unknown[]) => void; el: Element | null}> = [];
        class MockResizeObserver {
            private record: {cb: (e: unknown[]) => void; el: Element | null};
            constructor(cb: (e: unknown[]) => void) {
                this.record = {cb, el: null};
                observers.push(this.record);
            }
            observe(el: Element) {
                this.record.el = el;
            }
            disconnect() {
                this.record.el = null;
            }
        }
        const original = (global as {ResizeObserver?: unknown}).ResizeObserver;
        (global as {ResizeObserver?: unknown}).ResizeObserver = MockResizeObserver;
        try {
            mockGetCourses.mockResolvedValue(pageAt(0, 3));
            const {container} = render(<App {...PROPS} />);
            // Strings resolve and the full tree renders.
            await waitFor(() => expect(screen.getByText("Course 1")).toBeInTheDocument());

            // The observed element must still be the CONNECTED root section — a
            // detached node here reproduces the frozen-width-tier bug.
            const active = observers.filter((o) => o.el !== null);
            expect(active).toHaveLength(1);
            expect(active[0].el!.isConnected).toBe(true);

            // A late resize (layout settling after load) must reflow the width tiers.
            await act(async() => {
                active[0].cb([{contentRect: {width: 900}}]);
            });
            const section = container.querySelector("section.block-myoverview");
            expect(section!.className).toContain("courseoverview-min-480");
            expect(section!.className).toContain("courseoverview-min-576");
            expect(section!.className).not.toContain("courseoverview-min-992");
        } finally {
            (global as {ResizeObserver?: unknown}).ResizeObserver = original;
        }
    });

    it("keeps the controls and explains recovery when every course is removed from view", async() => {
        // The server returns nothing for the default filter (all courses hidden), and
        // zerostate is null — the server's proof that the user HAS enrolments.
        mockGetCourses.mockResolvedValue({courses: [], nextoffset: 0});

        render(<App {...PROPS} />);

        // Not a zero-state: the all-hidden guidance shows and the grouping menu stays
        // reachable so the user can select "Removed from view" to restore courses.
        await waitFor(() => expect(screen.getByText("emptyallhiddentitle")).toBeInTheDocument());
        expect(screen.getByText("emptyallhiddenintro")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /filterresults/})).toBeInTheDocument();
    });

    it("ends in a visible error, not an eternal spinner, when strings never load", async() => {
        jest.useFakeTimers();
        try {
            mockLoadStrings.mockImplementation(() => Promise.reject(new Error("strings service down")));
            mockGetCourses.mockResolvedValue({courses: [], nextoffset: 0});

            const {container} = render(<App {...PROPS} />);

            // Initial attempt plus three bounded retries at 2s apart.
            for (let i = 0; i < 4; i++) {
                await act(async() => {
                    await jest.advanceTimersByTimeAsync(2000);
                });
            }

            expect(screen.getByRole("alert")).toHaveTextContent(/reload the page/i);
            expect(container.querySelector(".block-myoverview__loading")).toBeNull();
        } finally {
            jest.useRealTimers();
        }
    });

    it("prefers the cached translated message for the terminal strings error", async() => {
        jest.useFakeTimers();
        try {
            mockLoadStrings.mockImplementation(() => Promise.reject(new Error("strings service down")));
            mockLoadErrorString.mockImplementation(() => Promise.resolve("Fout bij het laden van je cursussen."));
            mockGetCourses.mockResolvedValue({courses: [], nextoffset: 0});

            render(<App {...PROPS} />);

            for (let i = 0; i < 4; i++) {
                await act(async() => {
                    await jest.advanceTimersByTimeAsync(2000);
                });
            }

            expect(screen.getByRole("alert")).toHaveTextContent("Fout bij het laden van je cursussen.");
        } finally {
            jest.useRealTimers();
        }
    });

    it("shows progress only for courses that report it, with the MDS title variant in card view", async() => {
        mockGetCourses.mockResolvedValue({
            courses: [{...course(1), hasprogress: true, progress: 45}, course(2)],
            nextoffset: 2,
        });

        const {container} = render(<App {...PROPS} />);
        await screen.findByText("Course 1");

        // Course 2 reports no progress, so only one bar renders.
        const bars = screen.getAllByRole("progressbar");
        expect(bars).toHaveLength(1);
        // The accessible name is what is measured; the value comes from aria-valuenow.
        expect(bars[0]).toHaveAttribute("aria-label", "courseprogress");
        expect(bars[0]).toHaveAttribute("aria-valuenow", "45");

        // Card view is the narrow layout: label line above the track, no inline count.
        const wrapper = container.querySelector(".courseoverview-progress") as HTMLElement;
        expect(wrapper.className).toContain("mds-progress-bar--label-title");
        expect(wrapper.querySelector(".mds-progress-bar-title")).toHaveTextContent("percentcomplete");
        expect(wrapper.querySelector(".mds-progress-bar-count")).toBeNull();
    });

    it("uses the MDS inline count variant in the wide list and summary rows", async() => {
        mockGetCourses.mockResolvedValue({
            courses: [{...course(1), hasprogress: true, progress: 45}],
            nextoffset: 1,
        });

        for (const view of ["list", "summary"] as const) {
            const props = {...PROPS, preferences: {...PROPS.preferences, view}};
            const {container, unmount} = render(<App {...props} />);
            await screen.findByText("Course 1");

            const wrapper = container.querySelector(".courseoverview-progress") as HTMLElement;
            expect(wrapper.className).toContain("mds-progress-bar--label-inline");
            expect(wrapper.querySelector(".mds-progress-bar-count")).toHaveTextContent("percentcomplete");
            expect(wrapper.querySelector(".mds-progress-bar-title")).toBeNull();
            unmount();
        }
    });
});
