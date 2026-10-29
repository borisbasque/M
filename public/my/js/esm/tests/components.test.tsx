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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type React from 'react';
import * as stringUtils from '@moodle/lms/core/stringUtils';
import GridCell from '../src/components/GridCell';
import GridControls from '../src/components/GridControls';
import ConfirmationDialog from '../src/components/ConfirmationDialog';
import DashboardTile from '../src/components/DashboardTile';
import DashboardHandle from '../src/components/DashboardHandle';
import DashboardLoading from '../src/components/DashboardLoading';
import {renderIcon} from '../src/components/Icon';
import {DashboardScopeBanner} from '../src/index';
import type {DashboardIcons} from '../src/repository';
import type {DashboardLabels} from '../src/strings';
import {htmlToText} from '../src/utils';

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
        CloseButton: ({size: _size, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {size?: string}) =>
            <button type="button" {...props} />,
        Badge: ({label, variant: _variant, subtle: _subtle, pill: _pill, ...props}:
        React.HTMLAttributes<HTMLSpanElement> & {label?: string; variant?: string; subtle?: boolean; pill?: boolean}) =>
            <span {...props}>{label}</span>,
        Link: ({label, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {label?: string}) =>
            <a {...props}>{label}</a>,
        // The tooltip is purely presentational here: the trigger keeps its own accessible name.
        Tooltip: ({label: _label, children}: {label: string; children: React.ReactElement}) => children,
        // The dropdown mock mirrors the parts of the real contract the dashboard relies on: the
        // trigger element is cloned with the menu's id and ARIA wiring and a click toggle, the menu
        // is a role="menu" named by the trigger, Escape closes it and returns focus to the trigger,
        // and an action item is a link with the caller's extra props (data-* attributes) spread on.
        Dropdown: ({trigger, open, onOpenChange, className, children}: {
            trigger: React.ReactElement;
            open?: boolean;
            onOpenChange?: (open: boolean) => void;
            className?: string;
            children?: React.ReactNode;
        }) => {
            const [uncontrolled, setUncontrolled] = ReactActual.useState(false);
            const isOpen: boolean = open ?? uncontrolled;
            const setOpen = (next: boolean) => {
                setUncontrolled(next);
                onOpenChange?.(next);
            };
            const id: string = ReactActual.useId();
            const triggerRef = ReactActual.useRef<HTMLElement | null>(null);
            ReactActual.useEffect(() => {
                if (!isOpen) {
                    return undefined;
                }
                const onKeyDown = (event: KeyboardEvent) => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                        triggerRef.current?.focus();
                    }
                };
                document.addEventListener('keydown', onKeyDown);
                return () => document.removeEventListener('keydown', onKeyDown);
            });
            return <div className={className}>
                {ReactActual.cloneElement(trigger, {
                    ref: triggerRef,
                    id,
                    'aria-haspopup': 'menu',
                    'aria-expanded': isOpen,
                    onClick: () => setOpen(!isOpen),
                })}
                {isOpen && <div role="menu" aria-labelledby={id}>{children}</div>}
            </div>;
        },
        DropdownItemAction: ({label, href, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {label: string}) =>
            <a role="menuitem" href={href} {...props}>{label}</a>,
    };
}, {virtual: true});

const labels: DashboardLabels = {
    addblock: 'Add a block',
    addblocktop: 'Add a block at the start of the dashboard',
    addblockbottom: 'Add a block at the end of the dashboard',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    confirmreset: 'Reset this dashboard?',
    down: 'Down',
    emptycell: 'Empty grid cell',
    left: 'Left',
    loading: 'Loading',
    movecontrols: 'Move block controls',
    moveinstructions: 'Use the arrow keys to move',
    reset: 'Reset page to default',
    resetheading: 'Reset dashboard',
    resize: 'Resize block',
    resizecontrols: 'Resize block controls',
    resizeinstructions: 'Use the arrow keys to resize',
    right: 'Right',
    scopeown: 'Editing your dashboard',
    scopesitedefault: 'Editing the default dashboard for all users',
    up: 'Up',
};

