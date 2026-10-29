import{useString as d}from"../strings";import m from"./Icon";import{jsx as l,jsxs as u}from"react/jsx-runtime";/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const p=({column:e,row:r,label:o,addLabel:a,addIcon:n,prospective:c=!1,onActivate:s})=>{const i=d("gridcellposition","my",{row:r+1,column:e+1}),t={gridColumn:`${e+1}`,gridRow:`${r+1}`};return c?l("div",{className:"core-my-grid-cell core-my-grid-cell--prospective",style:t,"aria-hidden":"true"}):u("button",{type:"button",className:"core-my-grid-cell core-my-grid-cell--available",style:t,"aria-label":i?`${o}, ${i}`:o,onClick:()=>s?.(e,r),children:[l(m,{markup:n,className:"core-my-grid-cell__icon"}),l("span",{className:"core-my-grid-cell__label","aria-hidden":"true",children:a})]})};var y=p;export{y as default};
