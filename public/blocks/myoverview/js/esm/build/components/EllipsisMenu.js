import{useDismissableMenu as N}from"../hooks/useDismissableMenu";import{useDismissableTooltip as h}from"../hooks/useDismissableTooltip";import{useCourseCallbacks as D,useStrings as _}from"../state";import c from"@moodle/lms/block_myoverview/components/Icon";import{jsx as s,jsxs as t}from"react/jsx-runtime";/**
 * Card overflow (ellipsis) menu (MDL-88968).
 *
 * Always visible (not hover-reveal). Opens on click/tap, closes on outside
 * click or Escape, and returns focus to the trigger on close. The star/favourite
 * action is intentionally NOT here (it is the standalone StarButton, MDL-88969);
 * the menu retains Hide/Show course, which drives the "removed from view" filter.
 *
 * Keyboard: Tab closes the menu; Escape closes and returns focus to trigger.
 * Roving focus is provided by the shared useDismissableMenu hook.
 *
 * Receives isHidden as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/EllipsisMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function M({courseId:p,courseName:m,isHidden:n}){const{toggleHidden:v}=D(),o=_(),{open:i,setOpen:r,containerRef:d,triggerRef:a,menuRef:f,handleMenuKeyDown:b}=N("menuitem"),{tooltipAttr:g,tooltipTriggerProps:w}=h(),u=e=>{e.preventDefault(),e.stopPropagation()},l=o.actionsfor.replace("{$a}",m);return t("div",{className:"courseoverview-menu",ref:d,children:[t("button",{type:"button",ref:a,className:"courseoverview-iconbtn","aria-haspopup":"menu","aria-expanded":i,"data-tooltip":g(o.courseactions),onClick:e=>{u(e),r(y=>!y)},...w,children:[s(c,{name:"ellipsis-vertical"}),s("span",{className:"visually-hidden",children:l})]}),i&&s("div",{className:"courseoverview-menu__list",role:"menu","aria-label":l,ref:f,onKeyDown:b,children:t("button",{type:"button",role:"menuitem",className:"courseoverview-menu__item",onClick:e=>{u(e),v(p),r(!1),a.current?.focus()},children:[s(c,{name:n?"eye":"eye-slash",className:"courseoverview-menu__icon"}),n?o.showcourse:o.hidecourse]})})]})}export{M as default};
