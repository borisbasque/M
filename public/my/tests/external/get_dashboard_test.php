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

namespace core_my\external;

use core_external\external_api;

/**
 * Tests for the responsive dashboard read external function.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversClass(get_dashboard::class)]
final class get_dashboard_test extends \advanced_testcase {
    /**
     * The server-rendered mount content prevents an empty page before React starts.
     */
    public function test_loading_placeholder_is_accessible_and_full(): void {
        $placeholder = \core_my\local\dashboard::get_loading_placeholder();

        $this->assertStringContainsString('core-my-dashboard-loading', $placeholder);
        $this->assertStringContainsString('role="status"', $placeholder);
        $this->assertStringContainsString('aria-busy="true"', $placeholder);
        $this->assertSame(6, substr_count($placeholder, 'core-my-dashboard-loading__tile'));
    }

    /**
     * The response contains rendered blocks, canonical layout, grid limits and control icons -
     * and no language strings, which the client fetches through core/str instead.
     */
    public function test_execute_returns_dashboard_payload(): void {
        $this->resetAfterTest();
        $this->setAdminUser();

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);

        $this->assertFalse($result['sitedefault']);
        $this->assertTrue($result['canedit']);
        $this->assertFalse($result['editing']);
        $this->assertArrayHasKey('blocks', $result);
        $this->assertArrayHasKey('layout', $result);
        $this->assertArrayHasKey('availableblocks', $result);
        $this->assertArrayHasKey('javascript', $result);
        $this->assertStringContainsString('block_recentlyaccesseditems/main', $result['javascript']);
        $this->assertArrayNotHasKey('labels', $result);
        $this->assertSame([
            'mincolumns' => \core_my\local\dashboard::get_minimum_size()['columns'],
            'minrows' => \core_my\local\dashboard::get_minimum_size()['rows'],
            'maxcolumns' => \core_my\local\dashboard::MAX_COLUMNS,
            'maxrows' => \core_my\local\dashboard::MAX_ROWS,
        ], $result['limits']);
        foreach (['move', 'resize', 'add', 'up', 'down', 'left', 'right'] as $icon) {
            $this->assertStringContainsString('<i ', $result['icons'][$icon], "The {$icon} icon must be rendered markup.");
            $this->assertStringContainsString('aria-hidden="true"', $result['icons'][$icon]);
        }
    }

    /**
     * A brand-new user's dashboard (with no customisation of their own, so it is copied
     * straight from the site's unmigrated default page) uses the default grid shape: an
     * empty column on each side, content blocks taking the next three columns, side-region
     * blocks the column after, and the first block in each stack a row taller than the rest.
     */
    public function test_execute_returns_the_default_layout_shape(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);

        $blockidsbyname = [];
        foreach ($result['blocks'] as $block) {
            $blockidsbyname[$block['name']] = $block['id'];
        }
        $positionsbyid = [];
        foreach ($result['layout'] as $item) {
            $positionsbyid[$item['id']] = $item;
        }

        $expected = [
            'myoverview' => ['column' => 1, 'row' => 0, 'columns' => 3, 'rows' => 5],
            'timeline' => ['column' => 1, 'row' => 5, 'columns' => 3, 'rows' => 3],
            'calendar_month' => ['column' => 4, 'row' => 0, 'columns' => 1, 'rows' => 5],
            'recentlyaccesseditems' => ['column' => 4, 'row' => 5, 'columns' => 1, 'rows' => 3],
        ];
        foreach ($expected as $blockname => $expectedposition) {
            $this->assertArrayHasKey(
                $blockname,
                $blockidsbyname,
                "Default dashboard is missing the {$blockname} block.",
            );
            $position = $positionsbyid[$blockidsbyname[$blockname]];
            foreach ($expectedposition as $field => $value) {
                $this->assertSame($value, $position[$field], "{$blockname}.{$field} did not match the default layout.");
            }
        }
    }

    /**
     * Each block carries its standard editing-controls menu, rendered as the classic block header
     * renders it, so nothing a block offers on any other page is missing on the dashboard. Only
     * Move is left out, since the grid's own handle repositions a tile. In view mode there is no
     * menu at all.
     */
    public function test_execute_renders_the_standard_block_controls_menu(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);

        $myoverview = current(array_filter($result['blocks'], static fn($block) => $block['name'] === 'myoverview'));
        $this->assertStringContainsString('action-menu', $myoverview['controls']);
        $expected = [
            'Configure Course overview block',
            'Hide Course overview block',
            'Manage permissions',
            'Check permissions',
            'Delete Course overview block',
        ];
        foreach ($expected as $item) {
            $this->assertStringContainsString($item, $myoverview['controls']);
        }
        $this->assertStringNotContainsString('Move Course overview block', $myoverview['controls']);

        $USER->editing = 0;
        $PAGE = new \moodle_page();
        $GLOBALS['PAGE'] = $PAGE;
        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        foreach ($result['blocks'] as $block) {
            $this->assertSame('', $block['controls'], "The {$block['name']} block has a menu outside Edit mode.");
        }
    }

    /**
     * Block requirements are collected after the dashboard header has prepared its block content.
     */
    public function test_block_requirements_are_collected_after_header_render(): void {
        global $OUTPUT, $PAGE;

        $this->resetAfterTest();
        $this->setAdminUser();

        \core_my\local\dashboard::initialise_page(false);
        $OUTPUT->header();
        $PAGE->start_collecting_javascript_requirements();
        $PAGE->blocks->refresh_cached_content();
        $PAGE->blocks->get_content_for_all_regions($OUTPUT);
        $javascript = $PAGE->requires->get_end_code();
        $PAGE->end_collecting_javascript_requirements();

        $this->assertStringContainsString('block_recentlyaccesseditems/main', $javascript);
    }

    /**
     * The site-default dashboard only exposes controls when edit mode is active.
     */
    public function test_execute_site_default_respects_edit_mode(): void {
        global $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 0;

        $result = get_dashboard::execute(true);

        $this->assertTrue($result['canedit']);
        $this->assertFalse($result['editing']);
    }

    /**
     * Only users with the site-dashboard capability can fetch the default layout.
     */
    public function test_execute_rejects_site_default_without_capability(): void {
        $this->resetAfterTest();
        $this->setUser($this->getDataGenerator()->create_user());

        $this->expectException(\required_capability_exception::class);
        get_dashboard::execute(true);
    }

    /**
     * User-context blocks from a legacy side region remain visible in the grid.
     */
    public function test_execute_includes_legacy_side_region_blocks(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $this->getDataGenerator()->create_block('comments', [
            'parentcontextid' => \context_user::instance($user->id)->id,
            'pagetypepattern' => 'my-index',
            'defaultregion' => 'side-pre',
        ]);

        $result = get_dashboard::execute(false);

        $this->assertContains('comments', array_column($result['blocks'], 'name'));
    }

    /**
     * In edit mode the addable block types are listed with the same name, title and blockform that
     * core_block_fetch_addable_blocks returns, so the standard "Add a block" modal
     * (core/add_block_body) lists them unchanged - and a type which shows its configuration form
     * when added, like Text, is added through that form on the dashboard too.
     */
    public function test_execute_lists_addable_blocks_for_the_standard_add_block_modal(): void {
        global $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();

        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $this->assertSame([], $result['availableblocks'], 'Nothing is addable outside edit mode.');

        $USER->editing = 1;
        $PAGE = new \moodle_page();
        $result = get_dashboard::execute(false);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), $result);
        $byname = array_column($result['availableblocks'], null, 'name');

        $this->assertArrayHasKey('html', $byname);
        $this->assertSame(get_string('pluginname', 'block_html'), $byname['html']['title']);
        $this->assertSame('block_html_edit_form', $byname['html']['blockform']);
        $this->assertArrayHasKey('online_users', $byname);
        $this->assertNull($byname['online_users']['blockform']);
    }

    /**
     * Switching the Dashboard off (Site administration > Appearance > Navigation) switches off
     * every way of reaching it, the web service behind the grid included.
     */
    public function test_execute_rejects_a_disabled_dashboard(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        set_config('enabledashboard', 0);

        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('error:dashboardisdisabled', 'my'));
        get_dashboard::execute(false);
    }

    /**
     * When the site forces the default dashboard on everyone (forcedefaultmymoodle), a user who
     * turns editing on is not given a personal copy of it, and is told they cannot edit, exactly
     * as on the page: a copy made now would silently replace the site default for that user the
     * day an administrator lifts the setting.
     */
    public function test_execute_makes_no_personal_copy_when_the_default_is_forced(): void {
        global $DB, $USER;

        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $USER->editing = 1;
        set_config('forcedefaultmymoodle', 1);

        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), get_dashboard::execute(false));

        $this->assertFalse($result['canedit']);
        $this->assertFalse($DB->record_exists('my_pages', ['userid' => $user->id, 'private' => MY_PAGE_PRIVATE]));
    }

    /**
     * A guest may read the site default dashboard only when the administrator allows guests onto
     * the Dashboard (allowguestmymoodle); the page sends them away otherwise, and so does this.
     */
    public function test_execute_serves_guests_only_when_allowed(): void {
        global $DB, $USER;

        $this->resetAfterTest();
        $this->setGuestUser();
        $USER->editing = 1;

        set_config('allowguestmymoodle', 1);
        $result = external_api::clean_returnvalue(get_dashboard::execute_returns(), get_dashboard::execute(false));
        $this->assertFalse($result['canedit']);
        $this->assertNotEmpty($result['blocks']);
        $this->assertFalse($DB->record_exists('my_pages', ['userid' => $USER->id]));

        set_config('allowguestmymoodle', 0);
        $this->expectException(\moodle_exception::class);
        $this->expectExceptionMessage(get_string('noguest', 'my'));
        get_dashboard::execute(false);
    }

    /**
     * A block hidden through its standard menu keeps its place. While editing it is returned,
     * flagged as hidden, so the tile shows it muted with the Show action on offer; out of Edit
     * mode it is left out altogether, and its grid space stays empty rather than being reflowed,
     * as the classic dashboard left a hidden block's space.
     */
    public function test_execute_returns_hidden_blocks_only_when_editing(): void {
        global $DB, $PAGE, $USER;

        $this->resetAfterTest();
        $this->setAdminUser();
        $USER->editing = 1;

        $payload = get_dashboard::execute(false);
        $PAGE = new \moodle_page();
        $GLOBALS['PAGE'] = $PAGE;
        \core_my\local\dashboard::save(false, $payload['layout']);
        $timeline = current(array_filter($payload['blocks'], static fn($block) => $block['name'] === 'timeline'));
        $this->assertTrue($timeline['visible']);
        $DB->set_field('block_positions', 'visible', 0, ['blockinstanceid' => $timeline['id']]);

        $PAGE = new \moodle_page();
        $GLOBALS['PAGE'] = $PAGE;
        $payload = get_dashboard::execute(false);
        $hidden = current(array_filter($payload['blocks'], static fn($block) => $block['name'] === 'timeline'));
        $this->assertFalse($hidden['visible']);
        $this->assertContains($timeline['id'], array_column($payload['layout'], 'id'));

        $USER->editing = 0;
        $PAGE = new \moodle_page();
        $GLOBALS['PAGE'] = $PAGE;
        $payload = get_dashboard::execute(false);
        $this->assertNotContains('timeline', array_column($payload['blocks'], 'name'));
        $this->assertNotContains($timeline['id'], array_column($payload['layout'], 'id'));
    }
}
