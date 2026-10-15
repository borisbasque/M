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
    it('opens on click, opens the Move submenu and applies a step', async() => {
        const onUp = jest.fn();
        const steps = (mode: 'move' | 'resize') => mode === 'move'
            ? [{key: 'up', label: 'Up', onSelect: onUp}]
            : [{key: 'wider', label: 'Wider', onSelect: jest.fn()}];
        render(<BlockActionsMenu
            blockId={11}
            actions={[{id: 'permissions', label: 'Permissions', url: 'https://example.com/perm', modalform: ''}]}
            label="More actions for Useful links"
            moveLabel="Move"
            resizeLabel="Resize"
            steps={steps}
        />);

        fireEvent.click(screen.getByRole('button', {name: 'More actions for Useful links'}));
        expect(await screen.findByRole('menu')).toBeInTheDocument();
        expect(screen.getByRole('menuitem', {name: 'Permissions'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('menuitem', {name: 'Move'}));
        const up = await screen.findByRole('menuitem', {name: /^Up/});
        fireEvent.click(up);
        expect(onUp).toHaveBeenCalledTimes(1);
    });
});
