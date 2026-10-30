// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * One component for all of the grid's empty space, after the board placeholder states of
 * Cloudscape (default, active and hover):
 *
 * - rest: a merged run of empty cells in edit mode, a button that adds a block there. Its cue
 *   shows on hover and keyboard focus only, so the grid does not fill with plus signs.
 * - active: one grid unit while a block is being moved or resized, so every snap point shows.
 *   After a click or tap on a handle, choosing one places the block there; keyboard users have the
 *   arrow keys instead, so it is hidden from assistive technology.
 * - prospective: where the block will land, hatched as well as tinted so it never relies on
 *   colour alone.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {useString} from '../strings';
import Icon from './Icon';

export type GridCellState = 'rest' | 'active' | 'prospective';

interface GridCellProps {
    column: number;
    row: number;
    columns?: number;
    rows?: number;
    state?: GridCellState;
    label?: string;
    addLabel?: string;
    addIcon?: string;
    onActivate?: (column: number, row: number) => void;
    onPlace?: (column: number, row: number) => void;
    onPreview?: (column: number, row: number) => void;
}

const GridCell = ({
    column,
    row,
    columns = 1,
    rows = 1,
    state = 'rest',
    label = '',
    addLabel = '',
    addIcon = '',
    onActivate,
    onPlace,
    onPreview,
}: GridCellProps) => {
    // The position is formatted by Moodle's own string handling (row and column are one-based for
    // people), fetched here rather than substituted into a template by hand.
    const position = useString('gridcellposition', 'my', {row: row + 1, column: column + 1});
    const style = {
        gridColumn: `${column + 1} / span ${columns}`,
        gridRow: `${row + 1} / span ${rows}`,
    };
    if (state === 'prospective') {
        return <div className="core-my-grid-cell core-my-grid-cell--prospective" style={style} aria-hidden="true" />;
    }
    if (state === 'active') {
        const placing = Boolean(onPlace);
        return <div
            className={`core-my-grid-cell core-my-grid-cell--active${placing ? ' core-my-grid-cell--placing' : ''}`}
            style={style}
            aria-hidden="true"
            // Keep focus on the handle that picked the block up: it commits on blur, and the click
            // below is what should place the block.
            onMouseDown={placing ? event => event.preventDefault() : undefined}
            onPointerEnter={placing ? () => onPreview?.(column, row) : undefined}
            onClick={placing ? () => onPlace?.(column, row) : undefined}
        />;
    }
    return <button
        type="button"
        className="core-my-grid-cell core-my-grid-cell--available"
        style={style}
        aria-label={position ? `${label}, ${position}` : label}
        onClick={() => onActivate?.(column, row)}
    >
        <span className="core-my-grid-cell__label" aria-hidden="true">
            <Icon markup={addIcon} className="core-my-grid-cell__icon" />
            {addLabel}
        </span>
    </button>;
};

export default GridCell;
