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

namespace core_my\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use core_my\local\dashboard;

/**
 * Fetch the responsive dashboard data: blocks, layout, capabilities, grid limits and control icons
 * the React application needs to render a full dashboard load (see
 * {@see \core_my\local\dashboard::get()}). Language strings are not part of it: the client
 * fetches those through core/str.
 * Called once on initial mount and again after any change that the client cannot safely predict
 * the server-side result of (e.g. adding a block, since its assigned position and rendered
 * content both come from the server).
 *
 * @package    core_my
 * @category   external
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class get_dashboard extends external_api {
    /**
     * Define parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sitedefault' => new external_value(PARAM_BOOL, 'Whether to fetch the site-default dashboard.'),
        ]);
    }

    /**
     * Execute the request.
     *
     * The site-default dashboard is a shared, admin-managed resource (context_system), so reading
     * it is gated by moodle/my:configsyspages; a user's own dashboard (context_user) needs no such
     * check here; whether the requesting user is even allowed to see it at all is already settled
     * by validate_context(), and whether they may edit it is a separate, less restrictive
     * capability check ('canedit' in the returned payload, not an access-control decision).
     *
     * @param bool $sitedefault Whether to fetch the site default.
     * @return array
     */
    public static function execute(bool $sitedefault): array {
        ['sitedefault' => $sitedefault] = self::validate_parameters(self::execute_parameters(), [
            'sitedefault' => $sitedefault,
        ]);
        $context = dashboard::get_context($sitedefault);
        self::validate_context($context);
        if ($sitedefault) {
            require_capability('moodle/my:configsyspages', $context);
        }
        return dashboard::get($sitedefault);
    }

    /**
     * Define return data.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'blocks' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Block instance id.'),
                'name' => new external_value(PARAM_PLUGIN, 'Block plugin name.'),
                'title' => new external_value(PARAM_RAW, 'Rendered block title.'),
                'content' => new external_value(PARAM_RAW, 'Rendered block content.'),
                'footer' => new external_value(PARAM_RAW, 'Rendered block footer.'),
                'region' => new external_value(PARAM_ALPHANUMEXT, 'Legacy block region.'),
                'weight' => new external_value(PARAM_INT, 'Legacy block weight.'),
                'visible' => new external_value(
                    PARAM_BOOL,
                    'Whether the block is shown. A hidden block is only returned while editing.',
                ),
                'controls' => new external_value(
                    PARAM_RAW,
                    'The block\'s standard editing-controls menu, rendered, or empty when not editing.',
                ),
            ])),
            'layout' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Block instance id.'),
                'column' => new external_value(PARAM_INT, 'Zero-based column.'),
                'row' => new external_value(PARAM_INT, 'Zero-based row.'),
                'columns' => new external_value(PARAM_INT, 'Column span.'),
                'rows' => new external_value(PARAM_INT, 'Row span.'),
            ])),
            'availableblocks' => new external_multiple_structure(new external_single_structure([
                'name' => new external_value(PARAM_PLUGIN, 'Block plugin name.'),
                'title' => new external_value(PARAM_RAW, 'Block title.'),
                'blockform' => new external_value(
                    PARAM_RAW,
                    'The class name of the form to show when adding this block type, or null for none.',
                ),
            ]), 'Block types the user may add, as core/add_block_body takes them.'),
            'canedit' => new external_value(PARAM_BOOL, 'Whether the user may edit.'),
            'editing' => new external_value(PARAM_BOOL, 'Whether Edit mode is active.'),
            'sitedefault' => new external_value(PARAM_BOOL, 'Whether this is the site default.'),
            'limits' => new external_single_structure([
                'mincolumns' => new external_value(PARAM_INT, 'Minimum column span of a block.'),
                'minrows' => new external_value(PARAM_INT, 'Minimum row span of a block.'),
                'maxcolumns' => new external_value(PARAM_INT, 'Number of columns in the canonical grid.'),
                'maxrows' => new external_value(PARAM_INT, 'Maximum number of rows in the grid.'),
            ], 'Grid bounds, resolved on the server so that the client enforces the same values.'),
            'icons' => new external_single_structure([
                'move' => new external_value(PARAM_RAW, 'Rendered move handle icon.'),
                'resize' => new external_value(PARAM_RAW, 'Rendered resize handle icon.'),
                'add' => new external_value(PARAM_RAW, 'Rendered add-a-block icon.'),
                'up' => new external_value(PARAM_RAW, 'Rendered up directional control icon.'),
                'down' => new external_value(PARAM_RAW, 'Rendered down directional control icon.'),
                'left' => new external_value(PARAM_RAW, 'Rendered left directional control icon.'),
                'right' => new external_value(PARAM_RAW, 'Rendered right directional control icon.'),
            ], 'Control icons, rendered through the theme icon system.'),
            'javascript' => new external_value(PARAM_RAW, 'Collected block JavaScript requirements.'),
        ]);
    }
}
