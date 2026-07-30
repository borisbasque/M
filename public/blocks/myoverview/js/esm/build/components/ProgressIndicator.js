import{ProgressBar as s}from"@moodlehq/design-system";import{useStrings as i}from"../state";import{jsx as c}from"react/jsx-runtime";/**
 * Course completion progress indicator (MDL-88970).
 *
 * Delegates to the DS ProgressBar. The label variant follows the MDS progress-bar
 * guidance: the inline count sits beside the track only where horizontal space
 * allows (list and summary rows); in the narrow card the label moves above the
 * track via the 'title' variant so the bar stays long enough to read, with the
 * percentage string as that single label line.
 *
 * The accessible name is always the "Course progress:" string — the visible
 * percentage must not become the name (the value is already announced from
 * aria-valuenow), so it is passed as aria-label in both variants.
 *
 * @module     block_myoverview/components/ProgressIndicator
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function a({progress:t,labelVariant:r="inline"}){const e=i(),o=Math.max(0,Math.min(100,Math.round(t))),n=e.percentcomplete.replace("{$a}",String(o));return c(s,{value:o,labelVariant:r,title:r==="title"?n:void 0,count:r==="inline"?n:void 0,"aria-label":e.courseprogress,className:"courseoverview-progress"})}export{a as default};
