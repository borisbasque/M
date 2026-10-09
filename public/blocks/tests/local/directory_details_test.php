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

namespace core_block\local;

use core\update\testable_api;
use PHPUnit\Framework\Attributes\CoversClass;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/tests/fixtures/testable_update_api.php');

/**
 * Tests for keeping contributed blocks' plugins directory details on the site.
 *
 * @package    core_block
 * @category   test
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(directory_details::class)]
final class directory_details_test extends \advanced_testcase {
    /**
     * A block the directory describes has its summary kept, and shown while the lookup is on.
     */
    public function test_refresh_keeps_the_directory_summary(): void {
        $this->resetAfterTest();

        $this->assertTrue(directory_details::refresh('described', testable_api::client()));

        // Plain text only.
        $this->assertSame('Shows described things.', directory_details::get_summary('described'));
        $this->assertSame('https://marketplace.moodle.com/?type=2', directory_details::get_discover_url());
    }

    /**
     * Turning the lookup off hides everything kept, and the link to discover more blocks.
     */
    public function test_nothing_is_shown_while_the_lookup_is_off(): void {
        $this->resetAfterTest();
        directory_details::refresh('described', testable_api::client());

        set_config('blockdirectorydetails', 0);

        $this->assertNull(directory_details::get_summary('described'));
        $this->assertNull(directory_details::get_icon_url('described'));
        $this->assertNull(directory_details::get_discover_url());
    }

    /**
     * A block the directory does not know, or a lookup that fails, keeps whatever was kept before.
     */
    public function test_a_failed_lookup_keeps_what_was_stored(): void {
        $this->resetAfterTest();
        set_config('directorysummary_inhouse', 'Kept from an earlier lookup.', 'core_block');

        $this->assertFalse(directory_details::refresh('inhouse', testable_api::client()));

        $this->assertSame('Kept from an earlier lookup.', directory_details::get_summary('inhouse'));
    }

    /**
     * A block the directory knows but does not describe keeps what it had, and gets no summary.
     */
    public function test_a_block_the_directory_does_not_describe_gets_nothing(): void {
        $this->resetAfterTest();

        $this->assertTrue(directory_details::refresh('undescribed', testable_api::client()));

        $this->assertNull(directory_details::get_summary('undescribed'));
        $this->assertNull(directory_details::get_icon_url('undescribed'));
    }

    /**
     * Core blocks describe themselves, and are never looked up.
     */
    public function test_core_blocks_are_never_due(): void {
        $this->resetAfterTest();

        $due = directory_details::get_due();

        foreach (\core_plugin_manager::instance()->get_plugins_of_type('block') as $name => $plugin) {
            if ($plugin->is_standard()) {
                $this->assertNotContains($name, $due);
            }
        }
    }

    /**
     * A kept icon is served from the site, at an address that changes when the icon does.
     */
    public function test_a_kept_icon_is_served_from_the_site(): void {
        $this->resetAfterTest();
        get_file_storage()->create_file_from_string([
            'contextid' => \context_system::instance()->id,
            'component' => 'core_block',
            'filearea' => directory_details::FILEAREA,
            'itemid' => 0,
            'filepath' => '/',
            'filename' => 'described.png',
        ], 'not really a png');

        $url = directory_details::get_icon_url('described');

        $this->assertStringContainsString('/pluginfile.php/' . \context_system::instance()->id . '/core_block/directoryicon/',
            $url->out(false));
        $this->assertStringEndsWith('/described.png', $url->out(false));
        $this->assertNull(directory_details::get_icon_url('other'));
    }
}
