import{Button as l}from"@moodlehq/design-system";import{renderIcon as m}from"./Icon";import{jsx as e}from"react/jsx-runtime";/**
 * Replaceable directional controls built with the Moodle Design System Button: secondary, large,
 * icon-only, the same Button as the tile's Delete (minus) button, so its fill, hover, pressed state and
 * keyboard-only focus ring all come from the design system.
 *
 * @module     core_my/components/GridControls
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const c=[{name:"up",horizontal:0,vertical:-1},{name:"left",horizontal:-1,vertical:0},{name:"right",horizontal:1,vertical:0},{name:"down",horizontal:0,vertical:1}],d=({mode:t,labels:r,icons:n,onDirection:i})=>e("div",{className:"core-my-grid-controls",role:"group","aria-label":t==="move"?r.movecontrols:r.resizecontrols,children:c.map(o=>{const s=r[o.name];return e(l,{size:"lg",variant:"secondary",className:`core-my-grid-controls__direction core-my-grid-controls__direction--${o.name}`,"aria-label":s,tabIndex:-1,startIcon:m(n[o.name]),onPointerDown:a=>{a.preventDefault(),a.stopPropagation()},onClick:()=>i(o.horizontal,o.vertical)},o.name)})});var b=d;export{b as default};
