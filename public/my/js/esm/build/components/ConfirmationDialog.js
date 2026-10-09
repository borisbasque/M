import{useEffect as m,useId as f,useRef as g}from"react";import{Button as n}from"@moodlehq/design-system";import{jsx as o,jsxs as r}from"react/jsx-runtime";/**
 * Replaceable confirmation dialog built with Moodle Design System controls.
 *
 * @module     core_my/components/ConfirmationDialog
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const b=({title:l,message:t,confirmLabel:s,cancelLabel:d,onConfirm:c,onCancel:i})=>{const e=g(null),a=f();return m(()=>{e.current?.showModal()},[]),r("dialog",{ref:e,className:"core-my-dashboard-confirm","aria-labelledby":`${a}-title`,"aria-describedby":`${a}-message`,onCancel:i,children:[o("h2",{id:`${a}-title`,children:l}),o("p",{id:`${a}-message`,children:t}),r("div",{className:"core-my-dashboard-confirm__actions",children:[o(n,{variant:"secondary",label:d,onClick:i}),o(n,{variant:"danger",label:s,onClick:c})]})]})};var v=b;export{v as default};