// Server-rendered icon markup, as $OUTPUT->pix_icon() produces it.
const icons: DashboardIcons = {
    move: '<i class="icon fa fa-arrows-up-down-left-right fa-fw" aria-hidden="true"></i>',
    resize: '<i class="icon fa fa-up-right-and-down-left-from-center fa-fw" aria-hidden="true"></i>',
    add: '<i class="icon fa fa-plus fa-fw" aria-hidden="true"></i>',
    up: '<i class="icon fa fa-arrow-up fa-fw" aria-hidden="true"></i>',
    down: '<i class="icon fa fa-arrow-down fa-fw" aria-hidden="true"></i>',
    left: '<i class="icon fa fa-arrow-left fa-fw" aria-hidden="true"></i>',
    right: '<i class="icon fa fa-arrow-right fa-fw" aria-hidden="true"></i>',
};

// The strings the components fetch themselves, with placeholders, as the language pack has them.
const strings: Record<string, Record<string, string>> = {
    my: {
        dashboardtile: '{$a} block',
        gridcellposition: 'Row {$a->row}, column {$a->column}',
    },
    block: {
        moveblock: 'Move {$a} block',
        deleteblock: 'Delete {$a} block',
    },
};

beforeEach(() => {
    Object.entries(strings).forEach(([component, map]) => {
        Object.entries(map).forEach(([key, value]) => mockString(key, component, value));
    });
    // The global string mock ignores placeholder parameters; the components rely on them, so
    // resolve through M.util.get_string (whose mock does substitute them) instead.
    jest.spyOn(stringUtils, 'getRequestedStrings').mockImplementation(requests => requests.map(
        ({key, component = 'core', param}) => Promise.resolve(
            (globalThis as unknown as {M: {util: {get_string: (k: string, c: string, p?: unknown) => string}}})
                .M.util.get_string(key, component, param ?? undefined),
        ),
    ));
});

const tileBlock = (overrides: Partial<React.ComponentProps<typeof DashboardTile>['block']> = {}) => ({
    id: 7,
    name: 'html',
    title: 'Useful links',
    content: '<p>Tile content</p>',
    footer: '',
    region: 'content',
    weight: 0,
    controls: '',
    visible: true,
    ...overrides,
});

const tileHandlers = () => ({
    onStart: jest.fn(),
    onKeyDown: jest.fn(),
    onPointerDown: jest.fn(),
    onDirection: jest.fn(),
    onCommit: jest.fn(),
});

