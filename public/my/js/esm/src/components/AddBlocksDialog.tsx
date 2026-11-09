// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The add blocks modal, listing the blocks that can be added as a grid of design system Choiceboxes.
 *
 * Each block is a Choicebox with its icon, name and what it does, all in one radio group: picking one
 * and then Add block (or Enter) adds it, to the space that opened the modal or the first free space,
 * and closes the modal. A dashboard has one block of each type, so the types already on it are listed
 * too, last, ticked and disabled, so nobody is left looking for them. Search narrows the list by name
 * and description. Escape, the close button or a click outside closes the modal.
 *
 * @module     core_my/components/AddBlocksDialog
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Button, Choicebox, CloseButton, Link, SearchInput} from '@moodlehq/design-system';
import type {AvailableBlock, DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import {renderIcon} from './Icon';

/** Where the modal's Marketplace link goes: the plugins directory, filtered to blocks. */
const MARKETPLACE_URL = 'https://moodle.org/plugins/?q=type:block';

/**
 * The block's icon, as the <i> element the Choicebox accepts. A block without one gets its initials.
 *
 * @param block The block.
 * @returns The icon element.
 */
const blockIcon = (block: AvailableBlock): React.ReactElement<React.HTMLAttributes<HTMLElement>, 'i'> => {
    if (block.icon) {
        return renderIcon(block.icon);
    }
    const initials = block.title.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
    return <i className="core-my-add-blocks__initials" aria-hidden="true">{initials}</i>;
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
    const groupName = useId();
    const addedId = useId();
    const [query, setQuery] = useState('');
    const [chosen, setChosen] = useState<string | null>(null);

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

    // A choice that search has hidden is no longer one: Add block waits for a visible one.
    const choice = shown.find(block => !block.added && block.name === chosen) ?? null;

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
        <form
            className="core-my-add-blocks__panel"
            onSubmit={event => {
                event.preventDefault();
                if (choice) {
                    onAdd(choice);
                }
            }}
        >
            <div className="core-my-add-blocks__header">
                <h2 id={headingId} className="core-my-add-blocks__title">{labels.addblocks}</h2>
                <CloseButton aria-label={labels.close} onClick={onClose} />
            </div>
            <div className="core-my-add-blocks__content">
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
                    ? <div className="core-my-add-blocks__list" role="radiogroup" aria-labelledby={headingId}>
                        {shown.map(block => block.added
                            ? <Choicebox
                                key={block.name}
                                className="core-my-add-blocks__block"
                                data-blockname={block.name}
                                label={block.title}
                                supportingText={block.description ?? undefined}
                                icon={blockIcon(block)}
                                checked
                                readOnly
                                disabled
                                aria-describedby={addedId}
                            />
                            : <Choicebox
                                key={block.name}
                                className="core-my-add-blocks__block"
                                data-blockname={block.name}
                                name={groupName}
                                value={block.name}
                                label={block.title}
                                supportingText={block.description ?? undefined}
                                icon={blockIcon(block)}
                                checked={chosen === block.name}
                                onChange={() => setChosen(block.name)}
                            />)}
                    </div>
                    : <p className="core-my-add-blocks__empty" role="status">{labels.noblocksfound}</p>}
                <span id={addedId} className="visually-hidden">{labels.onpage}</span>
            </div>
            <div className="core-my-add-blocks__footer">
                <Link
                    className="core-my-add-blocks__marketplace"
                    href={MARKETPLACE_URL}
                    target="_blank"
                    rel="noopener"
                    label={labels.marketplace}
                    endIcon={renderIcon(icons.external)}
                />
                <Button type="submit" variant="primary" size="lg" label={labels.addblockshort} disabled={!choice} />
            </div>
        </form>
    </dialog>;
};

export default AddBlocksDialog;
