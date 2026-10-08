// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Tests for the responsive dashboard layout engine.
 *
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {
    applyRowSpans,
    columnsForWidth,
    disturbedCount,
    fitMinimum,
    maxRow,
    packInOrder,
    packLayout,
    packWithPinned,
    readGridMetrics,
    rowsForHeight,
    writeBack,
    type LayoutItem,
} from '../src/layout';

const canonical: LayoutItem[] = [
    {id: 1, column: 0, row: 0, columns: 4, rows: 2},
    {id: 2, column: 4, row: 0, columns: 2, rows: 2},
    {id: 3, column: 0, row: 2, columns: 2, rows: 2},
];

describe('core_my responsive dashboard layout', () => {
    it.each([
        [500, 1],
        [690, 2],
        [919, 2],
        [920, 4],
        [1920, 4],
        [1921, 6],
    ])('uses %dpx as a %d-column container', (width, columns) => {
        expect(columnsForWidth(width)).toBe(columns);
    });

    it('preserves row-major order and clamps spans at narrower widths', () => {
        const packed = packLayout(canonical, 2);

        expect(packed.map(item => item.id)).toEqual([1, 2, 3]);
        expect(packed.map(item => item.columns)).toEqual([2, 2, 2]);
        expect(packed.map(item => item.row)).toEqual([0, 2, 4]);
    });

    it('leaves an untouched layout in place at a wider column count', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 1, row: 0, columns: 3, rows: 3},
            {id: 2, column: 4, row: 0, columns: 1, rows: 3},
        ];

        expect(packLayout(layout, 6)).toEqual([
            {...layout[0], sourceColumns: 3},
            {...layout[1], sourceColumns: 1},
        ]);
    });

    it('shifts a layout left rather than reflowing when only empty margins are clipped', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 1, row: 0, columns: 3, rows: 3},
            {id: 2, column: 4, row: 0, columns: 1, rows: 3},
        ];

        const packed = packLayout(layout, 4);

        expect(packed.find(item => item.id === 1)).toMatchObject({column: 0, row: 0, columns: 3});
        expect(packed.find(item => item.id === 2)).toMatchObject({column: 3, row: 0, columns: 1});
    });

    it('reflows instead of shifting once real content spans more columns than fit', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 1, row: 0, columns: 4, rows: 2},
            {id: 2, column: 5, row: 0, columns: 1, rows: 2},
        ];

        const packed = packLayout(layout, 4);

        expect(packed.map(item => item.columns)).toEqual([4, 1]);
        expect(packed.find(item => item.id === 2)?.row).toBeGreaterThan(0);
    });

    it('keeps the active block pinned while reflowing disturbed blocks', () => {
        const packed = packWithPinned(canonical, 6, {...canonical[2], column: 0, row: 0});

        expect(packed.find(item => item.id === 3)).toMatchObject({column: 0, row: 0});
        expect(disturbedCount(canonical, packed, 3)).toBeGreaterThan(0);
    });

    it('does not move blocks which do not collide with the pinned block', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 3, rows: 2},
            {id: 2, column: 3, row: 2, columns: 3, rows: 2},
        ];

        const packed = packWithPinned(layout, 6, {...layout[0], column: 3, row: 0});

        expect(packed.find(item => item.id === 2)).toMatchObject({column: 3, row: 2});
    });

    it('restores canonical spans after a temporary responsive clamp', () => {
        const narrow = packLayout(canonical, 2);
        const restored = writeBack(canonical, narrow);

        expect(restored.find(item => item.id === 1)?.columns).toBe(4);
        expect(restored.find(item => item.id === 2)?.columns).toBe(2);
    });

    it('preserves a moved tile in an otherwise free adjacent column', () => {
        const fourColumnLayout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 4, rows: 2, sourceColumns: 4},
            {id: 2, column: 0, row: 2, columns: 3, rows: 2, sourceColumns: 3},
        ];
        const moved = {...fourColumnLayout[1], column: 1};
        const restored = writeBack(fourColumnLayout, [fourColumnLayout[0], moved], moved.id);

        expect(restored.find(item => item.id === moved.id)).toMatchObject({column: 1, row: 2, columns: 3});
        expect(packLayout(restored, 4).find(item => item.id === moved.id))
            .toMatchObject({column: 1, row: 2, columns: 3});
    });

    it('clamps an oversized pinned block without producing a negative column', () => {
        const packed = packWithPinned(canonical, 1, {...canonical[0], column: 5});

        expect(packed.find(item => item.id === 1)).toMatchObject({column: 0, columns: 1});
    });

    it('pushes a row-neighbour sideways into free grid space instead of the row start', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 1, row: 0, columns: 2, rows: 2},
            {id: 2, column: 3, row: 0, columns: 1, rows: 2},
        ];

        const packed = packWithPinned(layout, 6, {...layout[0], columns: 3});

        expect(packed.find(item => item.id === 2)).toMatchObject({column: 4, row: 0});
    });

    it('pushes a column-neighbour downwards into free grid space instead of the grid start', () => {
        const layout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 2, rows: 2},
            {id: 2, column: 0, row: 2, columns: 2, rows: 2},
        ];

        const packed = packWithPinned(layout, 6, {...layout[0], rows: 4});

        expect(packed.find(item => item.id === 2)).toMatchObject({column: 0, row: 4});
    });

    it('falls back to the first free cell when a collision is diagonal (neither same row nor column)', () => {
        // The pinned block occupies columns 1-2, rows 1-2; the other item's original rectangle
        // (columns 2-3, rows 0-1) overlaps it without sharing either its row or its column, so
        // neither pushRight nor pushDown apply and firstFreeCell must resolve it instead.
        const layout: LayoutItem[] = [
            {id: 1, column: 1, row: 1, columns: 2, rows: 2},
            {id: 2, column: 2, row: 0, columns: 2, rows: 2},
        ];

        const packed = packWithPinned(layout, 6, layout[0]);

        const other = packed.find(item => item.id === 2)!;
        expect(packed.find(item => item.id === 1)).toMatchObject({column: 1, row: 1});
        // Landed somewhere that does not overlap the pinned block, not necessarily row 0.
        const overlapsPinned = other.column < 3 && other.column + other.columns > 1 &&
            other.row < 3 && other.row + other.rows > 1;
        expect(overlapsPinned).toBe(false);
    });

    it('falls back to pushDown when pushRight has no room in a single-column grid', () => {
        // With only one column available, pushRight (which only ever moves within the same row)
        // can never find room, so the row-neighbour case must fall back to pushDown instead.
        // packWithPinned enforces the given minimum on the pinned block, so it occupies rows 0-1
        // even though it was only given rows: 1 - the other item is displaced to row 2, not row 1.
        const layout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 1, rows: 1},
            {id: 2, column: 0, row: 0, columns: 1, rows: 1},
        ];

        const packed = packWithPinned(layout, 1, layout[0], {columns: 1, rows: 2});

        expect(packed.find(item => item.id === 2)).toMatchObject({column: 0, row: 2});
    });

    it('places every item in reading order, ignoring its original column/row', () => {
        const items: LayoutItem[] = [
            {id: 1, column: 5, row: 5, columns: 2, rows: 2},
            {id: 2, column: 0, row: 0, columns: 3, rows: 1},
        ];

        const packed = packInOrder(items, 4);

        // Processed in array order (not sorted): item 1 takes columns 0-1 across two rows first,
        // leaving no room for item 2's 3-column span until the row after that.
        expect(packed.find(item => item.id === 1)).toMatchObject({column: 0, row: 0});
        expect(packed.find(item => item.id === 2)).toMatchObject({column: 0, row: 2});
    });

    it('re-packs in reading order when writeBack is given no pinned block (e.g. after a remove)', () => {
        const narrow = packLayout(canonical, 2);
        const remaining = narrow.filter(item => item.id !== 2);

        const restored = writeBack(canonical, remaining);

        expect(restored.map(item => item.id).sort()).toEqual([1, 3]);
        expect(restored.find(item => item.id === 1)?.columns).toBe(4);
        // No pinned id: falls to packInOrder, which never overlaps blocks.
        const [first, second] = [...restored].sort((left, right) => left.row - right.row);
        const overlap = first.column < second.column + second.columns &&
            first.column + first.columns > second.column &&
            first.row < second.row + second.rows && first.row + first.rows > second.row;
        expect(overlap).toBe(false);
    });

    it('returns zero for an empty layout', () => {
        expect(maxRow([])).toBe(0);
    });

    it('returns the furthest occupied row plus its height', () => {
        expect(maxRow(canonical)).toBe(4);
    });

    it('returns an empty layout unchanged rather than erroring', () => {
        expect(packLayout([], 4)).toEqual([]);
    });
});

