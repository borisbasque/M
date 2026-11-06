var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Thin FontAwesome icon wrapper (FA6 ships with Boost).
 *
 * @module     block_myoverview/components/Icon
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
function Icon({ name, variant = "solid", className = "" }) {
  return /* @__PURE__ */ jsxDEV("i", { className: `fa-${variant} fa-${name} ${className}`.trim(), "aria-hidden": "true" }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/Icon.tsx",
    lineNumber: 38,
    columnNumber: 12
  }, this);
}
__name(Icon, "Icon");
const faIcon = /* @__PURE__ */ __name((name) => /* @__PURE__ */ jsxDEV("i", { className: `fa-solid fa-${name}`, "aria-hidden": "true" }, void 0, false, {
  fileName: "public/blocks/myoverview/js/esm/src/components/Icon.tsx",
  lineNumber: 48,
  columnNumber: 41
}), "faIcon");
export {
  Icon as default,
  faIcon
};
//# sourceMappingURL=Icon.dev.js.map
