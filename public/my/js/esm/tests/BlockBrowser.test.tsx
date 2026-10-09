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
 * Tests for the dashboard's block browser.
 *
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {act, fireEvent, render, screen, within} from '@testing-library/react';
import type React from 'react';
import BlockBrowser, {initialsFor} from '../src/components/BlockBrowser';
import type {AvailableBlock, DashboardLabels} from '../src/repository';

// The design system is ESM only, so Jest cannot load it: stand in with the same DOM contract.
jest.mock('@moodlehq/design-system', () => {
    const ReactActual = require('react');
    return {
        Button: ({label, variant: _variant, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
            label?: string;
            variant?: string;
        }) => <button type="button" {...props}>{label}</button>,
        CloseButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
        Choicebox: ({label, supportingText, icon, ...props}: React.InputHTMLAttributes<HTMLInputElement> & {
            label: string;
            supportingText?: string;
            icon?: React.ReactElement;
        }) => {
            const id = ReactActual.useId();
            return <div className="mds-choicebox-wrapper">
                <input type="radio" className="mds-choicebox-input" id={id} aria-describedby={`${id}-text`} {...props} />
                <label className="mds-choicebox" htmlFor={id}>
                    {/* As the real Choicebox: only an <i> or <svg> element is used as the icon. */}
                    {icon && (icon.type === 'i' || icon.type === 'svg')
                        && <span className="mds-choicebox-icon" aria-hidden="true">{icon}</span>}
                    <span className="mds-choicebox-label">{label}</span>
                    <span id={`${id}-text`} className="mds-choicebox-supporting-text">{supportingText}</span>
                </label>
            </div>;
        },
    };
}, {virtual: true});

HTMLDialogElement.prototype.showModal = jest.fn(function markOpen(this: HTMLDialogElement) {
    // eslint-disable-next-line no-invalid-this
    this.setAttribute('open', '');
});

const labels = {
    addblock: 'Add a block',
    browseralreadyadded: 'Blocks already on your dashboard aren\'t listed.',
    browserallpresent: 'Every block is already on your dashboard.',
    browserblocks: 'Blocks',
    browsercount: '{$a} blocks you can add.',
    browsercountone: '1 block you can add.',
    browserdiscover: 'Discover more blocks on Moodle Marketplace',
    browserfallbackdescription: 'Added to your site by an administrator.',
    browserinsert: 'Insert',
    browsernomatch: 'No blocks match "{$a}".',
    browsersearch: 'Search blocks',
    browsertargetcell: 'Your block will go in the space you picked.',
    browsertargetfree: 'Your block will go in the first free space, ready for you to move.',
    cancel: 'Cancel',
    clearsearch: 'Clear search input',
    close: 'Close',
    opensinnewwindow: 'Opens in new window',
} as unknown as DashboardLabels;

const block = (name: string, title: string, overrides: Partial<AvailableBlock> = {}): AvailableBlock => ({
    name, title, description: `${title} description.`, iconhtml: '<i class="icon fa fa-star"></i>', added: false, ...overrides,
});

const blocks = [
    block('calendar_month', 'Calendar'),
    block('completion_progress', 'Completion progress', {description: '', iconhtml: ''}),
    block('online_users', 'Online users'),
    block('timeline', 'Timeline', {added: true}),
];

const renderBrowser = (overrides: Partial<React.ComponentProps<typeof BlockBrowser>> = {}) => {
    const onInsert = jest.fn();
    const onClose = jest.fn();
    render(<BlockBrowser
        labels={labels}
        blocks={blocks}
        targeted={false}
        discoverUrl={null}
        onInsert={onInsert}
        onClose={onClose}
        {...overrides}
    />);
    return {onInsert, onClose};
};

