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
 * My Moodle -- a user's personal dashboard
 *
 * - each user can currently have their own page (cloned from system and then customised)
 * - only the user can see their own dashboard
 * - users can add any blocks they want
 * - the administrators can define a default site dashboard for users who have
 *   not created their own dashboard
 *
 * This script sets up the page (context, editing state, blocks) exactly as the classic
 * dashboard always has, then hands off rendering to the responsive React grid (see
 * {@see \core_my\local\dashboard}) instead of the legacy block-region template output: this
 * file's own output is just a page shell and a mount point, plus a server-rendered
 * loading placeholder shaped like the user's real layout so the first paint (before the
 * React bundle has even loaded) already looks like their dashboard. All of the actual grid
 * data - blocks, layout, available block types, capabilities - is fetched by the React
 * application itself over the web service in {@see \core_my\external\get_dashboard}, not
 * assembled here.
 *
 * @package    moodlecore
 * @subpackage my
 * @copyright  2010 Remote-Learner.net
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @author     Hubert Chathi <hubert@remote-learner.net>
 * @author     Olav Jordan <olav.jordan@remote-learner.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../config.php');
require_once($CFG->dirroot . '/my/lib.php');

redirect_if_major_upgrade_required();

// TODO Add sesskey check to edit
$edit   = optional_param('edit', null, PARAM_BOOL);    // Turn editing on and off
$reset  = optional_param('reset', null, PARAM_BOOL);

require_login();

$hassiteconfig = has_capability('moodle/site:config', context_system::instance());
if ($hassiteconfig && moodle_needs_upgrading()) {
    redirect(new moodle_url('/admin/index.php'));
}

// If site registration needs updating, redirect.
\core\hub\registration::registration_reminder('/my/index.php');

$strmymoodle = get_string('myhome');

if (empty($CFG->enabledashboard)) {
    // Dashboard is disabled, so the /my page shouldn't be displayed.
    $defaultpage = get_default_home_page();
    if ($defaultpage == HOMEPAGE_MYCOURSES) {
        // If default page is set to "My courses", redirect to it.
        redirect(new moodle_url('/my/courses.php'));
    } else if ($defaultpage == HOMEPAGE_SITE) {
        redirect(new moodle_url('/'));
    } else if ($defaultpage == HOMEPAGE_USER) {
        // All homepage options disabled - redirect to user preferences page.
        redirect(new moodle_url('/user/preferences.php'));
    } else {
        // Otherwise, raise an exception to inform the dashboard is disabled.
        throw new moodle_exception('error:dashboardisdisabled', 'my');
    }
}

if (isguestuser()) {  // Force them to see system default, no editing allowed
    // If guests are not allowed my moodle, send them to front page.
    if (empty($CFG->allowguestmymoodle)) {
        redirect(new moodle_url('/', array('redirect' => 0)));
    }

    $userid = null;
    $USER->editing = $edit = 0;  // Just in case
    $context = context_system::instance();
    $PAGE->set_blocks_editing_capability('moodle/my:configsyspages');  // unlikely :)
    $strguest = get_string('guest');
    $pagetitle = "$strmymoodle ($strguest)";

} else {        // We are trying to view or edit our own My Moodle page
    $userid = $USER->id;  // Owner of the page
    $context = context_user::instance($USER->id);
    $PAGE->set_blocks_editing_capability('moodle/my:manageblocks');
    $pagetitle = $strmymoodle;
}

// Get the My Moodle page info.  Should always return something unless the database is broken.
if (!$currentpage = my_get_page($userid, MY_PAGE_PRIVATE)) {
    throw new \moodle_exception('mymoodlesetup');
}

