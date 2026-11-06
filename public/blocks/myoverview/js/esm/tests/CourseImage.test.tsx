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
 * Tests for the course image fallback behaviour.
 *
 * @module     block_myoverview/tests/CourseImage
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {render, fireEvent} from "@testing-library/react";

import CourseImage from "../src/components/CourseImage";

describe("block_myoverview/components/CourseImage", () => {
    it("renders the checkerboard fallback when no image is set", () => {
        const {container} = render(<CourseImage src={null} />);
        expect(container.querySelector(".courseoverview-image--empty")).toBeInTheDocument();
        expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("falls back to the checkerboard when the image fails to load", () => {
        const {container} = render(<CourseImage src="https://example.com/broken.png" />);
        const img = container.querySelector("img") as HTMLImageElement;
        expect(img).toBeInTheDocument();

        fireEvent.error(img);
        expect(container.querySelector(".courseoverview-image--empty")).toBeInTheDocument();
        expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("recovers when a new source arrives after an error", () => {
        const {container, rerender} = render(<CourseImage src="https://example.com/broken.png" />);
        fireEvent.error(container.querySelector("img") as HTMLImageElement);

        rerender(<CourseImage src="https://example.com/ok.png" />);
        expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/ok.png");
        expect(container.querySelector(".courseoverview-image--empty")).not.toBeInTheDocument();
    });
});