describe('core_my block browser', () => {
    it('opens as a dialog with the search field focused, saying where the block will go', () => {
        renderBrowser();

        expect(screen.getByRole('dialog', {name: 'Add a block'})).toHaveAttribute('open');
        expect(screen.getByRole('searchbox', {name: 'Search blocks'})).toHaveFocus();
        expect(screen.getByText(labels.browsertargetfree)).toBeInTheDocument();
    });

    it('lists the blocks that can be added as one radio group, and says how many', () => {
        renderBrowser();

        const group = screen.getByRole('radiogroup', {name: 'Blocks'});
        expect(within(group).getAllByRole('radio')).toHaveLength(3);
        // A single-instance block already on the dashboard is not offered, and the status says why.
        expect(within(group).queryByRole('radio', {name: /^Timeline/})).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            '3 blocks you can add. Blocks already on your dashboard aren\'t listed.');
    });

    it('shows a block\'s own icon in the card\'s icon slot', () => {
        renderBrowser();

        const radio = screen.getByRole('radio', {name: /^Calendar/});
        expect(radio.closest('.mds-choicebox-wrapper')!.querySelector('.mds-choicebox-icon .fa-star')).toBeInTheDocument();
    });

    it('falls back to initials when a block\'s image icon cannot load', () => {
        renderBrowser({blocks: [block('progress', 'Completion progress', {iconhtml: '<img src="https://example.invalid/x.png" alt="">'})]});

        const slot = screen.getByRole('radio', {name: /^Completion progress/}).closest('.mds-choicebox-wrapper')!
            .querySelector('.mds-choicebox-icon')!;
        act(() => {
            slot.querySelector('img')!.dispatchEvent(new Event('error'));
        });
        expect(slot).toHaveTextContent('CP');
    });

    it('falls back to initials and a generic description for a block that declares neither', () => {
        renderBrowser();

        const radio = screen.getByRole('radio', {name: /^Completion progress/});
        expect(radio).toHaveAccessibleDescription('Added to your site by an administrator.');
        expect(radio.closest('.mds-choicebox-wrapper')!.querySelector('.mds-choicebox-icon')).toHaveTextContent('CP');
    });

    it('selects the top result as you search, so Enter adds it', () => {
        const {onInsert} = renderBrowser();

        const search = screen.getByRole('searchbox', {name: 'Search blocks'});
        fireEvent.change(search, {target: {value: 'online'}});
        expect(screen.getByRole('radio', {name: /^Online users/})).toBeChecked();
        expect(screen.getByRole('status')).toHaveTextContent('1 block you can add.');

        fireEvent.keyDown(search, {key: 'Enter'});
        expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({name: 'online_users'}));
    });

    it('matches descriptions as well as names, and can be cleared in one click', () => {
        renderBrowser();
        const search = screen.getByRole('searchbox', {name: 'Search blocks'});

        fireEvent.change(search, {target: {value: 'calendar description'}});
        expect(screen.getAllByRole('radio')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', {name: 'Clear search input'}));
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(search).toHaveFocus();
    });

    it('says when nothing matches, with a way to clear the search', () => {
        renderBrowser();

        fireEvent.change(screen.getByRole('searchbox', {name: 'Search blocks'}), {target: {value: 'zzz'}});

        expect(screen.getByText('No blocks match "zzz".')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Insert'})).toBeDisabled();
        fireEvent.click(screen.getAllByRole('button', {name: 'Clear search input'}).at(-1)!);
        expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('says when every block is already on the dashboard', () => {
        renderBrowser({blocks: [block('timeline', 'Timeline', {added: true})]});

        expect(screen.getByText('Every block is already on your dashboard.')).toBeInTheDocument();
    });

    it('moves from the search field to the selected card with Down, and adds a card with Enter', () => {
        const {onInsert} = renderBrowser();

        fireEvent.keyDown(screen.getByRole('searchbox', {name: 'Search blocks'}), {key: 'ArrowDown'});
        const calendar = screen.getByRole('radio', {name: /^Calendar/});
        expect(calendar).toHaveFocus();

        fireEvent.click(screen.getByRole('radio', {name: /^Online users/}));
        fireEvent.keyDown(screen.getByRole('radio', {name: /^Online users/}), {key: 'Enter'});
        expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({name: 'online_users'}));
    });

    it('adds the chosen block with Insert, and closes with Cancel or Escape', () => {
        const {onInsert, onClose} = renderBrowser();

        fireEvent.click(screen.getByRole('radio', {name: /^Online users/}));
        fireEvent.click(screen.getByRole('button', {name: 'Insert'}));
        expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({name: 'online_users'}));

        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        fireEvent(screen.getByRole('dialog'), new Event('cancel', {cancelable: true}));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('links to the Marketplace in a new window only when the site uses it', () => {
        renderBrowser({discoverUrl: 'https://marketplace.moodle.com/?type=2'});

        const link = screen.getByRole('link', {name: /Discover more blocks on Moodle Marketplace/});
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveTextContent('Opens in new window');
    });

    it('shows no Marketplace link when the site does not use it', () => {
        renderBrowser();

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('makes initials from the first two words', () => {
        expect(initialsFor('Completion progress')).toBe('CP');
        expect(initialsFor('Calendar')).toBe('C');
        expect(initialsFor('  logged in user ')).toBe('LI');
    });
});
