var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
const BLOCK_LOAD_CONCURRENCY = 4;
class BlockLoader {
  static {
    __name(this, "BlockLoader");
  }
  waiting = [];
  started = /* @__PURE__ */ new Set();
  running = 0;
  stopped = false;
  options;
  constructor(options) {
    this.options = { concurrency: BLOCK_LOAD_CONCURRENCY, ...options };
  }
  /**
   * Queue blocks to load, in the order given, after any already queued.
   *
   * @param ids Block instance ids, in reading order.
   */
  enqueue(ids) {
    ids.forEach((id) => {
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
  prioritise(id) {
    const index = this.waiting.indexOf(id);
    if (index > 0) {
      this.waiting.splice(index, 1);
      this.waiting.unshift(id);
    }
  }
  /** Stop starting new loads, and ignore the results of any in flight, e.g. after a full reload. */
  stop() {
    this.stopped = true;
    this.waiting.length = 0;
  }
  pump() {
    while (!this.stopped && this.running < this.options.concurrency && this.waiting.length) {
      const id = this.waiting.shift();
      this.started.add(id);
      this.running++;
      this.options.fetch(id).then(
        (result) => {
          if (!this.stopped) {
            this.options.onLoaded(id, result);
          }
          return void 0;
        },
        (error) => {
          if (!this.stopped) {
            this.options.onFailed(id, error);
          }
        }
      ).finally(() => {
        this.running--;
        this.pump();
      });
    }
  }
}
export {
  BLOCK_LOAD_CONCURRENCY,
  BlockLoader
};
//# sourceMappingURL=blockLoader.dev.js.map
