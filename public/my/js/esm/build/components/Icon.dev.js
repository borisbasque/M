var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * A control icon rendered by the server through the theme's icon system.
 *
 * The markup comes from $OUTPUT->pix_icon() via the get_dashboard payload (see DashboardIcons in
 * repository.ts), so the theme's icon map decides which glyph is drawn; nothing here names a
 * FontAwesome class. The icon is always decorative: every control it appears in carries its own
 * accessible name.
 *
 * The element is always an <i>, because that is what the design system Button accepts as a
 * startIcon: it checks the React element's own type (an <i> or <svg>; anything else, including a
 * component that would render one, is dropped). That is why renderIcon() returns the element
 * itself rather than a component. The usual FontAwesome markup is a single <i> carrying the
 * glyph's classes, which becomes that element directly; any other icon system's markup (an
 * <img>, say) is rendered inside the <i>.
 *
 * @module     core_my/components/Icon
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const SINGLE_I_ELEMENT = /^\s*<i\b([^>]*)>\s*<\/i>\s*$/i;
const CLASS_ATTRIBUTE = /\bclass\s*=\s*"([^"]*)"/i;
const renderIcon = /* @__PURE__ */ __name((markup, className = "") => {
  const single = SINGLE_I_ELEMENT.exec(markup);
  if (single) {
    const glyphClasses = CLASS_ATTRIBUTE.exec(single[1])?.[1] ?? "";
    return /* @__PURE__ */ jsxDEV("i", { className: `core-my-dashboard-icon ${glyphClasses} ${className}`.trim(), "aria-hidden": "true" }, void 0, false, {
      fileName: "public/my/js/esm/src/components/Icon.tsx",
      lineNumber: 49,
      columnNumber: 16
    });
  }
  return /* @__PURE__ */ jsxDEV(
    "i",
    {
      className: `core-my-dashboard-icon ${className}`.trim(),
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: markup }
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/Icon.tsx",
      lineNumber: 51,
      columnNumber: 12
    }
  );
}, "renderIcon");
const Icon = /* @__PURE__ */ __name(({ markup, className = "" }) => renderIcon(markup, className), "Icon");
var Icon_default = Icon;
export {
  Icon_default as default,
  renderIcon
};
//# sourceMappingURL=Icon.dev.js.map
