var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
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
 */
import { ProgressBar } from "@moodlehq/design-system";
import { useStrings } from "../state";
function ProgressIndicator({ progress, labelVariant = "inline" }) {
  const strings = useStrings();
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const count = strings.percentcomplete.replace("{$a}", String(clamped));
  return /* @__PURE__ */ jsxDEV(
    ProgressBar,
    {
      value: clamped,
      labelVariant,
      title: labelVariant === "title" ? count : void 0,
      count: labelVariant === "inline" ? count : void 0,
      "aria-label": strings.courseprogress,
      className: "courseoverview-progress"
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/ProgressIndicator.tsx",
      lineNumber: 53,
      columnNumber: 9
    },
    this
  );
}
__name(ProgressIndicator, "ProgressIndicator");
export {
  ProgressIndicator as default
};
//# sourceMappingURL=ProgressIndicator.dev.js.map
