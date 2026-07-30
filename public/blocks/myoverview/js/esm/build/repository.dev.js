var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Data-access layer for the course overview block (MDL-88965).
 *
 * All AJAX calls live here — components never talk to @moodle/lms/core/ajax or
 * core/fetch directly (the block_timeline reference pattern, MDL-88287).
 *
 * Two mechanisms, matching the block's original AMD split:
 *  - Course data + favourites use classic web services via @moodle/lms/core/ajax's
 *    fetchOne (same request shape as amd/src/repository.js), which gives the
 *    platform's error shape, GET/POST fallback and session-timeout handling.
 *  - Preference writes use REST v2 via @moodle/lms/core/fetch, POSTing to
 *    current/preferences/{name} exactly as core_user/repository.js does. Passing
 *    `value: null` unsets the preference — essential for un-hiding a course, since
 *    course/lib.php reads the hidden preference with a plain PHP truthy check and a
 *    literal "false" string would read as truthy.
 *
 * The site root URL and session key are not read here: fetchOne and
 * Fetch.performPost both resolve them from @moodle/lms/core/config internally, so
 * they are neither props nor arguments.
 *
 * @module     block_myoverview/repository
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { fetchOne } from "@moodle/lms/core/ajax";
import Fetch from "@moodle/lms/core/fetch";
const CARDLIST_REQUIRED_FIELDS = [
  "id",
  "fullname",
  "shortname",
  "visible",
  "enddate"
];
const SUMMARY_REQUIRED_FIELDS = [...CARDLIST_REQUIRED_FIELDS, "summary", "summaryformat"];
const SORT_SQL_MAP = {
  title: "fullname",
  shortname: "shortname",
  lastaccessed: "ul.timeaccess desc",
  startdate: "startdate"
};
const PREF_VIEW = "block_myoverview_user_view_preference";
const PREF_FILTER = "block_myoverview_user_grouping_preference";
const PREF_SORT = "block_myoverview_user_sort_preference";
const PREF_CFVALUE = "block_myoverview_user_grouping_customfieldvalue_preference";
const hiddenPrefName = /* @__PURE__ */ __name((courseId) => `block_myoverview_hidden_course_${courseId}`, "hiddenPrefName");
function decodeEntities(encoded) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = encoded;
  return textarea.value;
}
__name(decodeEntities, "decodeEntities");
async function getCourses(args) {
  const { sort, view, ...rest } = args;
  const response = await fetchOne({
    methodname: "core_course_get_enrolled_courses_by_timeline_classification",
    args: {
      ...rest,
      sort: SORT_SQL_MAP[sort],
      requiredfields: view === "summary" ? SUMMARY_REQUIRED_FIELDS : CARDLIST_REQUIRED_FIELDS
    }
  });
  return {
    ...response,
    courses: response.courses.map((c) => ({
      ...c,
      fullnamedisplay: decodeEntities(c.fullnamedisplay),
      coursecategory: decodeEntities(c.coursecategory ?? "")
    }))
  };
}
__name(getCourses, "getCourses");
async function setFavourite(courseId, favourite) {
  return fetchOne({
    methodname: "core_course_set_favourite_courses",
    args: { courses: [{ id: courseId, favourite }] }
  });
}
__name(setFavourite, "setFavourite");
async function writePreference(name, value) {
  await Fetch.performPost("core_user", `current/preferences/${name}`, { body: { value } });
}
__name(writePreference, "writePreference");
async function setPreference(name, value) {
  return writePreference(name, value);
}
__name(setPreference, "setPreference");
async function setCourseHidden(courseId, hidden) {
  return writePreference(hiddenPrefName(courseId), hidden ? "1" : null);
}
__name(setCourseHidden, "setCourseHidden");
export {
  PREF_CFVALUE,
  PREF_FILTER,
  PREF_SORT,
  PREF_VIEW,
  getCourses,
  hiddenPrefName,
  setCourseHidden,
  setFavourite,
  setPreference
};
//# sourceMappingURL=repository.dev.js.map
