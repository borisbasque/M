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
 * Course list pagination (MDL-88977, reworked for server-side paging).
 *
 * The design-system Pagination in its 'grouped' variant: previous/next controls
 * without page numbers, because the timeline web service returns no total count,
 * so the number of pages is unknowable without fetching the entire course set
 * (which would need an unbounded fetch). The component receives
 * totalPages = current page + 1 whenever the app's silent prefetch has confirmed
 * a non-empty next page, so "Next" never navigates onto an empty page, and the
 * DS component hides itself entirely on a single-page result.
 *
 * @module     block_myoverview/components/Pagination
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Pagination as DSPagination} from "@moodlehq/design-system";
import {useStrings} from "../state";


type PaginationProps = {
    page: number;
    hasNext: boolean;
    onPage: (page: number) => void;
};


/**
 * Render the previous/next pagination control.
 *
 * @param props The current page, whether a next page exists, and the page callback.
 * @returns The pagination element (the DS component hides itself on one page).
 */
export default function Pagination({page, hasNext, onPage}: PaginationProps) {
    const strings = useStrings();
    return (
        <div className="courseoverview-pagination">
            <DSPagination
                variant="grouped"
                totalPages={hasNext ? page + 1 : page}
                currentPage={page}
                onPageChange={onPage}
                ariaLabel={strings.courseoverview}
                previousPageLabel={strings.previouspage}
                nextPageLabel={strings.nextpage}
            />
        </div>
    );
}
