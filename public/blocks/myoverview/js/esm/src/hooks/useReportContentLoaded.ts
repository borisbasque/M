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
 * Tell the page hosting the block when its first page of courses is in place.
 *
 * The block declares that it loads its content separately (block_myoverview::has_async_content()),
 * so pages that host blocks, such as the flexible dashboard, wait for it to report through
 * core_block/events instead of guessing. While the first load is outstanding the block's root is
 * marked busy and a core/pending key is held; when it settles, succeeded or failed, the
 * core_block/contentLoaded event fires. Reported once per mount.
 *
 * @module     block_myoverview/hooks/useReportContentLoaded
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useRef, type RefObject} from "react";
import {requireAsync} from "@moodle/lms/core/amd";

interface BlockEvents {
    trackBlockContentLoading: (root: Element, loading: Promise<unknown>) => Promise<unknown>;
}

/**
 * Report the block's first load to the page.
 *
 * @param rootRef The block's root element.
 * @param loading Whether courses are being fetched. It is false before the first fetch starts, so
 *     the first load has settled only once it has been true and is false again.
 * @param failed Whether loading has failed (courses or language strings).
 */
export function useReportContentLoaded(rootRef: RefObject<HTMLElement | null>, loading: boolean, failed: boolean): void {
    const pending = useRef<{resolve: () => void; reject: (error: Error) => void} | null>(null);
    const started = useRef(false);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const firstLoad = new Promise<void>((resolve, reject) => {
            pending.current = {resolve, reject};
        });
        void requireAsync<BlockEvents>("core_block/events")
            .then((events) => events.trackBlockContentLoading(root, firstLoad))
            // A failed load is reported through the event; nothing else needs the rejection.
            .catch(() => null);
    }, [rootRef]);

    useEffect(() => {
        if (loading) {
            started.current = true;
        }
        const settle = pending.current;
        if (!settle) {
            return;
        }
        if (failed) {
            pending.current = null;
            settle.reject(new Error("Course overview could not load its courses."));
        } else if (started.current && !loading) {
            pending.current = null;
            settle.resolve();
        }
    }, [loading, failed]);
}
