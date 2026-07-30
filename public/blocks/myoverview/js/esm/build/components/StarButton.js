import{FavouriteButton as u}from"@moodlehq/design-system";import{useCourseCallbacks as l,useStrings as p}from"../state";import{jsx as i}from"react/jsx-runtime";/**
 * Standalone star/favourite control (MDL-88969).
 *
 * Delegates to the DS FavouriteButton — selected/unselected icon state,
 * aria-pressed, focus ring, and hover/active colours are all owned by the DS.
 *
 * Receives isFavourite as a prop (resolved by CourseControls from the membership
 * context) so this component subscribes only to the stable callbacks context and
 * does not re-render when unrelated courses are toggled.
 *
 * @module     block_myoverview/components/StarButton
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function c({courseId:a,courseName:t,isFavourite:o}){const{toggleFavourite:s}=l(),r=p(),n=o?r.removefromstarred.replace("{$a}",t):r.starcourse.replace("{$a}",t);return i(u,{selected:o,"aria-label":n,onClick:e=>{e.preventDefault(),e.stopPropagation(),s(a)}})}export{c as default};
