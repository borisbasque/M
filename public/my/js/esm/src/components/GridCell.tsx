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

interface GridCellProps {
    column: number;
    row: number;
    // How far the empty region spans: neighbouring empty cells are offered as one region.
    columns?: number;
    rows?: number;
    // The region's accessible name, with {$a->row} and {$a->column} for where it starts.
    label: string;
    // Shown on hover or focus.
    addLabel: string;
    // Placing a picked-up block, not adding one: no plus sign.
    placing?: boolean;
    prospective?: boolean;
    onActivate?: (column: number, row: number, columns: number, rows: number) => void;
}

/**
 * An empty region of the grid: a faint outline at rest that offers "Add a block here" on hover or
 * keyboard focus, one Tab stop for the whole region. While a block is picked up by a click or by
 * assistive technology, the same regions are named as places to put it, and the dashboard's click
 * handler places it there. During a move or resize, it can instead mark the cells the block will
 * take (prospective).
 */
const GridCell = ({
    column,
    row,
    columns = 1,
    rows = 1,
    label,
    addLabel,
    placing = false,
    prospective = false,
    onActivate,
}: GridCellProps) => {
    const style = {
        gridColumn: `${column + 1} / span ${columns}`,
        gridRow: `${row + 1} / span ${rows}`,
    };
    if (prospective) {
        return <div className="core-my-grid-cell core-my-grid-cell--prospective" style={style} aria-hidden="true" />;
    }
    return <button
        type="button"
        className="core-my-grid-cell core-my-grid-cell--available"
        style={style}
        data-grid-column={column}
        data-grid-row={row}
        aria-label={label.replace('{$a->row}', String(row + 1)).replace('{$a->column}', String(column + 1))}
        onClick={() => onActivate?.(column, row, columns, rows)}
    >
        <span className="core-my-grid-cell__label" aria-hidden="true">
            {!placing && <i className="fa fa-plus core-my-grid-cell__icon" aria-hidden="true" />}
            {addLabel}
        </span>
    </button>;
};

export default GridCell;
