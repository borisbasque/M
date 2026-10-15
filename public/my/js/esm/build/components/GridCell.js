import{jsx as l,jsxs as u}from"react/jsx-runtime";/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const m=({column:e,row:r,columns:a=1,rows:i=1,label:c,addLabel:t,placing:n=!1,prospective:d=!1,onActivate:s})=>{const o={gridColumn:`${e+1} / span ${a}`,gridRow:`${r+1} / span ${i}`};return d?l("div",{className:"core-my-grid-cell core-my-grid-cell--prospective",style:o,"aria-hidden":"true"}):l("button",{type:"button",className:`core-my-grid-cell core-my-grid-cell--available${n?" core-my-grid-cell--placing":""}`,style:o,"data-grid-column":e,"data-grid-row":r,"aria-label":c.replace("{$a->row}",String(r+1)).replace("{$a->column}",String(e+1)),onClick:()=>s?.(e,r,a,i),children:u("span",{className:"core-my-grid-cell__label","aria-hidden":"true",children:[!n&&l("i",{className:"fa fa-plus core-my-grid-cell__icon","aria-hidden":"true"}),t]})})};var b=m;export{b as default};
