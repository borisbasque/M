<?php
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

namespace core_block;

/**
 * A block's size on a block grid, such as the flexible dashboard's, in whole columns and rows.
 *
 * Blocks return one of these from {@see \block_base::get_grid_minimum_size()} and
 * {@see \block_base::get_grid_preferred_size()}. Columns are counted on the grid at its widest:
 * between 1 and {@see self::MAX_COLUMNS}. A row is one row unit of the grid (6rem, 96px at
 * default text size); a block's height is always a whole number of rows.
 *
 * Values are not checked here. The page using the grid validates them, and replaces an
 * unusable declaration with its default and a developer debugging message, so a bad
 * declaration never stops a block from being shown.
 *
 * @package    core_block
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      Moodle 6.0
 */
final readonly class grid_size {
    /** Number of columns on the grid at its widest. */
    public const MAX_COLUMNS = 6;

    /** Largest number of rows a block may declare as its minimum or preferred height. */
    public const MAX_ROWS = 12;

    /**
     * Create a grid size.
     *
     * @param int $columns Width in grid columns.
     * @param int|null $rows Height in grid rows. For a preferred size, null means "as tall as the
     *     block's content", where the page supports that; for a minimum size, null means "the
     *     page's default minimum height".
     */
    public function __construct(
        /** @var int Width in grid columns. */
        public int $columns,
        /** @var int|null Height in grid rows, or null (see the constructor). */
        public ?int $rows = null,
    ) {
    }
}
