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

namespace block_myoverview;

/**
 * Online users testcase
 *
 * @package    block_myoverview
 * @category   test
 * @copyright  2019 Juan Leyva <juan@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class myoverview_test extends \advanced_testcase {
    /**
     * Test getting block configuration
     *
     * @covers \block_myoverview::get_config_for_external
     */
    public function test_get_block_config_for_external(): void {
        global $PAGE, $CFG, $OUTPUT;
        require_once($CFG->dirroot . '/my/lib.php');

        $this->resetAfterTest(true);

        $user = $this->getDataGenerator()->create_user();

        $fieldcategory = self::getDataGenerator()->create_custom_field_category(['name' => 'Other fields']);

        $customfield = ['shortname' => 'test', 'name' => 'Custom field', 'type' => 'text',
            'categoryid' => $fieldcategory->get('id')];
        $field = self::getDataGenerator()->create_custom_field($customfield);

        $customfieldvalue = ['shortname' => 'test', 'value' => 'Test value I'];
        $course1  = self::getDataGenerator()->create_course(['customfields' => [$customfieldvalue]]);
        $customfieldvalue = ['shortname' => 'test', 'value' => 'Test value II'];
        $course2  = self::getDataGenerator()->create_course(['customfields' => [$customfieldvalue]]);
        $this->getDataGenerator()->enrol_user($user->id, $course1->id, 'student');
        $this->getDataGenerator()->enrol_user($user->id, $course2->id, 'student');

        // Force a setting change to check the returned blocks settings.
        set_config('displaygroupingcustomfield', 1, 'block_myoverview');
        set_config('customfiltergrouping', $field->get('shortname'), 'block_myoverview');

        $this->setUser($user);
        $context = \context_user::instance($user->id);

        if (!$currentpage = my_get_page($user->id, MY_PAGE_PUBLIC, MY_PAGE_COURSES)) {
            throw new \moodle_exception('mymoodlesetup');
        }

        $PAGE->set_url('/my/courses.php');    // Need this because some internal API calls require the $PAGE url to be set.
        $PAGE->set_context($context);
        $PAGE->set_pagelayout('mydashboard');
        $PAGE->set_pagetype('my-index');
        $PAGE->blocks->add_region('content');   // Need to add this special region to retrieve the central blocks.
        $PAGE->set_subpage($currentpage->id);

        // Load the block instances for all the regions.
        $PAGE->blocks->load_blocks();
        $PAGE->blocks->create_all_block_instances();

        $blocks = $PAGE->blocks->get_content_for_all_regions($OUTPUT);
        $configs = null;
        foreach ($blocks as $region => $regionblocks) {
            $regioninstances = $PAGE->blocks->get_blocks_for_region($region);

            foreach ($regioninstances as $ri) {
                // Look for myoverview block only.
                if ($ri->instance->blockname == 'myoverview') {
                    $configs = $ri->get_config_for_external();
                    break 2;
                }
            }
        }

        // Test we receive all we expect (exact number and values of settings).
        $this->assertNotEmpty($configs);
        $this->assertEmpty((array) $configs->instance);
        $this->assertCount(13, (array) $configs->plugin);
        $this->assertEquals('test', $configs->plugin->customfiltergrouping);
        // Test default values.
        $this->assertEquals(1, $configs->plugin->displaycategories);
        $this->assertEquals(1, $configs->plugin->displaygroupingall);
        $this->assertEquals(0, $configs->plugin->displaygroupingallincludinghidden);
        $this->assertEquals(1, $configs->plugin->displaygroupingcustomfield);
        $this->assertEquals(1, $configs->plugin->displaygroupingfuture);
        $this->assertEquals(1, $configs->plugin->displaygroupinghidden);
        $this->assertEquals(1, $configs->plugin->displaygroupinginprogress);
        $this->assertEquals(1, $configs->plugin->displaygroupingpast);
        $this->assertEquals(1, $configs->plugin->displaygroupingfavourites);
        $this->assertEquals('card,list,summary', $configs->plugin->layouts);
        $this->assertEquals(get_config('block_myoverview', 'version'), $configs->plugin->version);
        // Test custom fields.
        $this->assertJson($configs->plugin->customfieldsexport);
        $fields = json_decode($configs->plugin->customfieldsexport);
        $this->assertEquals('Test value I', $fields[0]->name);
        $this->assertEquals('Test value I', $fields[0]->value);
        $this->assertFalse($fields[0]->active);
        $this->assertEquals('Test value II', $fields[1]->name);
        $this->assertEquals('Test value II', $fields[1]->value);
        $this->assertFalse($fields[1]->active);
        $this->assertEquals('No Custom field', $fields[2]->name);
        $this->assertFalse($fields[2]->active);
    }

    /**
     * The request-course URL must use the 'category' parameter, not 'categoryid'.
     *
     * course/request.php reads the pre-selected category via optional_param('category', ...),
     * so a 'categoryid' key would silently drop the selection. This pins the fix in place.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_get_request_course_url_uses_category_param(): void {
        global $CFG, $PAGE;
        $this->resetAfterTest();

        // Enable course requests and grant the request capability (but not create) in a category.
        $CFG->enablecourserequests = 1;
        $category = $this->getDataGenerator()->create_category();
        $catcontext = \context_coursecat::instance($category->id);

        $user = $this->getDataGenerator()->create_user();
        $roleid = $this->getDataGenerator()->create_role();
        assign_capability('moodle/course:request', CAP_ALLOW, $roleid, $catcontext->id, true);
        role_assign($roleid, $user->id, $catcontext->id);

        $this->setUser($user);
        $PAGE->set_url('/my/courses.php');

        $builder = new \block_myoverview\local\props_builder(null, null, null);
        $props = $builder->get_props();

        $this->assertNotNull($props['requestcourseurl']);
        $this->assertStringContainsString('category=' . $category->id, $props['requestcourseurl']);
        $this->assertStringNotContainsString('categoryid=', $props['requestcourseurl']);
    }

    /**
     * The mount props are data-only: no language strings travel to the client, the
     * illustration URL resolves to the block's pix asset, and the zero-state is built
     * only for courseless users.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_props_are_minimal_and_zerostate_conditional(): void {
        global $PAGE;
        $this->resetAfterTest();

        $generator = $this->getDataGenerator();
        $user = $generator->create_user();
        $this->setUser($user);
        $PAGE->set_url('/my/courses.php');

        $builder = new \block_myoverview\local\props_builder(null, null, null);
        $props = $builder->get_props();

        // Minimal props: strings are fetched client-side, never serialised.
        $this->assertArrayNotHasKey('strings', $props);

        // The illustration resolves to the block's courses.svg pix asset.
        $this->assertStringContainsString('block_myoverview', $props['illustrationurl']);
        $this->assertStringEndsWith('courses', $props['illustrationurl']);

        // Courseless user: the zero-state carries data only (variant + URLs, no HTML).
        $this->assertIsArray($props['zerostate']);
        $this->assertArrayHasKey('variant', $props['zerostate']);
        $this->assertArrayNotHasKey('title', $props['zerostate']);
        $this->assertArrayNotHasKey('intro', $props['zerostate']);

        // Enrolled user: the zero-state is not built at all.
        $course = $generator->create_course();
        $generator->enrol_user($user->id, $course->id);
        $builder = new \block_myoverview\local\props_builder(null, null, null);
        $props = $builder->get_props();
        $this->assertNull($props['zerostate']);
    }

    /**
     * The site default sort follows $CFG->courselistshortnames so the client's sort
     * control only lights up when the user changed something.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_defaultsort_follows_courselistshortnames(): void {
        global $CFG, $PAGE;
        $this->resetAfterTest();

        $this->setUser($this->getDataGenerator()->create_user());
        $PAGE->set_url('/my/courses.php');

        $CFG->courselistshortnames = 0;
        $props = (new \block_myoverview\local\props_builder(null, null, null))->get_props();
        $this->assertEquals('title', $props['config']['defaultsort']);

        $CFG->courselistshortnames = 1;
        $props = (new \block_myoverview\local\props_builder(null, null, null))->get_props();
        $this->assertEquals('shortname', $props['config']['defaultsort']);
    }

    /**
     * A stored view preference for a layout the admin has since disabled must fall back
     * to the first enabled layout instead of being exported verbatim, matching the
     * guard the removed output\main class applied.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_view_preference_clamped_to_enabled_layouts(): void {
        global $PAGE;
        $this->resetAfterTest();

        $this->setUser($this->getDataGenerator()->create_user());
        $PAGE->set_url('/my/courses.php');

        // An enabled layout passes through unchanged.
        set_config('layouts', 'card,list,summary', 'block_myoverview');
        $props = (new \block_myoverview\local\props_builder(null, null, BLOCK_MYOVERVIEW_VIEW_SUMMARY))->get_props();
        $this->assertEquals(BLOCK_MYOVERVIEW_VIEW_SUMMARY, $props['preferences']['view']);

        // Once the admin disables that layout, the stored preference falls back to the
        // first enabled layout and the client never receives an unoffered view.
        set_config('layouts', 'card,list', 'block_myoverview');
        $props = (new \block_myoverview\local\props_builder(null, null, BLOCK_MYOVERVIEW_VIEW_SUMMARY))->get_props();
        $this->assertEquals(BLOCK_MYOVERVIEW_VIEW_CARD, $props['preferences']['view']);
    }

    /**
     * The exported defaultfilter is the grouping a preference-less user starts on: 'all'
     * when enabled, otherwise the ordered fallback — so the client's zero-state and
     * active-control logic work under admin configs whose default is not 'all'.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_defaultfilter_follows_enabled_groupings(): void {
        global $PAGE;
        $this->resetAfterTest();

        $this->setUser($this->getDataGenerator()->create_user());
        $PAGE->set_url('/my/courses.php');

        // Default config: 'all' is enabled and is the fallback.
        $props = (new \block_myoverview\local\props_builder(null, null, null))->get_props();
        $this->assertEquals(BLOCK_MYOVERVIEW_GROUPING_ALL, $props['config']['defaultfilter']);

        // Disable 'all': the fallback order reaches the next enabled grouping.
        set_config('displaygroupingall', 0, 'block_myoverview');
        set_config('displaygroupingallincludinghidden', 0, 'block_myoverview');
        $props = (new \block_myoverview\local\props_builder(null, null, null))->get_props();
        $this->assertEquals(BLOCK_MYOVERVIEW_GROUPING_INPROGRESS, $props['config']['defaultfilter']);
        // And the seeded preference falls back with it.
        $this->assertEquals(BLOCK_MYOVERVIEW_GROUPING_INPROGRESS, $props['preferences']['filter']);
    }

    /**
     * A stored customfield grouping preference without a configured field must not be
     * exported (the web service would reject the classification without a field name):
     * both the seeded preference and the enabled filters fall back.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_customfield_grouping_requires_configured_field(): void {
        global $PAGE;
        $this->resetAfterTest();

        $this->setUser($this->getDataGenerator()->create_user());
        $PAGE->set_url('/my/courses.php');

        // Admin enables the customfield grouping but never selects a field.
        set_config('displaygroupingcustomfield', 1, 'block_myoverview');
        set_config('customfiltergrouping', '', 'block_myoverview');

        // A user with a stale customfield preference is seeded onto the fallback instead.
        $builder = new \block_myoverview\local\props_builder(BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD, null, null);
        $props = $builder->get_props();
        $this->assertEquals(BLOCK_MYOVERVIEW_GROUPING_ALL, $props['preferences']['filter']);
        $this->assertNotContains(BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD, $props['config']['enabledfilters']);
        $this->assertNull($props['config']['customfieldname']);
    }

    /**
     * The mount attribute emitted by the real get_content() must round-trip: JSON with
     * quotes, unicode and script-closing tags in course data survives html_writer's
     * attribute escaping and parses back identically, as core/react_autoinit will
     * JSON.parse it (MDL-88287 mount pattern). Exercising the block itself (not a
     * re-implementation of the encode) pins the actual json_encode flags in use.
     *
     * @covers \block_myoverview\local\props_builder::get_props
     */
    public function test_mount_props_attribute_roundtrip(): void {
        global $PAGE;
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $course = $this->getDataGenerator()->create_course([
            'fullname' => 'He said "hi" & <script>alert(1)</script> café — ♥ 日本語',
        ]);
        $this->getDataGenerator()->enrol_user($user->id, $course->id);
        $this->setUser($user);
        $PAGE->set_url('/my/');

        $block = block_instance('myoverview');
        $html = $block->get_content()->text;

        $doc = new \DOMDocument();
        $doc->loadHTML('<?xml encoding="utf-8"?>' . $html);
        $div = $doc->getElementsByTagName('div')->item(0);
        $this->assertEquals('@moodle/lms/block_myoverview/app', $div->getAttribute('data-react-component'));

        $props = json_decode($div->getAttribute('data-react-props'), true);
        $this->assertIsArray($props);
        $this->assertEquals(JSON_ERROR_NONE, json_last_error());
        // The full props shape survives the attribute round trip.
        $this->assertArrayHasKey('preferences', $props);
        $this->assertArrayHasKey('config', $props);
        $this->assertNull($props['zerostate']);
    }

    /**
     * The per-course control labels are parameterised client-side with the course name, so their
     * source strings must retain the {$a} placeholder for the React app to substitute.
     * The client fetches these strings raw (no $a supplied), so the placeholder must survive.
     *
     * @coversNothing
     */
    public function test_percourse_aria_labels_carry_placeholder(): void {
        // Star, unstar and overflow-menu labels are ".replace('{$a}', coursename)" in the client.
        foreach (['aria:courseactionsfor', 'aria:addtofavouritesfor', 'aria:removefromfavouritesfor'] as $key) {
            $this->assertStringContainsString(
                '{$a}',
                get_string($key, 'block_myoverview'),
                "String '{$key}' must keep the placeholder for client-side substitution."
            );
        }
    }
}
