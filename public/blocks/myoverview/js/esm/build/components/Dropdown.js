import{useDismissableMenu as x}from"../hooks/useDismissableMenu";import{useDismissableTooltip as P}from"../hooks/useDismissableTooltip";import t from"@moodle/lms/block_myoverview/components/Icon";import{jsx as o,jsxs as s}from"react/jsx-runtime";/**
 * Generic single-select toolbar dropdown (used for filter, sort and layout).
 *
 * Shows a tooltip (title) and an active-state class when the current value is
 * non-default (MDL-88972). Opens on click, closes on outside click or Escape,
 * and returns focus to the trigger. Options are mutually exclusive.
 *
 * Keyboard: ArrowDown/ArrowUp move focus between items; Home/End jump to
 * first/last; Escape closes and returns focus to trigger; Tab closes.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function R({label:r,triggerAriaLabel:g,icon:v,options:n,current:a,onSelect:w,active:b,showLabel:i=!1,menuTitle:l,tooltip:_,groupOf:u,align:f="end"}){const{open:c,setOpen:d,containerRef:T,triggerRef:m,menuRef:D,handleMenuKeyDown:N}=x("menuitemradio"),{tooltipAttr:y,tooltipTriggerProps:h}=P(),k=n.find(e=>e.value===a);return s("div",{className:`courseoverview-dropdown${i?" courseoverview-dropdown--labelled":""}`,ref:T,children:[s("button",{type:"button",ref:m,className:`courseoverview-toolbtn${b?" is-active":""}${i?" courseoverview-toolbtn--labelled":""}`,"aria-haspopup":"menu","aria-expanded":c,"aria-label":g??r,"data-tooltip":y(_??r),onClick:()=>d(e=>!e),...h,children:[v&&o(t,{name:v}),i&&o("span",{className:"courseoverview-toolbtn__label",children:k?.label??r}),i&&o(t,{name:"chevron-down",className:"courseoverview-toolbtn__caret"})]}),c&&s("div",{className:`courseoverview-menu__list${f==="start"?" courseoverview-menu__list--start":""}`,role:"menu","aria-label":r,ref:D,onKeyDown:N,children:[l&&o("div",{className:"courseoverview-menu__group-label","aria-hidden":"true",children:l}),o("div",{role:"group","aria-label":l??r,children:n.map((e,p)=>{const $=!!u&&p<n.length-1&&u(e.value)!==u(n[p+1].value);return s("button",{type:"button",role:"menuitemradio","aria-checked":e.value===a,className:`courseoverview-menu__item${e.value===a?" is-selected":""}${$?" courseoverview-menu__item--group-end":""}`,onClick:()=>{w(e.value),d(!1),m.current?.focus()},children:[e.icon&&o(t,{name:e.icon,className:"courseoverview-menu__icon"}),e.label,e.value===a&&o(t,{name:"check",className:"courseoverview-menu__check"})]},e.value)})})]})]})}export{R as default};
