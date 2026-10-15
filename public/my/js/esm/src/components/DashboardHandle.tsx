// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Accessible move and resize handle for dashboard tiles.
 *
 * @module     core_my/components/DashboardHandle
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {Button} from '@moodlehq/design-system';

interface DashboardHandleProps {
    mode: 'move' | 'resize';
    label: string;
    instructionsId: string;
    active: boolean;
    // The block is picked up by a click, so the next click (handled by the dashboard) places it.
    tapping?: boolean;
    // Activated by assistive technology without a key press, such as a screen reader's double-tap.
    onStart: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onPointerDown: (event: React.PointerEvent) => void;
    onCommit: () => void;
}

const DashboardHandle = ({
    mode,
    label,
    instructionsId,
    active,
    tapping = false,
    onStart,
    onKeyDown,
    onPointerDown,
    onCommit,
}: DashboardHandleProps) => <div
    className={`core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${mode}${active ? ' active' : ''}`}
    onBlur={event => {
        // Tabbing away from a block picked up by keyboard drops it there. Moving to the toast's
        // Cancel does not: Cancel decides. Nor does anything while picked up by a click.
        const nextTarget = event.relatedTarget;
        if (!active || tapping || (nextTarget instanceof Element && nextTarget.closest('.core-toast'))) {
            return;
        }
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            onCommit();
        }
    }}
>
    <Button
        size="md"
        variant="ghost"
        className={`core-my-dashboard-handle core-my-dashboard-handle--${mode}`}
        aria-label={label}
        aria-describedby={instructionsId}
        aria-pressed={active}
        title={label}
        startIcon={mode === 'move'
            ? <i className="fa fa-grip-vertical" aria-hidden="true" />
            // The corner grip from the flexible dashboard prototype: two diagonal strokes in the
            // bottom corner, so it reads as "drag this corner" rather than "expand".
            : <svg
                className="core-my-dashboard-handle__corner"
                viewBox="0 0 12 12"
                width="12"
                height="12"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M11 4 4 11M11 8 8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>}
        onClick={event => {
            // Pointer activation starts on pointerdown so dragging works immediately, and Space or
            // Enter on keydown. A zero-detail click is neither: assistive technology activated the
            // handle, such as a screen reader's double-tap on a touch screen, where there may be no
            // keyboard. It picks the block up as a click does.
            if (event.detail === 0 && !active) {
                onStart();
            }
        }}
        onKeyDown={onKeyDown}
        onPointerDown={event => {
            if (tapping) {
                event.preventDefault();
                return;
            }
            if (active) {
                event.preventDefault();
                onCommit();
                return;
            }
            event.currentTarget.focus();
            onPointerDown(event);
        }}
    />
</div>;

export default DashboardHandle;
