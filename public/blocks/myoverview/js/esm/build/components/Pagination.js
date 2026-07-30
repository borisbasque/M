import{Pagination as r}from"@moodlehq/design-system";import{useStrings as t}from"../state";import{jsx as o}from"react/jsx-runtime";/**
 * Course list pagination (MDL-88977, reworked for server-side paging).
 *
 * The design-system Pagination in its 'grouped' variant: previous/next controls
 * without page numbers, because the timeline web service returns no total count,
 * so the number of pages is unknowable without fetching the entire course set
 * (which would need an unbounded fetch). The component receives
 * totalPages = current page + 1 whenever the app's silent prefetch has confirmed
 * a non-empty next page, so "Next" never navigates onto an empty page, and the
 * DS component hides itself entirely on a single-page result.
 *
 * @module     block_myoverview/components/Pagination
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function g({page:a,hasNext:n,onPage:i}){const e=t();return o("div",{className:"courseoverview-pagination",children:o(r,{variant:"grouped",totalPages:n?a+1:a,currentPage:a,onPageChange:i,ariaLabel:e.courseoverview,previousPageLabel:e.previouspage,nextPageLabel:e.nextpage})})}export{g as default};
