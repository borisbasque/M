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
#[CoversMethod(dashboard::class, 'get')]
final class dashboard_test extends \advanced_testcase {
    /**
     * A user's own rendered blocks are cached after the first read. Saving a layout keeps that
     * cache - layout is read fresh on every get() - so the next load still shows the new layout
     * without re-rendering any block. Changing which blocks exist (here, adding one) purges it.
     */
    public function test_get_caches_blocks_but_always_reads_layout_fresh(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();

        $cache = \cache::make('core', 'my_dashboard');
        $this->assertFalse($cache->get('view'));

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $cached = $cache->get('view');
        $this->assertNotFalse($cached);
        $this->assertArrayNotHasKey('layout', $cached);

        // Move the first block down one row and save.
        $layout = $result['layout'];
        $bottom = max(array_map(static fn(array $item): int => $item['row'] + $item['rows'], $layout));
        $moved = $layout[0]['id'];
        $layout[0]['row'] = $bottom;
        $PAGE = new \moodle_page();
        dashboard::save(false, $layout);

        // The rendered blocks are still cached...
        $this->assertSame($cached, $cache->get('view'));

        // ...and the next load serves them, with the saved layout.
        $PAGE = new \moodle_page();
        $reloaded = dashboard::get(false);
        $this->assertSame($result['blocks'], $reloaded['blocks']);
        $reloadeditem = array_values(array_filter($reloaded['layout'], static fn(array $item): bool => $item['id'] === $moved));
        $this->assertSame($bottom, $reloadeditem[0]['row']);
        $this->assertArrayNotHasKey('pageid', $reloaded);
        $this->assertArrayNotHasKey('layoutinstances', $reloaded);

        // Adding a block changes what is rendered, so it purges the cache.
        $USER->editing = 1;
        $PAGE = new \moodle_page();
        dashboard::add(false, 'online_users');
        $this->assertFalse($cache->get('view'));
    }

    /**
     * A load served from the cache still grows a block stored below its declared minimum: the
     * cache keeps each block's resolved minimum alongside it, since no block object is built then.
     */
    public function test_get_from_the_cache_still_enforces_minimum_sizes(): void {
        global $DB, $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();

        $result = get_dashboard::execute(false);
        $calendar = array_values(array_filter($result['blocks'],
            static fn(array $block): bool => $block['name'] === 'calendar_month'))[0];
        $this->assertSame(4, $calendar['minsize']['rows']);
        $this->assertNotFalse(\cache::make('core', 'my_dashboard')->get('view'));

        // Store the calendar shorter than its minimum, as a layout saved before it declared one would be.
        $PAGE = new \moodle_page();
        dashboard::save(false, $result['layout']);
        $this->assertTrue($DB->record_exists('block_positions', ['blockinstanceid' => $calendar['id']]));
        $DB->set_field('block_positions', 'gridrows', 2, ['blockinstanceid' => $calendar['id']]);

        $PAGE = new \moodle_page();
        $reloaded = dashboard::get(false);
        $item = array_values(array_filter($reloaded['layout'],
            static fn(array $item): bool => $item['id'] === $calendar['id']))[0];
        $this->assertSame(4, $item['rows']);
        $this->assertDebuggingNotCalled();
    }

    /**
     * The site default is never cached: it is read rarely (only by admins with
     * moodle/my:configsyspages), and caching it would risk masking a capability revoked mid-ttl.
     */
    public function test_get_never_caches_the_site_default(): void {
        $this->resetAfterTest();
        $this->setAdminUser();

        $cache = \cache::make('core', 'my_dashboard');
        get_dashboard::execute(true);

        $this->assertFalse($cache->get('view'));
        $this->assertFalse($cache->get('edit'));
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
}
