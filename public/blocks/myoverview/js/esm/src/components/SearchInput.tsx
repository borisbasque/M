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
 * Course search input (MDL-88972).
 *
 * A controlled text field. Search state is independent of filter and sort
 * (MDL-88973): typing here never resets them, and clearing it leaves them
 * intact.
 *
 * @module     block_myoverview/components/SearchInput
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {SearchInput as MdsSearchInput} from "@moodlehq/design-system";
import {useStrings} from "../state";

type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
};

/**
 * Render the design system search field, with its leading icon and clear button.
 *
 * The label is visually hidden: the field's placeholder and icon say what it is, and the
 * label stays its accessible name. Clearing (the button, or Escape) reports an empty value.
 *
 * @param props The current value and change handler.
 * @returns The search input.
 */
export default function SearchInput({value, onChange}: SearchInputProps) {
    const strings = useStrings();
    return (
        <MdsSearchInput
            className="courseoverview-search"
            label={strings.searchcourses}
            hideLabel
            clearLabel={strings.clearsearch}
            placeholder={strings.search}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
