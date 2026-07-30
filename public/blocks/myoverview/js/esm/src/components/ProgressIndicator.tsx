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
 * Course completion progress indicator (MDL-88970).
 *
 * Delegates to the DS ProgressBar. The label variant follows the MDS progress-bar
 * guidance: the inline count sits beside the track only where horizontal space
 * allows (list and summary rows); in the narrow card the label moves above the
 * track via the 'title' variant so the bar stays long enough to read, with the
 * percentage string as that single label line.
 *
 * The accessible name is always the "Course progress:" string — the visible
 * percentage must not become the name (the value is already announced from
 * aria-valuenow), so it is passed as aria-label in both variants.
 *
 * @module     block_myoverview/components/ProgressIndicator
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {ProgressBar} from "@moodlehq/design-system";
import {useStrings} from "../state";

type ProgressIndicatorProps = {
    progress: number;
    /** 'title' stacks the percentage above the bar (card view); 'inline' puts it beside (list/summary rows). */
    labelVariant?: "title" | "inline";
};

/**
 * Render the DS ProgressBar for a course item.
 *
 * @param props The progress percentage (0-100) and the label variant.
 * @returns The progress bar element.
 */
export default function ProgressIndicator({progress, labelVariant = "inline"}: ProgressIndicatorProps) {
    const strings = useStrings();
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const count = strings.percentcomplete.replace("{$a}", String(clamped));
    return (
        <ProgressBar
            value={clamped}
            labelVariant={labelVariant}
            title={labelVariant === "title" ? count : undefined}
            count={labelVariant === "inline" ? count : undefined}
            aria-label={strings.courseprogress}
            className="courseoverview-progress"
        />
    );
}
