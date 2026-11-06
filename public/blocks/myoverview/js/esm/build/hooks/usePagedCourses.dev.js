var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Server-side paging orchestration for the course overview block.
 *
 * Each page is fetched with limit PAGE_SIZE, chaining offsets through the web
 * service's returned nextoffset — the only offset arithmetic valid for every
 * classification (favourites/customfield filter after retrieval, so the number
 * of records kept is smaller than the number processed). Whenever the current
 * page is full, the next page is silently prefetched, matching the old AMD
 * block's two-pages-per-fetch model; "Next" only enables once that prefetch
 * confirms a non-empty page. A failed prefetch is retried a bounded number of
 * times so a transient error cannot permanently disable "Next".
 *
 * A search is mutually exclusive with the grouping filter (the search
 * classification overrides it, as the old block behaved) and never touches the
 * filter preference.
 *
 * Guards: queryKeyRef ignores responses that land after the query changed
 * (fetchOne has no per-call cancellation); generationRef ignores responses that
 * land after refetchAfterToggle() replaced the paged data; inflightRef prevents
 * duplicate fetches of the same page.
 *
 * @module     block_myoverview/hooks/usePagedCourses
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { getCourses } from "../repository";
import { PAGE_SIZE } from "../types";
const MAX_PREFETCH_ATTEMPTS = 3;
function usePagedCourses({ state, dispatch, config, debouncedSearch }) {
  const { view, filter, sort, page, customfieldvalue, pages, pageOffsets } = state;
  const searching = debouncedSearch.trim() !== "";
  const needsSummaryFields = view === "summary";
  const queryKey = JSON.stringify(
    searching ? ["search", sort, debouncedSearch, needsSummaryFields] : [filter, sort, customfieldvalue, needsSummaryFields]
  );
  const queryKeyRef = useRef(null);
  const generationRef = useRef(0);
  const inflightRef = useRef(/* @__PURE__ */ new Set());
  const attemptsRef = useRef(/* @__PURE__ */ new Map());
  const [retryTick, setRetryTick] = useState(0);
  const latestRef = useRef({ page, filter, sort, view, customfieldvalue, searching, debouncedSearch });
  latestRef.current = { page, filter, sort, view, customfieldvalue, searching, debouncedSearch };
  const buildArgs = /* @__PURE__ */ __name((offset) => {
    const latest = latestRef.current;
    const isCustomField = !latest.searching && latest.filter === "customfield";
    return {
      classification: latest.searching ? "search" : latest.filter,
      sort: latest.sort,
      limit: PAGE_SIZE,
      offset,
      view: latest.view,
      customfieldname: isCustomField ? config.customfieldname : void 0,
      customfieldvalue: isCustomField ? latest.customfieldvalue ?? void 0 : void 0,
      searchvalue: latest.searching ? latest.debouncedSearch : void 0
    };
  }, "buildArgs");
  useLayoutEffect(() => {
    if (queryKeyRef.current !== queryKey) {
      queryKeyRef.current = queryKey;
      generationRef.current++;
      inflightRef.current.clear();
      attemptsRef.current.clear();
      dispatch({ type: "RESET_PAGES" });
      return;
    }
    const generation = generationRef.current;
    const fetchPage = /* @__PURE__ */ __name(async (index, silent) => {
      inflightRef.current.add(index);
      if (!silent) {
        dispatch({ type: "SET_LOADING" });
      }
      try {
        const { courses: fetched, nextoffset } = await getCourses(buildArgs(pageOffsets[index] ?? 0));
        if (queryKeyRef.current !== queryKey || generationRef.current !== generation) {
          return;
        }
        inflightRef.current.delete(index);
        attemptsRef.current.delete(index);
        dispatch({ type: "PAGE_LOADED", index, courses: fetched, nextoffset });
      } catch {
        if (queryKeyRef.current !== queryKey || generationRef.current !== generation) {
          return;
        }
        inflightRef.current.delete(index);
        if (!silent) {
          dispatch({ type: "SET_ERROR", error: "loadfailed" });
          return;
        }
        const attempts = (attemptsRef.current.get(index) ?? 0) + 1;
        attemptsRef.current.set(index, attempts);
        if (attempts < MAX_PREFETCH_ATTEMPTS) {
          setRetryTick((t) => t + 1);
        }
      }
    }, "fetchPage");
    const current = page - 1;
    if (pages[current] === void 0) {
      if (!inflightRef.current.has(current)) {
        fetchPage(current, false);
      }
      return;
    }
    const next = current + 1;
    if (pages[current].length === PAGE_SIZE && pages[next] === void 0 && !inflightRef.current.has(next)) {
      fetchPage(next, true);
    }
  }, [queryKey, page, pages, retryTick]);
  const refetchAfterToggle = useCallback(() => {
    const key = queryKeyRef.current;
    const generation = ++generationRef.current;
    inflightRef.current.clear();
    attemptsRef.current.clear();
    const targetPage = latestRef.current.page;
    (async () => {
      const collected = [];
      const offsets = [0];
      let offset = 0;
      try {
        for (let i = 0; i < targetPage; i++) {
          const { courses, nextoffset } = await getCourses(buildArgs(offset));
          if (queryKeyRef.current !== key || generationRef.current !== generation) {
            return;
          }
          collected[i] = courses;
          offsets[i + 1] = nextoffset;
          offset = nextoffset;
          if (courses.length < PAGE_SIZE) {
            break;
          }
        }
      } catch {
        if (queryKeyRef.current !== key || generationRef.current !== generation) {
          return;
        }
        dispatch({ type: "RESET_PAGES" });
        return;
      }
      if (latestRef.current.page !== targetPage) {
        return;
      }
      let landing = Math.min(targetPage, collected.length);
      while (landing > 1 && (collected[landing - 1] ?? []).length === 0) {
        landing--;
      }
      dispatch({
        type: "REPLACE_PAGES",
        pages: collected,
        pageOffsets: offsets,
        page: Math.max(1, landing)
      });
    })();
  }, [dispatch]);
  return { searching, refetchAfterToggle };
}
__name(usePagedCourses, "usePagedCourses");
export {
  usePagedCourses
};
//# sourceMappingURL=usePagedCourses.dev.js.map