describe('core_my grid components', () => {
    it('exposes an available cell as a positioned button named by its grid position', async() => {
        const activate = jest.fn();
        render(<GridCell
            column={2}
            row={3}
            label="Empty grid cell"
            addLabel="Add a block"
            addIcon={icons.add}
            onActivate={activate}
        />);

        const cell = await screen.findByRole('button', {name: 'Empty grid cell, Row 4, column 3'});
        cell.focus();
        expect(cell).toHaveFocus();

        fireEvent.click(cell);
        expect(activate).toHaveBeenCalledWith(2, 3);
    });

    it('shows the server-rendered plus icon and an "add a block" cue without changing the accessible name',
        async() => {
            render(<GridCell
                column={2}
                row={3}
                label="Empty grid cell"
                addLabel="Add a block"
                addIcon={icons.add}
            />);

            const cell = await screen.findByRole('button', {name: 'Empty grid cell, Row 4, column 3'});
            const icon = cell.querySelector('.core-my-grid-cell__icon');
            expect(icon).toHaveAttribute('aria-hidden', 'true');
            // The server's markup is a single <i>, rendered as that element so the glyph classes
            // apply to the icon itself (and the design system Button accepts it as an icon).
            expect(icon?.tagName).toBe('I');
            expect(icon).toHaveClass('fa-plus', 'core-my-dashboard-icon');
            const cue = cell.querySelector('.core-my-grid-cell__label');
            expect(cue).toHaveAttribute('aria-hidden', 'true');
            expect(cue).toHaveTextContent('Add a block');
        });

    it('renders prospective placement without adding a focus target', () => {
        const {container} = render(<GridCell
            column={0}
            row={0}
            label="Empty grid cell"
            addLabel="Add a block"
            addIcon={icons.add}
            prospective
        />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('builds bespoke controls from MDS buttons and relays direction', () => {
        const direction = jest.fn();
        render(<GridControls
            mode="move"
            labels={labels}
            icons={icons}
            onDirection={direction}
        />);

        expect(screen.getByRole('group', {name: 'Move block controls'})).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(4);
        [
            ['Up', 0, -1],
            ['Left', -1, 0],
            ['Right', 1, 0],
            ['Down', 0, 1],
        ].forEach(([name, horizontal, vertical]) => {
            fireEvent.click(screen.getByRole('button', {name: String(name)}));
            expect(direction).toHaveBeenLastCalledWith(horizontal, vertical);
        });
    });

    it('exposes an icon move handle to pointer and keyboard input', () => {
        const start = jest.fn();
        const pointerDown = jest.fn();
        const keyDown = jest.fn();
        render(<DashboardHandle
            mode="move"
            label="Move Course overview block"
            labels={labels}
            icons={icons}
            instructionsId="move-instructions"
            active={false}
            showControls={false}
            onStart={start}
            onKeyDown={keyDown}
            onPointerDown={pointerDown}
            onDirection={jest.fn()}
            onCommit={jest.fn()}
        />);

        const handle = screen.getByRole('button', {name: 'Move Course overview block'});
        expect(handle).toHaveAttribute('aria-describedby', 'move-instructions');
        expect(handle).toHaveAttribute('aria-pressed', 'false');
        // The icon is the server's markup, inside a decorative wrapper.
        expect(handle.querySelector('.core-my-dashboard-icon.fa-arrows-up-down-left-right')).toBeInTheDocument();
        expect(handle.querySelector('.core-my-dashboard-icon')).toHaveAttribute('aria-hidden', 'true');
        fireEvent.pointerDown(handle, {clientX: 10, clientY: 10});
        expect(pointerDown).toHaveBeenCalled();
        expect(handle).toHaveFocus();
        fireEvent.keyDown(handle, {key: 'Enter'});
        expect(keyDown).toHaveBeenCalled();
    });

    it('displays clickable directional controls around an active handle', () => {
        const direction = jest.fn();
        const commit = jest.fn();
        render(<DashboardHandle
            mode="resize"
            label="Resize Course overview block"
            labels={labels}
            icons={icons}
            instructionsId="resize-instructions"
            active
            showControls
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onDirection={direction}
            onCommit={commit}
        />);

        expect(screen.getByRole('group', {name: 'Resize block controls'})).toBeInTheDocument();
        const up = screen.getByRole('button', {name: 'Up'});
        expect(up).toHaveAttribute('tabindex', '-1');
        expect(up.querySelector('.core-my-dashboard-icon.fa-arrow-up')).toBeInTheDocument();
        fireEvent.click(up);
        expect(direction).toHaveBeenCalledWith(0, -1);
        fireEvent.pointerDown(screen.getByRole('button', {name: 'Resize Course overview block'}));
        expect(commit).toHaveBeenCalled();
        fireEvent.blur(screen.getByRole('button', {name: 'Resize Course overview block'}));
        expect(commit).toHaveBeenCalledTimes(2);
    });

    it('hides directional controls during an active pointer interaction', () => {
        render(<DashboardHandle
            mode="resize"
            label="Resize Course overview block"
            labels={labels}
            icons={icons}
            instructionsId="resize-instructions"
            active
            showControls={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onDirection={jest.fn()}
            onCommit={jest.fn()}
        />);

        expect(screen.queryByRole('group', {name: 'Resize block controls'})).not.toBeInTheDocument();
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

    it('renders block content and names the tile after the block through a fetched string', async() => {
        render(<DashboardTile
            block={tileBlock()}
            item={{id: 7, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing={false}
            showControls={false}
            {...tileHandlers()}
        />);

        expect(await screen.findByRole('region', {name: 'Useful links block'})).toBeInTheDocument();
        expect(screen.getByText('Tile content')).toBeInTheDocument();
    });

    it('renders the block title as the formatted HTML it is, and decodes it for accessible names', async() => {
        render(<DashboardTile
            block={tileBlock({title: 'Tom &amp; Jerry <em>weekly</em>'})}
            item={{id: 7, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing
            showControls={false}
            {...tileHandlers()}
        />);

        expect(await screen.findByRole('region', {name: 'Tom & Jerry weekly block'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Move Tom & Jerry weekly block'})).toBeInTheDocument();
        const heading = screen.getByRole('heading', {level: 2});
        expect(heading).toHaveTextContent('Tom & Jerry weekly');
        expect(heading.querySelector('em')).toHaveTextContent('weekly');
    });

    it('runs script elements inside a block\'s rendered content', () => {
        const flag = `__dashboardTileScript${Date.now()}`;
        render(<DashboardTile
            block={tileBlock({content: `<p>Widget</p><script>window.${flag} = 'ran';</script>`})}
            item={{id: 7, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing={false}
            showControls={false}
            {...tileHandlers()}
        />);

        expect((window as unknown as Record<string, unknown>)[flag]).toBe('ran');
        delete (window as unknown as Record<string, unknown>)[flag];
    });

    it('keeps DOM changes made inside the block content across re-renders of the tile', async() => {
        // A block's own JavaScript renders into its content (and scripts in it change it); a
        // re-render of the tile for an unrelated reason must not rewrite that DOM.
        const block = tileBlock({content: '<p class="block-output">Server-rendered</p>'});
        const props = {
            block,
            item: {id: 7, column: 0, row: 0, columns: 2, rows: 2},
            labels,
            icons,
            showControls: false,
            ...tileHandlers(),
        };
        const {container, rerender} = render(<DashboardTile {...props} editing={false} />);
        await screen.findByRole('region', {name: 'Useful links block'});

        container.querySelector('.block-output')!.textContent = 'Rendered by the block';
        rerender(<DashboardTile {...props} editing />);
        await screen.findByRole('button', {name: 'Move Useful links block'});

        expect(container.querySelector('.block-output')).toHaveTextContent('Rendered by the block');
    });

    it('wraps block content with the standard block classes so shared block CSS keeps applying', () => {
        const {container} = render(<DashboardTile
            block={tileBlock({id: 8, name: 'calendar_month', title: 'Calendar'})}
            item={{id: 8, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing={false}
            showControls={false}
            {...tileHandlers()}
        />);

        const content = container.querySelector('.core-my-dashboard-tile__content');
        expect(content).toHaveClass('block', 'block_calendar_month');
        // The data-blockregion attribute lives on the tile wrapper (an ancestor of .block), matching
        // how Boost's block CSS selectors expect the two to relate (e.g. "[data-blockregion] .block").
        expect(container.querySelector('.core-my-dashboard-tile')).toHaveAttribute('data-blockregion');
    });

    it('marks a displaced tile for pointer-position easing', async() => {
        render(<DashboardTile
            block={tileBlock({id: 9, content: ''})}
            item={{id: 9, column: 1, row: 1, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing={false}
            showControls={false}
            shouldAnimatePosition
            isBumped
            {...tileHandlers()}
        />);

        expect(await screen.findByRole('region', {name: 'Useful links block'}))
            .toHaveAttribute('data-bumped', 'true');
    });

    it('renders large icon-only move and resize handles in edit mode', async() => {
        render(<DashboardTile
            block={tileBlock({id: 8})}
            item={{id: 8, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing
            showControls
            {...tileHandlers()}
        />);

        expect(await screen.findByRole('button', {name: 'Move Useful links block'}))
            .toHaveClass('mds-btn--size-lg');
        expect(screen.getByRole('button', {name: 'Resize block'}))
            .toHaveClass('core-my-dashboard-handle--resize');
        expect(screen.getByRole('button', {name: 'Resize block'}).closest('footer'))
            .toHaveClass('core-my-dashboard-tile__dashboard-footer');
        const move = screen.getByRole('button', {name: 'Move Useful links block'});
        // The visible label is the tooltip's job, not a title attribute's.
        expect(move).not.toHaveAttribute('title');
        expect(move).not.toHaveTextContent('Move Useful links block');
    });

    it('marks a block hidden through its standard menu, so it reads as hidden while editing', async() => {
        const {container} = render(<DashboardTile
            block={tileBlock({id: 9, visible: false})}
            item={{id: 9, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing
            showControls={false}
            {...tileHandlers()}
        />);

        await screen.findByRole('button', {name: 'Move Useful links block'});
        expect(container.querySelector('.core-my-dashboard-tile')).toHaveClass('core-my-dashboard-tile--hidden');
    });

    it('injects the block\'s standard controls menu in edit mode', async() => {
        const controls = '<div class="action-menu"><a href="#" class="dropdown-toggle" data-bs-toggle="dropdown" '
            + 'aria-label="Actions menu"></a><div class="dropdown-menu"><a class="dropdown-item" href="https://example.com/edit" '
            + 'data-action="editblock" data-blockid="14">Configure Useful links block</a></div></div>';
        const withoutControls = render(<DashboardTile
            block={tileBlock({id: 13, content: ''})}
            item={{id: 13, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing
            showControls={false}
            {...tileHandlers()}
        />);

        await withoutControls.findByRole('button', {name: 'Move Useful links block'});
        expect(withoutControls.container.querySelector('.core-my-dashboard-tile__menu')).not.toBeInTheDocument();
        withoutControls.unmount();

        const {container} = render(<DashboardTile
            block={tileBlock({id: 14, content: '', controls})}
            item={{id: 14, column: 0, row: 0, columns: 2, rows: 2}}
            labels={labels}
            icons={icons}
            editing
            showControls={false}
            {...tileHandlers()}
        />);

        await screen.findByRole('button', {name: 'Move Useful links block'});
        const menu = container.querySelector('.core-my-dashboard-tile__actions .core-my-dashboard-tile__menu');
        expect(menu?.querySelector('.action-menu [data-action="editblock"]')).toHaveTextContent('Configure Useful links block');
    });

    it('uses a native modal shell, named by its heading, with MDS confirmation controls', () => {
        HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
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
        const dialog = screen.getByRole('dialog', {name: 'Remove block'});
        expect(dialog).toHaveAccessibleDescription('Remove this block?');
        fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        expect(confirm).toHaveBeenCalled();
    });

    it('names the scope being edited: the user\'s own dashboard or the site default', () => {
        const own = render(<DashboardScopeBanner siteDefault={false} labels={labels} />);
        expect(screen.getByText('Editing your dashboard')).toBeInTheDocument();
        own.unmount();

        render(<DashboardScopeBanner siteDefault labels={labels} />);
        expect(screen.getByText('Editing the default dashboard for all users')).toBeInTheDocument();
    });

    it('wraps icon markup that is not a single <i> element inside an <i>, so the Button still accepts it', () => {
        const {container} = render(<DashboardHandle
            mode="move"
            label="Move"
            labels={labels}
            icons={{...icons, move: '<img src="https://example.com/move.svg" alt="">'}}
            instructionsId="move-instructions"
            active={false}
            showControls={false}
            onStart={jest.fn()}
            onKeyDown={jest.fn()}
            onPointerDown={jest.fn()}
            onDirection={jest.fn()}
            onCommit={jest.fn()}
        />);

        const icon = container.querySelector('.core-my-dashboard-icon');
        expect(icon?.tagName).toBe('I');
        expect(icon?.querySelector('img')).toHaveAttribute('src', 'https://example.com/move.svg');
    });

    it('builds icons as <i> elements themselves, which is what the design system Button accepts', () => {
        // The design system Button checks the React element's own type for an icon (an <i> or
        // <svg>) and drops anything else, so a wrapper component would render an empty button.
        expect(renderIcon(icons.move).type).toBe('i');
        expect(renderIcon('<img src="https://example.com/move.svg" alt="">').type).toBe('i');
        expect(renderIcon(icons.move).props.className).toContain('fa-arrows-up-down-left-right');
    });

    it('reduces formatted HTML to decoded text', () => {
        expect(htmlToText('Plain title')).toBe('Plain title');
        expect(htmlToText('Tom &amp; Jerry')).toBe('Tom & Jerry');
        expect(htmlToText('<b>Bold</b> &lt;not a tag&gt;')).toBe('Bold <not a tag>');
    });
});
