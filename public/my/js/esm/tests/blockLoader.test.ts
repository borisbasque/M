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
 * Tests for loading dashboard blocks one per request, a few at a time.
 *
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {BlockLoader} from '../src/blockLoader';

/** A fetch whose replies the test releases one by one. */
const controlledFetch = () => {
    const pending = new Map<number, {resolve: (value: string) => void; reject: (error: unknown) => void}>();
    const fetch = jest.fn((id: number) => new Promise<string>((resolve, reject) => {
        pending.set(id, {resolve, reject});
    }));
    return {fetch, pending};
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('core_my block loader', () => {
    it('loads at most four blocks at once, starting the next as each finishes', async() => {
        const {fetch, pending} = controlledFetch();
        const onLoaded = jest.fn();
        const loader = new BlockLoader({fetch, onLoaded, onFailed: jest.fn()});

        loader.enqueue([1, 2, 3, 4, 5, 6]);
        expect(fetch.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 4]);

        pending.get(2)!.resolve('two');
        await flush();
        expect(onLoaded).toHaveBeenCalledWith(2, 'two');
        expect(fetch.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 4, 5]);
    });

    it('loads a block scrolled into view ahead of the others waiting', async() => {
        const {fetch, pending} = controlledFetch();
        const loader = new BlockLoader({fetch, onLoaded: jest.fn(), onFailed: jest.fn(), concurrency: 1});

        loader.enqueue([1, 2, 3, 4]);
        loader.prioritise(4);
        pending.get(1)!.resolve('one');
        await flush();

        expect(fetch.mock.calls.map(([id]) => id)).toEqual([1, 4]);
    });

    it('reports a block that fails without holding up the rest', async() => {
        const {fetch, pending} = controlledFetch();
        const onFailed = jest.fn();
        const loader = new BlockLoader({fetch, onLoaded: jest.fn(), onFailed, concurrency: 1});

        loader.enqueue([1, 2]);
        pending.get(1)!.reject(new Error('slow block'));
        await flush();

        expect(onFailed).toHaveBeenCalledWith(1, expect.any(Error));
        expect(fetch.mock.calls.map(([id]) => id)).toEqual([1, 2]);
    });

    it('never loads the same block twice', () => {
        const {fetch} = controlledFetch();
        const loader = new BlockLoader({fetch, onLoaded: jest.fn(), onFailed: jest.fn()});

        loader.enqueue([1, 2]);
        loader.enqueue([2, 1, 3]);

        expect(fetch.mock.calls.map(([id]) => id)).toEqual([1, 2, 3]);
    });

    it('ignores replies once stopped, such as after a full reload', async() => {
        const {fetch, pending} = controlledFetch();
        const onLoaded = jest.fn();
        const loader = new BlockLoader({fetch, onLoaded, onFailed: jest.fn(), concurrency: 1});

        loader.enqueue([1, 2]);
        loader.stop();
        pending.get(1)!.resolve('stale');
        await flush();

        expect(onLoaded).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
