import{jsx as r}from"react/jsx-runtime";/**
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
 */const c=/^\s*<i\b([^>]*)>\s*<\/i>\s*$/i,o=/\bclass\s*=\s*"([^"]*)"/i,i=(e,s="")=>{const t=c.exec(e);if(t){const n=o.exec(t[1])?.[1]??"";return r("i",{className:`core-my-dashboard-icon ${n} ${s}`.trim(),"aria-hidden":"true"})}return r("i",{className:`core-my-dashboard-icon ${s}`.trim(),"aria-hidden":"true",dangerouslySetInnerHTML:{__html:e}})},a=({markup:e,className:s=""})=>i(e,s);var d=a;export{d as default,i as renderIcon};
