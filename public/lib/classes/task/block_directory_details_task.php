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

namespace core\task;

use core_block\local\directory_details;

/**
 * Look up installed contributed blocks in the plugins directory, for the dashboard's block browser.
 *
 * Runs often but does little: only blocks never looked up, upgraded since, or not looked up for a
 * week are fetched, so a newly installed block is described within the hour without the lookup
 * ever running during installation or upgrade. Failures are logged and change nothing.
 *
 * @package    core
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_directory_details_task extends scheduled_task {
    #[\Override]
    public function get_name() {
        return get_string('taskblockdirectorydetails', 'admin');
    }

    #[\Override]
    public function execute() {
        if (!directory_details::is_enabled()) {
            return;
        }
        foreach (directory_details::get_due() as $blockname) {
            if (directory_details::refresh($blockname)) {
                mtrace("Looked up block_{$blockname} in the plugins directory.");
            } else {
                mtrace("Could not look up block_{$blockname} in the plugins directory; keeping what was stored.");
            }
        }
    }
}
