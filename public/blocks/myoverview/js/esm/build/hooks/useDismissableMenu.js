import{useEffect as i,useRef as l,useState as m}from"react";/**
 * Shared keyboard/pointer behaviour for a pop-up menu with a trigger button.
 *
 * Encapsulates the open state, the container/trigger/menu refs, focusing the
 * first item on open, closing on outside click or Escape (Escape returns focus
 * to the trigger), and roving focus across items via arrow/Home/End keys with
 * Tab closing the menu. Used by both the toolbar Dropdown (menuitemradio items)
 * and the card overflow menu (menuitem items).
 *
 * @module     block_myoverview/hooks/useDismissableMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function y(f){const[r,o]=m(!1),s=l(null),a=l(null),c=l(null),u=`[role="${f}"]`;return i(()=>{r&&c.current&&c.current.querySelector(u)?.focus()},[r,u]),i(()=>{if(!r)return;const n=t=>{s.current&&!s.current.contains(t.target)&&o(!1)},e=t=>{t.key==="Escape"&&(o(!1),a.current?.focus())};return document.addEventListener("click",n,!0),document.addEventListener("keydown",e),()=>{document.removeEventListener("click",n,!0),document.removeEventListener("keydown",e)}},[r]),{open:r,setOpen:o,containerRef:s,triggerRef:a,menuRef:c,handleMenuKeyDown:n=>{const e=Array.from(c.current?.querySelectorAll(u)??[]),t=e.indexOf(document.activeElement);switch(n.key){case"ArrowDown":n.preventDefault(),e[(t+1)%e.length]?.focus();break;case"ArrowUp":n.preventDefault(),e[(t-1+e.length)%e.length]?.focus();break;case"Home":n.preventDefault(),e[0]?.focus();break;case"End":n.preventDefault(),e[e.length-1]?.focus();break;case"Tab":o(!1);break}}}}export{y as useDismissableMenu};
