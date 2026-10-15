// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Tests for the replaceable dashboard grid components.
 *
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {fireEvent, render, screen} from '@testing-library/react';
import type React from 'react';
import GridCell from '../src/components/GridCell';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import DashboardTile, {BlockActionsMenu} from '../src/components/DashboardTile';
import DashboardHandle from '../src/components/DashboardHandle';
import DashboardLoading from '../src/components/DashboardLoading';
import {DashboardScopeBanner} from '../src/index';
import type {DashboardLabels} from '../src/repository';
import type {LayoutItem} from '../src/layout';

// Jsdom has no ResizeObserver; DashboardLoading's positioned-grid mode measures the mount
// point's width the same way the real dashboard grid does.
class StubResizeObserver {
    observe(): void {
        // No-op: width comes from the getBoundingClientRect stub in the relevant test.
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

// Jsdom's layout is a no-op, so every element measures as a zero-size box by default. Pin a wide
// width so columnsForWidth resolves to the full six columns the positioned-loading test below
// is written for.
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

jest.mock('@moodlehq/design-system', () => {
    const ReactActual = require('react');
    return {
        ...require('./mdsDropdownMock'),
        Button: ReactActual.forwardRef((
            {label, startIcon, size, variant: _variant, className, ...props}:
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
            className={`mds-btn--size-${size} ${className ?? ''}`}
            {...props}
        >{startIcon}{label}</button>),
        Badge: ({label, variant: _variant, subtle: _subtle, pill: _pill, ...props}:
        React.HTMLAttributes<HTMLSpanElement> & {label?: string; variant?: string; subtle?: boolean; pill?: boolean}) =>
            <span {...props}>{label}</span>,
        Link: ({label, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {label?: string}) =>
            <a {...props}>{label}</a>,
    };
}, {virtual: true});

const labels = {
    blockactions: 'More actions for {$a}',
    retry: 'Retry',
    savefailed: 'Your changes could not be saved.',
    saveoffline: 'You are offline.',
    saveretrying: 'Trying again.',
    done: 'Done',
    cancel: 'Cancel',
    moveinstructions: 'Use the arrow keys to move',
    resize: 'Resize {$a}',
    resizeinstructions: 'Use the arrow keys to resize',
    positionmove: 'Move',
    positionresize: 'Resize',
    positionup: 'Up',
    positiondown: 'Down',
    positionleft: 'Left',
    positionright: 'Right',
    positionwider: 'Wider',
    positionnarrower: 'Narrower',
    positiontaller: 'Taller',
    positionshorter: 'Shorter',
    positionedge: 'At the edge of the dashboard',
    positionminimum: 'Already the smallest size for this block',
    positiondisplaces: 'Moves {$a} aside',
    scopeown: 'Editing your dashboard',
    scopesitedefault: 'Editing the default dashboard for all users',
    switchtoown: 'Switch to editing your dashboard',
    switchtositedefault: 'Switch to editing the default dashboard for all users',
} as DashboardLabels;

const urls = {
    ownpage: 'https://example.com/my/index.php',
    sitedefault: 'https://example.com/my/indexsys.php',
};

describe('core_my grid components', () => {
    it('leaves block content alone when a tile re-renders, so block JS keeps what it built', () => {
        const block = {
            id: 9, name: 'recentlyaccesseditems', title: 'Recent', content: '<div class="skeleton">Loading</div>',
            footer: '<p>Footer</p>', region: 'content', weight: 0, actions: [],
        };
        const props = {
            labels: {
                ...labels,
                move: 'Move {$a} block',
                remove: 'Delete {$a} block',
                resize: 'Resize {$a}',
                tile: '{$a} block',
            } as DashboardLabels,
            editing: true,
            onStart: jest.fn(),
            onKeyDown: jest.fn(),
            onPointerDown: jest.fn(),
            onCommit: jest.fn(),
            onRemove: jest.fn(),
        };
        const {container, rerender} = render(<DashboardTile
            {...props}
            block={block}
            item={{id: 9, column: 0, row: 0, columns: 2, rows: 2}}
        />);

        // The block's own JavaScript replaces its server-rendered placeholder.
        const content = container.querySelector('.core-my-dashboard-tile__content')!;
        content.innerHTML = '<ul class="loaded"><li>Course 1</li></ul>';
        const footer = container.querySelector('.core-my-dashboard-tile__block-footer')!;
        footer.innerHTML = '<p>Updated footer</p>';

        // A drag re-renders the tile with a new position (and a new, equal block object).
        rerender(<DashboardTile
            {...props}
            block={{...block}}
            item={{id: 9, column: 1, row: 0, columns: 2, rows: 2}}
            activeMode="move"
        />);

        expect(content.querySelector('.loaded')).not.toBeNull();
        expect(content.querySelector('.skeleton')).toBeNull();
        expect(footer.textContent).toBe('Updated footer');
    });

    it('offers an empty region as one positioned button, named with where it starts', () => {
        const activate = jest.fn();
        render(<GridCell
            column={2}
            row={3}
            columns={2}
            rows={1}
            label="Empty space, row {$a->row}, column {$a->column}. Add a block here."
            addLabel="Add a block here"
            onActivate={activate}
        />);

        const region = screen.getByRole('button', {name: 'Empty space, row 4, column 3. Add a block here.'});
        expect(region).toHaveStyle({gridColumn: '3 / span 2', gridRow: '4 / span 1'});
        region.focus();
        expect(region).toHaveFocus();

        fireEvent.click(region);
        expect(activate).toHaveBeenCalledWith(2, 3, 2, 1);
    });

    it('shows every place to put a picked-up block, with its label, not only on hover or focus', () => {
        render(<GridCell column={0} row={0} label="Move First block here" addLabel="Move here" placing />);

        const cell = screen.getByRole('button', {name: 'Move First block here'});
        expect(cell).toHaveClass('core-my-grid-cell--placing');
        expect(cell.querySelector('.core-my-grid-cell__label')).toHaveTextContent('Move here');
    });

    it('does not mark an empty region as a place to put a block when nothing is picked up', () => {
        render(<GridCell column={0} row={0} label="Empty space" addLabel="Add a block here" />);

        expect(screen.getByRole('button', {name: 'Empty space'})).not.toHaveClass('core-my-grid-cell--placing');
    });

    it('shows an "add a block here" cue without changing the accessible name', () => {
        render(<GridCell column={2} row={3} label="Empty space" addLabel="Add a block here" />);

        const cell = screen.getByRole('button', {name: 'Empty space'});
        expect(cell.querySelector('.core-my-grid-cell__icon')).toHaveAttribute('aria-hidden', 'true');
        const cue = cell.querySelector('.core-my-grid-cell__label');
        expect(cue).toHaveAttribute('aria-hidden', 'true');
        expect(cue).toHaveTextContent('Add a block here');
    });

    it('renders prospective placement without adding a focus target', () => {
        const {container} = render(<GridCell column={0} row={0} label="" addLabel="" prospective />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('exposes an icon move handle to pointer and keyboard input', () => {
        const start = jest.fn();
        const pointerDown = jest.fn();
        const keyDown = jest.fn();
        render(<DashboardHandle
            mode="move"
            label="Move Course overview block"
            instructionsId="move-instructions"
            active={false}
            onStart={start}
            onKeyDown={keyDown}
            onPointerDown={pointerDown}
            onCommit={jest.fn()}
        />);

        const handle = screen.getByRole('button', {name: 'Move Course overview block'});
        expect(handle).toHaveAttribute('aria-describedby', 'move-instructions');
        expect(handle).toHaveAttribute('aria-pressed', 'false');
        expect(handle.querySelector('.fa-grip-vertical')).toBeInTheDocument();
        fireEvent.pointerDown(handle, {clientX: 10, clientY: 10});
        expect(pointerDown).toHaveBeenCalled();
        expect(handle).toHaveFocus();
        fireEvent.keyDown(handle, {key: 'Enter'});
        expect(keyDown).toHaveBeenCalled();
    });

    it('picks a block up when assistive technology activates the handle, with no direction buttons', () => {
        const start = jest.fn();
        const commit = jest.fn();
        const {rerender} = render(<DashboardHandle
            mode="resize"
            label="Resize Course overview block"
            instructionsId="resize-instructions"
            active={false}
            onStart={start}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={commit}
        />);

        // A screen reader's double-tap is a click with no detail, and no key press.
        const handle = screen.getByRole('button', {name: 'Resize Course overview block'});
        fireEvent.click(handle, {detail: 0});
        expect(start).toHaveBeenCalledTimes(1);

        rerender(<DashboardHandle
            mode="resize"
            label="Resize Course overview block"
            instructionsId="resize-instructions"
            active
            onStart={start}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={commit}
        />);
        expect(screen.getAllByRole('button')).toHaveLength(1);
        fireEvent.pointerDown(handle);
        expect(commit).toHaveBeenCalled();
        fireEvent.blur(handle);
        expect(commit).toHaveBeenCalledTimes(2);
    });

    it('renders an accessible full-viewport loading skeleton without an initial layout', () => {
        const {container} = render(<DashboardLoading label="Loading" />);

        expect(screen.getByRole('status', {name: 'Loading'})).toHaveAttribute('aria-busy', 'true');
        expect(container.querySelectorAll('.core-my-dashboard-loading__tile')).toHaveLength(6);
    });

    it('renders loading tiles positioned like the real grid when given an initial layout', () => {
        const {container} = render(<DashboardLoading label="Loading" layout={[
            {id: 1, column: 0, row: 0, columns: 3, rows: 4},
            {id: 2, column: 3, row: 0, columns: 1, rows: 4},
        ]} />);

        expect(screen.getByRole('status', {name: 'Loading'})).toHaveAttribute('aria-busy', 'true');
        const tiles = container.querySelectorAll('.core-my-dashboard-loading__tile--positioned');
        expect(tiles).toHaveLength(2);
        expect((tiles[0] as HTMLElement).style.gridColumn).toBe('1 / span 3');
        expect((tiles[1] as HTMLElement).style.gridColumn).toBe('4 / span 1');
    });

    it('renders block content without changing the tile accessible name', () => {
        render(<DashboardTile
            block={{
                id: 7,
                name: 'html',
                title: 'Useful links',
                content: '<p>Tile content</p>',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [],
                asynccontent: false, loaded: true,
                minsize: {columns: 1, rows: 2},
            }}
            item={{id: 7, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{...labels, tile: '{$a} block'} as DashboardLabels}
            editing={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        expect(screen.getByRole('region', {name: 'Useful links block'})).toBeInTheDocument();
        expect(screen.getByText('Tile content')).toBeInTheDocument();
    });

    it('keeps the block\'s own DOM nodes when the tile re-renders, so block JavaScript stays attached', () => {
        const block = {
            id: 9,
            name: 'myoverview',
            title: 'Course overview',
            content: '<div id="block-myoverview-root"><p>Loading</p></div>',
            footer: '<a href="#">Footer link</a>',
            region: 'content',
            weight: 0,
            actions: [],
            asynccontent: false, loaded: true,
        };
        const tile = (item: LayoutItem) => <DashboardTile
            block={{...block}}
            item={item}
            labels={{...labels, tile: '{$a} block'} as DashboardLabels}
            editing={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />;
        const {container, rerender} = render(tile({id: 9, column: 0, row: 0, columns: 3, rows: 5}));
        const root = container.querySelector('#block-myoverview-root')!;
        // What a block's init() does: mark its root and render into it.
        root.setAttribute('data-init', 'true');
        root.innerHTML = '<p>Course 1</p>';

        // A re-render with the same content, e.g. after the column count changed.
        rerender(tile({id: 9, column: 1, row: 2, columns: 2, rows: 5}));

        expect(container.querySelector('#block-myoverview-root')).toBe(root);
        expect(root).toHaveAttribute('data-init', 'true');
        expect(screen.getByText('Course 1')).toBeInTheDocument();
        expect(screen.getByText('Footer link')).toBeInTheDocument();
    });

    it('identifies the block the way the standard block markup does, for core_block/events', () => {
        const {container} = render(<DashboardTile
            block={{
                id: 12, name: 'timeline', title: 'Timeline', content: '<p>Events</p>', footer: '',
                region: 'content', weight: 0, actions: [], asynccontent: true, loaded: true, minsize: {columns: 1, rows: 2},
            }}
            item={{id: 12, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{...labels, tile: '{$a} block'} as DashboardLabels}
            editing={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        const tile = container.querySelector('.core-my-dashboard-tile')!;
        expect(tile).toHaveAttribute('data-instance-id', '12');
        expect(tile).toHaveAttribute('data-block', 'timeline');
    });

    it('wraps block content with the standard block classes so shared block CSS keeps applying', () => {
        const {container} = render(<DashboardTile
            block={{
                id: 8,
                name: 'calendar_month',
                title: 'Calendar',
                content: '<p>Tile content</p>',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [],
                asynccontent: false, loaded: true,
                minsize: {columns: 1, rows: 2},
            }}
            item={{id: 8, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{...labels, tile: '{$a} block'} as DashboardLabels}
            editing={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        const content = container.querySelector('.core-my-dashboard-tile__content');
        expect(content).toHaveClass('block', 'block_calendar_month');
        // data-blockregion lives on the tile wrapper (an ancestor of .block), matching how
        // Boost's block CSS selectors expect the two to relate (e.g. "[data-blockregion] .block").
        expect(container.querySelector('.core-my-dashboard-tile')).toHaveAttribute('data-blockregion');
    });

    it('marks a displaced tile for pointer-position easing', () => {
        render(<DashboardTile
            block={{
                id: 9,
                name: 'html',
                title: 'Useful links',
                content: '',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [],
                asynccontent: false, loaded: true,
                minsize: {columns: 1, rows: 2},
            }}
            item={{id: 9, column: 1, row: 1, columns: 2, rows: 2}}
            labels={{...labels, tile: '{$a} block'} as DashboardLabels}
            editing={false}
            shouldAnimatePosition
            isBumped
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        expect(screen.getByRole('region', {name: 'Useful links block'}))
            .toHaveAttribute('data-bumped', 'true');
    });

    it('renders large icon-only move, resize, and remove actions in edit mode', () => {
        render(<DashboardTile
            block={{
                id: 8,
                name: 'html',
                title: 'Useful links',
                content: '<p>Tile content</p>',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [],
                asynccontent: false, loaded: true,
                minsize: {columns: 1, rows: 2},
            }}
            item={{id: 8, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{
                ...labels,
                move: 'Move {$a} block',
                remove: 'Delete {$a} block',
                resize: 'Resize {$a}',
                tile: '{$a} block',
            } as DashboardLabels}
            editing
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        expect(screen.getByRole('button', {name: 'Move Useful links block'}))
            .toHaveClass('mds-btn--size-md');
        expect(screen.getByRole('button', {name: 'Resize Useful links'}))
            .toHaveClass('core-my-dashboard-handle--resize');
        // No footer bar: the resize handle sits over the tile's corner.
        expect(screen.getByRole('button', {name: 'Resize Useful links'}).closest('.core-my-dashboard-tile__resize'))
            .toBeInTheDocument();
        expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
        const remove = screen.getByRole('button', {name: 'Delete Useful links block'});
        expect(remove).toHaveAttribute('title', 'Delete Useful links block');
        expect(remove.querySelector('.fa-xmark')).toBeInTheDocument();
        expect(remove).not.toHaveTextContent('Delete Useful links block');
    });

    it('renders no block actions menu when the block has no permitted actions', () => {
        render(<BlockActionsMenu blockId={11} actions={[]} label="More actions for Useful links" />);

        expect(screen.queryByRole('button', {name: 'More actions for Useful links'})).not.toBeInTheDocument();
    });

    it('offers Move and Resize submenus of steps, disabling unavailable ones with the reason', () => {
        const onUp = jest.fn();
        const onLeft = jest.fn();
        const steps = (mode: 'move' | 'resize') => mode === 'move' ? [
            {key: 'up', label: 'Up', onSelect: onUp, note: 'Moves Timeline aside'},
            {key: 'left', label: 'Left', onSelect: onLeft, reason: 'At the edge of the dashboard'},
        ] : [
            {key: 'wider', label: 'Wider', onSelect: jest.fn()},
        ];
        render(<BlockActionsMenu
            blockId={11}
            actions={[{id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''}]}
            label="More actions for Useful links"
            moveLabel="Move"
            resizeLabel="Resize"
            steps={steps}
        />);

        fireEvent.click(screen.getByRole('button', {name: 'More actions for Useful links'}));
        expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Move', 'Resize', 'Permissions']);
        expect(screen.getByRole('separator')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('menuitem', {name: 'Move'}));
        const up = screen.getByRole('menuitem', {name: /^Up/});
        const left = screen.getByRole('menuitem', {name: /^Left/});
        expect(up).toHaveTextContent('Moves Timeline aside');
        expect(up).not.toHaveAttribute('aria-disabled');
        expect(left).toHaveAttribute('aria-disabled', 'true');
        expect(left).toHaveTextContent('At the edge of the dashboard');

        // A step applies straight away and leaves the menu open, so it can be pressed again.
        fireEvent.click(up);
        expect(onUp).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('menuitem', {name: /^Up/})).toBeInTheDocument();
        fireEvent.click(left);
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('opens the block actions menu and lists each retained action as a link', () => {
        render(<BlockActionsMenu
            blockId={11}
            actions={[
                {id: 'assignroles', label: 'Assign roles', url: 'https://example.com/roles', modalform: ''},
                {id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''},
            ]}
            label="More actions for Useful links"
        />);

        const trigger = screen.getByRole('button', {name: 'More actions for Useful links'});
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const rolesitem = screen.getByRole('menuitem', {name: 'Assign roles'});
        expect(rolesitem).toHaveAttribute('href', 'https://example.com/roles');
        expect(screen.getByRole('menuitem', {name: 'Permissions'})).toHaveAttribute('href', 'https://example.com/perm');

        fireEvent.click(rolesitem);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('carries the legacy modal-form data attributes for the configure action only', () => {
        render(<BlockActionsMenu
            blockId={12}
            actions={[
                {
                    id: 'edit',
                    label: 'Configure Useful links block',
                    url: 'https://example.com/edit',
                    modalform: 'block_html\\form\\edit',
                },
                {id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''},
            ]}
            label="More actions for Useful links"
        />);

        fireEvent.click(screen.getByRole('button', {name: 'More actions for Useful links'}));

        const configure = screen.getByRole('menuitem', {name: 'Configure Useful links block'});
        expect(configure).toHaveAttribute('data-action', 'editblock');
        expect(configure).toHaveAttribute('data-blockid', '12');
        expect(configure).toHaveAttribute('data-blockform', 'block_html\\form\\edit');
        expect(configure).toHaveAttribute('data-header', 'Configure Useful links block');

        const permissions = screen.getByRole('menuitem', {name: 'Permissions'});
        expect(permissions).not.toHaveAttribute('data-action');
        expect(permissions).not.toHaveAttribute('data-blockform');
    });

    it('closes the block actions menu on Escape and returns focus to the trigger', () => {
        render(<BlockActionsMenu
            blockId={11}
            actions={[{id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''}]}
            label="More actions for Useful links"
        />);

        const trigger = screen.getByRole('button', {name: 'More actions for Useful links'});
        fireEvent.click(trigger);
        expect(screen.getByRole('menu')).toBeInTheDocument();

        fireEvent.keyDown(screen.getByRole('menuitem', {name: 'Permissions'}), {key: 'Escape'});

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('only shows the dashboard tile\'s block actions trigger when the block has actions', () => {
        const withoutActions = render(<DashboardTile
            block={{
                id: 13,
                name: 'html',
                title: 'Useful links',
                content: '',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [],
                asynccontent: false, loaded: true,
                minsize: {columns: 1, rows: 2},
            }}
            item={{id: 13, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{
                ...labels,
                move: 'Move {$a} block',
                remove: 'Delete {$a} block',
                tile: '{$a} block',
            } as DashboardLabels}
            editing
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        expect(withoutActions.queryByRole('button', {name: /More actions/})).not.toBeInTheDocument();
        withoutActions.unmount();

        render(<DashboardTile
            block={{
                id: 14,
                name: 'html',
                title: 'Useful links',
                content: '',
                footer: '',
                region: 'content',
                weight: 0,
                actions: [{id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''}],
            }}
            item={{id: 14, column: 0, row: 0, columns: 2, rows: 2}}
            labels={{
                ...labels,
                move: 'Move {$a} block',
                remove: 'Delete {$a} block',
                tile: '{$a} block',
                blockactions: 'More actions for {$a}',
            } as DashboardLabels}
            editing
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onCommit={jest.fn()}
            onRemove={jest.fn()}
        />);

        const trigger = screen.getByRole('button', {name: 'More actions for Useful links'});
        expect(trigger).toBeInTheDocument();

        const remove = screen.getByRole('button', {name: 'Delete Useful links block'});
        const actionsRow = remove.closest('.core-my-dashboard-tile__actions');
        const children = Array.from(actionsRow?.children ?? []);
        expect(children.indexOf(remove)).toBeLessThan(
            children.findIndex(child => child.contains(trigger)),
        );
    });

    it('uses a native modal shell with MDS confirmation controls', () => {
        HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
            // A typed `this` parameter: jsdom's dialog element, standing in for the real showModal().
            // eslint-disable-next-line no-invalid-this
            this.setAttribute('open', '');
        });
        const confirm = jest.fn();
        render(<ConfirmationDialog
            title="Remove block"
            message="Remove this block?"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            onConfirm={confirm}
            onCancel={jest.fn()}
        />);

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        expect(confirm).toHaveBeenCalled();
    });

    it('indicates the own-dashboard scope and offers no switch without the other capability', () => {
        render(<DashboardScopeBanner
            siteDefault={false}
            caneditotherscope={false}
            urls={urls}
            labels={labels}
        />);

        expect(screen.getByText('Editing your dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Switch to editing the default dashboard for all users')).not.toBeInTheDocument();
    });

    it('indicates the site-default scope and offers a switch back to the user\'s own dashboard', () => {
        render(<DashboardScopeBanner
            siteDefault
            caneditotherscope
            urls={urls}
            labels={labels}
        />);

        expect(screen.getByText('Editing the default dashboard for all users')).toBeInTheDocument();
        const link = screen.getByText('Switch to editing your dashboard');
        expect(link.closest('a')).toHaveAttribute('href', urls.ownpage);
    });
});
