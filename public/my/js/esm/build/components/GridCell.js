import{useString as v}from"../strings";import h from"./Icon";import{jsx as t,jsxs as k}from"react/jsx-runtime";/**
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
 * - prospective: where the block will land, one cell per grid unit it covers, at full size in the
 *   preview's tint. While a block moves, it is the active cells themselves that become the preview
 *   (previewDistance 0), and the others shrink back from it (previewDistance above 0).
 *
 * @module     core_my/components/GridCell
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const C=({column:r,row:l,columns:m=1,rows:u=1,state:n="rest",label:c="",addLabel:p="",addIcon:g="",hidePosition:b=!1,previewDistance:o,onActivate:y,onPlace:a})=>{const d=v("gridcellposition","my",{row:l+1,column:r+1}),i={gridColumn:`${r+1} / span ${m}`,gridRow:`${l+1} / span ${u}`};if(n==="prospective")return t("div",{className:"core-my-grid-cell core-my-grid-cell--prospective",style:i,"aria-hidden":"true"});if(n==="active"){const e=!!a,s=o!==void 0;return t("div",{className:["core-my-grid-cell core-my-grid-cell--active",e&&"core-my-grid-cell--placing",o===0&&"core-my-grid-cell--prospective",s&&o>0&&"core-my-grid-cell--receded"].filter(Boolean).join(" "),style:s?{...i,"--core-my-preview-distance":o}:i,"aria-hidden":"true",onMouseDown:e?f=>f.preventDefault():void 0,onClick:e?()=>a?.(r,l):void 0})}return t("button",{type:"button",className:"core-my-grid-cell core-my-grid-cell--available",style:i,"aria-label":d&&!b?`${c}, ${d}`:c,onClick:e=>y?.(r,l,e.currentTarget),children:k("span",{className:"core-my-grid-cell__label","aria-hidden":"true",children:[t(h,{markup:g,className:"core-my-grid-cell__icon"}),p]})})};var G=C;export{G as default};
