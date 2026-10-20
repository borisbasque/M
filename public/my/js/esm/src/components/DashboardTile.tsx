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

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
    Button,
    Dropdown,
    DropdownItemAction,
} from '@moodlehq/design-system';
import type {BlockAction, DashboardBlock, DashboardLabels} from '../repository';
import {NARROW_BLOCK_WIDTH, type LayoutItem} from '../layout';
import DashboardHandle from './DashboardHandle';

interface BlockActionsMenuProps {
    blockId: number;
    actions: BlockAction[];
    label: string;
}

// Kept in this file rather than its own module: it's only ever used from DashboardTile below,
// and every ESM component here is a separate network request (see swizzle.json).
// The menu is the design system's Dropdown, which provides the menu button and menu
// roles, arrow key, Home, End, typeahead and Escape handling, and returns focus to the trigger.
export const BlockActionsMenu = ({
    blockId,
    actions,
    label,
}: BlockActionsMenuProps) => {
    const [open, setOpen] = useState(false);
    if (actions.length === 0) {
        return null;
    }

    return <Dropdown
        className="core-my-dashboard-block-actions"
        label={label}
        iconOnly
        appearance="subtle"
        size="md"
        startIcon={<i className="fa fa-ellipsis-vertical" aria-hidden="true" />}
        placement="bottom-end"
        open={open}
        onOpenChange={setOpen}
    >
        {actions.map(action => <DropdownItemAction
            key={action.id}
            label={action.label}
            href={action.url}
            // The modal form actions are picked up by the core_block/edit click handler
            // already loaded as part of the block's own collected JavaScript requirements.
            data-action={action.modalform ? 'editblock' : undefined}
            data-blockid={action.modalform ? blockId : undefined}
            data-blockform={action.modalform || undefined}
            data-header={action.modalform ? action.label : undefined}
            onClick={() => setOpen(false)}
        />)}
    </Dropdown>;
};

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
    editing: boolean;
    // Removed on screen, but kept (and its content kept running) while the removal can be undone.
    hidden?: boolean;
    // Picked up by a click: the next click places it, so its handles must not act on their own.
    tapping?: boolean;
    activeMode?: 'move' | 'resize';
    drag?: PointerDrag;
    dragOrigin?: LayoutItem;
    shouldAnimatePosition?: boolean;
    isBumped?: boolean;
    // Just added: highlighted briefly so it is easy to spot.
    highlighted?: boolean;
    onStart: (id: number, mode: 'move' | 'resize') => void;
    onKeyDown: (event: React.KeyboardEvent, id: number, mode: 'move' | 'resize') => void;
    onPointerDown: (event: React.PointerEvent, id: number, mode: 'move' | 'resize') => void;
    onCommit: () => void;
    onRemove: (id: number) => void;
}

