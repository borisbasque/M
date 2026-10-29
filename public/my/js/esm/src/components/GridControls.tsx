// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Replaceable directional controls built with the Moodle Design System Button.
 *
 * @module     core_my/components/GridControls
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {Button, Tooltip} from '@moodlehq/design-system';
import type {DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import {renderIcon} from './Icon';

interface GridControlsProps {
    mode: 'move' | 'resize';
    labels: DashboardLabels;
    icons: DashboardIcons;
    onDirection: (horizontal: number, vertical: number) => void;
}

const directions = [
    {name: 'up', horizontal: 0, vertical: -1},
    {name: 'left', horizontal: -1, vertical: 0},
    {name: 'right', horizontal: 1, vertical: 0},
    {name: 'down', horizontal: 0, vertical: 1},
] as const;

const GridControls = ({mode, labels, icons, onDirection}: GridControlsProps) => <div
    className="core-my-grid-controls"
    role="group"
    aria-label={mode === 'move' ? labels.movecontrols : labels.resizecontrols}
>
    {directions.map(direction => {
        const label = labels[direction.name];
        return <Tooltip key={direction.name} label={label}>
            <Button
                size="sm"
                variant="secondary"
                className={`core-my-grid-controls__direction core-my-grid-controls__direction--${direction.name}`}
                aria-label={label}
                tabIndex={-1}
                startIcon={renderIcon(icons[direction.name])}
                onPointerDown={event => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                onClick={() => onDirection(direction.horizontal, direction.vertical)}
            />
        </Tooltip>;
    })}
</div>;

export default GridControls;
