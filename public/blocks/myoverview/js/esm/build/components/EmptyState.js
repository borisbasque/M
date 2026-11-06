import{useEffect as u,useState as p}from"react";import{resolveZeroStateCopy as v}from"../strings";import{useStrings as d}from"../state";import{Fragment as _,jsx as t,jsxs as s}from"react/jsx-runtime";/**
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
 */function y({zerostate:e,variant:m,illustrationurl:c}){const r=d(),[i,o]=p(null);u(()=>{if(!e)return;let a=!1;return v(e).then(n=>(a||o(n),null)).catch(n=>{a||o(null),window.console.error("[block_myoverview] Failed to resolve zero-state copy",n)}),()=>{a=!0}},[e]);const l=t("div",{className:"courseoverview-empty__illustration","aria-hidden":"true",children:t("img",{src:c,alt:""})});if(e){const a=e.sitehascourses?r.managecourses:r.managecategories;return s("div",{className:"courseoverview-empty","data-variant":"zerostate",children:[l,i&&s(_,{children:[t("h2",{className:"courseoverview-empty__title",children:i.title}),t("p",{className:"courseoverview-empty__text",dangerouslySetInnerHTML:{__html:i.intro}})]}),e.variant==="create"&&s("div",{className:"courseoverview-empty__actions",children:[e.manageurl&&t("a",{className:"mds-btn btn btn-outline-primary mds-btn--size-md",href:e.manageurl,children:a}),e.createurl&&t("a",{className:"mds-btn btn btn-primary mds-btn--size-md",href:e.createurl,children:r.createcourse})]})]})}return m==="no-results"?s("div",{className:"courseoverview-empty","data-variant":"no-results",children:[l,t("h2",{className:"courseoverview-empty__title",children:r.emptynoresultstitle}),t("p",{className:"courseoverview-empty__text",children:r.emptynoresults})]}):s("div",{className:"courseoverview-empty","data-variant":"all-hidden",children:[l,t("h2",{className:"courseoverview-empty__title",children:r.emptyallhiddentitle}),t("p",{className:"courseoverview-empty__text",children:r.emptyallhiddenintro})]})}export{y as default};
