import{useCourseMemberships as i}from"../state";import t from"@moodle/lms/block_myoverview/components/StarButton";import u from"@moodle/lms/block_myoverview/components/EllipsisMenu";import{jsx as s,jsxs as l}from"react/jsx-runtime";/**
 * Adjacent star + ellipsis controls (MDL-88968, MDL-88969).
 *
 * In card view this group is positioned at the top-right of the image; in list
 * and summary views the same group sits next to the ellipsis (CSS handles
 * placement). The star precedes the ellipsis in DOM order for correct tabbing.
 *
 * Reads live membership sets here (one subscription per card) and passes the
 * resolved booleans as props so StarButton and EllipsisMenu subscribe only to
 * the stable callbacks context and do not re-render for unrelated card toggles.
 *
 * @module     block_myoverview/components/CourseControls
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function d({course:o}){const{favourites:r,hidden:e}=i();return l("div",{className:"courseoverview-controls",children:[s(t,{courseId:o.id,courseName:o.fullnamedisplay,isFavourite:r.has(o.id)}),s(u,{courseId:o.id,courseName:o.fullnamedisplay,isHidden:e.has(o.id)})]})}export{d as default};
