// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * The block browser: a dialog for choosing one block to add to the dashboard.
 *
 * A search field over a grid of design-system Choicebox cards, one per block, each with the block's
 * icon, name and a short description. The cards are one native radio group, so they are a single
 * Tab stop and the arrow keys move between them and select. Enter, Insert or a double-click adds
 * the selected block.
 *
 * The design system has no dialog, so this is a native <dialog> laid out like core/modal: title and
 * close button, body, then the footer's secondary action before its primary one.
 *
 * @module     core_my/components/BlockBrowser
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Button, Choicebox, CloseButton} from '@moodlehq/design-system';
import type {AvailableBlock, DashboardLabels} from '../repository';

interface BlockBrowserProps {
    labels: DashboardLabels;
    blocks: AvailableBlock[];
    // Where "Discover more blocks" links to, or null when the site does not use the Marketplace.
    discoverUrl: string | null;
    onInsert: (block: AvailableBlock) => void;
    onClose: () => void;
}

/** A block's initials, shown when it has no icon of its own (or its image cannot load). */
export const initialsFor = (title: string): string => title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase();

const BlockBrowser = ({labels, blocks, discoverUrl, onInsert, onClose}: BlockBrowserProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<Element | null>(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    // Blocks whose image icon could not load, which show their initials instead.
    const [failedIcons, setFailedIcons] = useState<ReadonlySet<string>>(new Set());
    // One object per block, so React never rewrites an icon that has not changed.
    const iconHtml = useMemo(() => new Map(blocks.map(block => [block.name, {__html: block.iconhtml}])), [blocks]);

    /**
     * The block's icon, in the <i> element Choicebox's icon slot requires (it ignores anything else):
     * its own icon as the server rendered it, or its initials when it has none or the image fails.
     */
    const iconFor = (block: AvailableBlock) => {
        if (!block.iconhtml || failedIcons.has(block.name)) {
            return <i className="core-my-block-browser__initials">{initialsFor(block.title)}</i>;
        }
        return <i
            className="core-my-block-browser__icon"
            dangerouslySetInnerHTML={iconHtml.get(block.name)}
            // An image's error event does not bubble, so listen for it on the way down.
            ref={element => {
                const fail = () => setFailedIcons(failed => new Set([...failed, block.name]));
                element?.addEventListener('error', fail, {capture: true, once: true});
                return () => element?.removeEventListener('error', fail, {capture: true});
            }}
        />;
    };

    useEffect(() => {
        openerRef.current = document.activeElement;
        dialogRef.current?.showModal();
        searchRef.current?.focus();
        return () => {
            // Focus goes back to whatever opened the browser, if it is still there.
            if (openerRef.current instanceof HTMLElement && openerRef.current.isConnected) {
                openerRef.current.focus();
            }
        };
    }, []);

    const query = search.trim().toLocaleLowerCase();
    const matching = useMemo(() => blocks.filter(block => !query
        || `${block.title} ${block.description}`.toLocaleLowerCase().includes(query)), [blocks, query]);
    const addable = matching.filter(block => !block.added);
    // The top result is always selected, so typing a name and pressing Enter adds it.
    const current = addable.find(block => block.name === selected) ?? addable[0] ?? null;

    const insert = (block: AvailableBlock | null) => {
        if (block && !block.added) {
            onInsert(block);
        }
    };
    const focusSelected = () => {
        const radio = groupRef.current?.querySelector<HTMLInputElement>('input:checked')
            ?? groupRef.current?.querySelector<HTMLInputElement>('input');
        radio?.focus();
        return Boolean(radio);
    };
    const clearSearch = () => {
        setSearch('');
        searchRef.current?.focus();
    };

    return <dialog
        ref={dialogRef}
        className="core-my-block-browser"
        aria-labelledby="core-my-block-browser-title"
        onCancel={event => {
            event.preventDefault();
            onClose();
        }}
    >
        <div className="core-my-block-browser__header">
            <h2 id="core-my-block-browser-title">{labels.addblock}</h2>
            <CloseButton aria-label={labels.close} title={labels.close} onClick={onClose} />
        </div>
        <div className="core-my-block-browser__body">
            <div className="core-my-block-browser__search">
                <i className="fa fa-magnifying-glass" aria-hidden="true" />
                <input
                    ref={searchRef}
                    type="search"
                    className="form-control"
                    placeholder={labels.browsersearch}
                    aria-label={labels.browsersearch}
                    autoComplete="off"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            insert(current);
                        } else if (event.key === 'ArrowDown' && focusSelected()) {
                            event.preventDefault();
                        }
                    }}
                />
                {search && <button
                    type="button"
                    className="core-my-block-browser__clear"
                    aria-label={labels.clearsearch}
                    title={labels.clearsearch}
                    onClick={clearSearch}
                ><i className="fa fa-xmark" aria-hidden="true" /></button>}
            </div>
            {addable.length ? <div
                ref={groupRef}
                className="core-my-block-browser__grid"
                role="radiogroup"
                aria-label={labels.browserblocks}
            >
                {addable.map(block => <Choicebox
                    key={block.name}
                    name="core-my-block-browser-choice"
                    value={block.name}
                    label={block.title}
                    supportingText={block.description || labels.browserfallbackdescription}
                    icon={iconFor(block)}
                    checked={current?.name === block.name}
                    onChange={() => setSelected(block.name)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            insert(block);
                        }
                    }}
                    onDoubleClick={() => insert(block)}
                />)}
            </div> : <div className="core-my-block-browser__none">
                <p>{query ? labels.browsernomatch.replace('{$a}', search.trim()) : labels.browserallpresent}</p>
                {query && <Button variant="secondary" label={labels.clearsearch} onClick={clearSearch} />}
            </div>}
        </div>
        <div className="core-my-block-browser__footer">
            {discoverUrl && <a
                className="core-my-block-browser__discover"
                href={discoverUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                {labels.browserdiscover}
                <i className="fa fa-arrow-up-right-from-square" aria-hidden="true" />
                <span className="visually-hidden">{labels.opensinnewwindow}</span>
            </a>}
            <Button variant="secondary" label={labels.cancel} onClick={onClose} />
            <Button
                variant="primary"
                label={labels.browserinsert}
                disabled={!current}
                onClick={() => insert(current)}
            />
        </div>
    </dialog>;
};

export default BlockBrowser;
