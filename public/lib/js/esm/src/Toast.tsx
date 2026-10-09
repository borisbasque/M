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
 * A short, temporary message that can carry one action, such as Undo or Cancel.
 *
 * The Moodle Design System has no toast yet (see MDL-89740), and core/toast is an AMD module with no
 * action button. This component follows the same rules a design-system toast would, so it can move
 * there unchanged:
 *
 * - it is its own polite status region, so it is announced without taking focus. A page showing a
 *   toast should not announce the same words a second time through its own live region;
 * - only the newest message is shown: passing a new message replaces the current one;
 * - it closes itself after `duration` milliseconds (6 seconds by default) unless `persist` is set,
 *   and the timer pauses while the pointer is over it or it has keyboard focus, so its action can
 *   never vanish while someone is reaching for it;
 * - its action and close button are each at least 24 × 24px (WCAG 2.2 SC 2.5.8).
 *
 * @module     core/Toast
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';

/** The default time a toast stays on screen, in milliseconds. */
export const TOAST_DURATION_MS = 6000;

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastMessage {
    /** Distinguishes one message from the next, so repeating the same words still shows again. */
    id: number;
    text: string;
    action?: ToastAction;
    /** Stay until dismissed or replaced, instead of closing after `duration`. */
    persist?: boolean;
    /** How long to show the message, in milliseconds. */
    duration?: number;
}

export interface ToastProps {
    /** The message to show, or null for none. */
    message: ToastMessage | null;
    /** Accessible name for the close button. */
    closeLabel: string;
    /** Called when the toast closes by itself or is dismissed. */
    onClose: () => void;
}

const Toast = ({message, closeLabel, onClose}: ToastProps) => {
    const [held, setHeld] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // A hidden toast cannot be hovered or focused, so it holds nothing open.
    useEffect(() => {
        if (!message) {
            setHeld(0);
        }
    }, [message]);

    useEffect(() => {
        clearTimeout(timer.current);
        if (!message || message.persist || held > 0) {
            return undefined;
        }
        timer.current = setTimeout(() => onCloseRef.current(), message.duration ?? TOAST_DURATION_MS);
        return () => clearTimeout(timer.current);
    }, [message, held]);

    const hold = useCallback(() => setHeld(count => count + 1), []);
    const release = useCallback(() => setHeld(count => Math.max(0, count - 1)), []);

    // The status region is always in the page, even when empty: a live region added at the same
    // time as its text is not reliably announced.
    return <div
        className={`core-toast${message ? ' core-toast--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        onMouseEnter={message ? hold : undefined}
        onMouseLeave={message ? release : undefined}
        onFocus={message ? hold : undefined}
        onBlur={message ? release : undefined}
    >
        {message && <>
            <span className="core-toast__text">{message.text}</span>
            {message.action && <button
                type="button"
                className="core-toast__action"
                onClick={message.action.onClick}
            >{message.action.label}</button>}
            <button
                type="button"
                className="core-toast__close"
                aria-label={closeLabel}
                title={closeLabel}
                onClick={() => onCloseRef.current()}
            >
                <span aria-hidden="true">&times;</span>
            </button>
        </>}
    </div>;
};

export default Toast;
