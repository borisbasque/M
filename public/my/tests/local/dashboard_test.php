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

/**
 * Tests for the cheap, layout-only dashboard read used to shape the loading placeholder.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversClass(dashboard::class)]
final class dashboard_test extends \advanced_testcase {
    /**
     * Only the dashboard itself (a user's own, or the site default) is recognised as the grid:
     * pages sharing its page layout (the messaging page) or page type (My courses) are not.
     */
    public function test_is_dashboard_page(): void {
        global $CFG;

        $this->resetAfterTest();
        require_once($CFG->dirroot . '/my/lib.php');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $own = my_copy_page($user->id, MY_PAGE_PRIVATE);
        $page = new \moodle_page();
        $page->set_context(\context_user::instance($user->id));
        $page->set_pagelayout('mydashboard');
        $page->set_pagetype('my-index');
        $page->set_subpage($own->id);
        $this->assertTrue(dashboard::is_dashboard_page($page), 'The user\'s own dashboard is the grid.');

        $sitedefault = my_get_page(null, MY_PAGE_PRIVATE);
        $page = new \moodle_page();
        $page->set_context(\context_system::instance());
        $page->set_pagelayout('mydashboard');
        $page->set_pagetype('my-index');
        $page->set_subpage($sitedefault->id);
        $this->assertTrue(dashboard::is_dashboard_page($page), 'The site default dashboard is the grid.');

        $courses = my_get_page(null, MY_PAGE_PUBLIC, MY_PAGE_COURSES);
        $page = new \moodle_page();
        $page->set_context(\context_system::instance());
        $page->set_pagelayout('mycourses');
        $page->set_pagetype('my-index');
        $page->set_subpage($courses->id);
        $this->assertFalse(dashboard::is_dashboard_page($page), 'My courses shares the page type but is not the grid.');

        $page = new \moodle_page();
        $page->set_context(\context_user::instance($user->id));
        $page->set_pagelayout('mydashboard');
        $page->set_pagetype('message-index');
        $this->assertFalse(dashboard::is_dashboard_page($page), 'Messaging shares the page layout but is not the grid.');

        $page = new \moodle_page();
        $page->set_context(\context_system::instance());
        $page->set_pagetype('my-index');
        $this->assertFalse(dashboard::is_dashboard_page($page), 'Without a subpage there is no dashboard to identify.');
    }

    /**
     * Both dashboard pages render the same mount point contract for core/react_autoinit, differing
     * only in the siteDefault prop, and both require the AMD loader the blocks' collected
     * JavaScript may need.
     */
    public function test_render_mount_point(): void {
        global $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();

        $PAGE = new \moodle_page();
        $own = dashboard::render_mount_point(false);
        $this->assertStringContainsString('data-react-component="@moodle/lms/core_my/index"', $own);
        $this->assertStringContainsString('core-my-dashboard-loading', $own);
        $this->assertMatchesRegularExpression('/data-react-props="[^"]*siteDefault&quot;:false/', $own);
        $this->assertStringContainsString('core/first', $PAGE->requires->get_end_code());

        $PAGE = new \moodle_page();
        $sitedefault = dashboard::render_mount_point(true);
        $this->assertMatchesRegularExpression('/data-react-props="[^"]*siteDefault&quot;:true/', $sitedefault);
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

        $expected = $result['layout'];
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
        // Six columns: as stored. Four: the empty margin column shifted away. Two and one: stacked,
        // the wide block clamped to the width available. The stylesheet picks the set that matches
        // the grid's width, so the first paint has the shape the client will measure its way to.
        $this->assertStringContainsString('--core-my-column-6: 2 / span 3; --core-my-row-6: 1 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-6: 5 / span 1; --core-my-row-6: 1 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-4: 1 / span 3; --core-my-row-4: 1 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-4: 4 / span 1; --core-my-row-4: 1 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-2: 1 / span 2; --core-my-row-2: 1 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-2: 1 / span 1; --core-my-row-2: 5 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-column-1: 1 / span 1; --core-my-row-1: 5 / span 4;', $placeholder);
        $this->assertStringContainsString('--core-my-rows-6: 4;', $placeholder);
        $this->assertStringContainsString('--core-my-rows-1: 8;', $placeholder);
        $this->assertStringContainsString('--core-my-row-height: 96px;', $placeholder);
        $this->assertStringNotContainsString('grid-template-columns', $placeholder);
    }

    /**
     * The server packs a canonical layout at a narrower column count exactly as the client does
     * (packLayout() in js/esm/src/layout.ts, pinned by the Jest suite with the same cases): a
     * layout that fits once its empty left margin is removed is shifted whole, and one that does
     * not is reflowed in reading order with spans clamped to the columns available.
     */
    public function test_pack_layout_matches_the_client(): void {
        $margin = [
            ['id' => 1, 'column' => 1, 'row' => 0, 'columns' => 3, 'rows' => 4],
            ['id' => 2, 'column' => 4, 'row' => 0, 'columns' => 1, 'rows' => 4],
            ['id' => 3, 'column' => 1, 'row' => 4, 'columns' => 3, 'rows' => 2],
        ];
        $this->assertSame($margin, dashboard::pack_layout($margin, 6), 'The canonical width is returned as is.');

        $four = dashboard::pack_layout($margin, 4);
        $this->assertSame([[1, 0, 0, 3], [2, 3, 0, 1], [3, 0, 4, 3]], array_map(
            static fn(array $item): array => [$item['id'], $item['column'], $item['row'], $item['columns']],
            $four,
        ), 'At four columns the margin column is shifted away and nothing else moves.');

        $two = dashboard::pack_layout($margin, 2);
        $this->assertSame([[1, 0, 0, 2], [2, 0, 4, 1], [3, 0, 8, 2]], array_map(
            static fn(array $item): array => [$item['id'], $item['column'], $item['row'], $item['columns']],
            $two,
        ), 'At two columns the layout no longer fits: blocks reflow in reading order, spans clamped.');

        $full = [
            ['id' => 1, 'column' => 0, 'row' => 0, 'columns' => 3, 'rows' => 2],
            ['id' => 2, 'column' => 3, 'row' => 0, 'columns' => 3, 'rows' => 2],
        ];
        $this->assertSame([[1, 0, 0, 1], [2, 0, 2, 1]], array_map(
            static fn(array $item): array => [$item['id'], $item['column'], $item['row'], $item['columns']],
            dashboard::pack_layout($full, 1),
        ), 'At one column everything is a stack in reading order.');
        $this->assertSame([], dashboard::pack_layout([], 1));
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
     * In edit mode the mount point also carries the page's edited-page hash, which a block type's
     * own add form (opened from the standard "Add a block" modal, see js/esm/src/addBlockModal.ts)
     * needs to find this page again - exactly what core/add_block_button receives elsewhere.
     */
    public function test_render_mount_point_carries_the_edited_page_hash_when_editing(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();

        $PAGE = new \moodle_page();
        $this->assertStringContainsString('pagehash&quot;:null', dashboard::render_mount_point(false));

        $USER->editing = 1;
        $PAGE = new \moodle_page();
        dashboard::initialise_page(false);
        $hash = $PAGE->get_edited_page_hash();
        $this->assertNotEmpty($hash);
        $this->assertStringContainsString("pagehash&quot;:&quot;{$hash}&quot;", dashboard::render_mount_point(false));

        // The hash leads back to an editable dashboard page: block_edit_form adds to it.
        $retrieved = \moodle_page::retrieve_edited_page($hash, MUST_EXIST);
        $this->assertSame('my-index', $retrieved->pagetype);
        $this->assertTrue($retrieved->user_can_edit_blocks());
    }

    /**
     * The theme's own "Add a block" button (core/add_block_button, driven by core_block/add_modal
     * and a page reload) is not rendered on the grid pages: the grid renders that control itself
     * and opens the same modal, so that the chosen block can be placed without a reload. Every
     * other page keeps it, including the messaging page which shares the dashboard's page layout.
     */
    public function test_theme_add_block_button_is_not_rendered_on_the_grid(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $PAGE = new \moodle_page();
        dashboard::initialise_page(false);
        $this->assertTrue($PAGE->user_can_edit_blocks(), 'The grid does not lock its blocks.');
        $this->assertSame('', $PAGE->get_renderer('core')->addblockbutton('content'));

        $PAGE = new \moodle_page();
        dashboard::initialise_page(true);
        $this->assertSame('', $PAGE->get_renderer('core')->addblockbutton('content'));

        $PAGE = new \moodle_page();
        $PAGE->set_context(\context_user::instance($USER->id));
        $PAGE->set_url('/message/index.php');
        $PAGE->set_pagelayout('mydashboard');
        $PAGE->set_pagetype('message-index');
        $PAGE->blocks->add_region('content');
        $this->assertStringContainsString('data-key="addblock"', $PAGE->get_renderer('core')->addblockbutton('content'));
    }
}
