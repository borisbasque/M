// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Responsive dashboard tile.
 *
 * @module     core_my/components/DashboardTile
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Badge, Button, Dropdown, DropdownItemAction} from '@moodlehq/design-system';
import type {BlockAction, DashboardBlock, DashboardIcons} from '../repository';
import {NARROW_BLOCK_WIDTH, type LayoutItem} from '../layout';
import {useString, type DashboardLabels} from '../strings';
import {htmlToText} from '../utils';
import DashboardHandle from './DashboardHandle';
import {renderIcon} from './Icon';

/** An action's data-* attributes, which the handlers core attaches to the page read from the link. */
const actionAttributes = (action: BlockAction): Record<string, string> => {
    try {
        return JSON.parse(action.attributes) as Record<string, string>;
    } catch {
        return {};
    }
};

interface BlockActionsMenuProps {
    label: string;
    icon: string;
    actions: BlockAction[];
}

/**
 * A block's standard editing actions in the design system Dropdown. Each is the classic menu's
 * link, with its data-* attributes, so core's page-wide handlers still open Configure's form. Delete
 * is not one of them: it has its own button on the tile (see TileActions).
 */
const BlockActionsMenu = ({label, icon, actions}: BlockActionsMenuProps) => <Dropdown
    className="core-my-dashboard-tile__menu"
    label={label}
    iconOnly
    startIcon={renderIcon(icon)}
    appearance="subtle"
    placement="bottom-end"
>
    {actions.map(action => <DropdownItemAction
        key={action.key}
        href={action.url}
        label={action.label}
        variant={action.danger ? 'danger' : 'default'}
        startIcon={action.icon ? renderIcon(action.icon) : undefined}
        {...actionAttributes(action)}
    />)}
</Dropdown>;

interface TileActionsProps {
    block: DashboardBlock;
    icons: DashboardIcons;
    menuLabel: string;
    onDelete: () => void;
}

/**
 * The end of the header while editing: Delete (the design system Button, icon-only, with a minus),
 * whenever the person may delete the block, then the menu of the block's other actions, if it has
 * any. Delete takes the classic menu item's own label ("Delete Timeline block").
 */
const TileActions = ({block, icons, menuLabel, onDelete}: TileActionsProps) => {
    const deleteAction = block.actions.find(action => action.key === 'delete');
    const menuActions = block.actions.filter(action => action.key !== 'delete');
    if (!block.actions.length) {
        return null;
    }
    return <div className="core-my-dashboard-tile__actions">
        {deleteAction && <Button
            variant="secondary"
            size="lg"
            className="core-my-dashboard-tile__delete"
            aria-label={deleteAction.label}
            startIcon={renderIcon(icons.remove)}
            onClick={onDelete}
        />}
        {menuActions.length > 0 && <BlockActionsMenu
            label={menuLabel || menuActions[0].label}
            icon={icons.menu}
            actions={menuActions}
        />}
    </div>;
};

// How long a tile takes to ease into a new grid position, in milliseconds.
const POSITION_ANIMATION_MS = 180;
// How long a tile let go of mid-drag takes to travel from under the pointer into its place. It may
// have further to go than a nudge, so it is given longer. index.tsx's DROP_FEEDBACK_MS allows for it.
export const LANDING_ANIMATION_MS = 280;

// Presses on these, inside the header, belong to the control itself rather than starting a drag.
const HEADER_CONTROLS = 'button, a, input, select, textarea, label, [role="button"], [data-bs-toggle]';
// How far a press on the header has to travel before it becomes a drag, in pixels: the same
// threshold the dashboard uses to tell a click on a handle from a drag.
const HEADER_DRAG_THRESHOLD = 4;

interface PointerDrag {
    x: number;
    y: number;
    width?: number;
    height?: number;
}