// Start setting up the page
$params = array();
$PAGE->set_context($context);
$PAGE->set_url('/my/index.php', $params);
$PAGE->set_pagelayout('mydashboard');
$PAGE->set_docs_path('dashboard');
$PAGE->add_body_class('core-my-dashboard-page');
$PAGE->set_pagetype('my-index');
$PAGE->blocks->add_region('content');
// The grid renders the blocks itself, so this page normally loads no real block: creating their
// content here as well would run every block's JavaScript against markup that is not on the page.
// The one exception is a request carrying a block action from the standard block menu (hide,
// show, delete, the classic edit and add fallbacks): block_manager processes those from the URL
// and must find the block on this page, then redirects before anything is rendered. A block still
// positioned in the old drawer region is loaded into the content region then, as any block in an
// unregistered region is.
$blockaction = false;
foreach (['bui_hideid', 'bui_showid', 'bui_deleteid', 'bui_editid', 'bui_addblock', 'bui_moveid'] as $param) {
    $blockaction = $blockaction || optional_param($param, null, PARAM_RAW) !== null;
}
if (!$blockaction) {
    $PAGE->blocks->show_only_fake_blocks(true);
}
$PAGE->set_subpage($currentpage->id);
$PAGE->set_title($pagetitle);
$PAGE->set_heading($pagetitle);

if (!isguestuser()) {   // Skip default home page for guests
    if (get_home_page() != HOMEPAGE_MY) {
        if (optional_param('setdefaulthome', false, PARAM_BOOL) && confirm_sesskey()) {
            set_user_preference('user_home_page_preference', HOMEPAGE_MY);
            redirect($PAGE->url);
        } else if (!empty($CFG->defaulthomepage) && $CFG->defaulthomepage == HOMEPAGE_USER) {
            $frontpagenode = $PAGE->settingsnav->add(get_string('frontpagesettings'), null, navigation_node::TYPE_SETTING, null);
            $frontpagenode->force_open();
            $frontpagenode->add(
                get_string('makethismyhome'),
                new moodle_url('/my/', ['setdefaulthome' => 1, 'sesskey' => sesskey()]),
                navigation_node::TYPE_SETTING,
            );
        }
    }
}

// Toggle the editing state and switches
if (empty($CFG->forcedefaultmymoodle) && $PAGE->user_allowed_editing()) {
    if ($reset !== null) {
        if (!is_null($userid)) {
            require_sesskey();
            if (!$currentpage = my_reset_page($userid, MY_PAGE_PRIVATE)) {
                throw new \moodle_exception('reseterror', 'my');
            }
            redirect(new moodle_url('/my'));
        }
    } else if ($edit !== null) {             // Editing state was specified
        $USER->editing = $edit;       // Change editing state
    } else {                          // Editing state is in session
        if ($currentpage->userid) {   // It's a page we can edit, so load from session
            if (!empty($USER->editing)) {
                $edit = 1;
            } else {
                $edit = 0;
            }
        } else {
            // For the page to display properly with the user context header the page blocks need to
            // be copied over to the user context.
            if (!$currentpage = my_copy_page($USER->id, MY_PAGE_PRIVATE)) {
                throw new \moodle_exception('mymoodlesetup');
            }
            $context = context_user::instance($USER->id);
            $PAGE->set_context($context);
            $PAGE->set_subpage($currentpage->id);
            // The copy is the user's own page, so an Edit mode they already had on stays on:
            // this is also how a dashboard reset (which leaves them on the site default page,
            // still editing) keeps them in Edit mode on the fresh copy.
            $edit = empty($USER->editing) ? 0 : 1;
        }
    }

    // Add button for editing page
    $params = array('edit' => !$edit);

    if (!$currentpage->userid) {
        // viewing a system page -- let the user customise it
        $editstring = get_string('updatemymoodleon');
        $params['edit'] = 1;
    } else if (empty($edit)) {
        $editstring = get_string('updatemymoodleon');
    } else {
        $editstring = get_string('updatemymoodleoff');
    }

    $url = new moodle_url("$CFG->wwwroot/my/index.php", $params);
    $button = '';
    if (!$PAGE->theme->haseditswitch) {
        $button = $OUTPUT->single_button($url, $editstring);
    }
    $PAGE->set_button($button);

} else {
    $USER->editing = $edit = 0;
}

// The React application's mount point, with a server-rendered loading placeholder shaped like the
// user's real layout; see \core_my\local\dashboard::render_mount_point() for the details.
$mountpoint = \core_my\local\dashboard::render_mount_point(false);

echo $OUTPUT->header();

if (core_userfeedback::should_display_reminder()) {
    core_userfeedback::print_reminder_block();
}

echo $mountpoint;

echo $OUTPUT->footer();

// Trigger dashboard has been viewed event.
$eventparams = array('context' => $context);
$event = \core\event\dashboard_viewed::create($eventparams);
$event->trigger();
