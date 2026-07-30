var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Reducer, state shape and actions context for the course overview component.
 *
 * View, filter, sort and search are stored as independent slices; none of them
 * clears another (MDL-88973). Course data is paged server-side:
 * `pages` accumulates the loaded pages for the current query and
 * `pageOffsets` records the web service offset each page was (or will be)
 * fetched from, chained through the service's returned nextoffset. Any change
 * to the query resets the paged data via RESET_PAGES, dispatched by the fetch
 * orchestration in app.tsx when its query key changes.
 *
 * @module     block_myoverview/state
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { createContext, useContext } from "react";
import { DEFAULT_FILTER, DEFAULT_SORT, DEFAULT_VIEW } from "./types";
const initState = /* @__PURE__ */ __name((prefs, hiddenids = []) => ({
  view: prefs.view ?? DEFAULT_VIEW,
  filter: prefs.filter ?? DEFAULT_FILTER,
  sort: prefs.sort ?? DEFAULT_SORT,
  search: "",
  page: 1,
  pages: [],
  pageOffsets: [0],
  favourites: /* @__PURE__ */ new Set(),
  pendingfavourites: /* @__PURE__ */ new Set(),
  hidden: new Set(hiddenids),
  loading: false,
  error: null,
  customfieldvalue: prefs.customfieldvalue ?? null
}), "initState");
const hasNextPage = /* @__PURE__ */ __name((state) => (state.pages[state.page] ?? []).length > 0, "hasNextPage");
const reseedFavourites = /* @__PURE__ */ __name((favourites, courses, pending) => {
  courses.forEach((c) => {
    if (pending.has(c.id)) {
      return;
    }
    if (c.isfavourite) {
      favourites.add(c.id);
    } else {
      favourites.delete(c.id);
    }
  });
}, "reseedFavourites");
const reducer = /* @__PURE__ */ __name((state, action) => {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_FILTER":
      return { ...state, filter: action.filter };
    case "SET_SORT":
      return { ...state, sort: action.sort };
    case "SET_SEARCH":
      return { ...state, search: action.search };
    case "SET_PAGE":
      return { ...state, page: action.page };
    case "SET_CUSTOMFIELDVALUE":
      return { ...state, customfieldvalue: action.value };
    case "RESET_PAGES":
      return { ...state, page: 1, pages: [], pageOffsets: [0] };
    case "PAGE_LOADED": {
      const pages = state.pages.slice();
      pages[action.index] = action.courses;
      const pageOffsets = state.pageOffsets.slice();
      pageOffsets[action.index + 1] = action.nextoffset;
      const favourites = new Set(state.favourites);
      reseedFavourites(favourites, action.courses, state.pendingfavourites);
      const iscurrent = action.index === state.page - 1;
      return {
        ...state,
        pages,
        pageOffsets,
        favourites,
        loading: iscurrent ? false : state.loading,
        error: iscurrent ? null : state.error
      };
    }
    case "REPLACE_PAGES": {
      const favourites = new Set(state.favourites);
      action.pages.forEach(
        (pagecourses) => reseedFavourites(favourites, pagecourses, state.pendingfavourites)
      );
      return {
        ...state,
        pages: action.pages,
        pageOffsets: action.pageOffsets,
        page: action.page,
        favourites,
        loading: false,
        error: null
      };
    }
    case "SET_LOADING":
      return { ...state, loading: true, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "TOGGLE_FAVOURITE": {
      const favourites = new Set(state.favourites);
      if (favourites.has(action.id)) {
        favourites.delete(action.id);
      } else {
        favourites.add(action.id);
      }
      const pendingfavourites = new Set(state.pendingfavourites);
      pendingfavourites.add(action.id);
      return { ...state, favourites, pendingfavourites };
    }
    case "FAVOURITE_SETTLED": {
      const pendingfavourites = new Set(state.pendingfavourites);
      pendingfavourites.delete(action.id);
      return { ...state, pendingfavourites };
    }
    case "TOGGLE_HIDDEN": {
      const hidden = new Set(state.hidden);
      if (hidden.has(action.id)) {
        hidden.delete(action.id);
      } else {
        hidden.add(action.id);
      }
      return { ...state, hidden };
    }
    default:
      return state;
  }
}, "reducer");
const CourseCallbacksContext = createContext(null);
const CourseMembershipContext = createContext(null);
const useCourseCallbacks = /* @__PURE__ */ __name(() => {
  const ctx = useContext(CourseCallbacksContext);
  if (ctx === null) {
    throw new Error("useCourseCallbacks must be used within CourseCallbacksContext");
  }
  return ctx;
}, "useCourseCallbacks");
const useCourseMemberships = /* @__PURE__ */ __name(() => {
  const ctx = useContext(CourseMembershipContext);
  if (ctx === null) {
    throw new Error("useCourseMemberships must be used within CourseMembershipContext");
  }
  return ctx;
}, "useCourseMemberships");
const StringsContext = createContext(null);
const useStrings = /* @__PURE__ */ __name(() => {
  const ctx = useContext(StringsContext);
  if (ctx === null) {
    throw new Error("useStrings must be used within StringsContext");
  }
  return ctx;
}, "useStrings");
export {
  CourseCallbacksContext,
  CourseMembershipContext,
  StringsContext,
  hasNextPage,
  initState,
  reducer,
  useCourseCallbacks,
  useCourseMemberships,
  useStrings
};
//# sourceMappingURL=state.dev.js.map
