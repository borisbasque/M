import{Fragment as y,useState as k}from"react";import{Dropdown as x,DropdownItemDivider as N,DropdownItemHeader as O,DropdownItemSelect as S,DropdownTrigger as C,Tooltip as F}from"@moodlehq/design-system";import{faIcon as m}from"@moodle/lms/block_myoverview/components/Icon";import{jsx as r,jsxs as u}from"react/jsx-runtime";/**
 * Generic single-select toolbar dropdown (used for filter, sort and layout).
 *
 * Built on the design system Dropdown, so the trigger, menu, keyboard support
 * (arrow keys, Home/End, typeahead, Escape returning focus to the trigger) and
 * the selected-item check all come from there. The trigger shows the emphasis
 * appearance when the current value is non-default (MDL-88972), and a design
 * system Tooltip names it on hover and focus. Options are mutually exclusive.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function M({label:o,triggerAriaLabel:f,icon:l,options:t,current:i,onSelect:v,active:w,showLabel:n=!1,menuTitle:s,tooltip:b,groupOf:a,align:h="end"}){const[d,p]=k(!1),D=t.find(e=>e.value===i),c=f??o,T=r(C,{label:n?D?.label??o:c,...n?{"aria-label":c}:{},iconOnly:!n,startIcon:l?m(l):void 0,appearance:w?"emphasis":"default",open:d,className:n?"courseoverview-dropdown__trigger--labelled":void 0});return r(F,{label:b??o,className:n?"courseoverview-dropdown--labelled":void 0,children:u(x,{label:o,className:"courseoverview-dropdown",trigger:T,open:d,onOpenChange:p,placement:h==="start"?"bottom-start":"bottom-end",children:[s&&r(O,{label:s}),t.map((e,g)=>{const I=!!a&&g<t.length-1&&a(e.value)!==a(t[g+1].value);return u(y,{children:[r(S,{label:e.label,selected:e.value===i,startIcon:e.icon?m(e.icon):void 0,onClick:()=>{v(e.value),p(!1)}}),I&&r(N,{})]},e.value)})]})})}export{M as default};
