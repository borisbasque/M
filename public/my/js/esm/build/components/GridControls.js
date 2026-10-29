import{Button as s,Tooltip as m}from"@moodlehq/design-system";import{renderIcon as c}from"./Icon";import{jsx as a}from"react/jsx-runtime";/**
 * Replaceable directional controls built with the Moodle Design System Button.
 *
 * @module     core_my/components/GridControls
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=[{name:"up",horizontal:0,vertical:-1},{name:"left",horizontal:-1,vertical:0},{name:"right",horizontal:1,vertical:0},{name:"down",horizontal:0,vertical:1}],d=({mode:n,labels:r,icons:i,onDirection:l})=>a("div",{className:"core-my-grid-controls",role:"group","aria-label":n==="move"?r.movecontrols:r.resizecontrols,children:p.map(o=>{const e=r[o.name];return a(m,{label:e,children:a(s,{size:"sm",variant:"secondary",className:`core-my-grid-controls__direction core-my-grid-controls__direction--${o.name}`,"aria-label":e,tabIndex:-1,startIcon:c(i[o.name]),onPointerDown:t=>{t.preventDefault(),t.stopPropagation()},onClick:()=>l(o.horizontal,o.vertical)})},o.name)})});var h=d;export{h as default};
