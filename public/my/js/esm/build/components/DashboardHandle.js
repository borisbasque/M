import{Button as h}from"@moodlehq/design-system";import{jsx as n}from"react/jsx-runtime";/**
 * Accessible move and resize handle for dashboard tiles.
 *
 * @module     core_my/components/DashboardHandle
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=({mode:o,label:t,instructionsId:s,active:a,tapping:i=!1,onStart:l,onKeyDown:c,onPointerDown:f,onCommit:d})=>n("div",{className:`core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${o}${a?" active":""}`,onBlur:e=>{const r=e.relatedTarget;!a||i||r instanceof Element&&r.closest(".core-toast")||(!(r instanceof Node)||!e.currentTarget.contains(r))&&d()},children:n(h,{size:"md",variant:"ghost",className:`core-my-dashboard-handle core-my-dashboard-handle--${o}`,"aria-label":t,"aria-describedby":s,"aria-pressed":a,title:t,startIcon:n("i",{className:`fa fa-${o==="move"?"grip-vertical":"up-right-and-down-left-from-center fa-flip-horizontal"}`,"aria-hidden":"true"}),onClick:e=>{e.detail===0&&!a&&l()},onKeyDown:c,onPointerDown:e=>{if(i){e.preventDefault();return}if(a){e.preventDefault(),d();return}e.currentTarget.focus(),f(e)}})});var b=p;export{b as default};
