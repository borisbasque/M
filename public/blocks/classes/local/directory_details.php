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

namespace core_block\local;

use context_system;
use core\update\api;
use moodle_url;

/**
 * Descriptions and icons of installed contributed blocks, as shown in the Moodle plugins directory.
 *
 * Many contributed blocks declare no description or icon of their own (see
 * block_base::get_description() and get_icon()), but have both on their plugins directory listing.
 * This keeps a copy on the site, so people choosing a block to add can tell blocks apart:
 *
 * - only the server ever contacts the directory, from a scheduled task, never while someone waits;
 * - the icon is stored in the site's file storage and served from the site, so nobody's browser
 *   contacts the directory just by opening the dashboard;
 * - a failed or slow lookup changes nothing, so a site that loses its connection keeps what it had;
 * - a site setting turns the lookup off, and then nothing stored is shown.
 *
 * Only the block's name and the site's Moodle branch are sent; no personal data.
 *
 * @package    core_block
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class directory_details {
    /** @var string File area holding the icons, in the system context. */
    public const FILEAREA = 'directoryicon';

    /** @var int Seconds to wait for the directory, or for an icon to download. */
    public const TIMEOUT = 10;

    /** @var int How long stored details are kept before being looked up again, in seconds. */
    public const REFRESH_AFTER = WEEKSECS;

    /** @var int The largest icon that is kept, in bytes. */
    public const MAX_ICON_BYTES = 200 * 1024;

    /** @var string[] Image types kept as icons. SVG is not accepted: it can carry script. */
    private const ICON_TYPES = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/gif' => 'gif', 'image/webp' => 'webp'];

    /**
     * Whether the site looks blocks up in the plugins directory.
     *
     * @return bool
     */
    public static function is_enabled(): bool {
        return (bool) get_config('core', 'blockdirectorydetails');
    }

    /**
     * Where to send people to discover more blocks, or null when the site does not use the directory.
     *
     * @return string|null
     */
    public static function get_discover_url(): ?string {
        return self::is_enabled() ? 'https://marketplace.moodle.com/?type=2' : null;
    }

    /**
     * The directory's summary of a block, as last stored, or null for none.
     *
     * @param string $blockname The block's name, such as 'completion_progress'.
     * @return string|null
     */
    public static function get_summary(string $blockname): ?string {
        if (!self::is_enabled()) {
            return null;
        }
        $summary = get_config('core_block', 'directorysummary_' . $blockname);
        return $summary === false || $summary === '' ? null : $summary;
    }

    /**
     * The address, on this site, of a block's directory icon, as last stored, or null for none.
     *
     * @param string $blockname The block's name.
     * @return moodle_url|null
     */
    public static function get_icon_url(string $blockname): ?moodle_url {
        if (!self::is_enabled()) {
            return null;
        }
        $file = self::get_icon_file($blockname);
        if (!$file) {
            return null;
        }
        return moodle_url::make_pluginfile_url(
            context_system::instance()->id,
            'core_block',
            self::FILEAREA,
            $file->get_timemodified(),
            '/',
            $file->get_filename(),
        );
    }

    /**
     * The stored icon file for a block, if there is one.
     *
     * @param string $blockname The block's name.
     * @return \stored_file|null
     */
    public static function get_icon_file(string $blockname): ?\stored_file {
        $files = get_file_storage()->get_area_files(
            context_system::instance()->id,
            'core_block',
            self::FILEAREA,
            0,
            'filename',
            false,
        );
        foreach ($files as $file) {
            if (pathinfo($file->get_filename(), PATHINFO_FILENAME) === $blockname) {
                return $file;
            }
        }
        return null;
    }

    /**
     * The contributed blocks whose details are due to be looked up: never looked up, upgraded since,
     * or looked up longer ago than REFRESH_AFTER.
     *
     * @return string[] Block names.
     */
    public static function get_due(): array {
        $due = [];
        foreach (\core_plugin_manager::instance()->get_plugins_of_type('block') as $name => $plugin) {
            if ($plugin->is_standard()) {
                // Core blocks describe themselves, and are not in the directory.
                continue;
            }
            $checked = get_config('core_block', 'directorychecked_' . $name);
            [$time, $version] = $checked ? explode(':', $checked) + [0, 0] : [0, 0];
            if ((int) $version !== (int) $plugin->versiondisk || (int) $time < time() - self::REFRESH_AFTER) {
                $due[] = $name;
            }
        }
        return $due;
    }

    /**
     * Look a block up in the plugins directory, and keep what it says.
     *
     * Anything that goes wrong - no connection, a timeout, an unexpected reply, an icon too large
     * or of the wrong type - leaves whatever was stored before in place.
     *
     * @param string $blockname The block's name.
     * @param api|null $client The directory client, for tests.
     * @return bool Whether the directory answered.
     */
    public static function refresh(string $blockname, ?api $client = null): bool {
        $client ??= api::client();
        $details = $client->get_plugin_details('block_' . $blockname, self::TIMEOUT);
        if ($details === null) {
            return false;
        }

        $plugin = \core_plugin_manager::instance()->get_plugin_info('block_' . $blockname);
        set_config('directorychecked_' . $blockname, time() . ':' . ($plugin->versiondisk ?? 0), 'core_block');
        if ($details['summary'] !== null) {
            set_config('directorysummary_' . $blockname, \core_text::substr($details['summary'], 0, 300), 'core_block');
        }
        if ($details['logo'] !== null) {
            self::store_icon($blockname, $details['logo']);
        }
        return true;
    }

    /**
     * Download an icon and keep it in place of the block's previous one.
     *
     * @param string $blockname The block's name.
     * @param string $url Where the directory says the icon is.
     * @return bool Whether a new icon was kept.
     */
    protected static function store_icon(string $blockname, string $url): bool {
        $response = download_file_content($url, null, null, true, self::TIMEOUT, self::TIMEOUT);
        if (!$response || (int) ($response->status ?? 0) !== 200 || empty($response->results)
                || strlen($response->results) > self::MAX_ICON_BYTES) {
            return false;
        }
        $type = (new \finfo(FILEINFO_MIME_TYPE))->buffer($response->results);
        if (!isset(self::ICON_TYPES[$type])) {
            return false;
        }

        $previous = self::get_icon_file($blockname);
        $previous?->delete();
        get_file_storage()->create_file_from_string([
            'contextid' => context_system::instance()->id,
            'component' => 'core_block',
            'filearea' => self::FILEAREA,
            'itemid' => 0,
            'filepath' => '/',
            'filename' => $blockname . '.' . self::ICON_TYPES[$type],
        ], $response->results);
        return true;
    }

    /**
     * Forget everything stored about a block, such as when it is uninstalled.
     *
     * @param string $blockname The block's name.
     */
    public static function forget(string $blockname): void {
        unset_config('directorysummary_' . $blockname, 'core_block');
        unset_config('directorychecked_' . $blockname, 'core_block');
        self::get_icon_file($blockname)?->delete();
    }
}
