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
 * Escape dismissal for the pure-CSS `data-tooltip` tooltips (WCAG 2.1 1.4.13).
 *
 * The tooltip itself is ::after content shown on :hover / :focus-visible, so it
 * has no DOM of its own to attach behaviour to. This hook suppresses it by
 * dropping the data-tooltip attribute while Escape has been pressed during the
 * current hover/focus; leaving and re-entering shows it again, which is the
 * dismissal model 1.4.13 asks for. A document-level listener is attached only
 * while the trigger is hovered or focused, so Escape works for pointer users
 * whose focus is elsewhere.
 *
 * Migrate to the design-system Tooltip (which owns this behaviour) once Boost
 * vendors its CSS (MDL-89292).
 *
 * @module     block_myoverview/hooks/useDismissableTooltip
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useCallback, useEffect, useRef, useState} from "react";

type DismissableTooltip = {
    /** The data-tooltip value to render, or undefined while dismissed. */
    tooltipAttr: (text: string) => string | undefined;
    /** Spread these on the tooltip trigger. */
    tooltipTriggerProps: {
        onMouseEnter: () => void;
        onMouseLeave: () => void;
        onFocus: () => void;
        onBlur: () => void;
    };
};

/**
 * Manage Escape suppression for a CSS tooltip trigger.
 *
 * @returns The attribute helper and the trigger props.
 */
export function useDismissableTooltip(): DismissableTooltip {
    const [suppressed, setSuppressed] = useState(false);
    const activeRef = useRef(0);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            setSuppressed(true);
        }
    }, []);

    const enter = useCallback(() => {
        activeRef.current++;
        if (activeRef.current === 1) {
            document.addEventListener("keydown", onKeyDown, true);
        }
    }, [onKeyDown]);

    const leave = useCallback(() => {
        activeRef.current = Math.max(0, activeRef.current - 1);
        if (activeRef.current === 0) {
            document.removeEventListener("keydown", onKeyDown, true);
            setSuppressed(false);
        }
    }, [onKeyDown]);

    // Unmount safety: the trigger can disappear while hovered/focused.
    useEffect(() => () => document.removeEventListener("keydown", onKeyDown, true), [onKeyDown]);

    return {
        tooltipAttr: (text: string) => (suppressed ? undefined : text),
        tooltipTriggerProps: {
            onMouseEnter: enter,
            onMouseLeave: leave,
            onFocus: enter,
            onBlur: leave,
        },
    };
}
