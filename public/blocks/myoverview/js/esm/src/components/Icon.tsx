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
 * Thin FontAwesome icon wrapper (FA6 ships with Boost).
 *
 * @module     block_myoverview/components/Icon
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

type IconProps = {
    /** Icon name without prefix, e.g. "star", "ellipsis-vertical". */
    name: string;
    /** Style variant; defaults to solid. */
    variant?: "solid" | "regular";
    className?: string;
};

/**
 * Render a decorative FontAwesome icon (aria-hidden — labels live on controls).
 *
 * @param props Icon configuration.
 * @returns The icon element.
 */
export default function Icon({name, variant = "solid", className = ""}: IconProps) {
    return <i className={`fa-${variant} fa-${name} ${className}`.trim()} aria-hidden="true"></i>;
}
