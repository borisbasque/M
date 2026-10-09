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
 * Lines the page heading up with the dashboard's blocks.
 *
 * The heading spans the same width as the grid. When the outer columns hold no block - as in the
 * default layout at six columns - it would otherwise reach further out than anything below it. This
 * insets it to run from the leftmost to the rightmost column that has a block, by setting two custom
 * properties on the page, which the theme applies to the page header (my.scss). It follows the
 * committed layout only, never a drag in progress, so the heading moves once, when a block lands.
 *
 * @module     core_my/headingAlignment
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useLayoutEffect, type RefObject} from 'react';
import {readGridMetrics, unusedEdgeColumns, type LayoutItem} from './layout';

export const HEADING_INSET_START = '--core-my-dashboard-heading-inset-start';
export const HEADING_INSET_END = '--core-my-dashboard-heading-inset-end';

/**
 * Keep the page heading aligned with the blocks on the grid.
 *
 * @param gridRef The grid element.
 * @param layout The committed layout, at the current column count.
 * @param columnCount The grid's column count.
 */
export const useHeadingAlignment = (
    gridRef: RefObject<HTMLElement | null>,
    layout: LayoutItem[],
    columnCount: number,
): void => {
    // A layout effect, so the heading is in place before the browser paints.
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) {
            return undefined;
        }
        const {start, end} = unusedEdgeColumns(layout, columnCount);
        const apply = () => {
            const {gap} = readGridMetrics(grid);
            const stride = (grid.getBoundingClientRect().width - gap * (columnCount - 1)) / columnCount + gap;
            document.body.style.setProperty(HEADING_INSET_START, `${Math.max(0, start * stride)}px`);
            document.body.style.setProperty(HEADING_INSET_END, `${Math.max(0, end * stride)}px`);
        };
        apply();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
        observer?.observe(grid);
        return () => observer?.disconnect();
    }, [gridRef, layout, columnCount]);

    // Leaving the dashboard (unmounting) puts the heading back as it was.
    useLayoutEffect(() => () => {
        document.body.style.removeProperty(HEADING_INSET_START);
        document.body.style.removeProperty(HEADING_INSET_END);
    }, []);
};
