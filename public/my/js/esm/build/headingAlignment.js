import{useLayoutEffect as c}from"react";import{readGridMetrics as u,unusedEdgeColumns as b}from"./layout";/**
 * Lines the page heading up with the dashboard's blocks.
 *
 * The heading spans the same width as the grid. When the outer columns hold no block - as in the
 * default layout at six columns - it would otherwise reach further out than anything below it. This
 * insets it to run from the leftmost to the rightmost column that has a block, by setting two custom
 * properties on the page, which the theme applies to the page header (my.scss). It follows the
 * committed layout only, never a drag in progress, so the heading moves once, when a block lands.
 *
 * @module     core_my/headingAlignment
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const y="--core-my-dashboard-heading-inset-start",a="--core-my-dashboard-heading-inset-end",g=(r,o,e)=>{c(()=>{const t=r.current;if(!t)return;const{start:m,end:p}=b(o,e),n=()=>{const{gap:d}=u(t),i=(t.getBoundingClientRect().width-d*(e-1))/e+d;document.body.style.setProperty(y,`${Math.max(0,m*i)}px`),document.body.style.setProperty(a,`${Math.max(0,p*i)}px`)};n();const s=typeof ResizeObserver>"u"?null:new ResizeObserver(n);return s?.observe(t),()=>s?.disconnect()},[r,o,e]),c(()=>()=>{document.body.style.removeProperty(y),document.body.style.removeProperty(a)},[])};export{a as HEADING_INSET_END,y as HEADING_INSET_START,g as useHeadingAlignment};
