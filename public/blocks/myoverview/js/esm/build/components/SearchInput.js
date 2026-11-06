import{SearchInput as t}from"@moodlehq/design-system";import{useStrings as c}from"../state";import{jsx as o}from"react/jsx-runtime";/**
 * Course search input (MDL-88972).
 *
 * A controlled text field. Search state is independent of filter and sort
 * (MDL-88973): typing here never resets them, and clearing it leaves them
 * intact.
 *
 * @module     block_myoverview/components/SearchInput
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function n({value:r,onChange:a}){const e=c();return o(t,{className:"courseoverview-search",label:e.searchcourses,hideLabel:!0,clearLabel:e.clearsearch,placeholder:e.search,value:r,onChange:s=>a(s.target.value)})}export{n as default};
