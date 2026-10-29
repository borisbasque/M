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
import {Button, Tooltip} from '@moodlehq/design-system';
import type {DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import GridControls from './GridControls';
import {renderIcon} from './Icon';

interface DashboardHandleProps {
    mode: 'move' | 'resize';
    label: string;
    labels: DashboardLabels;
    icons: DashboardIcons;
    instructionsId: string;
    active: boolean;
    showControls: boolean;
    onStart: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onPointerDown: (event: React.PointerEvent) => void;
    onDirection: (horizontal: number, vertical: number) => void;
    onCommit: () => void;
}

const DashboardHandle = ({
    mode,
    label,
    labels,
    icons,
    instructionsId,
    active,
    showControls,
    onStart,
    onKeyDown,
    onPointerDown,
    onDirection,
    onCommit,
}: DashboardHandleProps) => <div
    className={`core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${mode}${active ? ' active' : ''}`}
    onBlur={event => {
        const nextTarget = event.relatedTarget;
        if (active && (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget))) {
            onCommit();
        }
    }}
>
    {active && showControls && <GridControls mode={mode} labels={labels} icons={icons} onDirection={onDirection} />}
    {/* The tooltip gives the icon-only handle a visible label on hover and on keyboard focus, which
        a native title attribute would not do for keyboard users. */}
    <Tooltip label={label}>
        <Button
            size="lg"
            variant="ghost"
            className={`core-my-dashboard-handle core-my-dashboard-handle--${mode}`}
            aria-label={label}
            aria-describedby={instructionsId}
            aria-pressed={active}
            startIcon={renderIcon(mode === 'move' ? icons.move : icons.resize)}
            onClick={event => {
                // Pointer activation starts on pointerdown so dragging works immediately.
                // A zero-detail click covers assistive-technology activation.
                if (event.detail === 0 && !active) {
                    onStart();
                }
            }}
            onKeyDown={onKeyDown}
            onPointerDown={event => {
                if (active) {
                    event.preventDefault();
                    onCommit();
                    return;
                }
                event.currentTarget.focus();
                onPointerDown(event);
            }}
        />
    </Tooltip>
</div>;

export default DashboardHandle;
