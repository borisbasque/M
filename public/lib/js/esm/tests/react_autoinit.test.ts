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
 * Tests for automatic mounting and unmounting of [data-react-component] elements.
 *
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Only unmounting is exercised here: mounting resolves components with a dynamic import(), which
// this Jest environment does not support. For an element that was never mounted, unmounting falls
// back to unmountReactApp(), so that is what records whether an unmount happened.
const mockUnmountReactApp = jest.fn();

jest.mock('@moodle/lms/core/mount', () => ({
    mountReactApp: jest.fn(() => () => undefined),
    unmountReactApp: mockUnmountReactApp,
}));

/** Let the MutationObserver's callback run. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

const component = (): HTMLElement => {
    const el = document.createElement('div');
    el.setAttribute('data-react-component', '@moodle/lms/core_test/Fake');
    return el;
};

describe('@moodle/lms/core/react_autoinit', () => {
    beforeAll(async() => {
        require('@moodle/lms/core/react_autoinit');
        await settle();
    });

    beforeEach(async() => {
        // Quiet the module's own diagnostics (profiling logs, the unresolvable test component).
        jest.spyOn(window.console, 'error').mockImplementation(() => undefined);
        jest.spyOn(window.console, 'log').mockImplementation(() => undefined);
        document.body.innerHTML = '';
        await settle();
        mockUnmountReactApp.mockClear();
    });

    afterEach(async() => {
        // Let the observer handle this test's elements before the spies go away.
        document.body.innerHTML = '';
        await settle();
    });

    it('unmounts a component whose element is removed from the page', async() => {
        const el = component();
        document.body.appendChild(el);
        await settle();

        el.remove();
        await settle();

        expect(mockUnmountReactApp).toHaveBeenCalledWith(el);
    });

    it('keeps a component mounted when its element is only moved', async() => {
        const first = document.createElement('section');
        const second = document.createElement('section');
        second.appendChild(component());
        document.body.append(first, second);
        await settle();

        // Reorder the containers, the way React reorders keyed children: the browser reports a
        // removal and an addition of the same node, which is still in the document throughout.
        document.body.insertBefore(second, first);
        await settle();

        expect(mockUnmountReactApp).not.toHaveBeenCalled();
    });
});
