import{useEffect as g,useId as r,useRef as b}from"react";import{Button as l}from"@moodlehq/design-system";import{jsx as o,jsxs as s}from"react/jsx-runtime";/**
 * Replaceable confirmation dialog built with Moodle Design System controls.
 *
 * @module     core_my/components/ConfirmationDialog
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=({title:t,message:d,confirmLabel:c,cancelLabel:m,onConfirm:f,onCancel:a})=>{const i=b(null),e=r(),n=r();return g(()=>{i.current?.showModal()},[]),s("dialog",{ref:i,className:"core-my-dashboard-confirm","aria-labelledby":e,"aria-describedby":n,onCancel:a,children:[o("h2",{id:e,children:t}),o("p",{id:n,children:d}),s("div",{className:"core-my-dashboard-confirm__actions",children:[o(l,{variant:"secondary",label:m,onClick:a}),o(l,{variant:"primary",label:c,onClick:f})]})]})};var v=p;export{v as default};
