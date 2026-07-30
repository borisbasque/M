import{useCallback as n,useEffect as c,useRef as d,useState as a}from"react";/**
 * Escape dismissal for the pure-CSS `data-tooltip` tooltips (WCAG 2.1 1.4.13).
 *
 * The tooltip itself is ::after content shown on :hover / :focus-visible, so it
 * has no DOM of its own to attach behaviour to. This hook suppresses it by
 * dropping the data-tooltip attribute while Escape has been pressed during the
 * current hover/focus; leaving and re-entering shows it again, which is the
 * dismissal model 1.4.13 asks for. A document-level listener is attached only
 * while the trigger is hovered or focused, so Escape works for pointer users
 * whose focus is elsewhere.
 *
 * Migrate to the design-system Tooltip (which owns this behaviour) once Boost
 * vendors its CSS (MDL-89292).
 *
 * @module     block_myoverview/hooks/useDismissableTooltip
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function p(){const[u,r]=a(!1),t=d(0),e=n(o=>{o.key==="Escape"&&r(!0)},[]),s=n(()=>{t.current++,t.current===1&&document.addEventListener("keydown",e,!0)},[e]),i=n(()=>{t.current=Math.max(0,t.current-1),t.current===0&&(document.removeEventListener("keydown",e,!0),r(!1))},[e]);return c(()=>()=>document.removeEventListener("keydown",e,!0),[e]),{tooltipAttr:o=>u?void 0:o,tooltipTriggerProps:{onMouseEnter:s,onMouseLeave:i,onFocus:s,onBlur:i}}}export{p as useDismissableTooltip};
