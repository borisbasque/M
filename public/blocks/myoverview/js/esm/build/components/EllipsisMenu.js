import{useState as u}from"react";import{Dropdown as m,DropdownItemAction as d,Tooltip as f}from"@moodlehq/design-system";import{useCourseCallbacks as b,useStrings as g}from"../state";import{faIcon as t}from"@moodle/lms/block_myoverview/components/Icon";import{jsx as o}from"react/jsx-runtime";/**
 * Card overflow (ellipsis) menu (MDL-88968).
 *
 * A design system Dropdown with an icon-only subtle trigger, always visible (not
 * hover-reveal). The design system handles opening, Escape, outside clicks,
 * keyboard movement and returning focus to the trigger. The star/favourite
 * action is intentionally NOT here (it is the standalone StarButton, MDL-88969);
 * the menu retains Hide/Show course, which drives the "removed from view" filter.
 *
 * Receives isHidden as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/EllipsisMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function h({courseId:r,courseName:l,isHidden:s}){const{toggleHidden:i}=b(),e=g(),[a,n]=u(!1),c=e.actionsfor.replace("{$a}",l);return o(f,{label:e.courseactions,children:o(m,{className:"courseoverview-menu",label:c,iconOnly:!0,appearance:"subtle",startIcon:t("ellipsis-vertical"),placement:"bottom-end",open:a,onOpenChange:n,onClick:p=>p.stopPropagation(),children:o(d,{label:s?e.showcourse:e.hidecourse,startIcon:t(s?"eye":"eye-slash"),onClick:()=>{i(r),n(!1)}})})})}export{h as default};
