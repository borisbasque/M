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

/**
 * Contains the class for the My overview block.
 *
 * @package    block_myoverview
 * @copyright  Mark Nelson <markn@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * My overview block class.
 *
 * @package    block_myoverview
 * @copyright  Mark Nelson <markn@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_myoverview extends block_base {
    /**
     * Init.
     */
    public function init() {
        $this->title = get_string('pluginname', 'block_myoverview');
    }

    /**
     * Returns the contents.
     *
     * @return stdClass contents of block
     */
    public function get_content() {
        if (isset($this->content)) {
            return $this->content;
        }
        $group = get_user_preferences('block_myoverview_user_grouping_preference');
        $sort = get_user_preferences('block_myoverview_user_sort_preference');
        $view = get_user_preferences('block_myoverview_user_view_preference');
        $customfieldvalue = get_user_preferences('block_myoverview_user_grouping_customfieldvalue_preference');

        $builder = new \block_myoverview\local\props_builder($group, $sort, $view, $customfieldvalue);
        // JSON_HEX_TAG is the flag the attribute round trip relies on; JSON_UNESCAPED_UNICODE
        // matches the block_timeline mount so the pattern stays copy-pasteable. THROW_ON_ERROR
        // surfaces unencodable props (e.g. invalid UTF-8 in a custom-field value) instead of
        // silently rendering an empty block.
        $props = json_encode(
            $builder->get_props(),
            JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_THROW_ON_ERROR,
        );

        // Mount the React component directly — no renderer, no template (the block_timeline
        // reference pattern, MDL-88287). core/react_autoinit mounts any element carrying
        // these two attributes; html_writer attribute-escapes the JSON for the round trip.
        $this->content = new stdClass();
        $this->content->text = html_writer::div('', 'block-myoverview-app', [
            'data-react-component' => '@moodle/lms/block_myoverview/app',
            'data-react-props' => $props,
        ]);
        $this->content->footer = '';

        return $this->content;
    }

    /**
     * Locations where block can be displayed.
     *
     * @return array
     */
    public function applicable_formats() {
        return ['my' => true];
    }

    /**
     * Allow the block to have a configuration page.
     *
     * @return boolean
     */
    public function has_config() {
        return true;
    }

    /**
     * Return the plugin config settings for external functions.
     *
     * @return stdClass the configs for both the block instance and plugin
     * @since Moodle 3.8
     */
    public function get_config_for_external() {
        // Return all settings for all users since it is safe (no private keys, etc..).
        $configs = get_config('block_myoverview');

        // Get the customfield values (if any).
        if ($configs->displaygroupingcustomfield) {
            $group = get_user_preferences('block_myoverview_user_grouping_preference');
            $sort = get_user_preferences('block_myoverview_user_sort_preference');
            $view = get_user_preferences('block_myoverview_user_view_preference');
            $customfieldvalue = get_user_preferences('block_myoverview_user_grouping_customfieldvalue_preference');

            $builder = new \block_myoverview\local\props_builder($group, $sort, $view, $customfieldvalue);
            $customfieldsexport = $builder->get_customfield_values_for_export();
            if (!empty($customfieldsexport)) {
                $configs->customfieldsexport = json_encode($customfieldsexport);
            }
        }

        return (object) [
            'instance' => new stdClass(),
            'plugin' => $configs,
        ];
    }

    /**
     * Disable block editing on the my courses page.
     *
     * @return boolean
     */
    public function instance_can_be_edited() {
        if ($this->page->blocks->is_known_region(BLOCK_POS_LEFT) || $this->page->blocks->is_known_region(BLOCK_POS_RIGHT)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Hide the block header on the my courses page.
     *
     * @return boolean
     */
    public function hide_header() {
        if ($this->page->blocks->is_known_region(BLOCK_POS_LEFT) || $this->page->blocks->is_known_region(BLOCK_POS_RIGHT)) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * This block loads its content asynchronously and reports when it is in place.
     *
     * @return bool
     */
    #[\Override]
    public function has_async_content(): bool {
        return true;
    }

    #[\Override]
    public function get_icon(): ?\core\output\pix_icon {
        return new \core\output\pix_icon('i/course', '', 'core');
    }
}
