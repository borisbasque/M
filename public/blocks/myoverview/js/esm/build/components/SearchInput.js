import{useId as i}from"react";import{CloseButton as t}from"@moodlehq/design-system";import{useStrings as l}from"../state";import n from"@moodle/lms/block_myoverview/components/Icon";import{jsx as e,jsxs as m}from"react/jsx-runtime";/**
 * Course search input (MDL-88972).
 *
 * A controlled text field. Search state is independent of filter and sort
 * (MDL-88973): typing here never resets them, and clearing it leaves them
 * intact.
 *
 * @module     block_myoverview/components/SearchInput
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function u({value:s,onChange:a}){const r=l(),o=i();return m("div",{className:"courseoverview-search",children:[e("label",{htmlFor:o,className:"visually-hidden",children:r.searchcourses}),e(n,{name:"magnifying-glass",className:"courseoverview-search__icon"}),e("input",{id:o,type:"text",className:"courseoverview-search__input",placeholder:r.search,value:s,onChange:c=>a(c.target.value)}),s!==""&&e(t,{"aria-label":r.clearsearch,size:"sm",className:"courseoverview-search__clear",onClick:()=>a("")})]})}export{u as default};