interface DashboardTileProps {
    block: DashboardBlock;
    item: LayoutItem;
    labels: DashboardLabels;
    icons: DashboardIcons;
    editing: boolean;
    activeMode?: 'move' | 'resize';
    showControls: boolean;
    drag?: PointerDrag;
    dragOrigin?: LayoutItem;
    shouldAnimatePosition?: boolean;
    isBumped?: boolean;
    /**
     * Set (to a fresh number each time) for the tile that has just landed after a move or an add,
     * so it plays its drop feedback once more.
     */
    justDropped?: number;
    /** Called when the drop feedback has finished playing. */
    onDropEnd?: () => void;
    onStart: (id: number, mode: 'move' | 'resize') => void;
    onKeyDown: (event: React.KeyboardEvent, id: number, mode: 'move' | 'resize') => void;
    onPointerDown: (event: React.PointerEvent, id: number, mode: 'move' | 'resize') => void;
    onDirection: (horizontal: number, vertical: number) => void;
    onCommit: () => void;
    onDelete: (id: number, title: string) => void;
}

/**
 * Drop feedback for a tile that has just landed: the 2px primary outline the tile had while it was
 * held, breaking into two pieces that spin once round the tile's edge and fade, while the tile itself
 * lifts 4px and bounces back into place (see my.scss). Decorative and
 * outside the layout, so it neither takes space nor catches the pointer. Keyed by the drop, so a
 * second drop on the same tile plays it again. It goes once the spin has ended.
 */
/**
 * A rounded rectangle's outline, w by h with corner radius r, as one path all the way round. It
 * starts and ends at the middle of the top-left corner's arc and runs clockwise (along the top,
 * down the right side, along the bottom and up the left side). Pulling its single dash forward
 * (stroke-dashoffset alone) erases it from that point, clockwise, until none is left. SVG
 * coordinates are physical, so it starts top-left and runs clockwise in RTL too.
 */
export const outlinePath = (w: number, h: number, r: number): string => {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    // How far the middle of a corner's arc is in from each of its two edges.
    const inset = radius * (1 - Math.SQRT1_2);
    const arc = (x: number, y: number) => `A ${radius} ${radius} 0 0 1 ${x} ${y}`;
    return [
        `M ${inset} ${inset} ${arc(radius, 0)}`,
        `H ${w - radius} ${arc(w, radius)}`,
        `V ${h - radius} ${arc(w - radius, h)}`,
        `H ${radius} ${arc(0, h - radius)}`,
        `V ${radius} ${arc(inset, inset)}`,
    ].join(' ');
};

const OutlineSvg = ({onEnd}: {onEnd?: () => void}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    useLayoutEffect(() => {
        const svg = svgRef.current;
        const tile = svg?.parentElement;
        if (!svg || !tile) {
            return;
        }
        // The outline is traced along the inner edge of the tile's border, which is the middle of
        // Active's 2px inside edge, at the corner radius there. The tile's
        // border is drawn on whole device pixels, but in a fractional-width grid column the SVG would
        // put its stroke between them, a blurred half pixel off the border it takes over from, so
        // the SVG's box is snapped to the same device pixels. A tile still settling into place
        // (its position animation) is measured where it is settling to.
        const style = window.getComputedStyle(tile);
        const shift = style.transform && style.transform !== 'none' ? new DOMMatrixReadOnly(style.transform) : null;
        const box = tile.getBoundingClientRect();
        const left = box.left - (shift?.e ?? 0);
        const top = box.top - (shift?.f ?? 0);
        const ratio = window.devicePixelRatio || 1;
        const snap = (value: number) => Math.round(value * ratio) / ratio;
        const width = snap(left + box.width) - snap(left);
        const height = snap(top + box.height) - snap(top);
        const border = parseFloat(style.borderTopWidth) || 0;
        const innerWidth = width - 2 * border;
        const innerHeight = height - 2 * border;
        svg.style.width = `${innerWidth}px`;
        svg.style.height = `${innerHeight}px`;
        svg.style.transform = `translate(${snap(left) - left}px, ${snap(top) - top}px)`;
        // The two pieces of the drop's spin are each the whole outline, showing half of it.
        const d = outlinePath(innerWidth, innerHeight, (parseFloat(style.borderTopLeftRadius) || 0) - border);
        svg.querySelectorAll('path').forEach(path => path.setAttribute('d', d));
    }, []);
    return <svg
        ref={svgRef}
        className="core-my-dashboard-tile__drop-outline"
        aria-hidden="true"
        focusable="false"
        onAnimationEnd={event => {
            // The second piece's lap is the longer (see my.scss), so the spin is over when it ends.
            if (event.animationName === 'core-my-dashboard-drop-spin-2') {
                onEnd?.();
            }
        }}
    >
        <path className="core-my-dashboard-tile__drop-outline-path" pathLength={1} />
        <path className="core-my-dashboard-tile__drop-outline-path" pathLength={1} />
    </svg>;
};

