// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The add blocks modal, listing the blocks that can be added as a grid of cards.
 *
 * Each block is a button with its icon, name and what it does. Clicking one adds it (to the space that
 * opened the modal, or the first free space) and closes the modal. Blocks that allow only one and are
 * already on the dashboard are listed too, last, with a tick and disabled, so nobody is left looking
 * for them. Search narrows the list by name and description. Escape, the close button or a click outside
 * closes the modal.
 *
 * @module     core_my/components/AddBlocksDialog
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {CloseButton, Link, SearchInput} from '@moodlehq/design-system';
import type {AvailableBlock, DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import Icon, {renderIcon} from './Icon';

/** Where the modal's Marketplace link goes: the plugins directory, filtered to blocks. */
const MARKETPLACE_URL = 'https://moodle.org/plugins/?q=type:block';

interface PaletteItemProps {
    block: AvailableBlock;
    labels: DashboardLabels;
    icons: DashboardIcons;
    onAdd: (block: AvailableBlock) => void;
}

/** One block in the modal: a card that adds it, or one saying it is already on the dashboard. */
const PaletteItem = ({block, labels, icons, onAdd}: PaletteItemProps) => {
    const initials = block.title.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
    const content = <>
        <span className="core-my-palette-item__icon" aria-hidden="true">
            {block.icon ? <Icon markup={block.icon} /> : initials}
        </span>
        <span className="core-my-palette-item__text">
            <span className="core-my-palette-item__name">{block.title}</span>
            {block.description && <span className="core-my-palette-item__description">{block.description}</span>}
        </span>
    </>;
    return <li data-blockname={block.name}>
        {block.added
            ? <div className="core-my-palette-item core-my-palette-item--added">
                {content}
                <span className="core-my-palette-item__added">
                    <Icon markup={icons.added} />
                    <span className="visually-hidden">{labels.onpage}</span>
                </span>
            </div>
            : <button type="button" className="core-my-palette-item" onClick={() => onAdd(block)}>{content}</button>}
    </li>;
};

interface AddBlocksDialogProps {
    blocks: AvailableBlock[];
    labels: DashboardLabels;
    icons: DashboardIcons;
    onAdd: (block: AvailableBlock) => void;
    onClose: () => void;
}

// The design system has no modal or dialog component yet (raised on MDL-89740), so the shell is
// the native <dialog>, as in ConfirmationDialog, with design system controls inside.
const AddBlocksDialog = ({blocks, labels, icons, onAdd, onClose}: AddBlocksDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingId = useId();
    const [query, setQuery] = useState('');

    // Focus goes to the modal itself, which names it for screen readers, rather than to its first
    // control, so nothing looks selected until someone moves on from it.
    useEffect(() => {
        dialogRef.current?.showModal();
        dialogRef.current?.focus();
    }, []);

    const shown = useMemo(() => {
        const words = query.trim().toLowerCase();
        const matching = words ? blocks.filter(block =>
            `${block.title} ${block.description ?? ''}`.toLowerCase().includes(words)) : blocks;
        // Blocks that can be added first, those already added after them, each in their own order.
        return [...matching.filter(block => !block.added), ...matching.filter(block => block.added)];
    }, [blocks, query]);

    return <dialog
        ref={dialogRef}
        className="core-my-add-blocks"
        aria-labelledby={headingId}
        tabIndex={-1}
        onCancel={onClose}
        onClick={event => {
            // The panel fills the dialog, so a click on the dialog itself is one on its backdrop.
            if (event.target === dialogRef.current) {
                onClose();
            }
        }}
    >
        <div className="core-my-add-blocks__panel">
            <div className="core-my-add-blocks__header">
                <h2 id={headingId} className="core-my-add-blocks__title">{labels.addblocks}</h2>
                <CloseButton aria-label={labels.close} onClick={onClose} />
            </div>
            <SearchInput
                className="core-my-add-blocks__search"
                label={labels.searchblocks}
                hideLabel
                clearLabel={labels.clearsearch}
                placeholder={labels.searchblocks}
                value={query}
                onChange={event => setQuery(event.target.value)}
            />
            {shown.length
                ? <ul className="core-my-add-blocks__list">
                    {shown.map(block => <PaletteItem
                        key={block.name}
                        block={block}
                        labels={labels}
                        icons={icons}
                        onAdd={onAdd}
                    />)}
                </ul>
                : <p className="core-my-add-blocks__empty" role="status">{labels.noblocksfound}</p>}
            <Link
                className="core-my-add-blocks__marketplace"
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener"
                label={labels.marketplace}
                endIcon={renderIcon(icons.external)}
            />
        </div>
    </dialog>;
};

export default AddBlocksDialog;
