var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { useEffect, useRef } from "react";
import { requireAsync } from "@moodle/lms/core/amd";
function useReportContentLoaded(rootRef, loading, failed) {
  const pending = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const firstLoad = new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
    });
    void requireAsync("core_block/events").then((events) => events.trackBlockContentLoading(root, firstLoad)).catch(() => null);
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
__name(useReportContentLoaded, "useReportContentLoaded");
export {
  useReportContentLoaded
};
//# sourceMappingURL=useReportContentLoaded.dev.js.map
