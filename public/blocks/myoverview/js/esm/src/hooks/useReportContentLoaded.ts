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
 * Tell the page hosting the block when its courses are in place.
 *
 * The block declares that it loads its content separately (block_myoverview::has_async_content()),
 * so pages that host blocks, such as the flexible dashboard, wait for it to report through
 * core_block/events instead of guessing. While the first load is outstanding the block's root is
 * marked busy and a core/pending key is held; when it settles, succeeded or failed, the
 * core_block/contentLoaded event fires. After that, the block reports again whenever what it shows
 * changes: a later load finishing (filter, sort, search, a page not yet loaded) or a change of view
 * or page, once the new content has rendered. A page can then fit the block to its content again.
 *
 * @module     block_myoverview/hooks/useReportContentLoaded
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef, type RefObject} from "react";
import {requireAsync} from "@moodle/lms/core/amd";

interface BlockEvents {
    trackBlockContentLoading: (root: Element, loading: Promise<unknown>) => Promise<unknown>;
    notifyBlockContentLoaded: (element: Element, failed?: boolean) => unknown;
}

/**
 * Report the block's courses to the page: the first load, then each change.
 *
 * @param rootRef The block's root element.
 * @param loading Whether courses are being fetched. It is false before the first fetch starts, so
 *     the first load has settled only once it has been true and is false again.
 * @param failed Whether loading has failed (courses or language strings).
 * @param shown What is shown without loading, such as the view and page: a change is reported too.
 */
export function useReportContentLoaded(
    rootRef: RefObject<HTMLElement | null>,
    loading: boolean,
    failed: boolean,
    shown: string,
): void {
    const pending = useRef<{resolve: () => void; reject: (error: Error) => void} | null>(null);
    const started = useRef(false);
    const reported = useRef(false);
    const wasLoading = useRef(false);
    const events = useRef<BlockEvents | null>(null);

    // Report a change once the browser has laid it out, so a page measuring the block sees it.
    const reportChange = () => {
        const root = rootRef.current;
        if (!reported.current || !root) {
            return undefined;
        }
        const frame = requestAnimationFrame(() => events.current?.notifyBlockContentLoaded(root, failed));
        return () => cancelAnimationFrame(frame);
    };

    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const firstLoad = new Promise<void>((resolve, reject) => {
            pending.current = {resolve, reject};
        });
        void requireAsync<BlockEvents>("core_block/events")
            .then((module) => {
                events.current = module;
                return module.trackBlockContentLoading(root, firstLoad);
            })
            // A failed load is reported through the event; nothing else needs the rejection.
            .catch(() => null);
    }, [rootRef]);

    useEffect(() => {
        const finished = wasLoading.current && !loading;
        wasLoading.current = loading;
        if (loading) {
            started.current = true;
        }
        const settle = pending.current;
        if (!settle) {
            // The first load is reported; a later one finishing is a change.
            return finished ? reportChange() : undefined;
        }
        if (failed) {
            pending.current = null;
            reported.current = true;
            settle.reject(new Error("Course overview could not load its courses."));
        } else if (started.current && !loading) {
            pending.current = null;
            reported.current = true;
            settle.resolve();
        }
        return undefined;
    }, [loading, failed]);

    // A change of view or page shows other content without loading anything.
    useEffect(() => reportChange(), [shown]);
}
