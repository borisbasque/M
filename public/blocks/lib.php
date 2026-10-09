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
 * Callbacks for the blocks subsystem.
 *
 * @package    core_block
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use core_block\local\directory_details;

/**
 * Serve the blocks subsystem's files: the block icons copied from the plugins directory.
 *
 * Anyone who is logged in may see them: they are the same images the plugins directory shows
 * publicly, kept on the site so that nobody's browser has to contact the directory.
 *
 * @param stdClass $course Course object.
 * @param stdClass|null $cm Course module object.
 * @param context $context Context object.
 * @param string $filearea File area.
 * @param array $args Extra arguments: the item id (the file's time modified, for caching) and filename.
 * @param bool $forcedownload Whether or not to force the download of the file.
 * @param array $options Array of options.
 * @return void|false
 */
function core_block_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    if ($context->contextlevel != CONTEXT_SYSTEM || $filearea !== directory_details::FILEAREA
            || !directory_details::is_enabled()) {
        return false;
    }
    require_login(null, false);

    // The item id in the address is the file's time modified, so a replaced icon gets a new address.
    $revision = (int) array_shift($args);
    $filename = clean_param(array_pop($args), PARAM_FILE);
    $file = directory_details::get_icon_file(pathinfo($filename, PATHINFO_FILENAME));
    if (!$file || $file->get_filename() !== $filename) {
        return false;
    }
    $lifetime = $revision === (int) $file->get_timemodified() ? YEARSECS : 0;
    send_stored_file($file, $lifetime, 0, $forcedownload, $options);
}
