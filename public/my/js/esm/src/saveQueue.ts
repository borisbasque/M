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
 * An ordered, retrying queue for dashboard changes, built for slow and unreliable connections.
 *
 * The dashboard applies every move, resize and removal on screen straight away and sends it to the
 * server afterwards. This queue is what makes that safe:
 *
 * - Changes are sent one at a time, in the order they were made, so a slow earlier request can
 *   never land after (and overwrite) a later one.
 * - Layout saves coalesce. Each save carries the whole layout, so while one is in flight, any
 *   further drops only replace the single queued save instead of each sending its own request.
 * - Transient failures (the request never reached the server, timed out, or the server was
 *   unavailable) are retried with a growing delay, or as soon as the browser reports it is back
 *   online. A definitive rejection from the server (a Moodle exception) is never retried.
 *
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {isMoodleAjaxError} from '@moodle/lms/core/ajax';
import type {LayoutItem} from './layout';

/** How the queue is getting on, for a visible status message. */
export type SaveStatus = 'idle' | 'saving' | 'retrying' | 'offline';

/** Delays between retries of a transient failure, in milliseconds (about 30 seconds in all). */
export const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

interface Waiter {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
}

type Task =
    | {kind: 'layout'; layout: LayoutItem[]; waiters: Waiter[]}
    | {kind: 'call'; run: () => Promise<unknown>; retryable: boolean; waiters: Waiter[]};

export interface SaveQueueOptions {
    /** Send one full layout to the server. */
    sendLayout: (layout: LayoutItem[]) => Promise<unknown>;
    /** Told whenever the queue's status changes. */
    onStatus?: (status: SaveStatus) => void;
    /** Delays between retries; the number of entries is the number of retries. */
    retryDelays?: number[];
}

/**
 * Whether a failed request is worth retrying.
 *
 * The server always answers a request it received with a Moodle exception when it refuses it;
 * anything else (a network error, a timeout abort, an HTTP 5xx) means the change may never have
 * arrived.
 *
 * @param error What the request rejected with.
 * @return True if the same request could succeed if sent again.
 */
export const isTransientError = (error: unknown): boolean => !isMoodleAjaxError(error);

const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Wait for a retry delay, cutting it short if the connection comes back.
 *
 * While the browser reports being offline, there is no point waiting on a timer: wait for the
 * 'online' event instead.
 *
 * @param delay Milliseconds to wait while online.
 * @return A promise resolved when it is time to retry.
 */
const waitToRetry = (delay: number): Promise<void> => new Promise(resolve => {
    const done = () => {
        clearTimeout(timer);
        window.removeEventListener('online', done);
        resolve();
    };
    const timer = isOffline() ? undefined : setTimeout(done, delay);
    window.addEventListener('online', done);
});

export class SaveQueue {
    private readonly tasks: Task[] = [];
    private running = false;
    private readonly sendLayout: SaveQueueOptions['sendLayout'];
    private readonly onStatus: NonNullable<SaveQueueOptions['onStatus']>;
    private readonly retryDelays: number[];

    constructor({sendLayout, onStatus = () => undefined, retryDelays = DEFAULT_RETRY_DELAYS}: SaveQueueOptions) {
        this.sendLayout = sendLayout;
        this.onStatus = onStatus;
        this.retryDelays = retryDelays;
    }

    /**
     * Queue a full layout save, merging it into a save that is queued but not yet sent.
     *
     * @param layout The whole layout to persist.
     * @return Resolves once this layout, or a later one that replaced it, has been saved.
     */
    saveLayout(layout: LayoutItem[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const waiter = {resolve: () => resolve(), reject};
            const last = this.tasks[this.tasks.length - 1];
            // Only a queued task can be merged into - tasks[0] may already be on the wire.
            if (last && last.kind === 'layout' && (this.tasks.length > 1 || !this.running)) {
                last.layout = layout;
                last.waiters.push(waiter);
            } else {
                this.tasks.push({kind: 'layout', layout, waiters: [waiter]});
            }
            void this.pump();
        });
    }

    /**
     * Queue any other dashboard change, in order with the layout saves.
     *
     * @param run Sends the change.
     * @param retryable Whether sending it twice is harmless. Adding a block is not: if the first
     *     response is lost after the server added it, a retry would add a second one.
     * @return Resolves with what run() resolved with.
     */
    call<T>(run: () => Promise<T>, retryable: boolean): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.tasks.push({kind: 'call', run, retryable, waiters: [{resolve: resolve as (value: unknown) => void, reject}]});
            void this.pump();
        });
    }

    /** Whether anything is still waiting to reach the server. */
    get busy(): boolean {
        return this.running || this.tasks.length > 0;
    }

    private async pump(): Promise<void> {
        if (this.running) {
            return;
        }
        this.running = true;
        while (this.tasks.length) {
            const task = this.tasks[0];
            this.onStatus('saving');
            try {
                const result = await this.attempt(task);
                task.waiters.forEach(waiter => waiter.resolve(result));
            } catch (error) {
                task.waiters.forEach(waiter => waiter.reject(error));
            }
            this.tasks.shift();
        }
        this.running = false;
        this.onStatus('idle');
    }

    private async attempt(task: Task): Promise<unknown> {
        const retryable = task.kind === 'layout' || task.retryable;
        for (let attempt = 0; ; attempt++) {
            try {
                return await (task.kind === 'layout' ? this.sendLayout(task.layout) : task.run());
            } catch (error) {
                if (!retryable || !isTransientError(error) || attempt >= this.retryDelays.length) {
                    throw error;
                }
                this.onStatus(isOffline() ? 'offline' : 'retrying');
                await waitToRetry(this.retryDelays[attempt]);
                this.onStatus('saving');
            }
        }
    }
}
