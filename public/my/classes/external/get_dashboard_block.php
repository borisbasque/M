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
use core_external\external_single_structure;
use core_external\external_value;
use core_my\local\dashboard;

/**
 * Render one dashboard block, after the dashboard's layout has arrived without any block's content.
 *
 * Loading blocks one per request means a slow block never holds up the others. Read only: it runs
 * with a read-only session, so it never makes the viewer's other requests wait.
 *
 * @package    core_my
 * @category   external
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class get_dashboard_block extends external_api {
    /**
     * Define parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sitedefault' => new external_value(PARAM_BOOL, 'Whether the block is on the site default dashboard.'),
            'blockid' => new external_value(PARAM_INT, 'Block instance id.'),
        ]);
    }

    /**
     * Render the block.
     *
     * @param bool $sitedefault Whether the block is on the site default dashboard.
     * @param int $blockid Block instance id.
     * @return array
     */
    public static function execute(bool $sitedefault, int $blockid): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'sitedefault' => $sitedefault,
            'blockid' => $blockid,
        ]);
        $context = $params['sitedefault'] ? \context_system::instance() : \context_user::instance($USER->id);
        self::validate_context($context);

        // Capabilities, and that the block is on this viewer's dashboard, are checked there.
        return dashboard::get_block($params['sitedefault'], $params['blockid']);
    }

    /**
     * Define return data.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'block' => get_dashboard::block_structure(VALUE_REQUIRED, NULL_ALLOWED),
            'javascript' => new external_value(PARAM_RAW, 'Collected JavaScript requirements of the block.'),
        ]);
    }
}