describe('readGridMetrics', () => {
    it('reads the row unit and gap from the grid element\'s computed style', () => {
        const grid = document.createElement('div');
        grid.style.gridAutoRows = '120px';
        grid.style.rowGap = '10px';
        document.body.appendChild(grid);

        expect(readGridMetrics(grid)).toEqual({rowHeight: 120, gap: 10});

        grid.remove();
    });

    it('falls back to the default metrics when there is no grid or no computed value', () => {
        expect(readGridMetrics(null)).toEqual({rowHeight: 96, gap: 16});
        expect(readGridMetrics(document.createElement('div'))).toEqual({rowHeight: 96, gap: 16});
    });
});

describe('fitMinimum', () => {
    it('keeps a minimum that fits the current column count', () => {
        expect(fitMinimum({columns: 2, rows: 4}, 4)).toEqual({columns: 2, rows: 4});
    });

    it('caps a minimum wider than the grid at the full width, keeping its height', () => {
        expect(fitMinimum({columns: 3, rows: 4}, 2)).toEqual({columns: 2, rows: 4});
        expect(fitMinimum({columns: 3, rows: 4}, 1)).toEqual({columns: 1, rows: 4});
    });
});

describe('rowsForHeight', () => {
    const metrics = {rowHeight: 96, gap: 16};

    it('rounds a natural height up to whole rows, counting the gaps between them', () => {
        // Three rows are 3 x 96 + 2 x 16 = 320px tall.
        expect(rowsForHeight(320, metrics, 1)).toBe(3);
        expect(rowsForHeight(321, metrics, 1)).toBe(4);
        expect(rowsForHeight(96, metrics, 1)).toBe(1);
    });

    it('never goes below the block\'s minimum or above the cap', () => {
        expect(rowsForHeight(0, metrics, 2)).toBe(2);
        expect(rowsForHeight(5000, metrics, 2)).toBe(8);
        expect(rowsForHeight(5000, metrics, 2, 6)).toBe(6);
    });

    it('lets a declared minimum above the cap win', () => {
        expect(rowsForHeight(100, metrics, 10)).toBe(10);
    });
});

