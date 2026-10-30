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
import * as stringUtils from '@moodle/lms/core/stringUtils';
import {requireManyAsync} from '@moodle/lms/core/amd';
import Dashboard, {DashboardErrorBoundary} from '../src/index';
import type {DashboardData, DashboardIcons} from '../src/repository';
import {DEFAULT_LIMITS, type LayoutItem} from '../src/layout';

jest.mock('@moodlehq/design-system', () => {
    const ReactActual = require('react');
    return {
        Button: ReactActual.forwardRef((
            {label, startIcon, size: _size, variant, className, ...props}:
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
            data-variant={variant}
            {...props}
        >{startIcon}{label}</button>),
        CloseButton: ({size: _size, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {size?: string}) =>
            <button type="button" {...props} />,
        Badge: ({label, variant: _variant, subtle: _subtle, pill: _pill, ...props}:
        React.HTMLAttributes<HTMLSpanElement> & {label?: string; variant?: string; subtle?: boolean; pill?: boolean}) =>
            <span {...props}>{label}</span>,
        Link: ({label, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {label?: string}) =>
            <a {...props}>{label}</a>,
        Tooltip: ({label: _label, children}: {label: string; children: React.ReactElement}) => children,
        Dropdown: ({label, children}: {label: string; children?: React.ReactNode}) =>
            <div><button type="button" aria-haspopup="menu">{label}</button><div role="menu">{children}</div></div>,
        DropdownItemAction: ({label, startIcon: _startIcon, variant: _variant, ...props}:
        React.AnchorHTMLAttributes<HTMLAnchorElement> & {label: string; startIcon?: React.ReactElement; variant?: string}) =>
            <a role="menuitem" {...props}>{label}</a>,
        DropdownItemSelect: ({label, selected, ...props}:
        React.ButtonHTMLAttributes<HTMLButtonElement> & {label: string; selected?: boolean}) =>
            <button type="button" role="menuitemradio" aria-checked={Boolean(selected)} {...props}>{label}</button>,
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

// Jsdom does not implement <dialog>'s imperative API, used by ConfirmationDialog.
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

// The language strings the application fetches for itself, as the language pack has them.
const strings: Record<string, Record<string, string>> = {
    core: {
        addblock: 'Add a block',
        confirm: 'Confirm',
        'delete': 'Delete',
        actionsfor: 'Actions for {$a}',
        loading: 'Loading',
    },
    my: {
        dashboardaddblock: 'Add block',
        dashboardediting: 'Editing',
        dashboardedithint: 'Drag a block by its header to move it, or drag its corner to resize.',
        dashboardreset: 'Reset to default',
        dashboardscopedefaultshort: 'Default for all users',
        dashboardscopeownshort: 'Your dashboard',
        dashboardundo: 'Undo',
        dashboardundone: 'Last change undone.',
        dashboardcancel: 'Cancel',
        confirmresetdashboard: 'Reset this dashboard?',
        dashboarddown: 'Down',
        addblockhere: 'Add a block here',
        dashboardleft: 'Left',
        dashboardmovecontrols: 'Move block controls',
        dashboardmovehandleinstructions: 'Use the arrow keys to move',
        resetpage: 'Reset page to default',
        resetdashboardheading: 'Reset dashboard',
        resizeblock: 'Resize block',
        dashboardresizecontrols: 'Resize block controls',
        dashboardresizehandleinstructions: 'Use the arrow keys to resize',
        dashboardright: 'Right',
        dashboardscopeown: 'Editing your dashboard',
        dashboardscopesitedefault: 'Editing the default dashboard for all users',
        dashboardup: 'Up',
        dashboardtile: '{$a} block',
        gridcellposition: 'Row {$a->row}, column {$a->column}',
        dashboardmovebegin: 'Started moving {$a}.',
        dashboardresizebegin: 'Started resizing {$a}.',
        dashboardmovecommitted: 'Item moved to row {$a->row}, column {$a->column}.',
        dashboardresizecommitted: 'Item resized to {$a->columns} columns by {$a->rows} rows.',
        dashboardminimumsize: 'Minimum block size reached: {$a}.',
        dashboardoperationdiscarded: 'Operation discarded.',
        dashboardblockadded: '{$a} block added.',
        dashboardblockremoved: '{$a} block deleted.',
    },
    block: {
        moveblock: 'Move {$a} block',
        deleteblock: 'Delete {$a} block',
        deletecheck: 'Delete {$a} block?',
        deleteblockcheck: 'This will delete the block {$a}.',
    },
};

beforeEach(() => {
    Object.entries(strings).forEach(([component, map]) => {
        Object.entries(map).forEach(([key, value]) => mockString(key, component, value));
    });
    // The global string mock ignores placeholder parameters; the application relies on them, so
    // resolve through M.util.get_string (whose mock does substitute them) instead.
    jest.spyOn(stringUtils, 'getRequestedStrings').mockImplementation(requests => requests.map(
        ({key, component = 'core', param}) => Promise.resolve(
            (globalThis as unknown as {M: {util: {get_string: (k: string, c: string, p?: unknown) => string}}})
                .M.util.get_string(key, component, param ?? undefined),
        ),
    ));
});

const icons: DashboardIcons = {
    move: '<i class="icon fa fa-arrows-up-down-left-right fa-fw" aria-hidden="true"></i>',
    resize: '<i class="icon fa fa-up-right-and-down-left-from-center fa-fw" aria-hidden="true"></i>',
    add: '<i class="icon fa fa-plus fa-fw" aria-hidden="true"></i>',
    up: '<i class="icon fa fa-arrow-up fa-fw" aria-hidden="true"></i>',
    down: '<i class="icon fa fa-arrow-down fa-fw" aria-hidden="true"></i>',
    left: '<i class="icon fa fa-arrow-left fa-fw" aria-hidden="true"></i>',
    right: '<i class="icon fa fa-arrow-right fa-fw" aria-hidden="true"></i>',
    edit: '<i class="icon fa fa-pen fa-fw" aria-hidden="true"></i>',
    undo: '<i class="icon fa fa-rotate-left fa-fw" aria-hidden="true"></i>',
    reset: '<i class="icon fa fa-arrow-rotate-left fa-fw" aria-hidden="true"></i>',
    remove: '<i class="icon fa fa-minus fa-fw" aria-hidden="true"></i>',
    menu: '<i class="icon fa fa-ellipsis-vertical fa-fw" aria-hidden="true"></i>',
};


/**
 * Two side-by-side blocks with a free column between them, wide enough apart that moving the
 * first one right by a single column cannot collide with the second.
 */
const baseLayout: LayoutItem[] = [
    {id: 101, column: 0, row: 0, columns: 2, rows: 2},
    {id: 102, column: 3, row: 0, columns: 2, rows: 2},
];

const secondBlockOnly = [
    {
        id: 102, name: 'online_users', title: 'Second block', content: '<p>Second</p>',
        footer: '', region: 'content', weight: 1, actions: [], visible: true,
    },
];

const buildData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
    blocks: [
        {
            id: 101, name: 'html', title: 'First block', content: '<p>First</p>',
            footer: '', region: 'content', weight: 0, actions: [], visible: true,
        },
        {
            id: 102, name: 'online_users', title: 'Second block', content: '<p>Second</p>',
            footer: '', region: 'content', weight: 1, actions: [], visible: true,
        },
    ],
    layout: baseLayout,
    availableblocks: [{name: 'calendar_month', title: 'Calendar'}],
    canedit: true,
    caneditdefault: false,
    editing: true,
    sitedefault: false,
    limits: DEFAULT_LIMITS,
    icons,
    javascript: '',
    ...overrides,
});

/** Route fetchOne by methodname to whichever fixture/queue applies. */
const mockDashboardApi = (options: {
    getResponses: DashboardData[];
    updateImpl?: (action: string, args: Record<string, unknown>) => Promise<{status: boolean; blockid: number}>;
}) => {
    const {getResponses, updateImpl} = options;
    let getCallCount = 0;
    const fetchOneSpy = jest.spyOn(Ajax, 'fetchOne');
    fetchOneSpy.mockImplementation((request: {methodname: string; args?: Record<string, unknown>}) => {
        if (request.methodname === 'core_my_get_dashboard') {
            const response = getResponses[Math.min(getCallCount, getResponses.length - 1)];
            getCallCount += 1;
            return Promise.resolve(response);
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

const findSaveCall = (fetchOneSpy: jest.SpyInstance) => fetchOneSpy.mock.calls.find(([request]) =>
    (request as {methodname: string}).methodname === 'core_my_update_dashboard');

describe('core_my Dashboard application', () => {
    it('loads and renders the dashboard from the server', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        expect(await screen.findByText('First block')).toBeInTheDocument();
        expect(screen.getByText('Second block')).toBeInTheDocument();
    });

    it('fetches its strings through core/str rather than reading them from the payload', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        expect(await screen.findByRole('button', {name: 'Add block'})).toBeInTheDocument();
        expect(stringUtils.getRequestedStrings).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({key: 'dashboardaddblock', component: 'my'}),
            expect.objectContaining({key: 'addblock', component: 'core'}),
        ]));
    });

    it('shows an error message when the initial load fails', async() => {
        jest.spyOn(Ajax, 'fetchOne').mockImplementation(() => Promise.reject(new Error('Network is down')));

        render(<Dashboard />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Network is down');
    });

    it('shows the server\'s message when a web service call fails', async() => {
        // Web service failures reject with Moodle's plain error object, not an Error instance.
        jest.spyOn(Ajax, 'fetchOne').mockImplementation(() => Promise.reject({
            message: 'Can\'t find data record in database table external_functions.',
            errorcode: 'invalidrecord',
        }));

        render(<Dashboard />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Can\'t find data record');
    });

    it('commits a keyboard move and persists the new canonical layout', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        const moveHandle = await screen.findByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await waitFor(() => expect(findSaveCall(fetchOneSpy)).toBeDefined());

        const args = (findSaveCall(fetchOneSpy)![0] as {args: {action: string; layout: LayoutItem[]}}).args;
        expect(args.action).toBe('save');
        const moved = args.layout.find(item => item.id === 101);
        expect(moved).toMatchObject({column: 1, row: 0});
    });

    it('undoes the last move from the edit bar by saving the layout from before it', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        const undo = await screen.findByRole('button', {name: 'Undo'});
        expect(undo).toBeDisabled();
        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });
        await waitFor(() => expect(screen.getByRole('button', {name: 'Undo'})).toBeEnabled());

        await act(async() => {
            fireEvent.click(screen.getByRole('button', {name: 'Undo'}));
        });

        const saves = () => fetchOneSpy.mock.calls.filter(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_update_dashboard');
        await waitFor(() => expect(saves()).toHaveLength(2));
        const restored = (saves()[1][0] as {args: {layout: LayoutItem[]}}).args.layout;
        expect(restored.find(item => item.id === 101)).toMatchObject({column: 0, row: 0});
        await waitFor(() => expect(screen.getByRole('button', {name: 'Undo'})).toBeDisabled());
    });

    it('deletes a block in place after a danger confirmation, closing the gap it leaves', async() => {
        const deleteAction = {
            key: 'delete',
            label: 'Delete First block block',
            url: 'https://example.com/delete',
            icon: '',
            attributes: '{}',
            danger: true,
        };
        const [first, second] = buildData().blocks;
        const before = buildData({
            blocks: [{...first, actions: [deleteAction]}, second],
            layout: [
                {id: 101, column: 0, row: 0, columns: 2, rows: 2},
                {id: 102, column: 0, row: 2, columns: 2, rows: 2},
            ],
        });
        // The server returns the layout as it was, with the gap the deleted block left.
        const after = buildData({blocks: [second], layout: [{id: 102, column: 0, row: 2, columns: 2, rows: 2}]});
        const fetchOneSpy = mockDashboardApi({getResponses: [before, after]});

        render(<Dashboard />);

        fireEvent.click(await screen.findByRole('button', {name: 'Delete First block block'}));
        const dialog = await screen.findByRole('dialog', {name: 'Delete First block block?'});
        expect(dialog).toHaveAccessibleDescription('This will delete the block First block.');
        const confirm = within(dialog).getByRole('button', {name: 'Delete'});
        expect(confirm).toHaveAttribute('data-variant', 'danger');
        expect(within(dialog).getByRole('button', {name: 'Cancel'})).toHaveAttribute('data-variant', 'outline-secondary');

        await act(async() => {
            fireEvent.click(confirm);
        });

        const updates = () => fetchOneSpy.mock.calls
            .map(([request]) => request as {methodname: string; args: {action: string; blockid: number; layout: LayoutItem[]}})
            .filter(request => request.methodname === 'core_my_update_dashboard');
        await waitFor(() => expect(updates()).toHaveLength(2));
        expect(updates()[0].args).toMatchObject({action: 'remove', blockid: 101});
        expect(updates()[1].args.action).toBe('save');
        expect(updates()[1].args.layout).toEqual([{id: 102, column: 0, row: 0, columns: 2, rows: 2}]);
        await waitFor(() => expect(document.querySelector('[aria-live="polite"]'))
            .toHaveTextContent('First block block deleted.'));
        expect(screen.queryByText('First block')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Add block'})).toHaveFocus();
    });

    it('keeps the block when the deletion is cancelled', async() => {
        const deleteAction = {
            key: 'delete', label: 'Delete First block block', url: '', icon: '', attributes: '{}', danger: true,
        };
        const [first, second] = buildData().blocks;
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData({blocks: [{...first, actions: [deleteAction]}, second]})]});

        render(<Dashboard />);

        fireEvent.click(await screen.findByRole('button', {name: 'Delete First block block'}));
        const dialog = await screen.findByRole('dialog', {name: 'Delete First block block?'});
        fireEvent.click(within(dialog).getByRole('button', {name: 'Cancel'}));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('First block')).toBeInTheDocument();
        expect(findSaveCall(fetchOneSpy)).toBeUndefined();
    });

    it('moves with the arrow keys alone, announcing each step', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        const moveHandle = await screen.findByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        // The on-screen direction controls are for a click or a tap, not the keyboard.
        expect(screen.queryByRole('group', {name: 'Move block controls'})).not.toBeInTheDocument();
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        });
        await waitFor(() => expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Row 2, column 1'));
    });

    it('discards a keyboard interaction on Escape without saving', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        const moveHandle = await screen.findByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        fireEvent.keyDown(moveHandle, {key: 'ArrowRight'});
        fireEvent.keyDown(moveHandle, {key: 'Escape'});

        expect(findSaveCall(fetchOneSpy)).toBeUndefined();
    });

    it('rejects a keyboard resize that would fall below the minimum tile size', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        // Both tiles' resize handles share the generic "Resize block" label; scope to the first
        // block's own tile to disambiguate.
        const firstTile = await screen.findByRole('region', {name: 'First block block'});
        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        // The first block is 2 rows tall; the minimum is 2, so shrinking up once more is rejected.
        fireEvent.keyDown(resizeHandle, {key: 'ArrowUp'});
        await act(async() => {
            fireEvent.keyDown(resizeHandle, {key: ' '});
        });

        // Committing still saves (Space always commits the current draft) - but the rejected
        // shrink left the draft's row span unchanged at 2, proving the minimum-size guard, not
        // the commit path itself, is what's under test here.
        const args = (findSaveCall(fetchOneSpy)![0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 101)?.rows).toBe(2);
    });

    it('enforces the server\'s grid limits: a keyboard move cannot push a block past the row ceiling', async() => {
        // A deliberately tiny grid: four rows tall, so a two-row block can start at row 2 at most.
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData({limits: {...DEFAULT_LIMITS, maxrows: 4}})]});

        render(<Dashboard />);

        const moveHandle = await screen.findByRole('button', {name: 'Move First block block'});
        fireEvent.keyDown(moveHandle, {key: ' '});
        for (let press = 0; press < 10; press++) {
            fireEvent.keyDown(moveHandle, {key: 'ArrowDown'});
        }
        await act(async() => {
            fireEvent.keyDown(moveHandle, {key: ' '});
        });

        await waitFor(() => expect(findSaveCall(fetchOneSpy)).toBeDefined());
        const args = (findSaveCall(fetchOneSpy)![0] as {args: {layout: LayoutItem[]}}).args;
        const moved = args.layout.find(item => item.id === 101)!;
        expect(moved.row + moved.rows).toBeLessThanOrEqual(4);
        // Nothing is above it in its columns, so it rises back to the top once dropped.
        expect(moved.row).toBe(0);
    });

    it('enforces the server\'s grid limits: a keyboard resize cannot grow a block past the row ceiling', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData({limits: {...DEFAULT_LIMITS, maxrows: 3}})]});

        render(<Dashboard />);

        const firstTile = await screen.findByRole('region', {name: 'First block block'});
        const resizeHandle = within(firstTile).getByRole('button', {name: 'Resize block'});
        fireEvent.keyDown(resizeHandle, {key: ' '});
        for (let press = 0; press < 10; press++) {
            fireEvent.keyDown(resizeHandle, {key: 'ArrowDown'});
        }
        await act(async() => {
            fireEvent.keyDown(resizeHandle, {key: ' '});
        });

        await waitFor(() => expect(findSaveCall(fetchOneSpy)).toBeDefined());
        const args = (findSaveCall(fetchOneSpy)![0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 101)?.rows).toBe(3);
    });

    // A full pixel-based pointer drag (pointerdown, a pointermove past the drag threshold, then
    // pointerup committing a new cell) is not exercised here: jsdom's PointerEvent support does
    // not propagate clientX/clientY through dispatched events, so the drag-distance math in
    // pointerDown's `move` handler has no reliable pixel input to work from in this environment.
    // The "no movement at all" path below (a plain click) does not depend on those coordinates and
    // is covered; the drag-distance-to-grid-cell math itself is covered directly by the pure
    // layout.ts helpers it delegates to (see layout.test.ts), which pointerDown's own comment
    // documents as the same clamping logic shift()/keyDown exercise here via the keyboard.
    it('reveals move/resize controls on a plain pointer click that never drags', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        render(<Dashboard />);

        const moveHandle = await screen.findByRole('button', {name: 'Move First block block'});
        await act(async() => {
            fireEvent.pointerDown(moveHandle, {clientX: 0, clientY: 0});
            fireEvent.pointerUp(window);
        });

        expect(screen.getByRole('group', {name: 'Move block controls'})).toBeInTheDocument();
    });

    it('merges empty space into regions at rest, and shows every cell once a block is picked up', async() => {
        mockDashboardApi({getResponses: [buildData()]});

        const {container} = render(<Dashboard />);
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));

        // Two 2 x 2 blocks with a one-column gap and two columns free on the right: two regions.
        expect(container.querySelectorAll('.core-my-grid-cell--available')).toHaveLength(2);
        expect(container.querySelector('.core-my-grid-cell--active')).toBeNull();

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        await act(async() => {
            fireEvent.pointerDown(moveHandle, {clientX: 0, clientY: 0});
            fireEvent.pointerUp(window);
        });

        // Two rows plus the spare row a move adds, six columns each.
        expect(container.querySelectorAll('.core-my-grid-cell--placing')).toHaveLength(18);
        expect(container.querySelector('.core-my-grid-cell--available')).toBeNull();
    });

    it('places a block picked up by a click in the cell clicked next', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData()]});

        const {container} = render(<Dashboard />);
        await waitFor(() => expect(container.querySelector('.core-my-grid-cell--available')).not.toBeNull());

        const moveHandle = screen.getByRole('button', {name: 'Move First block block'});
        await act(async() => {
            fireEvent.pointerDown(moveHandle, {clientX: 0, clientY: 0});
            fireEvent.pointerUp(window);
        });
        // Under the second block, so the first one has nothing to rise into once it is placed.
        const target = container.querySelector<HTMLElement>(
            '.core-my-grid-cell--placing[style*="grid-column: 4 /"][style*="grid-row: 3 /"]')!;
        expect(target).not.toBeNull();
        await act(async() => {
            fireEvent.click(target);
        });

        await waitFor(() => expect(findSaveCall(fetchOneSpy)).toBeDefined());
        const args = (findSaveCall(fetchOneSpy)![0] as {args: {layout: LayoutItem[]}}).args;
        expect(args.layout.find(item => item.id === 101)).toMatchObject({column: 3, row: 2});
    });

    describe('adding a block through the standard "Add a block" modal', () => {
        interface FakeModalForm {
            config: unknown;
            show: jest.Mock;
            submit: () => void;
        }

        /**
         * Stand-ins for the core AMD modules the add flow loads (core/modal_cancel, core/templates
         * and core_form/modalform), close enough to the real ones that the flow can be driven: the
         * template fake renders the links core/add_block_body renders, into a modal root in the
         * document.
         */
        const mockCoreModules = () => {
            const root = document.createElement('div');
            root.className = 'modal';
            document.body.appendChild(root);
            const modal = {
                getRoot: () => ({get: () => root}),
                setBody: jest.fn((body: Promise<string>) => body.then(html => {
                    root.innerHTML = html;
                    return undefined;
                })),
                show: jest.fn(),
                destroy: jest.fn(() => root.remove()),
            };
            const CancelModal = {create: jest.fn(() => Promise.resolve(modal))};
            const Templates = {
                render: jest.fn((_template: string, context: {
                    blocks: {name: string; title: string; blockform: string | null}[];
                    url: string;
                }) => Promise.resolve(context.blocks.map(block =>
                    `<a href="${context.url}&bui_addblock=${block.name}" data-blockname="${block.name}"` +
                    (block.blockform ? ` data-action="showaddblockform" data-blockform="${block.blockform}"` : '') +
                    `>${block.title}</a>`).join(''))),
            };
            const forms: FakeModalForm[] = [];
            class ModalForm implements FakeModalForm {
                events = {FORM_SUBMITTED: 'core_form_modalform_formsubmitted'};
                listeners: (() => void)[] = [];
                show = jest.fn();
                constructor(public config: unknown) {
                    forms.push(this);
                }
                addEventListener(_name: string, listener: () => void): void {
                    this.listeners.push(listener);
                }
                submit(): void {
                    this.listeners.forEach(listener => listener());
                }
            }
            const modules: Record<string, unknown> = {
                'core/modal_cancel': CancelModal,
                'core/templates': Templates,
                'core_form/modalform': ModalForm,
            };
            (requireManyAsync as jest.Mock).mockImplementation((names: string[]) =>
                Promise.resolve(names.map(name => modules[name])));
            return {root, modal, CancelModal, Templates, forms};
        };

        const newBlock = {
            id: 103, name: 'calendar_month', title: 'Calendar', content: '<p>Cal</p>',
            footer: '', region: 'content', weight: 2, actions: [], visible: true,
        };
        const afterAdd = () => buildData({
            blocks: [...buildData().blocks, newBlock],
            layout: [...baseLayout, {id: 103, column: 0, row: 2, columns: 2, rows: 2}],
        });
        const saveCalls = (fetchOneSpy: jest.SpyInstance) => fetchOneSpy.mock.calls
            .map(([request]) => request as {methodname: string; args: {action: string; layout?: LayoutItem[]}})
            .filter(request => request.methodname === 'core_my_update_dashboard');

        afterEach(() => {
            (requireManyAsync as jest.Mock).mockReset();
            document.body.innerHTML = '';
        });

        it('places a newly added block into the specific empty cell that was clicked', async() => {
            const newBlock = {
                id: 103, name: 'calendar_month', title: 'Calendar', content: '<p>Cal</p>',
                footer: '', region: 'content', weight: 2, actions: [], visible: true,
            };
            // The server appends the new block wherever it likes (here, far from where the user
            // clicked) - the client is expected to notice and immediately re-save it into the cell.
            const afterAdd = buildData({
                blocks: [...buildData().blocks, newBlock],
                layout: [...baseLayout, {id: 103, column: 0, row: 6, columns: 2, rows: 2}],
            });
            const fetchOneSpy = mockDashboardApi({
                getResponses: [buildData(), afterAdd],
                updateImpl: (action) => Promise.resolve({status: true, blockid: action === 'add' ? 103 : 0}),
            });

            mockCoreModules();
            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            // The column-count measurement effect (ResizeObserver + an immediate manual measure())
            // runs after the grid first mounts, one render after the block text itself appears -
            // wait for it, so the empty cell this test targets (column index 2) actually exists yet.
            await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
                .toHaveAttribute('data-columns', '6'));

            const emptyCell = await screen.findByRole('button', {name: 'Add a block here, Row 1, column 3'});
            fireEvent.click(emptyCell);
            fireEvent.click(await screen.findByText('Calendar', {selector: 'a[data-blockname]'}));

            await waitFor(() => {
                const calls = fetchOneSpy.mock.calls.filter(([request]) =>
                    (request as {methodname: string}).methodname === 'core_my_update_dashboard');
                expect(calls).toHaveLength(2);
            });
            const calls = fetchOneSpy.mock.calls.filter(([request]) =>
                (request as {methodname: string}).methodname === 'core_my_update_dashboard');
            const [, secondCall] = calls;
            const args = (secondCall[0] as {args: {action: string; layout: LayoutItem[]}}).args;
            expect(args.action).toBe('save');
            // The hole between the two fixture blocks is one column wide, so the block is sized to
            // it rather than shoving its neighbour aside.
            const placed = args.layout.find(item => item.id === 103);
            expect(placed).toMatchObject({column: 2, row: 0, columns: 1});
            expect(args.layout.find(item => item.id === 102)).toMatchObject({column: 3, row: 0});
        });

        it('opens the core modal with core/add_block_body and places the chosen block at the start', async() => {
            const {modal, CancelModal, Templates} = mockCoreModules();
            const fetchOneSpy = mockDashboardApi({
                getResponses: [buildData(), afterAdd()],
                updateImpl: () => Promise.resolve({status: true, blockid: 103}),
            });

            render(<Dashboard pagehash="abc123" />);
            const trigger = await screen.findByRole('button', {name: 'Add block'});
            fireEvent.click(trigger);

            await waitFor(() => expect(modal.show).toHaveBeenCalled());
            expect(CancelModal.create).toHaveBeenCalledWith({title: 'Add a block', returnElement: trigger});
            expect(Templates.render).toHaveBeenCalledWith('core/add_block_body', expect.objectContaining({
                blocks: [{name: 'calendar_month', title: 'Calendar', blockform: null}],
                blockregion: 'content',
                pagehash: 'abc123',
                url: expect.stringContaining('bui_addblock='),
            }));

            fireEvent.click(await screen.findByText('Calendar', {selector: 'a[data-blockname]'}));

            expect(modal.destroy).toHaveBeenCalled();
            await waitFor(() => expect(saveCalls(fetchOneSpy)).toHaveLength(2));
            const [addCall, saveCall] = saveCalls(fetchOneSpy);
            expect(addCall.args).toMatchObject({action: 'add', blockname: 'calendar_month'});
            expect(saveCall.args.action).toBe('save');
            expect(saveCall.args.layout!.find(item => item.id === 103)).toMatchObject({column: 0, row: 0});
        });

        it('offers the standard end-of-grid add block button, which places the block below everything', async() => {
            const {modal} = mockCoreModules();
            const fetchOneSpy = mockDashboardApi({
                getResponses: [buildData(), afterAdd()],
                updateImpl: () => Promise.resolve({status: true, blockid: 103}),
            });

            const {container} = render(<Dashboard />);
            await screen.findByText('First block');
            const wrapper = container.querySelector('[data-region="add-block-button"]')!;
            const link = within(wrapper as HTMLElement).getByRole('link', {name: 'Add a block'});
            expect(link).toHaveClass('btn-add-content');
            expect(link).not.toHaveAttribute('data-key');
            fireEvent.click(link);

            await waitFor(() => expect(modal.show).toHaveBeenCalled());
            fireEvent.click(await screen.findByText('Calendar', {selector: 'a[data-blockname]'}));

            await waitFor(() => expect(screen.getByText('Cal')).toBeInTheDocument());
            await waitFor(() => expect(saveCalls(fetchOneSpy).map(call => call.args.action)).toEqual(['add', 'save']));
            expect(saveCalls(fetchOneSpy)[1].args.layout!.find(item => item.id === 103)).toMatchObject({column: 0, row: 2});
        });

        it('adds a block type with its own form through core_form/modalform, then places it', async() => {
            const {forms} = mockCoreModules();
            const textBlock = {
                id: 103, name: 'html', title: 'Notes', content: '<p>Things</p>',
                footer: '', region: 'content', weight: 2, actions: [], visible: true,
            };
            const fetchOneSpy = mockDashboardApi({
                getResponses: [
                    buildData({availableblocks: [{name: 'html', title: 'Text', blockform: 'block_html_edit_form'}]}),
                    buildData({
                        blocks: [...buildData().blocks, textBlock],
                        layout: [...baseLayout, {id: 103, column: 1, row: 2, columns: 3, rows: 3}],
                    }),
                ],
            });

            render(<Dashboard pagehash="abc123" />);
            fireEvent.click(await screen.findByRole('button', {name: 'Add block'}));
            fireEvent.click(await screen.findByText('Text', {selector: 'a[data-blockname]'}));

            await waitFor(() => expect(forms).toHaveLength(1));
            expect(forms[0].config).toMatchObject({
                formClass: 'block_html_edit_form',
                args: {blockname: 'html', pagehash: 'abc123', blockregion: 'content'},
            });
            expect(forms[0].show).toHaveBeenCalled();
            // The form creates the block itself: nothing has been asked of the grid's web service.
            expect(saveCalls(fetchOneSpy)).toHaveLength(0);

            await act(async() => {
                forms[0].submit();
            });

            await screen.findByText('Things');
            await waitFor(() => expect(saveCalls(fetchOneSpy)).toHaveLength(1));
            const [saveCall] = saveCalls(fetchOneSpy);
            expect(saveCall.args.action).toBe('save');
            expect(saveCall.args.layout!.find(item => item.id === 103)).toMatchObject({column: 0, row: 0});
        });

        it('adds a form block unconfigured when the page has no edited-page hash to offer the form', async() => {
            mockCoreModules();
            const fetchOneSpy = mockDashboardApi({
                getResponses: [
                    buildData({availableblocks: [{name: 'html', title: 'Text', blockform: 'block_html_edit_form'}]}),
                    afterAdd(),
                ],
            });

            render(<Dashboard />);
            fireEvent.click(await screen.findByRole('button', {name: 'Add block'}));
            fireEvent.click(await screen.findByText('Text', {selector: 'a[data-blockname]'}));

            await waitFor(() => expect(saveCalls(fetchOneSpy).length).toBeGreaterThan(0));
            expect(saveCalls(fetchOneSpy)[0].args).toMatchObject({action: 'add', blockname: 'html'});
        });

        it('runs only the latest reload\'s collected block JS, not a superseded one', async() => {
            mockCoreModules();
            const modalModules = (requireManyAsync as jest.Mock).getMockImplementation()!;
            const firstData = buildData({javascript: 'window.__ran = "first";'});
            const secondData = buildData({
                javascript: 'window.__ran = "second";',
                blocks: [...buildData().blocks, newBlock],
                layout: [...baseLayout, {id: 103, column: 0, row: 2, columns: 2, rows: 2}],
            });
            mockDashboardApi({getResponses: [firstData, secondData]});

            const runTemplateJS = jest.fn();
            const processCollectedJavascript = jest.fn((source: string) => source);
            let resolveFirst: (modules: unknown[]) => void;
            const firstRequire = new Promise(resolve => {
                resolveFirst = resolve;
            });
            const secondRequire = Promise.resolve([{processCollectedJavascript}, {runTemplateJS}]);
            let collectedLoads = 0;
            (requireManyAsync as jest.Mock).mockImplementation((names: string[]) => {
                if (!names.includes('core/fragment')) {
                    return modalModules(names);
                }
                collectedLoads += 1;
                return collectedLoads === 1 ? firstRequire : secondRequire;
            });

            render(<Dashboard />);

            // Trigger a second load (adding a block reloads the dashboard) while the first load's
            // collected-JS promise is still unresolved: a slow first response overtaken by a second.
            fireEvent.click(await screen.findByRole('button', {name: 'Add block'}));
            fireEvent.click(await screen.findByText('Calendar', {selector: 'a[data-blockname]'}));
            await screen.findByRole('heading', {name: 'Calendar'});

            // Now let the superseded first load's collected-JS resolve.
            await act(async() => {
                resolveFirst([{processCollectedJavascript}, {runTemplateJS}]);
                await secondRequire;
            });

            expect(runTemplateJS).toHaveBeenCalledTimes(1);
            expect(runTemplateJS).toHaveBeenCalledWith('window.__ran = "second";');
        });
    });

    it('keeps the dashboard pending until the grid\'s DOM mutations from a reload settle', async() => {
        const data = buildData({javascript: 'window.__ran = "settle-mutate";'});
        mockDashboardApi({getResponses: [data]});
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
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

    it('settles quickly when a reload causes no DOM mutations at all', async() => {
        const data = buildData({javascript: 'window.__ran = "settle-quiet";'});
        mockDashboardApi({getResponses: [data]});
        (requireManyAsync as jest.Mock).mockImplementation(() => Promise.resolve([
            {processCollectedJavascript: (source: string) => source},
            {runTemplateJS: jest.fn()},
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

    it('measures the column count once the grid exists, even when the strings arrive after the data', async() => {
        mockDashboardApi({getResponses: [buildData()]});
        // Hold the strings back until after the dashboard payload has been applied.
        let releaseStrings: () => void = () => undefined;
        const gate = new Promise<void>(resolve => {
            releaseStrings = resolve;
        });
        jest.spyOn(stringUtils, 'getRequestedStrings').mockImplementation(requests => requests.map(
            ({key, component = 'core', param}) => gate.then(() =>
                (globalThis as unknown as {M: {util: {get_string: (k: string, c: string, p?: unknown) => string}}})
                    .M.util.get_string(key, component, param ?? undefined)),
        ));

        const {container} = render(<Dashboard />);
        await waitFor(() => expect(Ajax.fetchOne).toHaveBeenCalled());
        expect(container.querySelector('.core-my-dashboard-grid')).toBeNull();

        await act(async() => {
            releaseStrings();
            await gate;
        });

        await screen.findByText('First block');
        await waitFor(() => expect(container.querySelector('.core-my-dashboard-grid'))
            .toHaveAttribute('data-columns', '6'));
    });

    it('fetches the site default when told so by its props, whatever the URL', async() => {
        const fetchOneSpy = mockDashboardApi({getResponses: [buildData({sitedefault: true})]});

        render(<Dashboard siteDefault />);
        await screen.findByText('First block');

        const getCall = fetchOneSpy.mock.calls.find(([request]) =>
            (request as {methodname: string}).methodname === 'core_my_get_dashboard')!;
        expect((getCall[0] as {args: {sitedefault: boolean}}).args.sitedefault).toBe(true);
    });

    it('reports a rendering failure in place and keeps the reset control reachable', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const reset = jest.fn();
        const Broken = () => {
            throw new Error('Unable to place dashboard block.');
        };

        render(<DashboardErrorBoundary resetLabel="Reset page to default" onReset={reset}>
            <Broken />
        </DashboardErrorBoundary>);

        expect(screen.getByRole('alert')).toHaveTextContent('Unable to place dashboard block.');
        fireEvent.click(screen.getByRole('button', {name: 'Reset page to default'}));
        expect(reset).toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
