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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace core_my\local;

use core_external\external_api;
use core_my\external\get_dashboard;
use PHPUnit\Framework\Attributes\CoversMethod;

/**
 * Tests for the cheap, layout-only dashboard read used to shape the loading placeholder.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversMethod(dashboard::class, 'get_skeleton_layout')]
#[CoversMethod(dashboard::class, 'get_loading_placeholder')]
#[CoversMethod(dashboard::class, 'rise_to_fill')]
#[CoversMethod(dashboard::class, 'get')]
#[CoversMethod(dashboard::class, 'get_block')]
#[CoversMethod(dashboard::class, 'get_initial_data')]
final class dashboard_test extends \advanced_testcase {
    /**
     * The dashboard arrives without any block's content: each block then loads on its own, so a
     * slow block never holds up the others. Nothing is kept in the session.
     */
    public function test_get_sends_every_block_without_its_content(): void {
        $this->resetAfterTest();
        $this->setAdminUser();

        $payload = dashboard::get(false);

        $this->assertNotEmpty($payload['blocks']);
        foreach ($payload['blocks'] as $block) {
            $this->assertFalse($block['loaded']);
            $this->assertSame('', $block['content']);
            $this->assertNotEmpty($block['minsize']);
        }
        $this->assertSame('', $payload['javascript']);
        $this->assertSame(count($payload['blocks']), count($payload['layout']));
    }

    /**
     * One block is rendered on its own, with the JavaScript it needs.
     */
    public function test_get_block_renders_one_block(): void {
        global $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();
        $calendar = array_values(array_filter(dashboard::get(false)['blocks'],
            static fn(array $block): bool => $block['name'] === 'calendar_month'))[0];

        $PAGE = new \moodle_page();
        $result = dashboard::get_block(false, $calendar['id']);

        $this->assertTrue($result['block']['loaded']);
        $this->assertSame($calendar['id'], $result['block']['id']);
        $this->assertNotSame('', $result['block']['content']);
        $this->assertIsString($result['javascript']);
    }

    /**
     * Each block comes with its own JavaScript only: rendering one block never collects another's,
     * which would start that block a second time, against content that is not on the page.
     */
    public function test_get_block_returns_only_that_blocks_javascript(): void {
        global $PAGE;

        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $byname = array_column(dashboard::get(false)['blocks'], null, 'name');

        $PAGE = new \moodle_page();
        $recent = dashboard::get_block(false, $byname['recentlyaccesseditems']['id']);
        $PAGE = new \moodle_page();
        $calendar = dashboard::get_block(false, $byname['calendar_month']['id']);

        $this->assertStringContainsString('block_recentlyaccesseditems/main', $recent['javascript']);
        $this->assertStringNotContainsString('block_recentlyaccesseditems/main', $calendar['javascript']);
    }

    /**
     * A block on someone else's dashboard cannot be rendered.
     */
    public function test_get_block_refuses_a_block_not_on_the_viewers_dashboard(): void {
        global $PAGE;

        $this->resetAfterTest();
        $other = $this->getDataGenerator()->create_user();
        $this->setUser($other);
        // The other user's own copy of the dashboard, with blocks of their own.
        $PAGE = new \moodle_page();
        $GLOBALS['USER']->editing = 1;
        $theirs = dashboard::get(false)['blocks'][0]['id'];

        $this->setAdminUser();
        $PAGE = new \moodle_page();
        $this->expectException(\moodle_exception::class);
        dashboard::get_block(false, $theirs);
    }

    /**
     * The dashboard sent with the page is exactly what core_my_get_dashboard returns, and building
     * it leaves the page being output as it was.
     */
    public function test_get_initial_data_matches_the_web_service_and_leaves_the_page_alone(): void {
        global $OUTPUT, $PAGE;

        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());
        $page = $PAGE;
        $output = $PAGE->get_renderer('core');
        $OUTPUT = $output;

        $initial = dashboard::get_initial_data(false);

        $this->assertSame($page, $PAGE);
        $this->assertSame($output, $OUTPUT);
        $PAGE = new \moodle_page();
        $fromservice = \core_external\external_api::clean_returnvalue(
            \core_my\external\get_dashboard::execute_returns(),
            \core_my\external\get_dashboard::execute(false),
        );
        $this->assertEquals($fromservice, $initial);
    }

    /**
     * Someone who may not see the site default gets nothing sent with the page, not an error.
     */
    public function test_get_initial_data_checks_the_same_permissions(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $this->assertNull(dashboard::get_initial_data(true));
        $this->assertDebuggingCalled();
    }

    /**
     * A block stored below a minimum it declared since is grown when the dashboard is loaded.
     */
    public function test_get_enforces_minimum_sizes(): void {
        global $DB, $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();

        $result = dashboard::get(false);
        $calendar = array_values(array_filter($result['blocks'],
            static fn(array $block): bool => $block['name'] === 'calendar_month'))[0];
        $this->assertSame(4, $calendar['minsize']['rows']);

        // Store the calendar shorter than its minimum, as a layout saved before it declared one would be.
        $PAGE = new \moodle_page();
        dashboard::save(false, $result['layout']);
        $DB->set_field('block_positions', 'gridrows', 2, ['blockinstanceid' => $calendar['id']]);

        $PAGE = new \moodle_page();
        $item = array_values(array_filter(dashboard::get(false)['layout'],
            static fn(array $item): bool => $item['id'] === $calendar['id']))[0];
        $this->assertSame(4, $item['rows']);
        $this->assertDebuggingNotCalled();
    }

    /**
     * Once a dashboard's grid has been saved, its shape can be read back cheaply, without
     * instantiating or rendering any block, and matches the layout the full read returns.
     */
    public function test_get_skeleton_layout_matches_a_saved_grid(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $PAGE = new \moodle_page();
        dashboard::save(false, $result['layout']);

        $PAGE = new \moodle_page();
        $skeleton = dashboard::get_skeleton_layout(false);

        // The skeleton only draws rectangles, so it carries no auto-height flag.
        $expected = array_map(static fn(array $item): array => array_diff_key($item, ['autorows' => true]), $result['layout']);
        usort($expected, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        $this->assertSame($expected, $skeleton);
    }

    /**
     * Before any grid position has ever been saved, the shape isn't cheaply knowable (deriving
     * it would mean the same block instantiation and content rendering this exists to avoid), so
     * the caller is told to fall back to a generic placeholder instead of guessing.
     */
    public function test_get_skeleton_layout_is_empty_without_a_saved_grid(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $this->assertSame([], dashboard::get_skeleton_layout(false));
    }

    /**
     * A block whose position predates the grid (for example a pre-migration row a backfill
     * missed) has no grid columns saved: the persisted grid is incomplete, so the real shape
     * still isn't cheaply knowable and the result stays empty rather than silently omitting
     * that block from the placeholder.
     */
    public function test_get_skeleton_layout_is_empty_when_a_block_is_missing_its_position(): void {
        global $DB, $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $PAGE = new \moodle_page();
        dashboard::save(false, $result['layout']);

        $DB->set_field(
            'block_positions',
            'gridcolumn',
            null,
            ['blockinstanceid' => $result['layout'][0]['id']],
        );

        $PAGE = new \moodle_page();
        $this->assertSame([], dashboard::get_skeleton_layout(false));
    }

    /**
     * When a real layout is knowable, the server-rendered placeholder (the very first thing the
     * browser paints, before React has run) is positioned to match it, instead of falling back
     * to the generic grid.
     */
    public function test_loading_placeholder_is_positioned_from_a_given_layout(): void {
        $placeholder = dashboard::get_loading_placeholder([
            ['id' => 1, 'column' => 1, 'row' => 0, 'columns' => 3, 'rows' => 4],
            ['id' => 2, 'column' => 4, 'row' => 0, 'columns' => 1, 'rows' => 4],
        ]);

        $this->assertStringContainsString('core-my-dashboard-loading__grid--positioned', $placeholder);
        $this->assertSame(2, substr_count($placeholder, 'core-my-dashboard-loading__tile--positioned'));
        $this->assertStringContainsString('grid-column: 2 / span 3;', $placeholder);
        $this->assertStringContainsString('grid-column: 5 / span 1;', $placeholder);
    }

    /**
     * Without a knowable layout, the placeholder falls back to the generic grid exactly as
     * before.
     */
    public function test_loading_placeholder_is_generic_without_a_layout(): void {
        $placeholder = dashboard::get_loading_placeholder();

        $this->assertStringContainsString('core-my-dashboard-loading', $placeholder);
        $this->assertStringNotContainsString('core-my-dashboard-loading__grid--positioned', $placeholder);
        $this->assertSame(6, substr_count($placeholder, 'core-my-dashboard-loading__tile'));
    }

    /**
     * Blocks rise within their own columns. A block beside a gap is not pulled sideways, and a
     * block stops flush under whatever occupies its span.
     */
    public function test_rise_to_fill_closes_empty_space_above_a_block(): void {
        $layout = [
            ['id' => 1, 'column' => 0, 'row' => 0, 'columns' => 2, 'rows' => 2],
            ['id' => 2, 'column' => 0, 'row' => 5, 'columns' => 2, 'rows' => 2],
            ['id' => 3, 'column' => 3, 'row' => 4, 'columns' => 1, 'rows' => 1],
        ];

        $risen = dashboard::rise_to_fill($layout);
        $byid = array_column($risen, null, 'id');

        $this->assertSame(0, $byid[1]['row']);
        // Flush under the block above it, still in its own columns.
        $this->assertSame(2, $byid[2]['row']);
        $this->assertSame(0, $byid[2]['column']);
        // Nothing above it, so it rises to the top and stays on the right.
        $this->assertSame(['column' => 3, 'row' => 0], ['column' => $byid[3]['column'], 'row' => $byid[3]['row']]);
        // The caller's layout is left as it was given.
        $this->assertSame(5, $layout[1]['row']);

        // A wide block stops under the lowest block anywhere in its span, and does not slide sideways.
        $wide = dashboard::rise_to_fill([
            ['id' => 1, 'column' => 0, 'row' => 0, 'columns' => 2, 'rows' => 4],
            ['id' => 2, 'column' => 2, 'row' => 0, 'columns' => 1, 'rows' => 1],
            ['id' => 3, 'column' => 0, 'row' => 8, 'columns' => 3, 'rows' => 2],
        ]);
        $widebyid = array_column($wide, null, 'id');
        $this->assertSame(['column' => 0, 'row' => 4], ['column' => $widebyid[3]['column'], 'row' => $widebyid[3]['row']]);
    }

    /**
     * A layout with nothing above its blocks is returned unchanged.
     */
    public function test_rise_to_fill_leaves_a_compact_layout_unchanged(): void {
        $layout = [
            ['id' => 1, 'column' => 0, 'row' => 0, 'columns' => 2, 'rows' => 2],
            ['id' => 2, 'column' => 2, 'row' => 0, 'columns' => 2, 'rows' => 2],
        ];

        $this->assertSame($layout, dashboard::rise_to_fill($layout));
        $this->assertSame([], dashboard::rise_to_fill([]));
    }

    /**
     * The loading placeholder rises for the current view, and the saved positions are not rewritten.
     */
    public function test_skeleton_layout_rises_without_saving(): void {
        global $DB, $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $byname = array_column($result['blocks'], null, 'name');
        $PAGE = new \moodle_page();
        dashboard::save(false, $result['layout']);

        $timelineid = $byname['timeline']['id'];
        $DB->set_field('block_positions', 'gridrow', 9, ['blockinstanceid' => $timelineid]);

        $PAGE = new \moodle_page();
        $skeleton = array_column(dashboard::get_skeleton_layout(false), null, 'id');
        $myoverview = $skeleton[$byname['myoverview']['id']];

        $this->assertSame($myoverview['row'] + $myoverview['rows'], $skeleton[$timelineid]['row']);
        $this->assertSame(1, $skeleton[$timelineid]['column']);
        $this->assertSame(9, (int) $DB->get_field('block_positions', 'gridrow', ['blockinstanceid' => $timelineid]));
    }
}