const DashboardTile = ({
    block,
    item,
    labels,
    editing,
    hidden = false,
    tapping = false,
    activeMode,
    drag,
    dragOrigin,
    shouldAnimatePosition = false,
    isBumped = false,
    highlighted = false,
    onStart,
    onKeyDown,
    onPointerDown,
    onCommit,
    onRemove,
}: DashboardTileProps) => {
    const tileRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const previousPosition = useRef<DOMRect | null>(null);
    const positionAnimation = useRef<Animation | null>(null);
    const [narrow, setNarrow] = useState(false);
    const moveInstructionsId = `core-my-dashboard-move-instructions-${block.id}`;
    const resizeInstructionsId = `core-my-dashboard-resize-instructions-${block.id}`;

    const displayItem = drag && dragOrigin ? dragOrigin : item;

    // The block's own rendered HTML is written here, outside React's control, and only when it
    // actually changes. Block JavaScript (run once per dashboard load) attaches itself to these
    // nodes - e.g. Course overview fetches and renders its courses into them - so they must never
    // be replaced behind its back. Letting React own them via dangerouslySetInnerHTML re-created
    // them, unchanged but as new nodes, whenever the tile re-rendered (such as when the column
    // count changed), leaving those blocks stuck on their loading placeholders. A layout effect,
    // so the HTML is in place before the dashboard runs the collected block JavaScript.
    useLayoutEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = block.content;
        }
    }, [block.content]);
    useLayoutEffect(() => {
        if (footerRef.current) {
            footerRef.current.innerHTML = block.footer;
        }
    }, [block.footer]);

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

    useLayoutEffect(() => {
        const tile = tileRef.current;
        if (!tile) {
            return;
        }
        positionAnimation.current?.cancel();
        const currentPosition = tile.getBoundingClientRect();
        const priorPosition = previousPosition.current;
        previousPosition.current = currentPosition;

        if (!shouldAnimatePosition || !priorPosition ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !tile.animate) {
            return;
        }

        const horizontal = priorPosition.left - currentPosition.left;
        const vertical = priorPosition.top - currentPosition.top;
        if (!horizontal && !vertical) {
            return;
        }

        // Use FLIP so CSS grid's discrete row/column placement eases visually.
        positionAnimation.current = tile.animate([
            {transform: `translate3d(${horizontal}px, ${vertical}px, 0)`},
            {transform: 'translate3d(0, 0, 0)'},
        ], {
            duration: 180,
            easing: 'cubic-bezier(.2, 0, 0, 1)',
        });
    }, [item.column, item.columns, item.row, item.rows, shouldAnimatePosition]);

    return <section
        ref={tileRef}
        className={[
            'core-my-dashboard-tile',
            activeMode && 'core-my-dashboard-tile--active',
            drag && 'core-my-dashboard-tile--pointer-dragging',
            isBumped && 'core-my-dashboard-tile--bumped',
            highlighted && 'core-my-dashboard-tile--new',
        ].filter(Boolean).join(' ')}
        style={{
            gridColumn: `${displayItem.column + 1} / span ${displayItem.columns}`,
            gridRow: `${displayItem.row + 1} / span ${displayItem.rows}`,
            transform: drag && activeMode === 'move' ? `translate3d(${drag.x}px, ${drag.y}px, 0)` : undefined,
            width: drag?.width ? `${drag.width}px` : undefined,
            height: drag?.height ? `${drag.height}px` : undefined,
        }}
        aria-label={labels.tile.replace('{$a}', block.title)}
        data-block={block.name}
        data-block-id={block.id}
        // As in the standard block markup, so core_block/events helpers identify the block.
        data-instance-id={block.id}
        data-blockregion={narrow ? 'side-pre' : 'content'}
        data-bumped={isBumped || undefined}
        data-grid-column={displayItem.column}
        data-grid-row={displayItem.row}
        hidden={hidden || undefined}
        // Until its own content arrives, the block is marked busy and shows a placeholder.
        aria-busy={!block.loaded || undefined}
    >
        {editing && <>
            <span id={moveInstructionsId} className="visually-hidden">{labels.moveinstructions}</span>
            <span id={resizeInstructionsId} className="visually-hidden">{labels.resizeinstructions}</span>
        </>}
        <header className="core-my-dashboard-tile__header">
            {editing && <DashboardHandle
                mode="move"
                label={labels.move.replace('{$a}', block.title)}
                instructionsId={moveInstructionsId}
                active={activeMode === 'move'}
                tapping={tapping}
                onStart={() => onStart(block.id, 'move')}
                onKeyDown={event => onKeyDown(event, block.id, 'move')}
                onPointerDown={event => onPointerDown(event, block.id, 'move')}
                onCommit={onCommit}
            />}
            {/* One line, cut short with an ellipsis; the full title shows on hover. */}
            <h2 className="core-my-dashboard-tile__title" title={block.title}>{block.title}</h2>
            {editing && <div className="core-my-dashboard-tile__actions">
                <Button
                    size="md"
                    variant="ghost"
                    className="core-my-dashboard-remove"
                    aria-label={labels.remove.replace('{$a}', block.title)}
                    title={labels.remove.replace('{$a}', block.title)}
                    startIcon={<i className="fa fa-xmark" aria-hidden="true" />}
                    onClick={() => onRemove(block.id)}
                />
                <BlockActionsMenu
                    blockId={block.id}
                    actions={block.actions}
                    label={labels.blockactions.replace('{$a}', block.title)}
                />
            </div>}
        </header>
        {!block.loaded && <div className="core-my-dashboard-tile__placeholder" aria-hidden="true">
            <span className="core-my-dashboard-loading__line" />
            <span className="core-my-dashboard-loading__line" />
            <span className="core-my-dashboard-loading__line" />
        </div>}
        {block.failed && <p className="core-my-dashboard-tile__failed">{labels.blockfailed}</p>}
        <div ref={contentRef} className={`core-my-dashboard-tile__content block block_${block.name}`} />
        {block.footer && <div ref={footerRef} className="core-my-dashboard-tile__block-footer" />}
        {/* No footer bar: the resize handle sits over the tile's corner, so editing costs the block no
            content space. */}
        {editing && <div className="core-my-dashboard-tile__resize">
            <DashboardHandle
                mode="resize"
                label={labels.resize.replace('{$a}', block.title)}
                instructionsId={resizeInstructionsId}
                active={activeMode === 'resize'}
                tapping={tapping}
                onStart={() => onStart(block.id, 'resize')}
                onKeyDown={event => onKeyDown(event, block.id, 'resize')}
                onPointerDown={event => onPointerDown(event, block.id, 'resize')}
                onCommit={onCommit}
            />
        </div>}
    </section>;
};

export default DashboardTile;
