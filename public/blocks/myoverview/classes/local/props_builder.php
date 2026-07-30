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
 * Builds the React mount-point props for the my overview block.
 *
 * @package    block_myoverview
 * @copyright  2017 Ryan Wyllie <ryan@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_myoverview\local;

// The guard stays (unlike other classes in this plugin): the file-scope require_once
// below is a global side effect, which the coding-style sniff only allows behind it.
defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/blocks/myoverview/lib.php');

/**
 * Builds the React mount-point props for the my overview block.
 *
 * @package    block_myoverview
 * @copyright  2017 Ryan Wyllie <ryan@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class props_builder {
    /**
     * Store the grouping preference.
     *
     * @var string String matching the grouping constants defined in myoverview/lib.php
     */
    private $grouping;

    /**
     * Store the sort preference.
     *
     * @var string String matching the sort constants defined in myoverview/lib.php
     */
    private $sort;

    /**
     * Store the view preference.
     *
     * @var string String matching the view/display constants defined in myoverview/lib.php
     */
    private $view;

    /**
     * Store the display categories config setting.
     *
     * @var bool
     */
    private $displaycategories;

    /**
     * Store the configuration values for the myoverview block.
     *
     * @var array Array of available layouts matching view/display constants defined in myoverview/lib.php
     */
    private $layouts;

    /**
     * Store a course grouping option setting
     *
     * @var bool
     */
    private $displaygroupingallincludinghidden;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupingall;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupinginprogress;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupingfuture;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupingpast;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupingfavourites;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupinghidden;

    /**
     * Store a course grouping option setting.
     *
     * @var bool
     */
    private $displaygroupingcustomfield;

    /**
     * Store the custom field used by customfield grouping.
     *
     * @var string
     */
    private $customfiltergrouping;

    /**
     * Store the selected custom field value to group by.
     *
     * @var string
     */
    private $customfieldvalue;

    /** @var \stdClass Plugin config (get_config('block_myoverview')), loaded once in the constructor. */
    private $config;

    /** @var \core_course_category|null|false Per-request cache of user_top(); false = unresolved. */
    private $usertopcategory = false;

    /** @var array Per-request cache of get_nearest_editable_subcategory() results, keyed by permission list. */
    private $nearestcategories = [];

    /**
     * main constructor.
     * Initialize the user preferences
     *
     * @param string $grouping Grouping user preference
     * @param string $sort Sort user preference
     * @param string $view Display user preference
     * @param string $customfieldvalue
     *
     * @throws \dml_exception
     */
    public function __construct($grouping, $sort, $view, $customfieldvalue = null) {
        global $CFG;
        // Get plugin config, kept for later fallback-grouping resolution in get_props().
        $config = $this->config = get_config('block_myoverview');

        // Build the course grouping option name to check if the given grouping is enabled afterwards.
        $groupingconfigname = 'displaygrouping' . $grouping;
        // Check the given grouping and remember it if it is enabled. The customfield grouping is
        // only usable when a field is also selected — the same compound condition that gates it
        // in get_enabled_groupings() — otherwise the client would query the web service with the
        // customfield classification and no field name, which errors.
        $groupingusable = $grouping && $config->$groupingconfigname == true
            && ($grouping !== BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD || !empty($config->customfiltergrouping));
        if ($groupingusable) {
            $this->grouping = $grouping;

            // Otherwise fall back to another grouping in a reasonable order.
            // This is done to prevent one-time UI glitches in the case when a user has chosen a grouping option previously which
            // was then disabled by the admin in the meantime.
        } else {
            $this->grouping = $this->get_fallback_grouping($config);
        }
        unset($groupingconfigname);

        // Remember which custom field value we were using, if grouping by custom field.
        $this->customfieldvalue = $customfieldvalue;

        // Check and remember the given sorting.
        if ($sort) {
            $this->sort = $sort;
        } else if ($CFG->courselistshortnames) {
            $this->sort = BLOCK_MYOVERVIEW_SORTING_SHORTNAME;
        } else {
            $this->sort = BLOCK_MYOVERVIEW_SORTING_TITLE;
        }
        // In case sorting remembered is shortname and display extended course names not checked,
        // we should revert sorting to title.
        if (!$CFG->courselistshortnames && $sort == BLOCK_MYOVERVIEW_SORTING_SHORTNAME) {
            $this->sort = BLOCK_MYOVERVIEW_SORTING_TITLE;
        }

        // Check and remember if the course categories should be shown or not.
        if (!$config->displaycategories) {
            $this->displaycategories = BLOCK_MYOVERVIEW_DISPLAY_CATEGORIES_OFF;
        } else {
            $this->displaycategories = BLOCK_MYOVERVIEW_DISPLAY_CATEGORIES_ON;
        }

        // Get and remember the available layouts. Fall back to the first enabled layout
        // when there is no stored preference or the stored layout has since been
        // disabled by the admin.
        $this->set_available_layouts();
        $this->view = ($view && in_array($view, $this->layouts)) ? $view : reset($this->layouts);

        // Check and remember if the particular grouping options should be shown or not.
        $this->displaygroupingallincludinghidden = $config->displaygroupingallincludinghidden;
        $this->displaygroupingall = $config->displaygroupingall;
        $this->displaygroupinginprogress = $config->displaygroupinginprogress;
        $this->displaygroupingfuture = $config->displaygroupingfuture;
        $this->displaygroupingpast = $config->displaygroupingpast;
        $this->displaygroupingfavourites = $config->displaygroupingfavourites;
        $this->displaygroupinghidden = $config->displaygroupinghidden;
        $this->displaygroupingcustomfield = ($config->displaygroupingcustomfield && $config->customfiltergrouping);
        $this->customfiltergrouping = $config->customfiltergrouping;
    }
    /**
     * Determine the most sensible fallback grouping to use (in cases where the stored selection
     * is no longer available).
     * @param object $config
     * @return string
     */
    private function get_fallback_grouping($config) {
        if ($config->displaygroupingall == true) {
            return BLOCK_MYOVERVIEW_GROUPING_ALL;
        }
        if ($config->displaygroupingallincludinghidden == true) {
            return BLOCK_MYOVERVIEW_GROUPING_ALLINCLUDINGHIDDEN;
        }
        if ($config->displaygroupinginprogress == true) {
            return BLOCK_MYOVERVIEW_GROUPING_INPROGRESS;
        }
        if ($config->displaygroupingfuture == true) {
            return BLOCK_MYOVERVIEW_GROUPING_FUTURE;
        }
        if ($config->displaygroupingpast == true) {
            return BLOCK_MYOVERVIEW_GROUPING_PAST;
        }
        if ($config->displaygroupingfavourites == true) {
            return BLOCK_MYOVERVIEW_GROUPING_FAVOURITES;
        }
        if ($config->displaygroupinghidden == true) {
            return BLOCK_MYOVERVIEW_GROUPING_HIDDEN;
        }
        if ($config->displaygroupingcustomfield == true) {
            return BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD;
        }
        // In this case, no grouping option is enabled and the grouping is not needed at all.
        // But it's better not to leave $this->grouping unset for any unexpected case.
        return BLOCK_MYOVERVIEW_GROUPING_ALLINCLUDINGHIDDEN;
    }

    /**
     * Set the available layouts based on the config table settings,
     * if none are available, defaults to the cards view.
     */
    private function set_available_layouts() {
        if (!empty($this->config->layouts)) {
            $this->layouts = explode(',', $this->config->layouts);
        } else {
            $this->layouts = [BLOCK_MYOVERVIEW_VIEW_CARD];
        }
    }

    /**
     * Get the list of values to add to the grouping dropdown
     * @return object[] containing name, value and active fields
     */
    public function get_customfield_values_for_export() {
        global $DB, $USER;
        if (!$this->displaygroupingcustomfield) {
            return [];
        }

        // Get the relevant customfield ID within the core_course/course component/area.
        $fieldid = $DB->get_field_sql("
            SELECT f.id
              FROM {customfield_field} f
              JOIN {customfield_category} c ON c.id = f.categoryid
             WHERE f.shortname = :shortname AND c.component = 'core_course' AND c.area = 'course'
        ", ['shortname' => $this->customfiltergrouping]);
        if (!$fieldid) {
            return [];
        }
        $courses = enrol_get_all_users_courses($USER->id, true);
        if (!$courses) {
            return [];
        }
        [$csql, $params] = $DB->get_in_or_equal(array_keys($courses), SQL_PARAMS_NAMED);
        $select = "instanceid $csql AND fieldid = :fieldid";
        $params['fieldid'] = $fieldid;
        $distinctablevalue = $DB->sql_compare_text('value');
        $values = $DB->get_records_select_menu(
            'customfield_data',
            $select,
            $params,
            '',
            "DISTINCT $distinctablevalue, $distinctablevalue AS value2"
        );
        \core_collator::asort($values, \core_collator::SORT_NATURAL);
        $values = array_filter($values);
        if (!$values) {
            return [];
        }
        $field = \core_customfield\field_controller::create($fieldid);
        $isvisible = $field->get_configdata_property('visibility') == \core_course\customfield\course_handler::VISIBLETOALL;
        // Only visible fields to everybody supporting course grouping will be displayed.
        if (!$field->supports_course_grouping() || !$isvisible) {
            return []; // The field shouldn't have been selectable in the global settings, but just skip it now.
        }
        $values = $field->course_grouping_format_values($values);
        $customfieldactive = ($this->grouping === BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD);
        $ret = [];
        foreach ($values as $value => $name) {
            $ret[] = (object)[
                'name' => $name,
                'value' => $value,
                'active' => ($customfieldactive && ($this->customfieldvalue == $value)),
            ];
        }
        return $ret;
    }

    /**
     * Build the props for the React component's mount point.
     *
     * @return array The props, ready for json_encode into data-react-props.
     * @throws \coding_exception
     */
    public function get_props(): array {
        global $CFG, $OUTPUT;
        require_once($CFG->dirroot . '/course/lib.php');

        // Persistent toolbar action URLs, gated server-side by capability. Category lookups
        // are cached per request (see get_nearest_editable_category()).
        $createcourseurl = null;
        if ($category = $this->get_nearest_editable_category(['create'])) {
            $createcourseurl = (new \moodle_url('/course/edit.php', ['category' => $category->id]))->out(false);
        }
        $managecourseurl = null;
        if ($category = $this->get_nearest_editable_category(['manage'])) {
            // Note: course/management.php reads the 'categoryid' parameter.
            $managecourseurl = (new \moodle_url('/course/management.php', ['categoryid' => $category->id]))->out(false);
        }
        $requestcourseurl = $this->get_request_course_url();

        // The zero-state is only visible when the user has no courses at all, so only compute
        // it then — it walks the category tree and counts courses. A limit-1
        // enrolment lookup is the cheapest "has any course" check (as block_timeline does).
        $hasanycourses = !empty(enrol_get_my_courses(['id'], null, 1));

        // Resolve the custom field values once, falling back if the stored value is stale.
        // The fallback is kept in locals rather than written back to the instance state so
        // that repeated get_props() calls on one builder return the same result.
        $customfieldvalues = $this->get_customfield_values_for_export();
        $grouping = $this->grouping;
        $customfieldvalue = $this->customfieldvalue;
        if ($grouping == BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD) {
            $found = false;
            foreach ($customfieldvalues as $field) {
                if ($field->value == $customfieldvalue) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $grouping = $this->get_fallback_grouping($this->config);
                if ($grouping == BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD && ($firstfield = reset($customfieldvalues))) {
                    $customfieldvalue = $firstfield->value;
                }
            }
        }

        $props = [
            'preferences' => [
                'view' => $this->view,
                'filter' => $grouping,
                'sort' => $this->sort,
                'customfieldvalue' => $customfieldvalue,
            ],
            'config' => [
                'enabledviews' => array_values($this->layouts),
                'enabledfilters' => $this->get_enabled_groupings($customfieldvalues),
                'displaycategories' => ($this->displaycategories === BLOCK_MYOVERVIEW_DISPLAY_CATEGORIES_ON),
                'showshortname' => (bool) $CFG->courselistshortnames,
                // The site-level default sort: shortname when extended course names are shown.
                // The client compares against this (not a hardcoded default) so the sort control
                // only shows its active state when the user has actually changed the sort.
                'defaultsort' => $CFG->courselistshortnames
                    ? BLOCK_MYOVERVIEW_SORTING_SHORTNAME : BLOCK_MYOVERVIEW_SORTING_TITLE,
                // The grouping a preference-less user starts on for this config; the client
                // treats any other active grouping as a narrowing "query" (see types.ts).
                'defaultfilter' => $this->get_fallback_grouping($this->config),
                'customfieldname' => $this->customfiltergrouping ?: null,
                'customfieldvalues' => $this->get_customfield_values_react($customfieldvalues),
            ],
            'createcourseurl' => $createcourseurl,
            'managecourseurl' => $managecourseurl,
            'requestcourseurl' => $requestcourseurl,
            'hiddencourseids' => array_map('intval', get_hidden_courses_on_timeline()),
            'zerostate' => $hasanycourses ? null : $this->get_zero_state_data(),
            'illustrationurl' => $OUTPUT->image_url('courses', 'block_myoverview')->out(false),
        ];

        return $props;
    }

    /**
     * Get the list of enabled grouping constants, in display order.
     *
     * @param array $customfieldvalues Values from {@see get_customfield_values_for_export()}
     * @return string[]
     */
    private function get_enabled_groupings(array $customfieldvalues): array {
        $map = [
            BLOCK_MYOVERVIEW_GROUPING_ALLINCLUDINGHIDDEN => $this->displaygroupingallincludinghidden,
            BLOCK_MYOVERVIEW_GROUPING_ALL => $this->displaygroupingall,
            BLOCK_MYOVERVIEW_GROUPING_INPROGRESS => $this->displaygroupinginprogress,
            BLOCK_MYOVERVIEW_GROUPING_FUTURE => $this->displaygroupingfuture,
            BLOCK_MYOVERVIEW_GROUPING_PAST => $this->displaygroupingpast,
            BLOCK_MYOVERVIEW_GROUPING_FAVOURITES => $this->displaygroupingfavourites,
            BLOCK_MYOVERVIEW_GROUPING_HIDDEN => $this->displaygroupinghidden,
            // Only offer the customfield grouping when it actually has values to filter by,
            // so the client never renders an empty custom-field group in the filter menu.
            BLOCK_MYOVERVIEW_GROUPING_CUSTOMFIELD => $this->displaygroupingcustomfield && !empty($customfieldvalues),
        ];
        $enabled = [];
        foreach ($map as $key => $on) {
            if ($on) {
                $enabled[] = $key;
            }
        }
        return $enabled;
    }

    /**
     * Adapt the custom field values for the React component (value + name only).
     *
     * @param array $values Values from {@see get_customfield_values_for_export()}
     * @return array
     */
    private function get_customfield_values_react(array $values): array {
        return array_values(array_map(fn($v) => ['value' => $v->value, 'name' => $v->name], $values));
    }

    /**
     * The user's top course category, resolved once per request.
     *
     * @return \core_course_category|null
     */
    private function get_user_top_category(): ?\core_course_category {
        if ($this->usertopcategory === false) {
            $this->usertopcategory = \core_course_category::user_top() ?: null;
        }
        return $this->usertopcategory;
    }

    /**
     * The nearest editable subcategory for a permission set, cached per request.
     *
     * The category-tree walk in get_nearest_editable_subcategory() is expensive and the
     * same permission sets are needed by both the toolbar URLs and the zero-state data,
     * so each distinct lookup runs at most once per request.
     *
     * @param array $permissions Permission names as accepted by get_nearest_editable_subcategory().
     * @return \core_course_category|null
     */
    private function get_nearest_editable_category(array $permissions): ?\core_course_category {
        $key = implode(',', $permissions);
        if (!array_key_exists($key, $this->nearestcategories)) {
            $coursecat = $this->get_user_top_category();
            $this->nearestcategories[$key] = $coursecat
                ? (\core_course_category::get_nearest_editable_subcategory($coursecat, $permissions) ?: null)
                : null;
        }
        return $this->nearestcategories[$key];
    }

    /**
     * Compute the "request a course" URL, or null when the user cannot request one.
     *
     * @return string|null
     */
    private function get_request_course_url(): ?string {
        $category = $this->get_nearest_editable_category(['moodle/course:request']);
        if (!$category || !$category->can_request_course()) {
            return null;
        }
        // Note: course/request.php reads the 'category' parameter (not 'categoryid').
        return (new \moodle_url('/course/request.php', ['category' => $category->id]))->out(false);
    }

    /**
     * Build the zero-state data for an empty course list.
     *
     * Data only: the variant, flags and URLs the client needs to
     * compose the zero-state copy from language strings itself — no strings or
     * pre-rendered HTML travel as props.
     *
     * @return array { variant, sitehascourses, createurl, manageurl, docsurl, docstarget, quickstarturl }
     */
    private function get_zero_state_data(): array {
        global $CFG, $DB;

        $base = [
            'variant' => 'default',
            'sitehascourses' => true,
            'createurl' => null,
            'manageurl' => null,
            'docsurl' => (new \moodle_url($CFG->docroot, ['lang' => current_language()]))->out(false),
            'docstarget' => $CFG->doctonewwindow ? '_blank' : '_self',
            'quickstarturl' => $CFG->coursecreationguide
                ? (new \moodle_url($CFG->coursecreationguide, ['lang' => current_language()]))->out(false)
                : null,
        ];

        if ($this->get_user_top_category()) {
            // Priority 1: the user can request a course. The request button lives in the
            // persistent toolbar (requestcourseurl), so the client renders none here.
            $category = $this->get_nearest_editable_category(['moodle/course:request']);
            if ($category && $category->can_request_course()) {
                return ['variant' => 'request'] + $base;
            }

            // Priority 2: the user can create a course (with an optional manage button).
            if ($category = $this->get_nearest_editable_category(['create'])) {
                $manage = $this->get_nearest_editable_category(['manage']);
                return [
                    'variant' => 'create',
                    'sitehascourses' => (bool) $DB->count_records_select('course', 'category > 0'),
                    'createurl' => (new \moodle_url('/course/edit.php', ['category' => $category->id]))->out(false),
                    'manageurl' => $manage
                        ? (new \moodle_url('/course/management.php', ['categoryid' => $manage->id]))->out(false)
                        : null,
                ] + $base;
            }
        }

        return $base;
    }
}
