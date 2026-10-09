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
 * Tests for core/Toast.
 *
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {act, fireEvent, render, screen} from '@testing-library/react';
import Toast, {TOAST_DURATION_MS, type ToastMessage} from '@moodle/lms/core/Toast';

describe('core/Toast', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const message = (overrides: Partial<ToastMessage> = {}): ToastMessage => ({id: 1, text: 'Block removed.', ...overrides});

    it('is a polite status region that is present even with no message', () => {
        const {rerender} = render(<Toast message={null} closeLabel="Close" onClose={jest.fn()} />);

        const region = screen.getByRole('status');
        expect(region).toHaveAttribute('aria-live', 'polite');
        expect(region).toBeEmptyDOMElement();

        rerender(<Toast message={message()} closeLabel="Close" onClose={jest.fn()} />);
        expect(screen.getByRole('status')).toHaveTextContent('Block removed.');
    });

    it('closes itself after six seconds by default', () => {
        const onClose = jest.fn();
        render(<Toast message={message()} closeLabel="Close" onClose={onClose} />);

        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS - 1));
        expect(onClose).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(1));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays until dismissed when it persists', () => {
        const onClose = jest.fn();
        render(<Toast message={message({persist: true})} closeLabel="Close" onClose={onClose} />);

        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS * 5));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', {name: 'Close'}));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('runs its action, which can be reached by keyboard', () => {
        const onClick = jest.fn();
        render(<Toast
            message={message({action: {label: 'Undo', onClick}})}
            closeLabel="Close"
            onClose={jest.fn()}
        />);

        const undo = screen.getByRole('button', {name: 'Undo'});
        expect(undo.tagName).toBe('BUTTON');
        fireEvent.click(undo);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('pauses its timer while hovered or focused', () => {
        const onClose = jest.fn();
        render(<Toast message={message({action: {label: 'Undo', onClick: jest.fn()}})} closeLabel="Close" onClose={onClose} />);
        const region = screen.getByRole('status');

        fireEvent.mouseEnter(region);
        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS * 2));
        expect(onClose).not.toHaveBeenCalled();

        // Focus inside keeps it open after the pointer leaves.
        fireEvent.focus(screen.getByRole('button', {name: 'Undo'}));
        fireEvent.mouseLeave(region);
        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS * 2));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.blur(screen.getByRole('button', {name: 'Undo'}));
        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows only the newest message, restarting the timer', () => {
        const onClose = jest.fn();
        const {rerender} = render(<Toast message={message()} closeLabel="Close" onClose={onClose} />);

        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS - 1000));
        rerender(<Toast message={message({id: 2, text: 'Block added.'})} closeLabel="Close" onClose={onClose} />);
        expect(screen.getByRole('status')).toHaveTextContent('Block added.');
        expect(screen.getByRole('status')).not.toHaveTextContent('Block removed.');

        act(() => jest.advanceTimersByTime(TOAST_DURATION_MS - 1));
        expect(onClose).not.toHaveBeenCalled();
    });
});
