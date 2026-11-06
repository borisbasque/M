var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Course search input (MDL-88972).
 *
 * A controlled text field. Search state is independent of filter and sort
 * (MDL-88973): typing here never resets them, and clearing it leaves them
 * intact.
 *
 * @module     block_myoverview/components/SearchInput
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { SearchInput as MdsSearchInput } from "@moodlehq/design-system";
import { useStrings } from "../state";
function SearchInput({ value, onChange }) {
  const strings = useStrings();
  return /* @__PURE__ */ jsxDEV(
    MdsSearchInput,
    {
      className: "courseoverview-search",
      label: strings.searchcourses,
      hideLabel: true,
      clearLabel: strings.clearsearch,
      placeholder: strings.search,
      value,
      onChange: (e) => onChange(e.target.value)
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/SearchInput.tsx",
      lineNumber: 47,
      columnNumber: 9
    },
    this
  );
}
__name(SearchInput, "SearchInput");
export {
  SearchInput as default
};
//# sourceMappingURL=SearchInput.dev.js.map
