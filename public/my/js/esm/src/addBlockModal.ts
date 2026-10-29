// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The standard "Add a block" modal, opened for the dashboard grid.
 *
 * The grid does not draw an add-block palette of its own: it opens the very same modal every other
 * Moodle page uses (core/modal_cancel showing the core/add_block_body template, the one
 * core_block/add_modal builds), so adding a block looks and behaves the same here as anywhere else.
 * Only what happens on choosing a block differs. core_block/add_modal follows the chosen item's
 * link to ?bui_addblock=... and reloads the page; the grid instead adds the block over its own web
 * service and places it where the user asked for it (an empty cell, the start or the end of the
 * grid) without a reload. Block types which show their configuration form when added
 * (block_edit_form::display_form_when_adding(), e.g. block_html) still get that form, through
 * core_form/modalform exactly as core_block/add_modal opens it, and are placed once it is saved.
 *
 * The items keep their links to ?bui_addblock=... as a fallback, so even if the handler here never
 * ran the block would still be added the classic way.
 *
 * @module     core_my/addBlockModal
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {requireManyAsync} from '@moodle/lms/core/amd';
import config from '@moodle/lms/core/config';
import {getString} from '@moodle/lms/core/stringUtils';
import type {AvailableBlock} from './repository';

/** The region the dashboard's blocks live in, as the fallback link and the add form take it. */
const DASHBOARD_REGION = 'content';

interface CoreModal {
    getRoot(): {get(index: number): HTMLElement | undefined};
    setBody(body: string | Promise<string>): void;
    show(): void;
    destroy(): void;
}

interface CancelModalModule {
    create(config: {title?: string | Promise<string>; returnElement?: Element}): Promise<CoreModal>;
}

interface TemplatesModule {
    render(template: string, context: Record<string, unknown>): Promise<string>;
}

interface ModalFormInstance {
    events: {FORM_SUBMITTED: string};
    addEventListener(name: string, listener: () => void): void;
    show(): unknown;
}

interface ModalFormModule {
    new(config: {
        modalConfig: {title: string | Promise<string>};
        args: Record<string, string>;
        formClass: string;
        returnFocus?: Element;
    }): ModalFormInstance;
}

export interface AddBlockModalOptions {
    /** The block types the user may add, as the dashboard payload lists them. */
    blocks: AvailableBlock[];
    /** The modal title (the core 'addblock' string). */
    title: string;
    /** The edited-page hash a block's own add form needs; null when the page has none. */
    pagehash: string | null;
    /** The control which opened the modal, to return focus to when it closes. */
    returnElement?: Element | null;
    /** Called with the chosen block type when it has no add form: the caller adds it. */
    onSelect: (block: AvailableBlock) => void;
    /** Called once a block type's own add form has been saved: the block now exists. */
    onFormSubmitted: (block: AvailableBlock) => void;
}

/** The classic ?bui_addblock=... link the modal's items point at, as core/add_block_button builds it. */
export const addBlockFallbackUrl = (): string => {
    const params = new URLSearchParams({
        'bui_addblock': '',
        'sesskey': config.sesskey,
        'bui_blockregion': DASHBOARD_REGION,
    });
    return `?${params.toString()}`;
};

/**
 * Open the block type's own configuration form, exactly as core_block/add_modal does.
 *
 * @param block The chosen block type (one with a blockform).
 * @param options The modal options the form inherits the page hash and callbacks from.
 */
const openAddBlockForm = async(block: AvailableBlock, options: AddBlockModalOptions): Promise<void> => {
    const [ModalForm] = await requireManyAsync(['core_form/modalform']) as [ModalFormModule];
    const form = new ModalForm({
        modalConfig: {
            title: getString('addblock', 'core_block', block.title),
        },
        args: {
            blockname: block.name,
            pagehash: options.pagehash ?? '',
            blockregion: DASHBOARD_REGION,
        },
        formClass: block.blockform ?? '',
        returnFocus: options.returnElement ?? undefined,
    });
    form.addEventListener(form.events.FORM_SUBMITTED, () => options.onFormSubmitted(block));
    form.show();
};

/**
 * Open the standard "Add a block" modal.
 *
 * @param options What to list, and what to do with the user's choice.
 * @return Resolves once the modal is showing.
 */
export const openAddBlockModal = async(options: AddBlockModalOptions): Promise<void> => {
    const [CancelModal, Templates] = await requireManyAsync(['core/modal_cancel', 'core/templates']) as
        [CancelModalModule, TemplatesModule];
    const modal = await CancelModal.create({
        title: options.title,
        returnElement: options.returnElement ?? undefined,
    });
    modal.setBody(Templates.render('core/add_block_body', {
        blocks: options.blocks.map(block => ({
            name: block.name,
            title: block.title,
            blockform: block.blockform ?? null,
        })),
        url: addBlockFallbackUrl(),
        blockregion: DASHBOARD_REGION,
        pagehash: options.pagehash ?? '',
    }));

    modal.getRoot().get(0)?.addEventListener('click', event => {
        const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-blockname]');
        if (!link) {
            return;
        }
        event.preventDefault();
        const block = options.blocks.find(candidate => candidate.name === link.dataset.blockname);
        modal.destroy();
        if (!block) {
            return;
        }
        // A block type with its own add form only gets it when the page can be found again from
        // its hash; without one (the application mounted somewhere other than the dashboard pages)
        // the block is added unconfigured instead, as the grid's own web service does.
        if (block.blockform && options.pagehash) {
            void openAddBlockForm(block, options);
        } else {
            options.onSelect(block);
        }
    });
    modal.show();
};
