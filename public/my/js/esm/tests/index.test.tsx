// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Tests for the top-level flexible dashboard React application.
 *
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import type React from 'react';
import * as Ajax from '@moodle/lms/core/ajax';
import * as StringUtils from '@moodle/lms/core/stringUtils';
import * as Location from '@moodle/lms/core/location';
import {requireManyAsync} from '@moodle/lms/core/amd';
import Dashboard from '../src/index';
import type {DashboardData, DashboardLabels} from '../src/repository';
import type {LayoutItem} from '../src/layout';

jest.mock('@moodlehq/design-system', () => {
    const ReactActual = require('react');
    return {
        ...require('./mdsDropdownMock'),
        Button: ReactActual.forwardRef((
            {label, startIcon, size: _size, variant: _variant, className, ...props}:
            React.ButtonHTMLAttributes<HTMLButtonElement> & {
                label?: string;
                startIcon?: React.ReactElement;
                size?: string;
                variant?: string;
            },
            ref: React.Ref<HTMLButtonElement>,
        ) => <button
            ref={ref}
            type="button"
            className={className ?? ''}
            {...props}
        >{startIcon}{label}</button>),
        Badge: ({label, variant: _variant, subtle: _subtle, pill: _pill, ...props}:
        React.HTMLAttributes<HTMLSpanElement> & {label?: string; variant?: string; subtle?: boolean; pill?: boolean}) =>
            <span {...props}>{label}</span>,
        Link: ({label, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {label?: string}) =>
            <a {...props}>{label}</a>,
        CloseButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
        Choicebox: ({label, supportingText: _supportingText, icon: _icon, ...props}:
        React.InputHTMLAttributes<HTMLInputElement> & {label: string; supportingText?: string; icon?: React.ReactElement}) =>
            <label><input type="radio" {...props} />{label}</label>,
    };
}, {virtual: true});

// Jsdom has no ResizeObserver; the dashboard's own column-count measurement effect uses one
// directly (unlike DashboardTile's, this one has no feature-detection guard). Width comes from
// the getBoundingClientRect stub below instead of a real observed measurement.
class StubResizeObserver {
    observe(): void {
        // No-op: width comes from the getBoundingClientRect stub below.
    }
    unobserve(): void {
        // No-op.
    }
    disconnect(): void {
        // No-op.
    }
}
(global as unknown as {ResizeObserver: typeof ResizeObserver}).ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;

// Jsdom does not implement <dialog>'s imperative API, used by BlockPalette/ConfirmationDialog.
HTMLDialogElement.prototype.showModal = jest.fn(function markOpen(this: HTMLDialogElement) {
    // eslint-disable-next-line no-invalid-this
    this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = jest.fn(function markClosed(this: HTMLDialogElement) {
    // eslint-disable-next-line no-invalid-this
    this.removeAttribute('open');
});

// Jsdom's layout is a no-op, so every element measures as a zero-size box by default. Pin a wide
// width so columnsForWidth resolves to the full six columns the fixtures below are written for.
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 2000,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 2000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    }));
});
afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

const labels: DashboardLabels = {
    addblock: 'Add a block',
    addblocktop: 'Add a block at the start of the dashboard',
    addblockbottom: 'Add a block at the end of the dashboard',
    blockactions: 'More actions for {$a}',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    confirmremove: 'Remove this block?',
    confirmreset: 'Reset this dashboard?',
    done: 'Done',
    emptycell: 'Empty cell',
    loading: 'Loading',
    gridcell: 'Row {$a->row}, column {$a->column}',
    move: 'Move {$a} block',
    movehere: 'Move here',
    moveinstructions: 'Use the arrow keys to move',
    remove: 'Delete {$a} block',
    removeheading: 'Remove block',
    reset: 'Reset page to default',
    resetheading: 'Reset dashboard',
    resize: 'Resize {$a}',
    resizehere: 'Resize to here',
    placemove: 'Move {$a->block} here: row {$a->row}, column {$a->column}',
    placeresize: 'Resize {$a->block} to end here: row {$a->row}, column {$a->column}',
    resizeinstructions: 'Use the arrow keys to resize',
    retry: 'Retry',
    savefailed: 'Your changes could not be saved.',
    saveoffline: 'You are offline.',
    saveretrying: 'Trying again.',
    scopeown: 'Editing your dashboard',
    scopesitedefault: 'Editing the default dashboard for all users',
    switchtoown: 'Switch to editing your dashboard',
    switchtositedefault: 'Switch to editing the default dashboard for all users',
    tile: '{$a} block',
    undo: 'Undo',
    addblockhere: 'Add a block here',
    dashboardblocks: 'Dashboard blocks',
    emptyregion: 'Empty space, row {$a->row}, column {$a->column}. Add a block here.',
    blockfailed: 'This block could not be loaded.',
    browserallpresent: 'Every block is already on your dashboard.',
    browserblocks: 'Blocks',
    browserdiscover: 'Discover more blocks',
    browserfallbackdescription: 'Added to your site by an administrator.',
    browserinsert: 'Insert',
    browsernomatch: 'No blocks match "{$a}".',
    browsersearch: 'Search blocks',
    clearsearch: 'Clear search input',
    empty: 'Your dashboard is empty.',
    opensinnewwindow: 'Opens in new window',
    restoredefault: 'Restore the default dashboard',
};

const urls = {ownpage: 'https://example.com/my/index.php', sitedefault: 'https://example.com/my/indexsys.php'};

/**
 * Two side-by-side blocks with a free column between them, wide enough apart that moving the
 * first one right by a single column cannot collide with the second.
 */
// Sized by hand (autorows: false), so these tests are not affected by content-fit sizing, which
// jsdom (with no layout) would always measure as the minimum. Content-fit has its own tests below.
const baseLayout: LayoutItem[] = [
    {id: 101, column: 0, row: 0, columns: 2, rows: 2, autorows: false},
    {id: 102, column: 3, row: 0, columns: 2, rows: 2, autorows: false},
];

const secondBlockOnly = [
    {
        id: 102, name: 'online_users', title: 'Second block', content: '<p>Second</p>',
        footer: '', region: 'content', weight: 1, actions: [], minsize: {columns: 1, rows: 2}, asynccontent: false,
            preferredrows: null, loaded: true,
    },
];

const buildData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
    blocks: [
        {
            id: 101, name: 'html', title: 'First block', content: '<p>First</p>',
            footer: '', region: 'content', weight: 0, actions: [], minsize: {columns: 1, rows: 2}, asynccontent: false,
            preferredrows: null, loaded: true,
        },
        {
            id: 102, name: 'online_users', title: 'Second block', content: '<p>Second</p>',
            footer: '', region: 'content', weight: 1, actions: [], minsize: {columns: 1, rows: 2}, asynccontent: false,
            preferredrows: null, loaded: true,
        },
    ],
    layout: baseLayout,
    availableblocks: [{name: 'calendar_month', title: 'Calendar', description: '', iconhtml: '', added: false}],
    grid: {minsize: {columns: 1, rows: 2}, autorowscap: 8},
    ownlayout: true,
    revision: 7,
    discoverurl: null,
    canedit: true,
    editing: true,
    sitedefault: false,
    caneditotherscope: false,
    urls,
    javascript: '',
    labels,
    ...overrides,
});

/** Route fetchOne by methodname to whichever fixture/queue applies. */
const mockDashboardApi = (options: {
    getResponses: DashboardData[];
    updateImpl?: (action: string, args: Record<string, unknown>) => Promise<{status: boolean; blockid: number}>;
    blockImpl?: (blockid: number) => Promise<unknown>;
}) => {
    const {getResponses, updateImpl, blockImpl} = options;
    let getCallCount = 0;
    const fetchOneSpy = jest.spyOn(Ajax, 'fetchOne');
    fetchOneSpy.mockImplementation((request: {methodname: string; args?: Record<string, unknown>}) => {
        if (request.methodname === 'core_my_get_dashboard') {
            const response = getResponses[Math.min(getCallCount, getResponses.length - 1)];
            getCallCount += 1;
            return Promise.resolve(response);
        }
        if (request.methodname === 'core_my_get_dashboard_block' && blockImpl) {
            return blockImpl((request.args ?? {}).blockid as number);
        }
        if (request.methodname === 'core_my_update_dashboard') {
            const args = request.args ?? {};
            if (updateImpl) {
                return updateImpl(args.action as string, args);
            }
            return Promise.resolve({status: true, blockid: 999});
        }
        return Promise.reject(new Error(`Unexpected methodname: ${request.methodname}`));
    });
    return fetchOneSpy;
};

