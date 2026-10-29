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
 * Small helpers for the dashboard application.
 *
 * @module     core_my/utils
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Reduce a fragment of HTML to its text, with entities decoded.
 *
 * A block's title arrives as HTML (block_contents::$title has already been through
 * format_string(), so "Tom & Jerry" is "Tom &amp; Jerry"), which is right for rendering it as
 * markup but wrong for an accessible name or a string placeholder, where it would read as the
 * literal entity. Parsing is done by the browser's HTML parser into an inert document, so nothing
 * in the fragment runs.
 *
 * @param html The HTML fragment.
 * @return Its text content.
 */
export const htmlToText = (html: string): string => {
    if (!html.includes('<') && !html.includes('&')) {
        return html;
    }
    return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
};
