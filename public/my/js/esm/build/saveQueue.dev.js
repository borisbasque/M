var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { isMoodleAjaxError } from "@moodle/lms/core/ajax";
const DEFAULT_RETRY_DELAYS = [1e3, 2e3, 4e3, 8e3, 16e3];
const isTransientError = /* @__PURE__ */ __name((error) => !isMoodleAjaxError(error), "isTransientError");
const isOffline = /* @__PURE__ */ __name(() => typeof navigator !== "undefined" && navigator.onLine === false, "isOffline");
const waitToRetry = /* @__PURE__ */ __name((delay) => new Promise((resolve) => {
  const done = /* @__PURE__ */ __name(() => {
    clearTimeout(timer);
    window.removeEventListener("online", done);
    resolve();
  }, "done");
  const timer = isOffline() ? void 0 : setTimeout(done, delay);
  window.addEventListener("online", done);
}), "waitToRetry");
class SaveQueue {
  static {
    __name(this, "SaveQueue");
  }
  tasks = [];
  running = false;
  sendLayout;
  onStatus;
  retryDelays;
  constructor({ sendLayout, onStatus = /* @__PURE__ */ __name(() => void 0, "onStatus"), retryDelays = DEFAULT_RETRY_DELAYS }) {
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
  saveLayout(layout) {
    return new Promise((resolve, reject) => {
      const waiter = { resolve: /* @__PURE__ */ __name(() => resolve(), "resolve"), reject };
      const last = this.tasks[this.tasks.length - 1];
      if (last && last.kind === "layout" && (this.tasks.length > 1 || !this.running)) {
        last.layout = layout;
        last.waiters.push(waiter);
      } else {
        this.tasks.push({ kind: "layout", layout, waiters: [waiter] });
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
  call(run, retryable) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ kind: "call", run, retryable, waiters: [{ resolve, reject }] });
      void this.pump();
    });
  }
  /** Whether anything is still waiting to reach the server. */
  get busy() {
    return this.running || this.tasks.length > 0;
  }
  async pump() {
    if (this.running) {
      return;
    }
    this.running = true;
    while (this.tasks.length) {
      const task = this.tasks[0];
      this.onStatus("saving");
      try {
        const result = await this.attempt(task);
        task.waiters.forEach((waiter) => waiter.resolve(result));
      } catch (error) {
        task.waiters.forEach((waiter) => waiter.reject(error));
      }
      this.tasks.shift();
    }
    this.running = false;
    this.onStatus("idle");
  }
  async attempt(task) {
    const retryable = task.kind === "layout" || task.retryable;
    for (let attempt = 0; ; attempt++) {
      try {
        return await (task.kind === "layout" ? this.sendLayout(task.layout) : task.run());
      } catch (error) {
        if (!retryable || !isTransientError(error) || attempt >= this.retryDelays.length) {
          throw error;
        }
        this.onStatus(isOffline() ? "offline" : "retrying");
        await waitToRetry(this.retryDelays[attempt]);
        this.onStatus("saving");
      }
    }
  }
}
export {
  DEFAULT_RETRY_DELAYS,
  SaveQueue,
  isTransientError
};
//# sourceMappingURL=saveQueue.dev.js.map
