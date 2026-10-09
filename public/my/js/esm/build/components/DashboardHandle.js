import{Button as p}from"@moodlehq/design-system";import u from"./GridControls";import{jsx as n,jsxs as v}from"react/jsx-runtime";/**
 * Accessible move and resize handle for dashboard tiles.
 *
 * @module     core_my/components/DashboardHandle
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const D=({mode:e,label:t,labels:d,instructionsId:l,active:r,tapping:i=!1,showControls:c,onStart:f,onKeyDown:b,onPointerDown:m,onDirection:h,onCommit:s})=>v("div",{className:`core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${e}${r?" active":""}`,onBlur:o=>{const a=o.relatedTarget;!r||i||a instanceof Element&&a.closest(".core-toast")||(!(a instanceof Node)||!o.currentTarget.contains(a))&&s()},children:[r&&c&&n(u,{mode:e,labels:d,onDirection:h}),n(p,{size:"md",variant:"ghost",className:`core-my-dashboard-handle core-my-dashboard-handle--${e}`,"aria-label":t,"aria-describedby":l,"aria-pressed":r,title:t,startIcon:n("i",{className:`fa fa-${e==="move"?"grip-vertical":"up-right-and-down-left-from-center fa-flip-horizontal"}`,"aria-hidden":"true"}),onClick:o=>{o.detail===0&&!r&&f()},onKeyDown:b,onPointerDown:o=>{if(i){o.preventDefault();return}if(r){o.preventDefault(),s();return}o.currentTarget.focus(),m(o)}})]});var w=D;export{w as default};