// While the tile is still travelling into place (waiting), the feedback holds until it arrives.
const DropOutline = ({dropKey, waiting, onEnd}: {dropKey?: number; waiting?: boolean; onEnd?: () => void}) =>
    (dropKey === undefined || waiting ? null : <OutlineSvg key={dropKey} onEnd={onEnd} />);

/**
 * A tile let go of mid-drag travels from under the pointer into its place (FLIP again), rather
 * than appearing there: where it lands when dropped, back where it came from when the drag is
 * cancelled. It keeps its Active look on the way (--landing), and its drop feedback
 * waits until it arrives. Returns the tile's --landing class while it is on its way.
 */
const useLanding = (
    tileRef: React.RefObject<HTMLElement>,
    positionAnimation: React.MutableRefObject<Animation | null>,
    drag?: PointerDrag,
    activeMode?: 'move' | 'resize',
): string | undefined => {
    const pointerMoving = Boolean(drag) && activeMode === 'move';
    // Where the tile last was on screen while being dragged by the pointer.
    const dragRect = useRef<DOMRect | null>(null);
    const [landing, setLanding] = useState(false);
    useLayoutEffect(() => {
        const tile = tileRef.current;
        if (!tile) {
            return undefined;
        }
        if (pointerMoving) {
            dragRect.current = tile.getBoundingClientRect();
            return undefined;
        }
        const from = dragRect.current;
        dragRect.current = null;
        if (!from || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !tile.animate) {
            return undefined;
        }
        const to = tile.getBoundingClientRect();
        const horizontal = from.left - to.left;
        const vertical = from.top - to.top;
        if (!horizontal && !vertical) {
            return undefined;
        }
        positionAnimation.current?.cancel();
        const animation = tile.animate([
            {transform: `translate3d(${horizontal}px, ${vertical}px, 0)`},
            {transform: 'translate3d(0, 0, 0)'},
        ], {
            duration: LANDING_ANIMATION_MS,
            easing: 'cubic-bezier(.2, 0, 0, 1)',
        });
        positionAnimation.current = animation;
        setLanding(true);
        const land = () => setLanding(false);
        animation.addEventListener('finish', land);
        animation.addEventListener('cancel', land);
        // As above: never leave the tile held short of its place.
        const settle = window.setTimeout(() => {
            if (animation.playState !== 'finished') {
                animation.finish();
            }
        }, LANDING_ANIMATION_MS * 2);
        return () => window.clearTimeout(settle);
    }, [positionAnimation, tileRef, pointerMoving, drag?.x, drag?.y]);
    return landing ? 'core-my-dashboard-tile--landing' : undefined;
};

