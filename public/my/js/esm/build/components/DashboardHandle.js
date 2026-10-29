import{Button as f,Tooltip as D}from"@moodlehq/design-system";import v from"./GridControls";import{renderIcon as y}from"./Icon";import{jsx as n,jsxs as g}from"react/jsx-runtime";/**
 * Accessible move and resize handle for dashboard tiles.
 *
 * @module     core_my/components/DashboardHandle
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const u=({mode:e,label:t,labels:d,icons:a,instructionsId:l,active:r,showControls:b,onStart:c,onKeyDown:m,onPointerDown:p,onDirection:h,onCommit:s})=>g("div",{className:`core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${e}${r?" active":""}`,onBlur:o=>{const i=o.relatedTarget;r&&(!(i instanceof Node)||!o.currentTarget.contains(i))&&s()},children:[r&&b&&n(v,{mode:e,labels:d,icons:a,onDirection:h}),n(D,{label:t,children:n(f,{size:"lg",variant:"ghost",className:`core-my-dashboard-handle core-my-dashboard-handle--${e}`,"aria-label":t,"aria-describedby":l,"aria-pressed":r,startIcon:y(e==="move"?a.move:a.resize),onClick:o=>{o.detail===0&&!r&&c()},onKeyDown:m,onPointerDown:o=>{if(r){o.preventDefault(),s();return}o.currentTarget.focus(),p(o)}})})]});var P=u;export{P as default};