/** A rejection the server itself sent: a Moodle exception, which is never retried. */
const serverError = (message: string) => ({message, errorcode: 'invalidparameter'});

const newBlock = {
    id: 103, name: 'calendar_month', title: 'Calendar', content: '<p>Cal</p>',
    footer: '', region: 'content', weight: 2, actions: [], minsize: {columns: 1, rows: 2}, asynccontent: false,
    preferredrows: null, loaded: true,
};

/** The server's reply to 'add': the new block, rendered, wherever it chose to put it. */
const addResult = (layoutitem: LayoutItem, javascript = '') => ({
    status: true,
    blockid: 103,
    block: newBlock,
    layoutitem,
    javascript,
    availableblocks: [],
});

const updateCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter(([request]) =>
    (request as {methodname: string}).methodname === 'core_my_update_dashboard');
const getCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter(([request]) =>
    (request as {methodname: string}).methodname === 'core_my_get_dashboard');

describe('core_my Dashboard application', () => {
    it('loads and renders the dashboard from the server', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        expect(await screen.findByText('First block')).toBeInTheDocument();
        expect(screen.getByText('Second block')).toBeInTheDocument();
    });

    it('shows an error message when the initial load fails', async() => {
        jest.spyOn(Ajax, 'fetchOne').mockImplementation(() => Promise.reject(new Error('Network is down')));

        render(<Dashboard />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Network is down');
    });

    it('commits a keyboard move and persists the new canonical layout', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await waitFor(() => {
            const saveCall = fetchOneSpy.mock.calls.find(([request]) =>
                (request as {methodname: string}).methodname === 'core_my_update_dashboard');
            expect(saveCall).toBeDefined();
        });

        const saveCall = fetchOneSpy.mock.calls.find(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_update_dashboard')!;
        const args = (saveCall[0] as {args: {action: string; layout: LayoutItem[]}}).args;
        expect(args.action).toBe('save');
        const moved = args.layout.find(item => item.id === 101);
        expect(moved).toMatchObject({column: 1, row: 0});
    });

    it('names the block in the announcement when a move or resize is committed', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        const getStringSpy = jest.spyOn(StringUtils, 'getString');
        render(<Dashboard />);
        await screen.findByText('First block');
        const firstTile = screen.getByRole('region', {name: 'First block block'});

        const moveHandle = within(firstTile).getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });
        await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith('dashboardmovecommitted', 'my',
            expect.objectContaining({block: 'First block'})));

        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        fireEvent.keyDown(resizeHandle, {key: 'ArrowDown'});
        await act(async() => {
            fireEvent.keyDown(resizeHandle, {key: ' '});
        });
        await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith('dashboardresizecommitted', 'my',
            expect.objectContaining({block: 'First block'})));
        getStringSpy.mockRestore();
    });

    it('settles a committed move immediately, before the save responds', async() => {
        let resolveSave: (value: {status: boolean; blockid: number}) => void = () => undefined;
        mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: () => new Promise(resolve => {
                resolveSave = resolve;
            }),
        });

        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        // The save is still pending, yet the tile already sits in its new column and the
        // interaction has ended (the keyboard move controls are gone).
        const firstTile = screen.getByRole('region', {name: 'First block block'});
        expect(firstTile.style.gridColumn).toBe('2 / span 2');
        expect(screen.queryByRole('group', {name: 'Move block controls'})).not.toBeInTheDocument();

        await act(async() => {
            resolveSave({status: true, blockid: 0});
        });
        expect(firstTile.style.gridColumn).toBe('2 / span 2');
    });

    it('reloads what is saved when the server rejects a committed move', async() => {
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: () => Promise.reject(serverError('Invalid layout')),
        });

        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        expect(await screen.findByText('Invalid layout')).toBeInTheDocument();
        await waitFor(() => expect(getCalls(fetchOneSpy)).toHaveLength(2));
        const firstTile = screen.getByRole('region', {name: 'First block block'});
        await waitFor(() => expect(firstTile.style.gridColumn).toBe('1 / span 2'));
        // A refusal is final: it is not retried.
        expect(updateCalls(fetchOneSpy)).toHaveLength(1);
    });

    it('keeps a committed move on screen while offline, and sends it on reconnecting', async() => {
        const onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        let attempts = 0;
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: () => {
                attempts += 1;
                return attempts === 1
                    ? Promise.reject(new TypeError('Failed to fetch'))
                    : Promise.resolve({status: true, blockid: 0});
            },
        });

        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        expect(await screen.findByText('You are offline.')).toBeInTheDocument();
        const firstTile = screen.getByRole('region', {name: 'First block block'});
        expect(firstTile.style.gridColumn).toBe('2 / span 2');

        onLine.mockReturnValue(true);
        await act(async() => {
            window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(2));
        await waitFor(() => expect(screen.queryByText('You are offline.')).not.toBeInTheDocument());
        expect(firstTile.style.gridColumn).toBe('2 / span 2');
        expect(getCalls(fetchOneSpy)).toHaveLength(1);
        onLine.mockRestore();
    });

    it('discards a keyboard interaction on Escape without saving', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        fireEvent.keyDown(moveHandle, {key: 'Escape'});

        expect(fetchOneSpy.mock.calls.some(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_update_dashboard')).toBe(false);
    });

    it('rejects a keyboard resize that would fall below the minimum tile size', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);
        await screen.findByText('First block');

        // Each resize handle is named after its block, and is still scoped to the block's own tile.
        const firstTile = screen.getByRole('region', {name: 'First block block'});
        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        // The first block is 2 rows tall; the payload's minimum is 2 rows, so shrinking up once more is rejected.
        fireEvent.keyDown(resizeHandle, {key: 'ArrowUp'});
        await act(async() => {
            fireEvent.keyDown(resizeHandle, {key: ' '});
        });

        // The rejected shrink left the block as it was, so dropping it changes and sends nothing.
        await waitFor(() => expect(screen.getByText('[dashboardnothingchanged, my]')).toBeInTheDocument());
        expect(updateCalls(fetchOneSpy)).toHaveLength(0);
    });

    it('announces each arrow-key step: where the block is, or its new size', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        const getStringSpy = jest.spyOn(StringUtils, 'getString');
        render(<Dashboard />);
        await screen.findByText('First block');
        const firstTile = screen.getByRole('region', {name: 'First block block'});

        const moveHandle = within(firstTile).getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith('gridcellposition', 'my', {row: 2, column: 1}));
        fireEvent.keyDown(moveHandle, {key: 'Escape'});

        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        fireEvent.keyDown(resizeHandle, {key: 'ArrowRight'});
        await waitFor(() => expect(getStringSpy)
            .toHaveBeenCalledWith('dashboardresizesize', 'my', {columns: 3, rows: 2}));
        getStringSpy.mockRestore();
    });

    it('announces the block\'s own declared minimum when a resize reaches it', async() => {
        const data = buildData();
        // The first block is 2 rows tall and declares a 2 × 2 minimum of its own.
        data.blocks[0] = {...data.blocks[0], minsize: {columns: 2, rows: 2}};
        mockDashboardApi({getResponses: [data]});
        const getStringSpy = jest.spyOn(StringUtils, 'getString');

        render(<Dashboard />);
        await screen.findByText('First block');
        const firstTile = screen.getByRole('region', {name: 'First block block'});
        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        fireEvent.keyDown(resizeHandle, {key: 'ArrowUp'});

        await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith('dashboardminimumsize', 'my', '2 × 2'));
        getStringSpy.mockRestore();
    });

    it('enforces each block\'s own minimum sent by the server, not a client-side constant', async() => {
        const data = buildData();
        // The block declares a 1-row minimum; the payload's default for other blocks is still 2.
        data.blocks[0] = {...data.blocks[0], minsize: {columns: 1, rows: 1}};
        const fetchOneSpy = mockDashboardApi({getResponses: [data]});

        render(<Dashboard />);
        await screen.findByText('First block');

        const firstTile = screen.getByRole('region', {name: 'First block block'});
        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        // This block may be 1 row tall, so the same shrink that is rejected above succeeds.
        fireEvent.keyDown(resizeHandle, {key: 'ArrowUp'});
        await act(async() => {
            fireEvent.keyDown(resizeHandle, {key: ' '});
        });

        const saveCall = fetchOneSpy.mock.calls.find(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_update_dashboard')!;
        const args = (saveCall[0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 101)?.rows).toBe(1);
    });

    // A full pixel-based pointer drag (pointerdown, a pointermove past the drag threshold, then
    // pointerup committing a new cell) is not exercised here: jsdom's PointerEvent support does
    // not propagate clientX/clientY through dispatched events, so the drag-distance math in
    // pointerDown's `move` handler has no reliable pixel input to work from in this environment.
    // The "no movement at all" path below (a plain click) does not depend on those coordinates and
    // is covered; the drag-distance-to-grid-cell math itself is covered directly by the pure
    // layout.ts helpers it delegates to (see layout.test.ts), which pointerDown's own comment
    // documents as the same clamping logic shift()/keyDown exercise here via the keyboard.
    describe('picking a block up with a click (no dragging)', () => {
        // This file stubs every element as a 2000 × 800 box at the origin, so the six-column grid's
        // cells are (2000 - 5 × 16) / 6 = 320px wide plus a 16px gap, and rows 96px plus the gap.
        const cellX = (column: number) => column * 336 + 10;
        const cellY = (row: number) => row * 112 + 10;

        const pickUp = async(name: string) => {
            const handle = screen.getByRole('button', {name});
            await act(async() => {
                fireEvent.pointerDown(handle, {clientX: 0, clientY: 0});
                fireEvent.pointerUp(window);
            });
            // The click that picked the block up must finish before the next one can place it.
            await act(async() => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            return handle;
        };

        it('keeps instructions with Cancel on screen while a block is picked up', async() => {
            mockString('dashboardtapmove', 'my', 'First block picked up. Click where you want it to go.');
            mockDashboardApi({getResponses: [buildData()]});
            render(<Dashboard />);
            await screen.findByText('First block');

            await pickUp('Move First block block');

            const toast = await screen.findByText('First block picked up. Click where you want it to go.');
            expect(toast.closest('[role="status"]')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
            await waitFor(() => expect(screen.queryByText('First block picked up. Click where you want it to go.'))
                .not.toBeInTheDocument());
        });

        it('places the block with the next click on the grid', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
                .toHaveAttribute('data-columns', '6'));

            await pickUp('Move First block block');
            await act(async() => {
                fireEvent.click(container.querySelector('.core-my-dashboard-grid')!, {clientX: cellX(1), clientY: cellY(2), detail: 1});
            });

            await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(1));
            const args = (updateCalls(fetchOneSpy)[0][0] as {args: {layout: LayoutItem[]}}).args;
            expect(args.layout.find(item => item.id === 101)).toMatchObject({column: 1});
        });

        it('places the block even when the click lands on its own handle', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
                .toHaveAttribute('data-columns', '6'));

            const handle = await pickUp('Move First block block');
            await act(async() => {
                fireEvent.pointerDown(handle, {clientX: cellX(1), clientY: cellY(0)});
                fireEvent.click(handle, {clientX: cellX(1), clientY: cellY(0), detail: 1});
            });

            await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(1));
            const args = (updateCalls(fetchOneSpy)[0][0] as {args: {layout: LayoutItem[]}}).args;
            expect(args.layout.find(item => item.id === 101)).toMatchObject({column: 1, row: 0});
        });

        it('puts the block back on Escape or a click outside the grid', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
            render(<Dashboard />);
            await screen.findByText('First block');

            await pickUp('Move First block block');
            await act(async() => {
                fireEvent.keyDown(window, {key: 'Escape'});
            });
            await pickUp('Move First block block');
            await act(async() => {
                fireEvent.click(document.body, {clientX: cellX(1), clientY: cellY(0), detail: 1});
            });

            expect(updateCalls(fetchOneSpy)).toHaveLength(0);
        });

        it('lets assistive technology pick a block up and put it in a named empty space', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
            const getStringSpy = jest.spyOn(StringUtils, 'getString');
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
                .toHaveAttribute('data-columns', '6'));

            // A screen reader's double-tap: a click with no detail and no key press.
            const handle = screen.getByRole('button', {name: 'Move First block block'});
            await act(async() => {
                fireEvent.click(handle, {detail: 0});
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith('dashboardchoosemove', 'my', 'First block'));
            // No direction buttons; empty spaces say they are places to put the block.
            expect(screen.queryByRole('button', {name: 'Up'})).not.toBeInTheDocument();
            const space = screen.getByRole('button', {name: 'Move First block here: row 3, column 4'});
            await act(async() => {
                fireEvent.click(space, {detail: 0});
            });

            await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(1));
            const args = (updateCalls(fetchOneSpy)[0][0] as {args: {layout: LayoutItem[]}}).args;
            expect(args.layout.find(item => item.id === 101)).toMatchObject({column: 3, row: 2});
            getStringSpy.mockRestore();
        });

        it('adds an empty row below the last block while one is picked up', async() => {
            mockDashboardApi({getResponses: [buildData()]});
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            const grid = container.querySelector<HTMLElement>('.core-my-dashboard-grid')!;
            expect(grid.style.gridTemplateRows).toMatch(/^repeat\(2,/);

            await pickUp('Move First block block');

            expect(grid.style.gridTemplateRows).toMatch(/^repeat\(3,/);
            expect(screen.getAllByRole('button', {name: /^Move First block here: row 3,/}).length).toBeGreaterThan(0);
        });
    });

    it('shows the keys while a block is picked up by keyboard, and Cancel there does not drop it', async() => {
        mockString('dashboardkeyboardmove', 'my', 'First block picked up. Use the arrow keys.');
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        moveHandle.focus();
        fireEvent.keyDown(moveHandle, {key: ' '});
        expect(await screen.findByText('First block picked up. Use the arrow keys.')).toBeInTheDocument();
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});

        // Tabbing to the toast's Cancel leaves the block picked up...
        const cancel = screen.getByRole('button', {name: 'Cancel'});
        fireEvent.blur(moveHandle, {relatedTarget: cancel});
        expect(moveHandle).toHaveAttribute('aria-pressed', 'true');
        // ...and Cancel puts it back, unsaved.
        await act(async() => {
            fireEvent.click(cancel);
        });
        expect(moveHandle).toHaveAttribute('aria-pressed', 'false');
        expect(updateCalls(fetchOneSpy)).toHaveLength(0);
    });

    it('mirrors the Left and Right arrow keys in a right-to-left language', async() => {
        const getComputedStyle = window.getComputedStyle;
        const styleSpy = jest.spyOn(window, 'getComputedStyle').mockImplementation(element => {
            const style = getComputedStyle(element);
            return new Proxy(style, {
                get: (target, property) => property === 'direction' ? 'rtl' : Reflect.get(target, property),
            });
        });
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move Second block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        // Right, on screen, is towards the first column in a right-to-left grid.
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(1));
        const args = (updateCalls(fetchOneSpy)[0][0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 102)).toMatchObject({column: 2});
        styleSpy.mockRestore();
    });

    it('sends each change with the revision it was made from, moving on with each reply', async() => {
        let revision = 7;
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: () => Promise.resolve({status: true, blockid: 0, revision: ++revision} as {status: boolean; blockid: number}),
        });
        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        for (const _ of [1, 2]) {
            fireEvent.keyDown(moveHandle, {key: ' '});
            fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
            await act(async() => {
                fireEvent.keyDown(moveHandle, {key: ' '});
            });
        }

        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(2));
        expect(updateCalls(fetchOneSpy).map(([request]) => (request as {args: {revision: number}}).args.revision))
            .toEqual([7, 8]);
    });

    it('reloads with a message when the dashboard changed in another window', async() => {
        const changed = buildData({layout: [baseLayout[1], {...baseLayout[0], row: 4}], revision: 9});
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData(), changed],
            updateImpl: () => Promise.reject({message: 'Your dashboard changed in another window.', errorcode: 'dashboardchanged'}),
        });
        render(<Dashboard />);
        await screen.findByText('First block');

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        expect(await screen.findByText('Your dashboard changed in another window.')).toBeInTheDocument();
        expect(getCalls(fetchOneSpy)).toHaveLength(2);
        // Not retried: the server's refusal is final.
        expect(updateCalls(fetchOneSpy)).toHaveLength(1);
    });

    it('undoes changes newest first with Ctrl+Z, and from the toolbar', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');
        const undoButton = screen.getByRole('button', {name: 'Undo'});
        expect(undoButton).toBeDisabled();

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        for (const _ of [1, 2]) {
            fireEvent.keyDown(moveHandle, {key: ' '});
            fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
            await act(async() => {
                fireEvent.keyDown(moveHandle, {key: ' '});
            });
        }
        expect(undoButton).toBeEnabled();

        await act(async() => {
            fireEvent.keyDown(document.body, {key: 'z', ctrlKey: true});
        });
        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(3));
        const afterOne = (updateCalls(fetchOneSpy)[2][0] as {args: {layout: LayoutItem[]}}).args.layout;
        const afterFirstMove = (updateCalls(fetchOneSpy)[0][0] as {args: {layout: LayoutItem[]}}).args.layout;
        expect(afterOne).toEqual(afterFirstMove);

        await act(async() => {
            fireEvent.click(undoButton);
        });
        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(4));
        const original = (updateCalls(fetchOneSpy)[3][0] as {args: {layout: LayoutItem[]}}).args.layout;
        expect(original.find(item => item.id === 101)).toMatchObject({column: 0, row: 0});
        expect(undoButton).toBeDisabled();
    });

    it('ignores Ctrl+Z while typing in a field', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<><Dashboard /><input aria-label="Notes" /></>);
        await screen.findByText('First block');
        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await act(async() => {
            fireEvent.keyDown(screen.getByRole('textbox', {name: 'Notes'}), {key: 'z', ctrlKey: true});
        });

        expect(updateCalls(fetchOneSpy)).toHaveLength(1);
    });

    it('places a newly added block into the specific empty cell that was clicked', async() => {
        // The server appends the new block wherever it likes (here, far from where the user
        // clicked) - the client is expected to notice and immediately re-save it into the cell.
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: (action) => Promise.resolve(action === 'add'
                ? addResult({id: 103, column: 0, row: 6, columns: 2, rows: 2})
                : {status: true, blockid: 0}),
        });

        const {container} = render(<Dashboard />);
        await screen.findByText('First block');
        // The column-count measurement effect (ResizeObserver + an immediate manual measure())
        // runs after the grid first mounts, one render after the block text itself appears -
        // wait for it, so the empty cell this test targets (column index 2) actually exists yet.
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));

        const emptyCell = screen.getByRole('button', {name: 'Empty space, row 1, column 3. Add a block here.'});
        fireEvent.click(emptyCell);
        fireEvent.click(await screen.findByRole('radio', {name: 'Calendar'}));
        fireEvent.click(screen.getByRole('button', {name: 'Insert'}));

        // Add, re-save into the clicked cell, then the new block is sized to its content.
        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(3));
        const [, secondCall, thirdCall] = updateCalls(fetchOneSpy);
        const args = (secondCall[0] as {args: {action: string; layout: LayoutItem[]}}).args;
        expect(args.action).toBe('save');
        const placed = args.layout.find(item => item.id === 103);
        expect(placed).toMatchObject({column: 2, row: 0});
        // This file stubs every element as 800px tall, so the new block measures past the cap.
        const fitted = (thirdCall[0] as {args: {layout: LayoutItem[]}}).args.layout.find(item => item.id === 103);
        expect(fitted).toMatchObject({column: 2, row: 0, rows: 8, autorows: true});
        // Inserted from the add reply: the dashboard itself is never reloaded.
        expect(getCalls(fetchOneSpy)).toHaveLength(1);
    });

    it('keeps a block added to a wide empty region at its usual width, at the start of the region', async() => {
        const data = buildData({layout: [{id: 101, column: 0, row: 0, columns: 2, rows: 2, autorows: false}]});
        data.blocks = [data.blocks[0]];
        const fetchOneSpy = mockDashboardApi({
            getResponses: [data],
            updateImpl: (action) => Promise.resolve(action === 'add'
                ? addResult({id: 103, column: 0, row: 6, columns: 3, rows: 2})
                : {status: true, blockid: 0}),
        });
        const {container} = render(<Dashboard />);
        await screen.findByText('First block');
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));

        // Columns 3 to 6 are one empty region, four columns wide.
        fireEvent.click(screen.getByRole('button', {name: 'Empty space, row 1, column 3. Add a block here.'}));
        fireEvent.click(await screen.findByRole('radio', {name: 'Calendar'}));
        fireEvent.click(screen.getByRole('button', {name: 'Insert'}));

        await waitFor(() => expect(updateCalls(fetchOneSpy).length).toBeGreaterThanOrEqual(2));
        const args = (updateCalls(fetchOneSpy)[1][0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 103)).toMatchObject({column: 2, row: 0, columns: 3});
    });

    describe('content-fit sizing', () => {
        // Every element in this file measures 800px tall (see the getBoundingClientRect stub), so a
        // block that follows its content measures past the 8-row cap.
        const autoLayout: LayoutItem[] = [
            {id: 101, column: 0, row: 0, columns: 2, rows: 2, autorows: true},
            {id: 102, column: 3, row: 0, columns: 2, rows: 2, autorows: false},
        ];
        const saves = (spy: jest.SpyInstance) => spy.mock.calls
            .filter(([request]) => (request as {methodname: string}).methodname === 'core_my_update_dashboard')
            .map(([request]) => (request as {args: {action: string; layout: LayoutItem[]}}).args);

        it('sizes blocks that follow their content, and saves it to the viewer\'s own dashboard', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: autoLayout, editing: false})]});

            const {container} = render(<Dashboard />);
            await screen.findByText('First block');

            await waitFor(() => expect(saves(fetchOneSpy)).toHaveLength(1));
            const [save] = saves(fetchOneSpy);
            expect(save.action).toBe('save');
            expect(save.layout.find(item => item.id === 101)).toMatchObject({rows: 8, autorows: true});
            // A block sized by hand is left alone.
            expect(save.layout.find(item => item.id === 102)).toMatchObject({rows: 2, autorows: false});
            expect(container.querySelector('[data-block-id="101"]')).toHaveStyle({gridRow: '1 / span 8'});
        });

        it('lets a block that declares no maximum open taller than the 8-row cap', async() => {
            const data = buildData({layout: autoLayout, editing: false});
            data.blocks[0] = {...data.blocks[0], maxrows: null};
            const fetchOneSpy = mockDashboardApi({getResponses: [data]});

            render(<Dashboard />);
            await screen.findByText('First block');

            await waitFor(() => expect(saves(fetchOneSpy)).toHaveLength(1));
            expect(saves(fetchOneSpy)[0].layout.find(item => item.id === 101)!.rows).toBeGreaterThan(8);
        });

        it('fits a block again when it reports a change after its first load, without saving', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: autoLayout, editing: false})]});
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            await waitFor(() => expect(saves(fetchOneSpy)).toHaveLength(1));
            const tile = container.querySelector<HTMLElement>('[data-block-id="101"]')!;
            expect(tile).toHaveStyle({gridRow: '1 / span 8'});

            // Its content is now short, as after a filter that leaves few items.
            const measure = Element.prototype.getBoundingClientRect as jest.Mock;
            const tall = measure.getMockImplementation();
            measure.mockImplementation(() => ({
                width: 2000, height: 40, top: 0, left: 0, bottom: 40, right: 2000, x: 0, y: 0, toJSON: () => ({}),
            }));
            try {
                await act(async() => {
                    tile.dispatchEvent(new CustomEvent('core_block/contentLoaded', {bubbles: true, detail: {instanceId: 101}}));
                });
                await waitFor(() => expect(tile).toHaveStyle({gridRow: '1 / span 2'}));
                expect(saves(fetchOneSpy)).toHaveLength(1);
            } finally {
                measure.mockImplementation(tall);
            }
        });

        it('measures each block once its own content has arrived, whatever order blocks load in', async() => {
            const data = buildData({layout: [autoLayout[0], {...autoLayout[1], autorows: true}], editing: false});
            data.blocks = data.blocks.map(block => ({...block, content: '', loaded: false}));
            const replies = new Map<number, (value: unknown) => void>();
            const fetchOneSpy = mockDashboardApi({
                getResponses: [data],
                blockImpl: blockid => new Promise(resolve => {
                    replies.set(blockid, resolve);
                }),
            });
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            await waitFor(() => expect(replies.size).toBe(2));

            // The second block arrives first: only it is measured.
            await act(async() => {
                replies.get(102)!({block: {...data.blocks[1], content: '<p>Second</p>', loaded: true}, javascript: ''});
            });
            await waitFor(() => expect(container.querySelector('[data-block-id="102"]')).toHaveStyle({gridRow: '1 / span 8'}));
            expect(container.querySelector('[data-block-id="101"]')).toHaveStyle({gridRow: '1 / span 2'});

            // The first block is measured once its own content is in.
            await act(async() => {
                replies.get(101)!({block: {...data.blocks[0], content: '<p>First</p>', loaded: true}, javascript: ''});
            });
            await waitFor(() => expect(container.querySelector('[data-block-id="101"]')).toHaveStyle({gridRow: '1 / span 8'}));
            expect(saves(fetchOneSpy).length).toBeGreaterThan(0);
        });

        it('uses a block\'s declared preferred height instead of measuring it', async() => {
            const data = buildData({layout: autoLayout, editing: false});
            data.blocks[0] = {...data.blocks[0], preferredrows: 4};
            const fetchOneSpy = mockDashboardApi({getResponses: [data]});

            render(<Dashboard />);
            await screen.findByText('First block');

            await waitFor(() => expect(saves(fetchOneSpy)).toHaveLength(1));
            expect(saves(fetchOneSpy)[0].layout.find(item => item.id === 101)).toMatchObject({rows: 4});
        });

        it('does not save measured heights over a layout the viewer does not own', async() => {
            const fetchOneSpy = mockDashboardApi({
                getResponses: [buildData({layout: autoLayout, editing: false, ownlayout: false})],
            });

            const {container} = render(<Dashboard />);
            await screen.findByText('First block');

            // Still sized on screen...
            await waitFor(() => expect(container.querySelector('[data-block-id="101"]'))
                .toHaveStyle({gridRow: '1 / span 8'}));
            // ...but nothing is written.
            expect(saves(fetchOneSpy)).toHaveLength(0);
        });

        it('stops a block following its content once someone resizes it', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({
                layout: [{id: 101, column: 0, row: 0, columns: 2, rows: 8, autorows: true}, autoLayout[1]],
            })]});

            render(<Dashboard />);
            await screen.findByText('First block');
            const firstTile = screen.getByRole('region', {name: 'First block block'});
            const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize First block'});
            fireEvent.keyDown(resizeHandle, {key: ' '});
            fireEvent.keyDown(resizeHandle, {key: 'ArrowUp'});
            await act(async() => {
                fireEvent.keyDown(resizeHandle, {key: ' '});
            });

            await waitFor(() => expect(saves(fetchOneSpy).some(save =>
                save.layout.find(item => item.id === 101)?.autorows === false)).toBe(true));
            const resized = saves(fetchOneSpy).find(save =>
                save.layout.find(item => item.id === 101)?.autorows === false)!;
            expect(resized.layout.find(item => item.id === 101)).toMatchObject({rows: 7, autorows: false});
        });
    });

    it('removes a block with one click, and sends the removal once its toast closes', async() => {
        mockString('dashboardblockremovednamed', 'my', 'First block removed.');
        let resolveRemove: (value: unknown) => void = () => undefined;
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData({availableblocks: []})],
            updateImpl: action => action === 'remove'
                ? new Promise(resolve => {
                    resolveRemove = resolve;
                }) as Promise<{status: boolean; blockid: number}>
                : Promise.resolve({status: true, blockid: 0}),
        });

        render(<Dashboard />);
        await screen.findByText('First block');

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Delete First block block'}));
        });

        // Gone at once, with no dialog, and focus on the next block...
        expect(screen.queryByRole('region', {name: 'First block block'})).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('button', {name: 'Move Second block block'})).toHaveFocus());
        // ...but nothing is sent while Undo can still bring it back.
        expect(await screen.findByText('First block removed.')).toBeInTheDocument();
        expect(updateCalls(fetchOneSpy)).toHaveLength(0);

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Close'}));
        });
        expect((updateCalls(fetchOneSpy)[0][0] as {args: {action: string; blockid: number}}).args).toMatchObject({
            action: 'remove',
            blockid: 101,
        });

        // The reply refreshes the palette: the removed block type can be added again.
        await act(async() => {
            resolveRemove({status: true, blockid: 0, availableblocks: [
                {name: 'html', title: 'Text', description: '', iconhtml: '', added: false},
            ]});
        });
        fireEvent.click(screen.getAllByRole('button', {name: labels.addblock})[0]);
        expect(await screen.findByRole('radio', {name: 'Text'})).toBeInTheDocument();
        expect(getCalls(fetchOneSpy)).toHaveLength(1);
    });

    it('brings a removed block back with Undo, as it was, without asking the server', async() => {
        mockString('dashboardblockremovednamed', 'my', 'First block removed.');
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');
        const tile = screen.getByRole('region', {name: 'First block block'});
        const content = tile.querySelector('.core-my-dashboard-tile__content')!;

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Delete First block block'}));
        });
        await act(async() => {
            fireEvent.click(within(await waitFor(() => document.querySelector<HTMLElement>('.core-toast--visible')!))
                .getByRole('button', {name: 'Undo'}));
        });

        // The same tile, with the same content nodes, is back in place.
        expect(screen.getByRole('region', {name: 'First block block'})).toBe(tile);
        expect(tile.querySelector('.core-my-dashboard-tile__content')).toBe(content);
        expect(tile).toBeVisible();
        // No removal was ever sent; restoring the layout is the only request.
        expect(updateCalls(fetchOneSpy).every(([request]) =>
            (request as {args: {action: string}}).args.action === 'save')).toBe(true);
    });

    it('sends a waiting removal as the page is left, without asking first', async() => {
        const sendBeacon = jest.fn(() => true);
        Object.defineProperty(navigator, 'sendBeacon', {value: sendBeacon, configurable: true});
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Delete First block block'}));
        });
        const leaving = new Event('beforeunload', {cancelable: true});
        window.dispatchEvent(leaving);

        expect(leaving.defaultPrevented).toBe(false);
        expect(sendBeacon).toHaveBeenCalledTimes(1);
        const [url, body] = sendBeacon.mock.calls[0] as unknown as [URL, string];
        expect(url.toString()).toContain('/lib/ajax/service.php');
        expect(JSON.parse(body)).toMatchObject([
            {methodname: 'core_my_update_dashboard', args: {action: 'remove', blockid: 101, revision: 7}},
            {methodname: 'core_my_update_dashboard', args: {action: 'save', revision: 8}},
        ]);
        expect(updateCalls(fetchOneSpy)).toHaveLength(0);
    });

    it('sends a waiting removal before the next change\'s layout', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Delete First block block'}));
        });
        const moveHandle = screen.getByRole('button', {name: 'Move Second block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await waitFor(() => expect(updateCalls(fetchOneSpy).length).toBeGreaterThanOrEqual(2));
        const actions = updateCalls(fetchOneSpy).map(([request]) => (request as {args: {action: string}}).args.action);
        expect(actions[0]).toBe('remove');
        expect(actions.slice(1).every(action => action === 'save')).toBe(true);
    });

    it('adds a block from the palette without reloading or re-running other blocks', async() => {
        const runTemplateJS = jest.fn();
        const notifyFilterContentUpdated = jest.fn();
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS},
            {notifyFilterContentUpdated},
        ]));
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData({javascript: 'window.__ran = "initial";'})],
            updateImpl: (action) => Promise.resolve(action === 'add'
                ? addResult({id: 103, column: 0, row: 2, columns: 2, rows: 2}, 'window.__ran = "added";')
                : {status: true, blockid: 0}),
        });

        render(<Dashboard />);
        await screen.findByText('First block');
        await waitFor(() => expect(runTemplateJS).toHaveBeenCalledWith('window.__ran = "initial";'));

        fireEvent.click(screen.getAllByRole('button', {name: labels.addblock})[0]);
        fireEvent.click(await screen.findByRole('radio', {name: 'Calendar'}));
        fireEvent.click(screen.getByRole('button', {name: 'Insert'}));

        expect(await screen.findByText('Calendar')).toBeInTheDocument();
        expect((updateCalls(fetchOneSpy)[0][0] as {args: {action: string; blockname: string}}).args).toMatchObject({
            action: 'add',
            blockname: 'calendar_month',
        });
        // Only the new block's own JavaScript runs; the existing blocks' does not run again.
        await waitFor(() => expect(runTemplateJS).toHaveBeenCalledWith('window.__ran = "added";'));
        expect(runTemplateJS).toHaveBeenCalledTimes(2);
        expect(getCalls(fetchOneSpy)).toHaveLength(1);
        // The filters are told about the new block's content only.
        const lastNotified = notifyFilterContentUpdated.mock.calls.at(-1)![0] as NodeListOf<Element>;
        expect(Array.from(lastNotified).map(node => node.closest('[data-instance-id]')?.getAttribute('data-instance-id')))
            .toEqual(['103']);
    });

    it('puts a block added from the toolbar in the first free space, picked up ready to move', async() => {
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: action => Promise.resolve(action === 'add'
                ? addResult({id: 103, column: 0, row: 9, columns: 2, rows: 2})
                : {status: true, blockid: 0}),
        });
        const {container} = render(<Dashboard />);
        await screen.findByText('First block');
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));

        fireEvent.click(screen.getAllByRole('button', {name: labels.addblock})[0]);
        fireEvent.click(await screen.findByRole('radio', {name: 'Calendar'}));
        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Insert'}));
        });

        // The two blocks fill columns 0-1 and 3-4 of the first rows, so a 2-wide block first fits below.
        await waitFor(() => expect(updateCalls(fetchOneSpy)).toHaveLength(2));
        const placed = (updateCalls(fetchOneSpy)[1][0] as {args: {layout: LayoutItem[]}}).args.layout
            .find(item => item.id === 103);
        expect(placed).toMatchObject({column: 0, row: 2});
        const handle = await screen.findByRole('button', {name: 'Move Calendar block'});
        await waitFor(() => expect(handle).toHaveAttribute('aria-pressed', 'true'));
        expect(handle).toHaveFocus();
    });

    it('replaces an empty grid with a message and a way forward', async() => {
        mockDashboardApi({getResponses: [buildData({blocks: [], layout: []})]});
        render(<Dashboard />);

        expect(await screen.findByText('Your dashboard is empty.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Restore the default dashboard'}));
        expect(screen.getByRole('dialog', {name: 'Reset dashboard'})).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', {name: 'Add a block'}).at(-1)!);
        expect(await screen.findByRole('dialog', {name: 'Add a block'})).toBeInTheDocument();
    });

    it('shows the dashboard sent with the page without asking for it, and asks on later reloads', async() => {
        const fetchOneSpy = mockDashboardApi({
            getResponses: [buildData()],
            updateImpl: () => Promise.reject({message: 'Your dashboard changed in another window.', errorcode: 'dashboardchanged'}),
        });
        render(<Dashboard initialData={buildData()} />);
        await screen.findByText('First block');
        expect(getCalls(fetchOneSpy)).toHaveLength(0);

        // A refused change reloads from the server.
        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });
        await waitFor(() => expect(getCalls(fetchOneSpy)).toHaveLength(1));
    });

    it('names the grid, and keeps tiles and empty regions in reading order', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        const {container} = render(<Dashboard />);
        await screen.findByText('First block');
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));

        const grid = screen.getByRole('group', {name: 'Dashboard blocks'});
        // Blocks fill columns 1-2 and 4-5 of the first two rows: the gap between them comes between
        // them in the page too, then the space after the second.
        const order = Array.from(grid.children).map(child => child.getAttribute('data-block-id')
            ?? child.getAttribute('aria-label'));
        expect(order).toEqual([
            '101',
            'Empty space, row 1, column 3. Add a block here.',
            '102',
            'Empty space, row 1, column 6. Add a block here.',
        ]);
    });

    it('says which dashboard is being edited in the toolbar, and leaves Edit mode with Done', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard />);
        await screen.findByText('First block');

        expect(screen.getByText('Editing your dashboard').closest('.core-my-dashboard-toolbar')).not.toBeNull();
        expectRedirect({urlContains: 'edit=0'});
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));
    });

    it('puts the Edit mode controls in the page sticky footer, and keeps the grid clear of it', async() => {
        const footer = document.createElement('div');
        footer.className = 'stickyfooter';
        footer.innerHTML = '<div data-region="core-my-dashboard-footer"></div>';
        document.body.appendChild(footer);
        footer.getBoundingClientRect = () => ({height: 72}) as DOMRect;
        const observe = jest.fn();
        const original = window.ResizeObserver;
        window.ResizeObserver = jest.fn(() => ({observe, disconnect: jest.fn(), unobserve: jest.fn()})) as never;
        try {
            mockDashboardApi({getResponses: [buildData()]});
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');

            const toolbar = footer.querySelector('.core-my-dashboard-toolbar');
            expect(toolbar).not.toBeNull();
            expect(container.querySelector('.core-my-dashboard-toolbar')).toBeNull();
            expect(within(toolbar as HTMLElement).getByRole('button', {name: 'Add a block'})).toBeInTheDocument();
            expect(within(toolbar as HTMLElement).getByRole('button', {name: 'Done'})).toBeInTheDocument();
            expect(observe).toHaveBeenCalledWith(footer);
            expect(container.querySelector<HTMLElement>('.core-my-dashboard-app')!.style
                .getPropertyValue('--core-my-dashboard-footer-height')).toBe('72px');
            expect(document.body.style.getPropertyValue('--sticky-footer-total-height')).toBe('72px');
        } finally {
            window.ResizeObserver = original;
            footer.remove();
        }
    });

    describe('rising to fill empty space above a block', () => {
        const tileOf = (title: string) => screen.getByRole('region', {name: `${title} block`});
        // Second block directly below the first, with two empty rows between them.
        const gapped = [
            baseLayout[0],
            {...baseLayout[1], column: 0, row: 4},
        ];

        it('shows a block risen when editing opens, without saving', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            render(<Dashboard />);
            await screen.findByText('First block');

            expect(tileOf('Second block')).toHaveStyle({gridRow: '3 / span 2'});
            expect(tileOf('Second block').style.gridColumn).toBe('1 / span 2');
            expect(document.querySelector('.core-my-dashboard-tile--joining')).toBeNull();
            expect(screen.queryByText(/when you finish editing/)).not.toBeInTheDocument();
            expect(updateCalls(fetchOneSpy)).toHaveLength(0);
        });

        it('shows the same rise outside Edit mode, without saving', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped, editing: false})]});
            render(<Dashboard />);
            await screen.findByText('First block');

            expect(tileOf('Second block')).toHaveStyle({gridRow: '3 / span 2'});
            expect(updateCalls(fetchOneSpy)).toHaveLength(0);
        });

        it('does not raise the block below during a move, then raises and announces it on drop', async() => {
            mockString('dashboardblockplaced', 'my', 'First block placed. Blocks below moved up.');
            mockString('dashboardmovecommitted', 'my', 'First block moved to row 1, column 3.');
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            const getStringSpy = jest.spyOn(StringUtils, 'getString');
            render(<Dashboard />);
            await screen.findByText('First block');

            const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
            fireEvent.keyDown(moveHandle, {key: ' '});
            fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
            fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
            // Still moving: the block below stays where the open layout showed it.
            expect(tileOf('Second block')).toHaveStyle({gridRow: '3 / span 2'});

            await act(async() => {
                fireEvent.keyDown(moveHandle, {key: ' '});
            });

            await waitFor(() => expect(tileOf('Second block')).toHaveStyle({gridRow: '1 / span 2'}));
            expect(tileOf('First block').style.gridColumn).toBe('3 / span 2');
            await waitFor(() => expect(getStringSpy).toHaveBeenCalledWith(
                'dashboardblockplaced', 'my', 'First block',
            ));
            expect(await screen.findByText(/First block placed\. Blocks below moved up\./)).toBeInTheDocument();
            await waitFor(() => {
                const save = updateCalls(fetchOneSpy).at(-1);
                const layout = (save?.[0] as {args: {layout: LayoutItem[]}}).args.layout;
                expect(layout.find(item => item.id === 102)).toMatchObject({column: 0, row: 0});
                expect(layout.find(item => item.id === 101)).toMatchObject({column: 2, row: 0});
            });
            getStringSpy.mockRestore();
        });

        it('raises the block below when the one above it is removed, and keeps Undo', async() => {
            mockString('dashboardblockremovednamed', 'my', 'First block removed.');
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            render(<Dashboard />);
            await screen.findByText('Second block');

            await act(async() => {
                fireEvent.click(screen.getByRole('button', {name: 'Delete First block block'}));
            });

            const toast = await screen.findByText('First block removed.');
            expect(within(toast.closest('.core-toast') as HTMLElement).getByRole('button', {name: 'Undo'}))
                .toBeInTheDocument();
            expect(tileOf('Second block')).toHaveStyle({gridRow: '1 / span 2'});

            await act(async() => {
                fireEvent.click(screen.getByRole('button', {name: 'Close'}));
            });
            await waitFor(() => {
                const save = updateCalls(fetchOneSpy).find(([request]) =>
                    (request as {args?: {action?: string}}).args?.action === 'save');
                const layout = (save?.[0] as {args: {layout: LayoutItem[]}} | undefined)?.args.layout;
                expect(layout?.find(item => item.id === 102)).toMatchObject({row: 0});
                expect(layout?.some(item => item.id === 101)).toBe(false);
            });
        });

        it('leaves Edit mode without moving or saving a layout that only has a gap', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            render(<Dashboard />);
            await screen.findByText('First block');

            expectRedirect({urlContains: 'edit=0'});
            await act(async() => {
                fireEvent.click(screen.getByRole('button', {name: 'Done'}));
            });

            await waitFor(() => expect(Location.redirect).toHaveBeenCalled());
            expect(updateCalls(fetchOneSpy)).toHaveLength(0);
            expect(tileOf('Second block')).toHaveStyle({gridRow: '3 / span 2'});
        });

        it('lets the Edit mode switch go ahead when nothing is waiting to be saved', async() => {
            const fetchOneSpy = mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            render(<Dashboard />);
            await screen.findByText('First block');

            const event = new CustomEvent('core/edit_switch/editModeSet', {
                bubbles: true,
                cancelable: true,
                detail: {editMode: false},
            });
            document.body.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(false);
            expect(updateCalls(fetchOneSpy)).toHaveLength(0);
        });

        it('leaves after Done without the unsaved-changes guard asking', async() => {
            mockDashboardApi({getResponses: [buildData({layout: gapped})]});
            render(<Dashboard />);
            await screen.findByText('First block');

            const asked: boolean[] = [];
            expectRedirect({urlContains: 'edit=0'});
            (Location.redirect as jest.Mock).mockImplementation(() => {
                const leaving = new Event('beforeunload', {cancelable: true});
                window.dispatchEvent(leaving);
                asked.push(leaving.defaultPrevented);
            });
            await act(async() => {
                fireEvent.click(screen.getByRole('button', {name: 'Done'}));
            });

            await waitFor(() => expect(asked).toEqual([false]));
        });

        it('still asks before leaving while a change is being saved', async() => {
            mockDashboardApi({getResponses: [buildData()], updateImpl: () => new Promise(() => undefined)});
            render(<Dashboard />);
            await screen.findByText('First block');

            const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
            fireEvent.keyDown(moveHandle, {key: ' '});
            fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
            await act(async() => {
                fireEvent.keyDown(moveHandle, {key: ' '});
            });
            const leaving = new Event('beforeunload', {cancelable: true});
            window.dispatchEvent(leaving);

            expect(leaving.defaultPrevented).toBe(true);
        });

        it('lets the person carry on when leaving after Done doesn\'t happen', async() => {
            mockDashboardApi({getResponses: [buildData()]});
            render(<Dashboard />);
            await screen.findByText('First block');

            jest.useFakeTimers();
            try {
                expectRedirect({urlContains: 'edit=0'});
                (Location.redirect as jest.Mock).mockImplementation(() => undefined);
                await act(async() => {
                    fireEvent.click(screen.getByRole('button', {name: 'Done'}));
                });
                await waitFor(() => expect(Location.redirect).toHaveBeenCalled());
                expect(screen.getByRole('button', {name: 'Done'})).toBeDisabled();

                await act(async() => {
                    jest.advanceTimersByTime(5000);
                });
                expect(screen.getByRole('button', {name: 'Done'})).toBeEnabled();
            } finally {
                jest.useRealTimers();
            }
        });
    });

    it('opens the block browser straight away when Edit mode was turned on to add a block', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        render(<Dashboard openBrowser />);

        expect(await screen.findByRole('dialog', {name: 'Add a block'})).toBeInTheDocument();
    });

    it('loads each block\'s content on its own after the layout, running only that block\'s JavaScript', async() => {
        const runTemplateJS = jest.fn();
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS},
            {notifyFilterContentUpdated: jest.fn()},
        ]));
        const unloaded = buildData();
        unloaded.blocks = unloaded.blocks.map(block => ({...block, content: '', loaded: false}));
        const replies = new Map<number, (value: unknown) => void>();
        const fetchOneSpy = mockDashboardApi({
            getResponses: [unloaded],
            blockImpl: blockid => new Promise(resolve => {
                replies.set(blockid, resolve);
            }),
        });
        const {container} = render(<Dashboard />);
        await screen.findByText('First block');

        // Both are requested on their own, and wait with a placeholder.
        await waitFor(() => expect(fetchOneSpy.mock.calls.filter(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_get_dashboard_block')).toHaveLength(2));
        const first = container.querySelector('[data-block-id="101"]')!;
        expect(first).toHaveAttribute('aria-busy', 'true');

        // The second answers first: it does not wait for the first.
        await act(async() => {
            replies.get(102)!({block: {...unloaded.blocks[1], content: '<p>Second loaded</p>', loaded: true},
                javascript: 'window.__ran = "second";'});
        });
        expect(await screen.findByText('Second loaded')).toBeInTheDocument();
        expect(first).toHaveAttribute('aria-busy', 'true');
        await waitFor(() => expect(runTemplateJS).toHaveBeenCalledWith('window.__ran = "second";'));

        await act(async() => {
            replies.get(101)!({block: {...unloaded.blocks[0], content: '<p>First loaded</p>', loaded: true},
                javascript: ''});
        });
        expect(await screen.findByText('First loaded')).toBeInTheDocument();
        expect(first).not.toHaveAttribute('aria-busy');
    });

    it('says so in the tile when a block\'s content cannot be loaded, leaving the rest', async() => {
        const unloaded = buildData();
        unloaded.blocks = unloaded.blocks.map(block => ({...block, content: '', loaded: false}));
        mockDashboardApi({
            getResponses: [unloaded],
            blockImpl: blockid => blockid === 101
                ? Promise.reject(new Error('timeout'))
                : Promise.resolve({block: {...unloaded.blocks[1], content: '<p>Second loaded</p>', loaded: true},
                    javascript: ''}),
        });
        render(<Dashboard />);

        expect(await screen.findByText('This block could not be loaded.')).toBeInTheDocument();
        expect(await screen.findByText('Second loaded')).toBeInTheDocument();
    });

    it('runs only the latest reload\'s collected block JS, not a superseded one', async() => {
        const firstData = buildData({javascript: 'window.__ran = "first";'});
        const secondData = buildData({
            javascript: 'window.__ran = "second";',
            blocks: secondBlockOnly,
            layout: [{id: 102, column: 3, row: 0, columns: 2, rows: 2}],
        });
        mockDashboardApi({
            getResponses: [firstData, secondData],
            updateImpl: () => Promise.reject(serverError('Invalid layout')),
        });

        const runTemplateJS = jest.fn();
        const processCollectedJavascript = jest.fn((source: string) => source);
        let resolveFirst: (modules: unknown[]) => void;
        const firstRequire = new Promise(resolve => {
            resolveFirst = resolve;
        });
        const secondRequire = Promise.resolve([
            {processCollectedJavascript},
            {runTemplateJS},
            {notifyFilterContentUpdated: jest.fn()},
        ]);
        (requireManyAsync as jest.Mock)
            .mockImplementationOnce(() => firstRequire)
            .mockImplementationOnce(() => secondRequire);

        render(<Dashboard />);
        await screen.findByText('First block');

        // Trigger a second load (the server refusing a move makes the dashboard reload what is
        // saved) while the first load's collected-JS promise is still unresolved, simulating a
        // slow first response overtaken by a second.
        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });
        await waitFor(() => expect(screen.queryByText('First block')).not.toBeInTheDocument());

        // Now let the superseded first reload's collected-JS resolve.
        await act(async() => {
            resolveFirst([{processCollectedJavascript}, {runTemplateJS}, {notifyFilterContentUpdated: jest.fn()}]);
            await secondRequire;
        });

        expect(runTemplateJS).toHaveBeenCalledTimes(1);
        expect(runTemplateJS).toHaveBeenCalledWith('window.__ran = "second";');
    });

    it('keeps the dashboard pending until the grid\'s DOM mutations from a reload settle', async() => {
        const data = buildData({javascript: 'window.__ran = "settle-mutate";'});
        mockDashboardApi({getResponses: [data]});
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
            {notifyFilterContentUpdated: jest.fn()},
        ]));
        const pendingSpy = jest.spyOn((globalThis as {M: {util: {js_pending: Function}}}).M.util, 'js_pending');
        const completeSpy = jest.spyOn((globalThis as {M: {util: {js_complete: Function}}}).M.util, 'js_complete');

        const {container} = render(<Dashboard />);
        await screen.findByText('First block');

        await waitFor(() => expect(pendingSpy.mock.calls.some(
            ([key]) => (key as string).startsWith('core_my/dashboard:settling:'),
        )).toBe(true));
        const settlingKey = pendingSpy.mock.calls
            .map(([key]) => key as string)
            .find(key => key.startsWith('core_my/dashboard:settling:'))!;

        // Simulate a block's own async fetch replacing its placeholder content - a structural
        // (childList) mutation somewhere under the grid - well within the quiet window.
        const grid = container.querySelector('.core-my-dashboard-grid')!;
        await act(async() => {
            grid.appendChild(document.createElement('div'));
        });

        expect(completeSpy).not.toHaveBeenCalledWith(settlingKey);

        await waitFor(() => expect(completeSpy).toHaveBeenCalledWith(settlingKey), {timeout: 2000});
    });

    it('tells the filter system about the block content it injected', async() => {
        const data = buildData({javascript: 'window.__ran = "filters";'});
        mockDashboardApi({getResponses: [data]});
        const notifyFilterContentUpdated = jest.fn();
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
            {notifyFilterContentUpdated},
        ]));

        render(<Dashboard />);
        await screen.findByText('First block');

        await waitFor(() => expect(notifyFilterContentUpdated).toHaveBeenCalledTimes(1));
        const nodes = Array.from(notifyFilterContentUpdated.mock.calls[0][0] as NodeListOf<Element>);
        expect(nodes).toHaveLength(data.blocks.length);
        expect(nodes.map(node => node.textContent)).toEqual(['First', 'Second']);
    });

    it('waits for every block that declares async content to report it loaded', async() => {
        const base = buildData({javascript: 'window.__ran = "async-blocks";'});
        const data = {...base, blocks: base.blocks.map(block => ({...block, asynccontent: true}))};
        mockDashboardApi({getResponses: [data]});
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
            {notifyFilterContentUpdated: jest.fn()},
        ]));
        const pendingSpy = jest.spyOn((globalThis as {M: {util: {js_pending: Function}}}).M.util, 'js_pending');
        const completeSpy = jest.spyOn((globalThis as {M: {util: {js_complete: Function}}}).M.util, 'js_complete');

        const {container} = render(<Dashboard />);
        await screen.findByText('First block');
        await waitFor(() => expect(pendingSpy.mock.calls.some(
            ([key]) => (key as string).startsWith('core_my/dashboard:settling:'),
        )).toBe(true));
        const settlingKey = pendingSpy.mock.calls
            .map(([key]) => key as string)
            .find(key => key.startsWith('core_my/dashboard:settling:'))!;
        const loaded = (id: number) => container.querySelector(`[data-instance-id="${id}"] .core-my-dashboard-tile__content`)!
            .dispatchEvent(new CustomEvent('core_block/contentLoaded', {bubbles: true, detail: {instanceId: id}}));

        // Well past the quiet window: still waiting, because the second block has not reported.
        await act(async() => {
            loaded(101);
            await new Promise(resolve => setTimeout(resolve, 400));
        });
        expect(completeSpy).not.toHaveBeenCalledWith(settlingKey);

        // Then settles once the grid has also been quiet for the quiet window.
        await act(async() => {
            loaded(102);
        });
        await waitFor(() => expect(completeSpy).toHaveBeenCalledWith(settlingKey), {timeout: 2000});
    });

    it('settles quickly when a reload causes no DOM mutations at all', async() => {
        const data = buildData({javascript: 'window.__ran = "settle-quiet";'});
        mockDashboardApi({getResponses: [data]});
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
            {notifyFilterContentUpdated: jest.fn()},
        ]));
        const pendingSpy = jest.spyOn((globalThis as {M: {util: {js_pending: Function}}}).M.util, 'js_pending');
        const completeSpy = jest.spyOn((globalThis as {M: {util: {js_complete: Function}}}).M.util, 'js_complete');

        render(<Dashboard />);
        await screen.findByText('First block');

        await waitFor(() => expect(pendingSpy.mock.calls.some(
            ([key]) => (key as string).startsWith('core_my/dashboard:settling:'),
        )).toBe(true));
        const settlingKey = pendingSpy.mock.calls
            .map(([key]) => key as string)
            .find(key => key.startsWith('core_my/dashboard:settling:'))!;

        await waitFor(() => expect(completeSpy).toHaveBeenCalledWith(settlingKey), {timeout: 2000});
    });
});