const DashboardTile = ({
    block,
    item,
    labels,
    icons,
    editing,
    activeMode,
    showControls,
    drag,
    dragOrigin,
    shouldAnimatePosition = false,
    isBumped = false,
    justDropped,
    onDropEnd,
    onStart,
    onKeyDown,
    onPointerDown,
    onDirection,
    onCommit,
    onDelete,
}: DashboardTileProps) => {
    const tileRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousPosition = useRef<DOMRect | null>(null);
    const positionAnimation = useRef<Animation | null>(null);
    const [narrow, setNarrow] = useState(false);
    const moveInstructionsId = `core-my-dashboard-move-instructions-${block.id}`;
    const resizeInstructionsId = `core-my-dashboard-resize-instructions-${block.id}`;

    // The block's title is HTML (see htmlToText); its text form is what the accessible names and
    // the per-block strings below take as their placeholder.
    const titleText = useMemo(() => htmlToText(block.title), [block.title]);
    const tileLabel = useString('dashboardtile', 'my', titleText);
    const moveLabel = useString('moveblock', 'block', titleText);

    const actionsLabel = useString('actionsfor', 'core', titleText);

    const displayItem = drag && dragOrigin ? dragOrigin : item;

    // React compares dangerouslySetInnerHTML by the identity of its object, not by the markup
    // inside it, and rewrites the element's innerHTML whenever that identity changes. A fresh
    // object literal on every render would therefore wipe the block's DOM on every re-render of
    // the tile (a drag, a string resolving, the narrow-width measurement) - including whatever
    // the block's own JavaScript rendered into it, and the effect of any script it contained.
    const titleHtml = useMemo(() => ({__html: block.title}), [block.title]);
    // The footer goes inside the block element after the content, as the classic block template
    // places it (div.footer inside the card), so block CSS written for that markup, such as the
    // calendar's separators between its footer links, keeps applying unchanged.
    const contentHtml = useMemo(() => ({
        __html: block.content + (block.footer ? `<div class="footer">${block.footer}</div>` : ''),
    }), [block.content, block.footer]);

    useEffect(() => {
        const content = contentRef.current;
        if (!content || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const measure = () => setNarrow(content.getBoundingClientRect().width < NARROW_BLOCK_WIDTH);
        const observer = new ResizeObserver(measure);
        observer.observe(content);
        measure();
        return () => observer.disconnect();
    }, []);

    // Script elements inserted through innerHTML never execute, by specification. A block's
    // rendered content can legitimately carry one, though: the Text block allows script in its
    // content on the user's own dashboard, exactly because that page is private to them (see
    // block_html::content_is_trusted()), and the classic dashboard rendered that content straight
    // into the page. Re-create each script element in place so it runs, the same way
    // core/templates runs the JavaScript it collects - the content is already trusted by the time
    // it reaches here, the server having applied the same rules it always has.
    useEffect(() => {
        const tile = tileRef.current;
        if (!tile) {
            return;
        }
        const scripts = tile.querySelectorAll('.core-my-dashboard-tile__content script');
        scripts.forEach(stale => {
            const script = document.createElement('script');
            Array.from(stale.attributes).forEach(attribute => script.setAttribute(attribute.name, attribute.value));
            script.text = stale.textContent ?? '';
            stale.replaceWith(script);
        });
    }, [block.content, block.footer]);

    useLayoutEffect(() => {
        const tile = tileRef.current;
        if (!tile) {
            return undefined;
        }
        positionAnimation.current?.cancel();
        const currentPosition = tile.getBoundingClientRect();
        const priorPosition = previousPosition.current;
        previousPosition.current = currentPosition;

        if (!shouldAnimatePosition || !priorPosition ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !tile.animate) {
            return undefined;
        }

        const horizontal = priorPosition.left - currentPosition.left;
        const vertical = priorPosition.top - currentPosition.top;
        if (!horizontal && !vertical) {
            return undefined;
        }

        // Use FLIP so CSS grid's discrete row/column placement eases visually.
        const animation = tile.animate([
            {transform: `translate3d(${horizontal}px, ${vertical}px, 0)`},
            {transform: 'translate3d(0, 0, 0)'},
        ], {
            duration: POSITION_ANIMATION_MS,
            easing: 'cubic-bezier(.2, 0, 0, 1)',
        });
        positionAnimation.current = animation;
        // The animation only eases the tile into the place it already has. Some browsers can leave
        // one waiting to start (pending) indefinitely, which would hold the tile at its old place
        // while the drop preview shows the new one; once it should have finished, finish it.
        const settle = window.setTimeout(() => {
            if (animation.playState !== 'finished') {
                animation.finish();
            }
        }, POSITION_ANIMATION_MS * 2);
        return () => window.clearTimeout(settle);
    }, [item.column, item.columns, item.row, item.rows, shouldAnimatePosition]);

    const landingClass = useLanding(tileRef, positionAnimation, drag, activeMode);

    // The whole header is a drag target for pointers, so people can grab a block by its title. A
    // press that then moves starts exactly the drag the move handle starts. A press that doesn't
    // move does nothing - clicking a header should not pick the block up - and keyboard and
    // assistive technology users keep the handle, which is the header's focusable control.
    const headerPointerDown = (event: React.PointerEvent<HTMLElement>) => {
        if (!editing || event.button !== 0 || (event.target as Element).closest(HEADER_CONTROLS)) {
            return;
        }
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const begin = {clientX: startX, clientY: startY, preventDefault: () => undefined} as unknown as React.PointerEvent;
        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };
        const move = (moveEvent: PointerEvent) => {
            if (Math.abs(moveEvent.clientX - startX) < HEADER_DRAG_THRESHOLD
                && Math.abs(moveEvent.clientY - startY) < HEADER_DRAG_THRESHOLD) {
                return;
            }
            stop();
            onPointerDown(begin, block.id, 'move');
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };

    const classes = [
        'core-my-dashboard-tile',
        editing && 'core-my-dashboard-tile--editing',
        // Hidden through the standard menu: still shown while editing, muted, with Show on offer.
        !block.visible && 'core-my-dashboard-tile--hidden',
        activeMode && 'core-my-dashboard-tile--active',
        landingClass,
        drag && 'core-my-dashboard-tile--pointer-dragging',
        isBumped && 'core-my-dashboard-tile--bumped',
    ].filter(Boolean).join(' ');

    return <section
        ref={tileRef}
        className={classes}
        style={{
            gridColumn: `${displayItem.column + 1} / span ${displayItem.columns}`,
            gridRow: `${displayItem.row + 1} / span ${displayItem.rows}`,
            transform: drag && activeMode === 'move' ? `translate3d(${drag.x}px, ${drag.y}px, 0)` : undefined,
            width: drag?.width ? `${drag.width}px` : undefined,
            height: drag?.height ? `${drag.height}px` : undefined,
        }}
        aria-label={tileLabel || titleText}
        data-block={block.name}
        data-block-id={block.id}
        data-blockregion={narrow ? 'side-pre' : 'content'}
        data-bumped={isBumped || undefined}
    >
        {editing && <>
            <span id={moveInstructionsId} className="visually-hidden">{labels.moveinstructions}</span>
            <span id={resizeInstructionsId} className="visually-hidden">{labels.resizeinstructions}</span>
        </>}
        <header className="core-my-dashboard-tile__header" onPointerDown={headerPointerDown}>
            {editing && <DashboardHandle
                mode="move"
                label={moveLabel}
                labels={labels}
                icons={icons}
                instructionsId={moveInstructionsId}
                active={activeMode === 'move'}
                showControls={showControls}
                onStart={() => onStart(block.id, 'move')}
                onKeyDown={event => onKeyDown(event, block.id, 'move')}
                onPointerDown={event => onPointerDown(event, block.id, 'move')}
                onDirection={onDirection}
                onCommit={onCommit}
            />}
            {/* The title is the block's own, already-formatted HTML (as the classic block template
                renders it), not text: rendering it as text would show entities literally. */}
            <h2 className="core-my-dashboard-tile__title" dangerouslySetInnerHTML={titleHtml} />
            {/* A hidden block is only shown while editing; it says so in words, not just by fading. */}
            {!block.visible && <Badge
                className="core-my-dashboard-tile__badge"
                label={labels.hiddenfromstudents}
                variant="secondary"
                subtle
                pill
                startIcon={renderIcon(icons.hidden)}
            />}
            {editing && <TileActions
                block={block}
                icons={icons}
                menuLabel={actionsLabel}
                onDelete={() => onDelete(block.id, titleText)}
            />}
        </header>
        <div
            ref={contentRef}
            className={`core-my-dashboard-tile__content block block_${block.name}`}
            dangerouslySetInnerHTML={contentHtml}
        />
        <DropOutline dropKey={justDropped} waiting={Boolean(landingClass)} onEnd={onDropEnd} />
        {editing && <footer className="core-my-dashboard-tile__dashboard-footer">
            <DashboardHandle
                mode="resize"
                label={labels.resize}
                labels={labels}
                icons={icons}
                instructionsId={resizeInstructionsId}
                active={activeMode === 'resize'}
                showControls={showControls}
                onStart={() => onStart(block.id, 'resize')}
                onKeyDown={event => onKeyDown(event, block.id, 'resize')}
                onPointerDown={event => onPointerDown(event, block.id, 'resize')}
                onDirection={onDirection}
                onCommit={onCommit}
            />
        </footer>}
    </section>;
};

export default DashboardTile;
