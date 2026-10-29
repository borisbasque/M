var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Small helpers for the dashboard application.
 *
 * @module     core_my/utils
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const htmlToText = /* @__PURE__ */ __name((html) => {
  if (!html.includes("<") && !html.includes("&")) {
    return html;
  }
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}, "htmlToText");
export {
  htmlToText
};
//# sourceMappingURL=utils.dev.js.map
