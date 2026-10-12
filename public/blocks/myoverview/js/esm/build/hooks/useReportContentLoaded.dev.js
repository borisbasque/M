var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { useEffect, useRef } from "react";
import { requireAsync } from "@moodle/lms/core/amd";
function useReportContentLoaded(rootRef, loading, failed, shown) {
  const pending = useRef(null);
  const started = useRef(false);
  const reported = useRef(false);
  const wasLoading = useRef(false);
  const events = useRef(null);
  const reportChange = /* @__PURE__ */ __name(() => {
    const root = rootRef.current;
    if (!reported.current || !root) {
      return void 0;
    }
    const frame = requestAnimationFrame(() => events.current?.notifyBlockContentLoaded(root, failed));
    return () => cancelAnimationFrame(frame);
  }, "reportChange");
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const firstLoad = new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
    });
    void requireAsync("core_block/events").then((module) => {
      events.current = module;
      return module.trackBlockContentLoading(root, firstLoad);
    }).catch(() => null);
  }, [rootRef]);
  useEffect(() => {
    const finished = wasLoading.current && !loading;
    wasLoading.current = loading;
    if (loading) {
      started.current = true;
    }
    const settle = pending.current;
    if (!settle) {
      return finished ? reportChange() : void 0;
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
    return void 0;
  }, [loading, failed]);
  useEffect(() => reportChange(), [shown]);
}
__name(useReportContentLoaded, "useReportContentLoaded");
export {
  useReportContentLoaded
};
//# sourceMappingURL=useReportContentLoaded.dev.js.map
