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

namespace core_my;

use context_system;
use context_user;
use core_my\local\dashboard;

/**
 * Tests for the responsive dashboard upgrade migration.
 *
 * The migration is one-way: there is no legacy dashboard to fall back to, so these cover every
 * branch of the upgrade step - the site default, customised user dashboards, pre-existing
 * block_positions rows (updated in place rather than duplicated), relative order within each
 * legacy region, more pages than one chunk of the paging loop, and pages whose user no longer
 * exists.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[\PHPUnit\Framework\Attributes\CoversNothing]
final class upgrade_test extends \advanced_testcase {
    /** The main version immediately below the migration's savepoint. */
    private const VERSION_BEFORE_MIGRATION = 2026102100.00;

    /**
     * Put the database into its pre-migration state and run the main upgrade from just below the
     * migration's savepoint, so that only the dashboard step executes.
     */
    private function run_migration(): void {
        global $CFG, $DB;

        $dbman = $DB->get_manager();
        $table = new \xmldb_table('block_positions');
        foreach (['gridrows', 'gridcolumns', 'gridrow', 'gridcolumn'] as $fieldname) {
            $field = new \xmldb_field($fieldname);
            if ($dbman->field_exists($table, $field)) {
                $dbman->drop_field($table, $field);
            }
        }

        set_config('version', self::VERSION_BEFORE_MIGRATION);
        require_once($CFG->libdir . '/upgradelib.php');
        require_once($CFG->dirroot . '/lib/db/upgrade.php');
        $this->assertTrue(xmldb_main_upgrade(self::VERSION_BEFORE_MIGRATION));
    }

    /**
     * Remove the install-time default blocks from the site default dashboard page, so that the
     * blocks a test creates are the only ones on it.
     *
     * @return \stdClass The site default dashboard page record.
     */
    private function clear_site_default_page(): \stdClass {
        global $DB;

        $page = $DB->get_record('my_pages', [
            'userid' => null,
            'name' => '__default',
            'private' => 1,
        ], '*', MUST_EXIST);
        foreach ($DB->get_records('block_instances', $this->instance_criteria(context_system::instance(), $page)) as $old) {
            blocks_delete_instance($old);
        }
        return $page;
    }

    /**
     * The block_instances fields which attach an instance to a dashboard page.
     *
     * @param \context $context The page's context.
     * @param \stdClass $page The my_pages record.
     * @return array
     */
    private function instance_criteria(\context $context, \stdClass $page): array {
        return [
            'parentcontextid' => $context->id,
            'pagetypepattern' => 'my-index',
            'subpagepattern' => (string) $page->id,
        ];
    }

    /**
     * Legacy main and side-region stacks on the site default are migrated to the six-column grid,
     * with the same row spans the runtime derives for an unmigrated block.
     */
    public function test_legacy_regions_are_migrated(): void {
        global $DB;

        $this->resetAfterTest();
        $page = $this->clear_site_default_page();
        $common = $this->instance_criteria(context_system::instance(), $page);
        $main = $this->getDataGenerator()->create_block('html', $common + [
            'defaultregion' => 'content',
            'defaultweight' => 50,
        ]);
        $side = $this->getDataGenerator()->create_block('online_users', $common + [
            'defaultregion' => 'side-pre',
            'defaultweight' => 50,
        ]);
        $postside = $this->getDataGenerator()->create_block('calendar_month', $common + [
            'defaultregion' => 'side-post',
            'defaultweight' => 50,
        ]);

        $this->run_migration();

        $mainposition = $DB->get_record('block_positions', ['blockinstanceid' => $main->id], '*', MUST_EXIST);
        $sideposition = $DB->get_record('block_positions', ['blockinstanceid' => $side->id], '*', MUST_EXIST);
        $postsideposition = $DB->get_record('block_positions', ['blockinstanceid' => $postside->id], '*', MUST_EXIST);
        $this->assertSame(1, (int) $mainposition->gridcolumn);
        $this->assertSame(3, (int) $mainposition->gridcolumns);
        $this->assertSame(4, (int) $sideposition->gridcolumn);
        $this->assertSame(1, (int) $sideposition->gridcolumns);
        $this->assertSame(4, (int) $postsideposition->gridcolumn);
        $this->assertSame(1, (int) $postsideposition->gridcolumns);
        $this->assertTrue(
            (int) $sideposition->gridrow + (int) $sideposition->gridrows <= (int) $postsideposition->gridrow
                || (int) $postsideposition->gridrow + (int) $postsideposition->gridrows <= (int) $sideposition->gridrow,
            'Legacy side-pre and side-post blocks must not overlap after migration.',
        );
        // The first block in each stack is taller; the spans are the runtime's own defaults, so
        // an upgraded dashboard and a freshly defaulted one share the same shape.
        $this->assertSame(dashboard::DEFAULT_ROWS_FIRST, (int) $mainposition->gridrows);
        $this->assertSame(dashboard::DEFAULT_ROWS_FIRST, (int) $sideposition->gridrows);
        $this->assertSame(dashboard::DEFAULT_ROWS, (int) $postsideposition->gridrows);
    }

    /**
     * A customised user dashboard is migrated in its own user context, keeps the relative order of
     * blocks within each legacy region (by their saved or default weight), and updates a block's
     * existing block_positions row in place rather than leaving it behind or duplicating it.
     */
    public function test_user_dashboard_is_migrated_preserving_order(): void {
        global $CFG, $DB;

        $this->resetAfterTest();
        require_once($CFG->dirroot . '/my/lib.php');
        $user = $this->getDataGenerator()->create_user();
        $context = context_user::instance($user->id);
        $page = my_copy_page($user->id, MY_PAGE_PRIVATE);
        $this->assertNotFalse($page);
        $criteria = $this->instance_criteria($context, $page);
        foreach ($DB->get_records('block_instances', $criteria) as $copied) {
            blocks_delete_instance($copied);
        }

        // Three content blocks whose default weights put them in the order second, first, third;
        // the first of them also has a saved position which moves it into the side region.
        $second = $this->getDataGenerator()->create_block('html', $criteria + [
            'defaultregion' => 'content',
            'defaultweight' => 2,
        ]);
        $first = $this->getDataGenerator()->create_block('online_users', $criteria + [
            'defaultregion' => 'content',
            'defaultweight' => 1,
        ]);
        $third = $this->getDataGenerator()->create_block('calendar_month', $criteria + [
            'defaultregion' => 'content',
            'defaultweight' => 3,
        ]);
        $moved = $this->getDataGenerator()->create_block('comments', $criteria + [
            'defaultregion' => 'content',
            'defaultweight' => 0,
        ]);
        $existingpositionid = $DB->insert_record('block_positions', (object) [
            'blockinstanceid' => $moved->id,
            'contextid' => $context->id,
            'pagetype' => 'my-index',
            'subpage' => (string) $page->id,
            'visible' => 1,
            'region' => 'side-pre',
            'weight' => 7,
        ]);

        $this->run_migration();

        $positions = [];
        foreach ([$first, $second, $third, $moved] as $block) {
            $rows = $DB->get_records('block_positions', ['blockinstanceid' => $block->id]);
            $this->assertCount(1, $rows, "Block {$block->blockname} must have exactly one position row.");
            $positions[$block->id] = reset($rows);
            $this->assertSame((int) $context->id, (int) $positions[$block->id]->contextid);
        }

        // Content blocks stack in weight order down the content column.
        $this->assertSame(1, (int) $positions[$first->id]->gridcolumn);
        $this->assertSame(0, (int) $positions[$first->id]->gridrow);
        $this->assertSame(dashboard::DEFAULT_ROWS_FIRST, (int) $positions[$first->id]->gridrows);
        $this->assertSame(1, (int) $positions[$second->id]->gridcolumn);
        $this->assertSame(dashboard::DEFAULT_ROWS_FIRST, (int) $positions[$second->id]->gridrow);
        $this->assertSame(dashboard::DEFAULT_ROWS, (int) $positions[$second->id]->gridrows);
        $this->assertSame(1, (int) $positions[$third->id]->gridcolumn);
        $this->assertSame(dashboard::DEFAULT_ROWS_FIRST + dashboard::DEFAULT_ROWS, (int) $positions[$third->id]->gridrow);

        // The block with a saved side-region position goes to the drawer column, through an
        // update of its existing row.
        $this->assertSame((int) $existingpositionid, (int) $positions[$moved->id]->id);
        $this->assertSame(4, (int) $positions[$moved->id]->gridcolumn);
        $this->assertSame(0, (int) $positions[$moved->id]->gridrow);
        $this->assertSame('side-pre', $positions[$moved->id]->region);
        $this->assertSame(7, (int) $positions[$moved->id]->weight);
    }

    /**
     * A block already holding a grid position is left exactly as it is: the migration is safe to
     * run again, and never overwrites an arrangement the user has made on the grid.
     */
    public function test_migration_leaves_existing_grid_positions_alone(): void {
        global $DB;

        $this->resetAfterTest();
        $page = $this->clear_site_default_page();
        $common = $this->instance_criteria(context_system::instance(), $page);
        $arranged = $this->getDataGenerator()->create_block('html', $common + [
            'defaultregion' => 'content',
            'defaultweight' => 1,
        ]);
        $unmigrated = $this->getDataGenerator()->create_block('online_users', $common + [
            'defaultregion' => 'content',
            'defaultweight' => 2,
        ]);

        // The fields are dropped and re-added by run_migration(), so the pre-existing grid
        // position has to be written after the fields are back: do the schema part up front.
        $dbman = $DB->get_manager();
        $table = new \xmldb_table('block_positions');
        foreach (['gridrows', 'gridcolumns', 'gridrow', 'gridcolumn'] as $fieldname) {
            $field = new \xmldb_field($fieldname);
            if ($dbman->field_exists($table, $field)) {
                $dbman->drop_field($table, $field);
            }
        }
        $gridfields = [
            new \xmldb_field('gridcolumn', XMLDB_TYPE_INTEGER, '4', null, null, null, null, 'weight'),
            new \xmldb_field('gridrow', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'gridcolumn'),
            new \xmldb_field('gridcolumns', XMLDB_TYPE_INTEGER, '4', null, null, null, null, 'gridrow'),
            new \xmldb_field('gridrows', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'gridcolumns'),
        ];
        foreach ($gridfields as $field) {
            $dbman->add_field($table, $field);
        }
        $positionid = $DB->insert_record('block_positions', (object) [
            'blockinstanceid' => $arranged->id,
            'contextid' => context_system::instance()->id,
            'pagetype' => 'my-index',
            'subpage' => (string) $page->id,
            'visible' => 1,
            'region' => 'content',
            'weight' => 1,
            'gridcolumn' => 5,
            'gridrow' => 7,
            'gridcolumns' => 1,
            'gridrows' => 9,
        ]);

        set_config('version', self::VERSION_BEFORE_MIGRATION);
        $this->assertTrue(xmldb_main_upgrade(self::VERSION_BEFORE_MIGRATION));

        $kept = $DB->get_record('block_positions', ['blockinstanceid' => $arranged->id], '*', MUST_EXIST);
        $this->assertSame((int) $positionid, (int) $kept->id);
        $this->assertSame([5, 7, 1, 9], [
            (int) $kept->gridcolumn, (int) $kept->gridrow, (int) $kept->gridcolumns, (int) $kept->gridrows,
        ]);
        $migrated = $DB->get_record('block_positions', ['blockinstanceid' => $unmigrated->id], '*', MUST_EXIST);
        $this->assertSame(1, (int) $migrated->gridcolumn);
        $this->assertSame(0, (int) $migrated->gridrow);
    }

    /**
     * The migration pages through my_pages in chunks; a site with more customised dashboards
     * than one chunk holds must still migrate every one of them.
     */
    public function test_migration_covers_more_pages_than_one_chunk(): void {
        global $DB;

        $this->resetAfterTest();
        $this->clear_site_default_page();

        // Enough user dashboards to need a second chunk (the loop reads 500 pages at a time).
        // Records are inserted directly, as the migration itself only reads tables: the users,
        // their pages and one block each.
        $count = 505;
        $blockids = [];
        for ($i = 0; $i < $count; $i++) {
            $userid = $DB->insert_record('user', (object) [
                'username' => "dashboarduser{$i}",
                'email' => "dashboarduser{$i}@example.com",
                'firstname' => 'Dashboard',
                'lastname' => (string) $i,
                'confirmed' => 1,
                'mnethostid' => 1,
            ]);
            $context = context_user::instance($userid);
            $pageid = $DB->insert_record('my_pages', (object) [
                'userid' => $userid,
                'name' => '__default',
                'private' => 1,
                'sortorder' => 0,
            ]);
            $blockids[] = $DB->insert_record('block_instances', (object) [
                'blockname' => 'html',
                'parentcontextid' => $context->id,
                'showinsubcontexts' => 0,
                'pagetypepattern' => 'my-index',
                'subpagepattern' => (string) $pageid,
                'defaultregion' => 'content',
                'defaultweight' => 0,
                'configdata' => '',
                'timecreated' => time(),
                'timemodified' => time(),
            ]);
        }

        $this->run_migration();

        [$insql, $inparams] = $DB->get_in_or_equal($blockids);
        $this->assertSame(
            $count,
            $DB->count_records_select('block_positions', "blockinstanceid {$insql} AND gridcolumn IS NOT NULL", $inparams),
        );
    }

    /**
     * A dashboard page left behind by a user who no longer exists is skipped without error, and
     * the pages after it are still migrated.
     */
    public function test_migration_skips_pages_of_missing_users(): void {
        global $DB;

        $this->resetAfterTest();
        $this->clear_site_default_page();
        $DB->insert_record('my_pages', (object) [
            'userid' => 987654321,
            'name' => '__default',
            'private' => 1,
            'sortorder' => 0,
        ]);
        $user = $this->getDataGenerator()->create_user();
        $context = context_user::instance($user->id);
        $pageid = $DB->insert_record('my_pages', (object) [
            'userid' => $user->id,
            'name' => '__default',
            'private' => 1,
            'sortorder' => 0,
        ]);
        $block = $this->getDataGenerator()->create_block('html', [
            'parentcontextid' => $context->id,
            'pagetypepattern' => 'my-index',
            'subpagepattern' => (string) $pageid,
            'defaultregion' => 'content',
        ]);

        $this->run_migration();

        $position = $DB->get_record('block_positions', ['blockinstanceid' => $block->id], '*', MUST_EXIST);
        $this->assertSame(1, (int) $position->gridcolumn);
    }
}
