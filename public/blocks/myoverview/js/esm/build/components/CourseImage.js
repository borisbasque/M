import{useEffect as i,useState as m}from"react";import{jsx as o}from"react/jsx-runtime";/**
 * Course overview image (MDL-88967).
 *
 * Renders the course image cover-cropped into a fixed-height block, or a
 * checkerboard fallback when no image is set. Height follows the Figma redesign
 * (160px, --co-image-h in styles.css).
 *
 * @module     block_myoverview/components/CourseImage
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function g({src:e,className:a=""}){const[t,r]=m(!1);i(()=>r(!1),[e]);const s=e!==null&&!t;return o("div",{className:`courseoverview-image ${s?"":"courseoverview-image--empty"} ${a}`.trim(),children:s&&o("img",{src:e,alt:"",className:"courseoverview-image__img",loading:"lazy",onError:()=>r(!0)})})}export{g as default};
