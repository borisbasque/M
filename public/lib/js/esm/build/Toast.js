import{useCallback as d,useEffect as f,useRef as p,useState as T}from"react";import{Fragment as _,jsx as o,jsxs as v}from"react/jsx-runtime";/**
 * A short, temporary message that can carry one action, such as Undo or Cancel.
 *
 * The Moodle Design System has no toast yet (see MDL-89740), and core/toast is an AMD module with no
 * action button. This component follows the same rules a design-system toast would, so it can move
 * there unchanged:
 *
 * - it is its own polite status region, so it is announced without taking focus. A page showing a
 *   toast should not announce the same words a second time through its own live region;
 * - only the newest message is shown: passing a new message replaces the current one;
 * - it closes itself after `duration` milliseconds (6 seconds by default) unless `persist` is set,
 *   and the timer pauses while the pointer is over it or it has keyboard focus, so its action can
 *   never vanish while someone is reaching for it;
 * - its action and close button are each at least 24 × 24px (WCAG 2.2 SC 2.5.8).
 *
 * @module     core/Toast
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const b=6e3,x=({message:t,closeLabel:a,onClose:c})=>{const[u,e]=T(0),n=p(void 0),r=p(c);r.current=c,f(()=>{t||e(0)},[t]),f(()=>{if(clearTimeout(n.current),!(!t||t.persist||u>0))return n.current=setTimeout(()=>r.current(),t.duration??b),()=>clearTimeout(n.current)},[t,u]);const l=d(()=>e(i=>i+1),[]),s=d(()=>e(i=>Math.max(0,i-1)),[]);return o("div",{className:`core-toast${t?" core-toast--visible":""}`,role:"status","aria-live":"polite","aria-atomic":"true",onMouseEnter:t?l:void 0,onMouseLeave:t?s:void 0,onFocus:t?l:void 0,onBlur:t?s:void 0,children:t&&v(_,{children:[o("span",{className:"core-toast__text",children:t.text}),t.action&&o("button",{type:"button",className:"core-toast__action",onClick:t.action.onClick,children:t.action.label}),o("button",{type:"button",className:"core-toast__close","aria-label":a,title:a,onClick:()=>r.current(),children:o("span",{"aria-hidden":"true",children:"\xD7"})})]})})};var k=x;export{b as TOAST_DURATION_MS,k as default};
