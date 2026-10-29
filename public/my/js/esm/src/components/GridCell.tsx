// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {useString} from '../strings';
import Icon from './Icon';

interface GridCellProps {
    column: number;
    row: number;
    label: string;
    addLabel: string;
    addIcon: string;
    prospective?: boolean;
    onActivate?: (column: number, row: number) => void;
}

const GridCell = ({column, row, label, addLabel, addIcon, prospective = false, onActivate}: GridCellProps) => {
    // The position is formatted by Moodle's own string handling (row and column are one-based for
    // people), fetched here rather than substituted into a template by hand.
    const position = useString('gridcellposition', 'my', {row: row + 1, column: column + 1});
    const style = {
        gridColumn: `${column + 1}`,
        gridRow: `${row + 1}`,
    };
    if (prospective) {
        return <div className="core-my-grid-cell core-my-grid-cell--prospective" style={style} aria-hidden="true" />;
    }
    return <button
        type="button"
        className="core-my-grid-cell core-my-grid-cell--available"
        style={style}
        aria-label={position ? `${label}, ${position}` : label}
        onClick={() => onActivate?.(column, row)}
    >
        <Icon markup={addIcon} className="core-my-grid-cell__icon" />
        <span className="core-my-grid-cell__label" aria-hidden="true">{addLabel}</span>
    </button>;
};

export default GridCell;
