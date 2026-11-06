import t from"@moodle/lms/block_myoverview/components/CourseItem";import{jsx as s}from"react/jsx-runtime";/**
 * The course collection in the active layout (MDL-88966).
 *
 * Card view renders a responsive grid (1 column on mobile, 3 columns from
 * tablet up, max 9 per page); list and summary views render single-column rows.
 *
 * @module     block_myoverview/components/CourseList
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function p({courses:r,view:e,displaycategories:i}){return s("div",{className:`courseoverview-list courseoverview-list--${e}`,children:r.map(o=>s(t,{course:o,view:e,displaycategories:i},o.id))})}export{p as default};
