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
 * Course overview image (MDL-88967).
 *
 * Renders the course image cover-cropped into a fixed-height block, or a
 * checkerboard fallback when no image is set. Height follows the Figma redesign
 * (160px, --co-image-h in styles.css).
 *
 * @module     block_myoverview/components/CourseImage
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useState} from "react";

type CourseImageProps = {
    src: string | null;
    /** Extra class for view-specific sizing (list/summary use a narrow variant). */
    className?: string;
};

/**
 * Render the course image block with graceful fallback.
 *
 * @param props The image source and optional class.
 * @returns The image block.
 */
export default function CourseImage({src, className = ""}: CourseImageProps) {
    const [errored, setErrored] = useState(false);
    useEffect(() => setErrored(false), [src]);
    const showImage = src !== null && !errored;

    return (
        <div className={`courseoverview-image ${showImage ? "" : "courseoverview-image--empty"} ${className}`.trim()}>
            {showImage && (
                <img
                    src={src as string}
                    alt=""
                    className="courseoverview-image__img"
                    loading="lazy"
                    onError={() => setErrored(true)}
                />
            )}
        </div>
    );
}
