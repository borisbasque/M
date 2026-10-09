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
 * Loads dashboard blocks' content one block per request, a few at a time, visible blocks first.
 *
 * The dashboard's layout arrives first, without any block's content (see core_my_get_dashboard).
 * Each block's content then loads on its own (core_my_get_dashboard_block), so one slow block never
 * holds up the others, and a limit on requests at once keeps a busy dashboard from flooding the
 * server or a slow connection. Blocks start in reading order; a block scrolled into view jumps the
 * queue.
 *
 * @module     core_my/blockLoader
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** How many blocks load at once. */
export const BLOCK_LOAD_CONCURRENCY = 4;

export interface BlockLoaderOptions<T> {
    /** Fetch one block's content. */
    fetch: (id: number) => Promise<T>;
    /** Told when a block's content has arrived. */
    onLoaded: (id: number, result: T) => void;
    /** Told when a block's content could not be loaded. */
    onFailed: (id: number, error: unknown) => void;
    /** How many blocks load at once. */
    concurrency?: number;
}

export class BlockLoader<T> {
    private readonly waiting: number[] = [];
    private readonly started = new Set<number>();
    private running = 0;
    private stopped = false;
    private readonly options: Required<BlockLoaderOptions<T>>;

    constructor(options: BlockLoaderOptions<T>) {
        this.options = {concurrency: BLOCK_LOAD_CONCURRENCY, ...options};
    }

    /**
     * Queue blocks to load, in the order given, after any already queued.
     *
     * @param ids Block instance ids, in reading order.
     */
    enqueue(ids: number[]): void {
        ids.forEach(id => {
            if (!this.started.has(id) && !this.waiting.includes(id)) {
                this.waiting.push(id);
            }
        });
        this.pump();
    }

    /**
     * Load a block next, ahead of the others waiting, such as when it scrolls into view.
     *
     * @param id Block instance id.
     */
    prioritise(id: number): void {
        const index = this.waiting.indexOf(id);
        if (index > 0) {
            this.waiting.splice(index, 1);
            this.waiting.unshift(id);
        }
    }

    /** Stop starting new loads, and ignore the results of any in flight, e.g. after a full reload. */
    stop(): void {
        this.stopped = true;
        this.waiting.length = 0;
    }

    private pump(): void {
        while (!this.stopped && this.running < this.options.concurrency && this.waiting.length) {
            const id = this.waiting.shift()!;
            this.started.add(id);
            this.running++;
            this.options.fetch(id).then(
                result => {
                    if (!this.stopped) {
                        this.options.onLoaded(id, result);
                    }
                    return undefined;
                },
                error => {
                    if (!this.stopped) {
                        this.options.onFailed(id, error);
                    }
                },
            ).finally(() => {
                this.running--;
                this.pump();
            });
        }
    }
}
