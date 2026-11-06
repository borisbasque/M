import d from"@moodle/lms/block_myoverview/components/CourseImage";import l from"@moodle/lms/block_myoverview/components/CourseControls";import m from"@moodle/lms/block_myoverview/components/ProgressIndicator";import{jsx as r,jsxs as a}from"react/jsx-runtime";/**
 * A single course as a card, list row or summary row (MDL-88966).
 *
 * One component renders all three views; CSS keys off the view modifier class
 * for layout. Anatomy (top to bottom in card view): image with star + ellipsis
 * at top-right, course name, category, then progress (when the course reports it).
 *
 * The whole surface is clickable (MDL-88971) via a stretched link on the title:
 * clicking anywhere navigates to the course, except on the star/ellipsis which
 * stop propagation. DOM order is body-first so tab order is link -> star ->
 * ellipsis (MDL-88978); CSS `order`/grid restores the visual layout.
 *
 * @module     block_myoverview/components/CourseItem
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function c({course:e,view:s,displaycategories:i}){const t=e.hasprogress&&e.progress!==null,o=`co-title-${e.id}`;return a("article",{className:`courseoverview-card courseoverview-card--${s}`,"data-courseid":e.id,"aria-labelledby":o,children:[a("div",{className:"courseoverview-card__body",children:[a("div",{className:"courseoverview-card__text",children:[r("a",{id:o,className:"courseoverview-card__title stretched-link",href:e.viewurl,children:e.fullnamedisplay}),i&&e.coursecategory&&r("div",{className:"courseoverview-card__category",children:e.coursecategory})]}),s==="summary"&&!!e.summary&&r("div",{className:"courseoverview-card__summary",dangerouslySetInnerHTML:{__html:e.summary}}),t&&r(m,{progress:e.progress,labelVariant:s==="card"?"title":"inline"})]}),a("div",{className:"courseoverview-card__media",children:[r(d,{src:e.courseimage}),r(l,{course:e})]})]})}export{c as default};
