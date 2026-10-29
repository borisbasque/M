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
 * My Moodle -- the site-default dashboard, editable by admins for users who have not customised
 * their own.
 *
 * This is the admin-facing sibling of my/index.php: same page setup (context, blocks, mount
 * point) but for the shared system dashboard rather than a single user's own. It renders the same
 * core_my/index.tsx React component into the same kind of mount point, with the siteDefault prop
 * set (see \core_my\local\dashboard::render_mount_point()); that prop determines which web service
 * calls (and which capability, moodle/my:configsyspages vs moodle/my:manageblocks) are appropriate
 * for the rest of the session.
 *
 * @package    moodlecore
 * @subpackage my
 * @copyright  2010 Remote-Learner.net
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @author     Hubert Chathi <hubert@remote-learner.net>
 * @author     Olav Jordan <olav.jordan@remote-learner.net>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('NO_OUTPUT_BUFFERING', true);
require_once(__DIR__ . '/../config.php');
require_once($CFG->dirroot . '/my/lib.php');
require_once($CFG->libdir.'/adminlib.php');

redirect_if_major_upgrade_required();

$resetall = optional_param('resetall', false, PARAM_BOOL);

$pagetitle = get_string('mypage', 'admin');

$PAGE->set_secondary_active_tab('appearance');
$PAGE->set_blocks_editing_capability('moodle/my:configsyspages');
$PAGE->set_url(new moodle_url('/my/indexsys.php'));
admin_externalpage_setup('mypage', '', null, '', ['pagelayout' => 'mydashboard', 'nosearch' => true]);
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
$PAGE->set_title($pagetitle);
$PAGE->set_heading($pagetitle);
$PAGE->set_secondary_navigation(false);
$PAGE->set_primary_active_tab('myhome');

// Resetting every user's dashboard back to this site default can take a while on a large site
// (my_reset_page_for_all_users() iterates every customised page), so this is a distinct,
// synchronous admin action outside the React application entirely: the session is closed early
// so the progress bar's output actually reaches the browser as it happens, rather than being
// buffered until the whole loop finishes.
// If we are resetting all, just output a progress bar.
if ($resetall && confirm_sesskey()) {
    echo $OUTPUT->header($pagetitle);
    echo $OUTPUT->heading(get_string('resettingdashboards', 'my'), 3);

    $progressbar = new progress_bar();
    $progressbar->create();

    \core\session\manager::write_close();
    my_reset_page_for_all_users(MY_PAGE_PRIVATE, 'my-index', $progressbar);
    core\notification::success(get_string('alldashboardswerereset', 'my'));
    echo $OUTPUT->continue_button($PAGE->url);
    echo $OUTPUT->footer();
    die();
}

// Get the My Moodle page info.  Should always return something unless the database is broken.
if (!$currentpage = my_get_page(null, MY_PAGE_PRIVATE)) {
    throw new \moodle_exception('mymoodlesetup');
}
$PAGE->set_subpage($currentpage->id);

// Display a button to reset everyone's dashboard.
$url = $PAGE->url;
$url->params(['resetall' => true, 'sesskey' => sesskey()]);
$button = $OUTPUT->single_button($url, get_string('reseteveryonesdashboard', 'my'));
$PAGE->set_button($button . $PAGE->button);

// The React application's mount point for the site-default dashboard; see
// \core_my\local\dashboard::render_mount_point() for what it and its placeholder are for.
$mountpoint = \core_my\local\dashboard::render_mount_point(true);

echo $OUTPUT->header();

echo $mountpoint;

echo $OUTPUT->footer();
