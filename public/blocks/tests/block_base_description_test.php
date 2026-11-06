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

use PHPUnit\Framework\Attributes\CoversMethod;
use PHPUnit\Framework\Attributes\DataProvider;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/blocks/moodleblock.class.php');

/**
 * Tests for the description and icon a block can declare for people choosing a block to add.
 *
 * @package    core_block
 * @category   test
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversMethod(\block_base::class, 'get_description')]
#[CoversMethod(\block_base::class, 'get_icon')]
final class block_base_description_test extends \advanced_testcase {
    /**
     * A block that declares nothing has no description or icon, so callers use their own fallbacks.
     */
    public function test_a_block_declaring_nothing_has_neither(): void {
        $block = new class extends \block_base {
            /**
             * Give the block a title, as every block's init() does.
             */
            public function init() {
                $this->title = 'Undeclared';
            }

            #[\Override]
            public function name() {
                return 'undeclared_test_block';
            }
        };

        $this->assertNull($block->get_description());
        $this->assertNull($block->get_icon());
    }

    /**
     * Every core block that can be added to the dashboard describes itself, in its own language
     * strings, and has an icon.
     *
     * @param string $name The block's name.
     */
    #[DataProvider('dashboard_blocks_provider')]
    public function test_core_dashboard_blocks_declare_both(string $name): void {
        $this->resetAfterTest();

        $block = block_instance($name);
        $this->assertSame(get_string('plugindescription', 'block_' . $name), $block->get_description());
        $this->assertInstanceOf(\core\output\pix_icon::class, $block->get_icon());
    }

    /**
     * The core blocks that can be added to the dashboard.
     *
     * @return array
     */
    public static function dashboard_blocks_provider(): array {
        $names = ['badges', 'calendar_month', 'calendar_upcoming', 'comments', 'course_list', 'globalsearch',
            'glossary_random', 'html', 'lp', 'mentees', 'myoverview', 'myprofile', 'navigation', 'news_items',
            'online_users', 'private_files', 'recentlyaccessedcourses', 'recentlyaccesseditems', 'rss_client',
            'settings', 'starredcourses', 'tags', 'timeline'];
        return array_combine($names, array_map(static fn(string $name): array => [$name], $names));
    }
}
