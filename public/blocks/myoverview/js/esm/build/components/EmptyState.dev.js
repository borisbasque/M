var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * Empty and no-results states (MDL-88974, MDL-88975, MDL-88979).
 *
 * When zero-state data is supplied, renders the rich variant: an illustration,
 * a title, a small intro paragraph, and any contextual action links (Create /
 * Manage course). The server sends data only (variant, flags and URLs); the
 * copy is composed here from language strings. The intro
 * strings embed documentation links, so the resolved lang-string HTML (never
 * user input) is injected via dangerouslySetInnerHTML, exactly as the old
 * Mustache template rendered the same strings. When no zero-state is supplied
 * it falls back to a simple single-message variant.
 *
 * @module     block_myoverview/components/EmptyState
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useState } from "react";
import { resolveZeroStateCopy } from "../strings";
import { useStrings } from "../state";
function EmptyState({ zerostate, variant, illustrationurl }) {
  const strings = useStrings();
  const [copyState, setCopyState] = useState(null);
  useEffect(() => {
    if (!zerostate) {
      return void 0;
    }
    let cancelled = false;
    resolveZeroStateCopy(zerostate).then((copy) => {
      if (!cancelled) {
        setCopyState(copy);
      }
      return null;
    }).catch((error) => {
      if (!cancelled) {
        setCopyState(null);
      }
      window.console.error("[block_myoverview] Failed to resolve zero-state copy", error);
    });
    return () => {
      cancelled = true;
    };
  }, [zerostate]);
  const illustration = /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-empty__illustration", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("img", { src: illustrationurl, alt: "" }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
    lineNumber: 89,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
    lineNumber: 88,
    columnNumber: 9
  }, this);
  if (zerostate) {
    const managelabel = zerostate.sitehascourses ? strings.managecourses : strings.managecategories;
    return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-empty", "data-variant": "zerostate", children: [
      illustration,
      copyState && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("h2", { className: "courseoverview-empty__title", children: copyState.title }, void 0, false, {
          fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
          lineNumber: 103,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV(
          "p",
          {
            className: "courseoverview-empty__text",
            dangerouslySetInnerHTML: { __html: copyState.intro }
          },
          void 0,
          false,
          {
            fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
            lineNumber: 104,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
        lineNumber: 99,
        columnNumber: 21
      }, this),
      zerostate.variant === "create" && /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-empty__actions", children: [
        zerostate.manageurl && /* @__PURE__ */ jsxDEV("a", { className: "btn btn-outline-primary", href: zerostate.manageurl, children: managelabel }, void 0, false, {
          fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
          lineNumber: 113,
          columnNumber: 29
        }, this),
        zerostate.createurl && /* @__PURE__ */ jsxDEV("a", { className: "btn btn-primary", href: zerostate.createurl, children: strings.createcourse }, void 0, false, {
          fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
          lineNumber: 118,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
        lineNumber: 111,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
      lineNumber: 96,
      columnNumber: 13
    }, this);
  }
  if (variant === "no-results") {
    return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-empty", "data-variant": "no-results", children: [
      illustration,
      /* @__PURE__ */ jsxDEV("h2", { className: "courseoverview-empty__title", children: strings.emptynoresultstitle }, void 0, false, {
        fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
        lineNumber: 134,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "courseoverview-empty__text", children: strings.emptynoresults }, void 0, false, {
        fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
        lineNumber: 135,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
      lineNumber: 132,
      columnNumber: 13
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-empty", "data-variant": "all-hidden", children: [
    illustration,
    /* @__PURE__ */ jsxDEV("h2", { className: "courseoverview-empty__title", children: strings.emptyallhiddentitle }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
      lineNumber: 146,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "courseoverview-empty__text", children: strings.emptyallhiddenintro }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
      lineNumber: 147,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "public/blocks/myoverview/js/esm/src/components/EmptyState.tsx",
    lineNumber: 144,
    columnNumber: 9
  }, this);
}
__name(EmptyState, "EmptyState");
export {
  EmptyState as default
};
//# sourceMappingURL=EmptyState.dev.js.map
