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
use PHPUnit\Framework\Attributes\CoversClass;

/**
 * Tests for core_my_get_dashboard_block.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversClass(get_dashboard_block::class)]
final class get_dashboard_block_test extends \advanced_testcase {
    /**
     * Each block on the viewer's dashboard can be rendered on its own.
     */
    public function test_execute_renders_each_block(): void {
        global $PAGE;

        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $payload = external_api::clean_returnvalue(get_dashboard::execute_returns(), get_dashboard::execute(false));
        foreach ($payload['blocks'] as $block) {
            $PAGE = new \moodle_page();
            $result = external_api::clean_returnvalue(get_dashboard_block::execute_returns(),
                get_dashboard_block::execute(false, $block['id']));
            if ($result['block'] !== null) {
                $this->assertSame($block['id'], $result['block']['id']);
                $this->assertTrue($result['block']['loaded']);
            }
        }
    }

    /**
     * The site default's blocks can only be rendered by someone who may configure it.
     */
    public function test_execute_requires_the_site_default_capability(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $this->expectException(\required_capability_exception::class);
        get_dashboard_block::execute(true, 1);
    }
}