describe('applyRowSpans', () => {
    const layout: LayoutItem[] = [
        {id: 1, column: 0, row: 0, columns: 3, rows: 3},
        {id: 2, column: 0, row: 3, columns: 3, rows: 3},
        {id: 3, column: 3, row: 0, columns: 1, rows: 3},
    ];

    it('returns the same layout when no span changes', () => {
        expect(applyRowSpans(layout, new Map([[1, 3]]))).toBe(layout);
    });

    it('pushes only the blocks a taller block now overlaps, and only down', () => {
        const next = applyRowSpans(layout, new Map([[1, 5]]));

        expect(next.find(item => item.id === 1)).toMatchObject({row: 0, rows: 5});
        expect(next.find(item => item.id === 2)).toMatchObject({column: 0, row: 5});
        // Not in the way: stays put.
        expect(next.find(item => item.id === 3)).toMatchObject({column: 3, row: 0});
    });

    it('leaves the space a shorter block gives up empty, rather than pulling others up', () => {
        const next = applyRowSpans(layout, new Map([[1, 2]]));

        expect(next.find(item => item.id === 1)).toMatchObject({row: 0, rows: 2});
        expect(next.find(item => item.id === 2)).toMatchObject({row: 3});
    });
});

describe('writeBack and content-fit sizing', () => {
    it('keeps each block\'s autorows flag, defaulting to following its content', () => {
        const canonical: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 2, rows: 2, autorows: false},
            {id: 2, column: 2, row: 0, columns: 2, rows: 2},
        ];

        const next = writeBack(canonical, canonical);

        expect(next.find(item => item.id === 1)?.autorows).toBe(false);
        expect(next.find(item => item.id === 2)?.autorows).toBe(true);
    });
});
