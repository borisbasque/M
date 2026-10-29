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
    clampToGrid,
    DEFAULT_LIMITS,
    columnsForWidth,
    disturbedCount,
    fitShift,
    fitToFreeSpace,
    maxRow,
    packByColumn,
    packInOrder,
    packLayout,
    packWithPinned,
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

    it('moves a row-neighbour into the space a block moved towards it vacated, before pushing it down', () => {
        // A three-wide block moved one column right over a one-wide neighbour at the grid's edge:
        // there is no room to its right, but the column the mover came from is now free.
        const layout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 3, rows: 3},
            {id: 2, column: 3, row: 0, columns: 1, rows: 3},
        ];

        const packed = packWithPinned(layout, 4, {...layout[0], column: 1});

        expect(packed.find(item => item.id === 2)).toMatchObject({column: 0, row: 0});
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
        // packWithPinned enforces MIN_ROWS on the pinned block, so it occupies rows 0-1 even
        // though it was only given rows: 1 - the other item is displaced to row 2, not row 1.
        const layout: LayoutItem[] = [
            {id: 1, column: 0, row: 0, columns: 1, rows: 1},
            {id: 2, column: 0, row: 0, columns: 1, rows: 1},
        ];

        const packed = packWithPinned(layout, 1, layout[0]);

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

    describe('edits made at a narrowed column count', () => {
        // The default dashboard shape: a content stack three columns wide with a one-column
        // side stack beside it, both inside an empty margin column on each side.
        const dashboard: LayoutItem[] = [
            {id: 1, column: 1, row: 0, columns: 3, rows: 5},
            {id: 2, column: 4, row: 0, columns: 1, rows: 5},
            {id: 3, column: 1, row: 5, columns: 3, rows: 3},
            {id: 4, column: 4, row: 5, columns: 1, rows: 3},
        ];
        const byId = (items: LayoutItem[], id: number) => items.find(item => item.id === id);

        it('tells a margin clip apart from a reflow', () => {
            expect(fitShift(dashboard, 6)).toBe(0);
            expect(fitShift(dashboard, 4)).toBe(1);
            expect(fitShift(dashboard, 2)).toBeNull();
            expect(fitShift(dashboard, 1)).toBeNull();
            expect(fitShift([], 1)).toBe(0);
        });

        it('does not persist the one-column stack as the wide layout after a move', () => {
            const narrow = packLayout(dashboard, 1);
            // Nudge the first block down one row, as the keyboard move control does.
            const draft = {...byId(narrow, 1)!, row: 1};
            const derived = packWithPinned(narrow, 1, draft);

            const restored = writeBack(dashboard, derived, 1, DEFAULT_LIMITS, 1);

            // Nothing about the relative order of the stacks changed, so the wide layout is
            // exactly what it was: nobody is squeezed into column one and nothing is one wide.
            expect(byId(restored, 1)).toMatchObject({column: 1, row: 0, columns: 3, rows: 5});
            expect(byId(restored, 2)).toMatchObject({column: 4, row: 0, columns: 1, rows: 5});
            expect(byId(restored, 3)).toMatchObject({column: 1, row: 5, columns: 3, rows: 3});
            expect(byId(restored, 4)).toMatchObject({column: 4, row: 5, columns: 1, rows: 3});
        });

        it('carries a one-column reorder back into the matching stack at full width', () => {
            const narrow = packLayout(dashboard, 1);
            // Move the third block (the second in the content stack) to the very top.
            const draft = {...byId(narrow, 3)!, row: 0};
            const derived = packWithPinned(narrow, 1, draft);

            const restored = writeBack(dashboard, derived, 3, DEFAULT_LIMITS, 1);

            expect(byId(restored, 3)).toMatchObject({column: 1, row: 0, columns: 3, rows: 3});
            expect(byId(restored, 1)).toMatchObject({column: 1, row: 3, columns: 3, rows: 5});
            // The side stack starts level with the second content block, not at the top, so
            // that the order the user built in one column reads the same when shown in one
            // column again: third, first, second, fourth.
            expect(byId(restored, 2)).toMatchObject({column: 4, row: 3, columns: 1, rows: 5});
            expect(byId(restored, 4)).toMatchObject({column: 4, row: 8, columns: 1, rows: 3});
            expect(packLayout(restored, 1).map(item => item.id)).toEqual([3, 1, 2, 4]);
        });

        it('keeps a width the user actually changed in a two-column view', () => {
            const narrow = packLayout(dashboard, 2);
            const side = byId(narrow, 2)!;
            const draft = {...side, columns: 2};
            const derived = packWithPinned(narrow, 2, draft);

            const restored = writeBack(dashboard, derived, 2, DEFAULT_LIMITS, 2);

            expect(byId(restored, 2)?.columns).toBe(2);
            expect(byId(restored, 1)?.columns).toBe(3);
        });

        it('keeps the canonical width of a block only moved in a two-column view', () => {
            const narrow = packLayout(dashboard, 2);
            const draft = {...byId(narrow, 1)!, row: 20};
            const derived = packWithPinned(narrow, 2, draft);

            const restored = writeBack(dashboard, derived, 1, DEFAULT_LIMITS, 2);

            expect(byId(restored, 1)).toMatchObject({column: 1, columns: 3, rows: 5});
        });

        it('undoes the margin shift of a four-column view so the wide layout stays centred', () => {
            const fourColumns = packLayout(dashboard, 4);
            expect(byId(fourColumns, 1)?.column).toBe(0);
            // Move the side block in the first row down below the other side block.
            const draft = {...byId(fourColumns, 2)!, row: 8};
            const derived = packWithPinned(fourColumns, 4, draft);

            const restored = writeBack(dashboard, derived, 2, DEFAULT_LIMITS, 4);

            expect(byId(restored, 1)).toMatchObject({column: 1, row: 0, columns: 3});
            expect(byId(restored, 2)).toMatchObject({column: 4, row: 8, columns: 1});
            expect(byId(restored, 4)).toMatchObject({column: 4, row: 5, columns: 1});
            const byIdOrder = (left: LayoutItem, right: LayoutItem) => left.id - right.id;
            expect([...packLayout(restored, 4)].sort(byIdOrder).map(item => item.column))
                .toEqual([...derived].sort(byIdOrder).map(item => item.column));
        });

        it('keeps the column a block was dragged to in a reflowed view', () => {
            // Six columns in use at full width, so a four-column view is a reflow; moving the
            // narrow block from the left to the right side there must not save it back on the left.
            const wide: LayoutItem[] = [
                {id: 1, column: 0, row: 0, columns: 3, rows: 2},
                {id: 2, column: 3, row: 0, columns: 3, rows: 2},
                {id: 3, column: 0, row: 2, columns: 2, rows: 2},
            ];
            expect(fitShift(wide, 4)).toBeNull();
            const display = packLayout(wide, 4);
            const moved = packWithPinned(display, 4, {...display.find(item => item.id === 3)!, column: 2, row: 2});

            const saved = writeBack(wide, moved, 3, DEFAULT_LIMITS, 4);

            expect(saved.find(item => item.id === 3)).toMatchObject({column: 2, columns: 2});
            expect(packLayout(saved, 4).find(item => item.id === 3)).toMatchObject({column: 2});
        });

        it('packs by column from the top, keeping the order given as the reading order', () => {
            const packed = packByColumn([
                {id: 3, column: 1, row: 9, columns: 3, rows: 3},
                {id: 1, column: 1, row: 9, columns: 3, rows: 5},
                {id: 2, column: 4, row: 9, columns: 1, rows: 5},
                {id: 5, column: 5, row: 0, columns: 4, rows: 1},
            ], 6);

            expect(byId(packed, 3)).toMatchObject({column: 1, row: 0});
            expect(byId(packed, 1)).toMatchObject({column: 1, row: 3});
            // Level with the block before it, since it sits further right.
            expect(byId(packed, 2)).toMatchObject({column: 4, row: 3});
            // Pulled in so its span fits, then dropped below what it now overlaps.
            expect(byId(packed, 5)).toMatchObject({column: 2, row: 8, columns: 4});
        });
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

describe('fitToFreeSpace', () => {
    // Two blocks side by side on the top rows, leaving a one-column hole between them.
    const layout: LayoutItem[] = [
        {id: 1, column: 0, row: 0, columns: 2, rows: 2},
        {id: 2, column: 3, row: 0, columns: 2, rows: 2},
    ];

    it('shrinks a block added into an empty cell to the room that is there', () => {
        expect(fitToFreeSpace(layout, 6, {column: 2, row: 0, columns: 2, rows: 3}))
            .toEqual({column: 2, row: 0, columns: 1, rows: 3});
    });

    it('keeps the full size when the space is free', () => {
        expect(fitToFreeSpace(layout, 6, {column: 0, row: 2, columns: 2, rows: 3}))
            .toEqual({column: 0, row: 2, columns: 2, rows: 3});
    });

    it('shrinks the height when only the width fits', () => {
        const tall: LayoutItem[] = [...layout, {id: 3, column: 0, row: 4, columns: 6, rows: 1}];
        expect(fitToFreeSpace(tall, 6, {column: 0, row: 2, columns: 2, rows: 3}))
            .toEqual({column: 0, row: 2, columns: 2, rows: 2});
    });

    it('returns null when not even the minimum tile fits', () => {
        const packedTight: LayoutItem[] = [...layout, {id: 3, column: 2, row: 1, columns: 1, rows: 1}];
        expect(fitToFreeSpace(packedTight, 6, {column: 2, row: 0, columns: 2, rows: 3})).toBeNull();
    });
});

describe('clampToGrid', () => {
    const limits = {mincolumns: 1, minrows: 2, maxcolumns: 6, maxrows: 10};

    it('leaves a rectangle that already fits untouched', () => {
        expect(clampToGrid({column: 1, row: 1, columns: 2, rows: 3}, 6, limits))
            .toEqual({column: 1, row: 1, columns: 2, rows: 3});
    });

    it('pulls a rectangle back inside the grid rather than shrinking it', () => {
        expect(clampToGrid({column: 5, row: 9, columns: 2, rows: 3}, 6, limits))
            .toEqual({column: 4, row: 7, columns: 2, rows: 3});
    });

    it('caps spans at the column count and the row ceiling, and floors them at the minimum', () => {
        expect(clampToGrid({column: 0, row: 0, columns: 9, rows: 999}, 4, limits))
            .toEqual({column: 0, row: 0, columns: 4, rows: 10});
        expect(clampToGrid({column: 0, row: 0, columns: 0, rows: 0}, 4, limits))
            .toEqual({column: 0, row: 0, columns: 1, rows: 2});
    });

    it('never produces a negative origin', () => {
        expect(clampToGrid({column: -3, row: -3, columns: 1, rows: 2}, 4, limits))
            .toEqual({column: 0, row: 0, columns: 1, rows: 2});
    });

    it('is applied by packWithPinned, so a pinned item can never be placed past the row ceiling', () => {
        const packed = packWithPinned([], 6, {id: 1, column: 0, row: 500, columns: 2, rows: 4}, limits);
        expect(packed[0]).toMatchObject({row: 6, rows: 4});
    });
});
