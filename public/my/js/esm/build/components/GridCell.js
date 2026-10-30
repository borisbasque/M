import{useString as y}from"../strings";import v from"./Icon";import{jsx as l,jsxs as h}from"react/jsx-runtime";/**
 * Replaceable grid-cell state component for the Moodle Design System.
 *
 * One component for all of the grid's empty space, after the board placeholder states of
 * Cloudscape (default, active and hover):
 *
 * - rest: a merged run of empty cells in edit mode, a button that adds a block there. Its cue
 *   shows on hover and keyboard focus only, so the grid does not fill with plus signs.
 * - active: one grid unit while a block is being moved or resized, so every snap point shows.
 *   After a click or tap on a handle, choosing one places the block there; keyboard users have the
 *   arrow keys instead, so it is hidden from assistive technology.
 * - prospective: where the block will land, hatched as well as tinted so it never relies on
 *   colour alone.
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const f=({column:e,row:r,columns:d=1,rows:s=1,state:n="rest",label:t="",addLabel:m="",addIcon:u="",onActivate:p,onPlace:c,onPreview:b})=>{const a=y("gridcellposition","my",{row:r+1,column:e+1}),o={gridColumn:`${e+1} / span ${d}`,gridRow:`${r+1} / span ${s}`};if(n==="prospective")return l("div",{className:"core-my-grid-cell core-my-grid-cell--prospective",style:o,"aria-hidden":"true"});if(n==="active"){const i=!!c;return l("div",{className:`core-my-grid-cell core-my-grid-cell--active${i?" core-my-grid-cell--placing":""}`,style:o,"aria-hidden":"true",onMouseDown:i?g=>g.preventDefault():void 0,onPointerEnter:i?()=>b?.(e,r):void 0,onClick:i?()=>c?.(e,r):void 0})}return l("button",{type:"button",className:"core-my-grid-cell core-my-grid-cell--available",style:o,"aria-label":a?`${t}, ${a}`:t,onClick:()=>p?.(e,r),children:h("span",{className:"core-my-grid-cell__label","aria-hidden":"true",children:[l(v,{markup:u,className:"core-my-grid-cell__icon"}),m]})})};var w=f;export{w as default};
