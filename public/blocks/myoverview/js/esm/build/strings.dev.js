var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Client-side language strings for the course overview block.
 *
 * The UI strings are fetched here via @moodle/lms/core/stringUtils rather than
 * being serialised into the mount props, keeping the props minimal as the
 * frontend docs require. One batched request resolves every string the block
 * needs; the results are cached by core (M.str / localStorage), so this costs at
 * most one round trip per session.
 *
 * @module     block_myoverview/strings
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { getString, getStrings } from "@moodle/lms/core/stringUtils";
const COMPONENT = "block_myoverview";
const STRING_MAP = {
  actionsfor: { key: "aria:courseactionsfor", component: COMPONENT },
  changelayout: { key: "aria:displaydropdown", component: COMPONENT },
  clearsearch: { key: "clear", component: "core" },
  courseactions: { key: "aria:courseactions", component: COMPONENT },
  courseoverview: { key: "pluginname", component: COMPONENT },
  courseprogress: { key: "courseprogress", component: COMPONENT },
  courseremoved: { key: "aria:courseremoved", component: COMPONENT },
  courserestored: { key: "aria:courserestored", component: COMPONENT },
  createcourse: { key: "createcourse", component: COMPONENT },
  emptyallhiddenintro: { key: "allhidden_intro", component: COMPONENT },
  emptyallhiddentitle: { key: "allhidden_title", component: COMPONENT },
  emptynoresults: { key: "noresults_intro", component: COMPONENT },
  emptynoresultstitle: { key: "noresults_title", component: COMPONENT },
  errorloadingcourses: { key: "errorloadingcourses", component: COMPONENT },
  filterall: { key: "allcourses", component: COMPONENT },
  filterallincludinghidden: { key: "allincludinghidden", component: COMPONENT },
  filtercustomfield: { key: "customfield", component: COMPONENT },
  filterfavourites: { key: "favourites", component: COMPONENT },
  filterfuture: { key: "future", component: COMPONENT },
  filterhidden: { key: "hiddencourses", component: COMPONENT },
  filterinprogress: { key: "inprogress", component: COMPONENT },
  filterpast: { key: "past", component: COMPONENT },
  filterresults: { key: "aria:groupingdropdown", component: COMPONENT },
  filters: { key: "filters", component: "core" },
  hidecourse: { key: "hidecourse", component: COMPONENT },
  loadingcourses: { key: "loadingcourses", component: COMPONENT },
  managecategories: { key: "managecategories", component: "core" },
  managecourses: { key: "managecourses", component: "core" },
  nextpage: { key: "nextpage", component: "core" },
  percentcomplete: { key: "completepercent", component: COMPONENT },
  previouspage: { key: "previouspage", component: "core" },
  removefromstarred: { key: "aria:removefromfavouritesfor", component: COMPONENT },
  requestcoursebutton: { key: "requestcoursebutton", component: COMPONENT },
  search: { key: "search", component: "core" },
  searchcourses: { key: "searchcourses", component: COMPONENT },
  showcourse: { key: "show", component: COMPONENT },
  sortby: { key: "sortby", component: "core" },
  sortcoursename: { key: "title", component: COMPONENT },
  sortcourses: { key: "aria:sortingdropdown", component: COMPONENT },
  sortlastaccessed: { key: "lastaccessed", component: COMPONENT },
  sortshortname: { key: "shortname", component: COMPONENT },
  sortstartdate: { key: "startdate", component: "core" },
  starcourse: { key: "aria:addtofavouritesfor", component: COMPONENT },
  tooltipfilter: { key: "filter", component: "core" },
  tooltipsort: { key: "sort", component: "core" },
  tooltipview: { key: "view", component: "core" },
  viewcard: { key: "card", component: COMPONENT },
  viewlabel: { key: "view", component: "core" },
  viewlist: { key: "list", component: COMPONENT },
  viewsummary: { key: "summary", component: COMPONENT }
};
async function loadStrings() {
  const keys = Object.keys(STRING_MAP);
  const values = await getStrings(keys.map((k) => STRING_MAP[k]));
  const strings = {};
  keys.forEach((k, i) => {
    strings[k] = values[i];
  });
  return strings;
}
__name(loadStrings, "loadStrings");
function loadErrorString() {
  return getString("errorloadingcourses", COMPONENT);
}
__name(loadErrorString, "loadErrorString");
async function resolveZeroStateCopy(zerostate) {
  if (zerostate.variant === "request") {
    return {
      title: await getString("zero_request_title", COMPONENT),
      intro: await getString("zero_request_intro_short", COMPONENT)
    };
  }
  if (zerostate.variant === "create") {
    const titlekey = zerostate.sitehascourses ? "zero_default_title" : "zero_nocourses_title";
    let introkey = "zero_default_intro";
    if (!zerostate.sitehascourses) {
      introkey = zerostate.quickstarturl ? "zero_request_intro" : "zero_nocourses_intro";
    }
    const docparams = {
      dochref: zerostate.docsurl,
      doctitle: await getString("documentation", "core"),
      doctarget: zerostate.docstarget
    };
    if (zerostate.quickstarturl) {
      docparams.quickhref = zerostate.quickstarturl;
      docparams.quicktitle = await getString("viewquickstart", COMPONENT);
      docparams.quicktarget = "_blank";
    }
    return {
      title: await getString(titlekey, COMPONENT),
      intro: await getString(introkey, COMPONENT, docparams)
    };
  }
  return {
    title: await getString("zero_default_title", COMPONENT),
    intro: await getString("zero_default_intro", COMPONENT)
  };
}
__name(resolveZeroStateCopy, "resolveZeroStateCopy");
export {
  loadErrorString,
  loadStrings,
  resolveZeroStateCopy
};
//# sourceMappingURL=strings.dev.js.map
