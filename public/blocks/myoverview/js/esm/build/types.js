/**
 * Shared types for the course overview React component.
 *
 * The Course shape mirrors the fields returned by the web service
 * core_course_get_enrolled_courses_by_timeline_classification, so the live data
 * layer (repository.ts) maps onto it directly.
 *
 * @module     block_myoverview/types
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const r=9,e="card",t="all",s="title";export{t as DEFAULT_FILTER,s as DEFAULT_SORT,e as DEFAULT_VIEW,r as PAGE_SIZE};
