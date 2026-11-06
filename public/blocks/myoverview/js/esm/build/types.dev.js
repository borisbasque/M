/**
 * Shared types for the course overview React component.
 *
 * The Course shape mirrors the fields returned by the web service
 * core_course_get_enrolled_courses_by_timeline_classification, so the live data
 * layer (repository.ts) maps onto it directly.
 *
 * @module     block_myoverview/types
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const PAGE_SIZE = 9;
const DEFAULT_VIEW = "card";
const DEFAULT_FILTER = "all";
const DEFAULT_SORT = "title";
export {
  DEFAULT_FILTER,
  DEFAULT_SORT,
  DEFAULT_VIEW,
  PAGE_SIZE
};
//# sourceMappingURL=types.dev.js.map
