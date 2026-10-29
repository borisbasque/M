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
import type {DashboardBlock, DashboardIcons} from '../repository';
import {NARROW_BLOCK_WIDTH, type LayoutItem} from '../layout';
import {useString, type DashboardLabels} from '../strings';
import {htmlToText} from '../utils';
import DashboardHandle from './DashboardHandle';

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
    onStart: (id: number, mode: 'move' | 'resize') => void;
    onKeyDown: (event: React.KeyboardEvent, id: number, mode: 'move' | 'resize') => void;
    onPointerDown: (event: React.PointerEvent, id: number, mode: 'move' | 'resize') => void;
    onDirection: (horizontal: number, vertical: number) => void;
    onCommit: () => void;
}

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
    onStart,
    onKeyDown,
    onPointerDown,
    onDirection,
    onCommit,
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

    // The block's standard editing-controls menu, rendered by the server as the classic block
    // header renders it. Memoised for the same reason as contentHtml below.
    const controlsHtml = useMemo(() => (block.controls ? {__html: block.controls} : null), [block.controls]);

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

    const classes = [
        'core-my-dashboard-tile',
        // Hidden through the standard menu: still shown while editing, muted, with Show on offer.
        ...(block.visible ? [] : ['core-my-dashboard-tile--hidden']),
        activeMode ? 'core-my-dashboard-tile--active' : '',
        drag ? 'core-my-dashboard-tile--pointer-dragging' : '',
        isBumped ? 'core-my-dashboard-tile--bumped' : '',
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
        <header className="core-my-dashboard-tile__header">
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
            {editing && <div className="core-my-dashboard-tile__actions">
                {/* Bootstrap's dropdown works through delegated events, so the injected menu
                    opens as it does in a classic block header, and the core_block/edit click
                    handler picks up its Configure item. */}
                {controlsHtml && <div className="core-my-dashboard-tile__menu" dangerouslySetInnerHTML={controlsHtml} />}
            </div>}
        </header>
        <div
            ref={contentRef}
            className={`core-my-dashboard-tile__content block block_${block.name}`}
            dangerouslySetInnerHTML={contentHtml}
        />
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
