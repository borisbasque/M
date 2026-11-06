import{fetchOne as n}from"@moodle/lms/core/ajax";import m from"@moodle/lms/core/fetch";/**
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
 */const i=["id","fullname","shortname","visible","enddate"],_=[...i,"summary","summaryformat"],l={title:"fullname",shortname:"shortname",lastaccessed:"ul.timeaccess desc",startdate:"startdate"},g="block_myoverview_user_view_preference",v="block_myoverview_user_grouping_preference",y="block_myoverview_user_sort_preference",b="block_myoverview_user_grouping_customfieldvalue_preference",f=e=>`block_myoverview_hidden_course_${e}`;function o(e){const r=document.createElement("textarea");return r.innerHTML=e,r.value}async function E(e){const{sort:r,view:u,...a}=e,t=await n({methodname:"core_course_get_enrolled_courses_by_timeline_classification",args:{...a,sort:l[r],requiredfields:u==="summary"?_:i}});return{...t,courses:t.courses.map(s=>({...s,fullnamedisplay:o(s.fullnamedisplay),coursecategory:o(s.coursecategory??"")}))}}async function P(e,r){return n({methodname:"core_course_set_favourite_courses",args:{courses:[{id:e,favourite:r}]}})}async function c(e,r){await m.performPost("core_user",`current/preferences/${e}`,{body:{value:r}})}async function R(e,r){return c(e,r)}async function w(e,r){return c(f(e),r?"1":null)}export{b as PREF_CFVALUE,v as PREF_FILTER,y as PREF_SORT,g as PREF_VIEW,E as getCourses,f as hiddenPrefName,w as setCourseHidden,P as setFavourite,R as setPreference};
