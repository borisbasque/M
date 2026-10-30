import{useEffect as b,useId as r,useRef as p}from"react";import{Button as l}from"@moodlehq/design-system";import{jsx as a,jsxs as s}from"react/jsx-runtime";/**
 * Replaceable confirmation dialog built with Moodle Design System controls.
 *
 * @module     core_my/components/ConfirmationDialog
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const u=({title:t,message:d,confirmLabel:c,cancelLabel:m,danger:f=!1,onConfirm:g,onCancel:o})=>{const i=p(null),e=r(),n=r();return b(()=>{i.current?.showModal()},[]),s("dialog",{ref:i,className:"core-my-dashboard-confirm","aria-labelledby":e,"aria-describedby":n,onCancel:o,children:[a("h2",{id:e,children:t}),a("p",{id:n,children:d}),s("div",{className:"core-my-dashboard-confirm__actions",children:[a(l,{variant:"outline-secondary",label:m,onClick:o}),a(l,{variant:f?"danger":"primary",label:c,onClick:g})]})]})};var y=u;export{y as default};
