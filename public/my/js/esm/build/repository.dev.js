var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import config from "@moodle/lms/core/config";
import { fetchOne } from "@moodle/lms/core/ajax";
const UPDATE_TIMEOUT_MS = 3e4;
const getDashboard = /* @__PURE__ */ __name((siteDefault) => fetchOne({
  methodname: "core_my_get_dashboard",
  args: { sitedefault: siteDefault }
}), "getDashboard");
const getDashboardBlock = /* @__PURE__ */ __name((siteDefault, blockid) => fetchOne({
  methodname: "core_my_get_dashboard_block",
  args: { sitedefault: siteDefault, blockid }
}), "getDashboardBlock");
const updateDashboard = /* @__PURE__ */ __name((action, siteDefault, layout = [], blockname = "", blockid = 0, revision = null) => fetchOne({
  methodname: "core_my_update_dashboard",
  args: {
    action,
    sitedefault: siteDefault,
    layout,
    blockname,
    blockid,
    revision
  }
}, { timeout: UPDATE_TIMEOUT_MS }), "updateDashboard");
const beaconRemoval = /* @__PURE__ */ __name((siteDefault, blockid, layout, revision) => {
  const url = new URL(`${config.wwwroot}/lib/ajax/service.php`);
  url.searchParams.set("sesskey", config.sesskey);
  url.searchParams.set("info", "core_my_update_dashboard");
  const call = /* @__PURE__ */ __name((index, action, args) => ({
    index,
    methodname: "core_my_update_dashboard",
    args: { action, sitedefault: siteDefault, layout: [], blockname: "", blockid: 0, ...args }
  }), "call");
  return navigator.sendBeacon(url, JSON.stringify([
    call(0, "remove", { blockid, revision }),
    call(1, "save", { layout, revision: revision === null ? null : revision + 1 })
  ]));
}, "beaconRemoval");
export {
  UPDATE_TIMEOUT_MS,
  beaconRemoval,
  getDashboard,
  getDashboardBlock,
  updateDashboard
};
//# sourceMappingURL=repository.dev.js.map
