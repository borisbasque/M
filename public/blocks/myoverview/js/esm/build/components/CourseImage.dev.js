var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Course overview image (MDL-88967).
 *
 * Renders the course image cover-cropped into a fixed-height block, or a
 * checkerboard fallback when no image is set. Height follows the Figma redesign
 * (160px, --co-image-h in styles.css).
 *
 * @module     block_myoverview/components/CourseImage
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useState } from "react";
function CourseImage({ src, className = "" }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => setErrored(false), [src]);
  const showImage = src !== null && !errored;
  return /* @__PURE__ */ jsxDEV("div", { className: `courseoverview-image ${showImage ? "" : "courseoverview-image--empty"} ${className}`.trim(), children: showImage && /* @__PURE__ */ jsxDEV(
    "img",
    {
      src,
      alt: "",
      className: "courseoverview-image__img",
      loading: "lazy",
      onError: () => setErrored(true)
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/CourseImage.tsx",
      lineNumber: 49,
      columnNumber: 17
    },
    this
  ) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/CourseImage.tsx",
    lineNumber: 47,
    columnNumber: 9
  }, this);
}
__name(CourseImage, "CourseImage");
export {
  CourseImage as default
};
//# sourceMappingURL=CourseImage.dev.js.map
