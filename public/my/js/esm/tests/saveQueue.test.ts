// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Tests for the dashboard's ordered, retrying save queue.
 *
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {SaveQueue, isTransientError, type SaveStatus} from '../src/saveQueue';
import type {LayoutItem} from '../src/layout';

const layoutAt = (column: number): LayoutItem[] => [{id: 1, column, row: 0, columns: 1, rows: 2}];
const serverError = {message: 'Invalid layout', errorcode: 'invalidparameter'};

/** A promise whose settling the test controls. */
const deferred = <T = unknown>() => {
    let settle!: {resolve: (value: T) => void; reject: (reason: unknown) => void};
    const promise = new Promise<T>((resolve, reject) => {
        settle = {resolve, reject};
    });
    return {promise, ...settle};
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('core_my dashboard SaveQueue', () => {
    it('treats only Moodle exceptions as final', () => {
        expect(isTransientError(serverError)).toBe(false);
        expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true);
        expect(isTransientError(new Error('HTTP 503: Service Unavailable'))).toBe(true);
    });

    it('sends changes one at a time, in the order they were made', async() => {
        const sent: string[] = [];
        const first = deferred();
        const queue = new SaveQueue({
            sendLayout: () => {
                sent.push('layout');
                return first.promise;
            },
            retryDelays: [],
        });

        const saved = queue.saveLayout(layoutAt(1));
        const removed = queue.call(() => {
            sent.push('remove');
            return Promise.resolve('removed');
        }, true);
        await flush();
        // The removal waits for the save ahead of it.
        expect(sent).toEqual(['layout']);

        first.resolve(undefined);
        await saved;
        await expect(removed).resolves.toBe('removed');
        expect(sent).toEqual(['layout', 'remove']);
    });

    it('merges layouts queued behind an in-flight save into one request', async() => {
        const sent: LayoutItem[][] = [];
        const inFlight = deferred();
        let calls = 0;
        const queue = new SaveQueue({
            sendLayout: layout => {
                sent.push(layout);
                calls += 1;
                return calls === 1 ? inFlight.promise : Promise.resolve();
            },
            retryDelays: [],
        });

        const first = queue.saveLayout(layoutAt(1));
        await flush();
        const second = queue.saveLayout(layoutAt(2));
        const third = queue.saveLayout(layoutAt(3));

        inFlight.resolve(undefined);
        await Promise.all([first, second, third]);
        // The first went out on its own; the second was replaced by the third before it was sent.
        expect(sent).toEqual([layoutAt(1), layoutAt(3)]);
    });

    it('retries a transient failure and reports it', async() => {
        const statuses: SaveStatus[] = [];
        let attempts = 0;
        const queue = new SaveQueue({
            sendLayout: () => {
                attempts += 1;
                return attempts < 3 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve();
            },
            onStatus: status => statuses.push(status),
            retryDelays: [0, 0, 0],
        });

        await queue.saveLayout(layoutAt(1));
        expect(attempts).toBe(3);
        expect(statuses).toContain('retrying');
        expect(statuses[statuses.length - 1]).toBe('idle');
    });

    it('never retries a refusal from the server', async() => {
        let attempts = 0;
        const queue = new SaveQueue({
            sendLayout: () => {
                attempts += 1;
                return Promise.reject(serverError);
            },
            retryDelays: [0, 0, 0],
        });

        await expect(queue.saveLayout(layoutAt(1))).rejects.toBe(serverError);
        expect(attempts).toBe(1);
    });

    it('never retries a change that is not safe to send twice', async() => {
        let attempts = 0;
        const queue = new SaveQueue({sendLayout: () => Promise.resolve(), retryDelays: [0, 0]});

        await expect(queue.call(() => {
            attempts += 1;
            return Promise.reject(new TypeError('Failed to fetch'));
        }, false)).rejects.toThrow('Failed to fetch');
        expect(attempts).toBe(1);
    });

    it('gives up after the last retry, and carries on with the rest of the queue', async() => {
        const failure = new TypeError('Failed to fetch');
        const queue = new SaveQueue({sendLayout: () => Promise.reject(failure), retryDelays: [0, 0]});

        await expect(queue.saveLayout(layoutAt(1))).rejects.toBe(failure);
        await expect(queue.call(() => Promise.resolve('next'), true)).resolves.toBe('next');
        expect(queue.busy).toBe(false);
    });

    it('waits for the connection to come back instead of retrying while offline', async() => {
        const onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        const statuses: SaveStatus[] = [];
        let attempts = 0;
        const queue = new SaveQueue({
            sendLayout: () => {
                attempts += 1;
                return attempts === 1 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve();
            },
            onStatus: status => statuses.push(status),
            // Long enough that only the 'online' event can explain a prompt retry.
            retryDelays: [60000],
        });

        const saved = queue.saveLayout(layoutAt(1));
        await flush();
        expect(statuses).toContain('offline');
        expect(attempts).toBe(1);

        onLine.mockReturnValue(true);
        window.dispatchEvent(new Event('online'));
        await saved;
        expect(attempts).toBe(2);
        onLine.mockRestore();
    });
});
