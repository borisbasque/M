// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Tests for the block actions menu against the real design system Dropdown (no mock).
 *
 * @copyright  2026 Kieran Gray
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {BlockActionsMenu} from '../src/components/DashboardTile';

describe('BlockActionsMenu with the real design system Dropdown', () => {
    it('opens on click, lists the block actions, and closes on Escape', () => {
        render(<BlockActionsMenu
            blockId={11}
            actions={[
                {id: 'permissions', label: 'Manage permissions', url: 'https://example.com/perm', modalform: ''},
                {id: 'check', label: 'Check permissions', url: 'https://example.com/check', modalform: ''},
            ]}
            label="More actions for Useful links"
        />);

        const trigger = screen.getByRole('button', {name: 'More actions for Useful links'});
        fireEvent.click(trigger);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getAllByRole('menuitem').map(item => item.textContent))
            .toEqual(['Manage permissions', 'Check permissions']);
        expect(screen.queryByRole('menuitem', {name: 'Move'})).not.toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Manage permissions'})).toHaveAttribute('href', 'https://example.com/perm');

        fireEvent.keyDown(document.activeElement!, {key: 'Escape'});
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        fireEvent.click(trigger);
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });
});
