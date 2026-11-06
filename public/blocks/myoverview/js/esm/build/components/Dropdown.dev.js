var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Generic single-select toolbar dropdown (used for filter, sort and layout).
 *
 * Built on the design system Dropdown, so the trigger, menu, keyboard support
 * (arrow keys, Home/End, typeahead, Escape returning focus to the trigger) and
 * the selected-item check all come from there. The trigger shows the emphasis
 * appearance when the current value is non-default (MDL-88972), and a design
 * system Tooltip names it on hover and focus. Options are mutually exclusive.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Fragment, useState } from "react";
import {
  Dropdown as MdsDropdown,
  DropdownItemDivider,
  DropdownItemHeader,
  DropdownItemSelect,
  DropdownTrigger,
  Tooltip
} from "@moodlehq/design-system";
import { faIcon } from "@moodle/lms/block_myoverview/components/Icon";
function Dropdown({
  label,
  triggerAriaLabel,
  icon,
  options,
  current,
  onSelect,
  active,
  showLabel = false,
  menuTitle,
  tooltip,
  groupOf,
  align = "end"
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === current);
  const name = triggerAriaLabel ?? label;
  const trigger = /* @__PURE__ */ jsxDEV(
    DropdownTrigger,
    {
      label: showLabel ? selected?.label ?? label : name,
      ...showLabel ? { "aria-label": name } : {},
      iconOnly: !showLabel,
      startIcon: icon ? faIcon(icon) : void 0,
      appearance: active ? "emphasis" : "default",
      open,
      className: showLabel ? "courseoverview-dropdown__trigger--labelled" : void 0
    },
    void 0,
    false,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
      lineNumber: 89,
      columnNumber: 9
    },
    this
  );
  return /* @__PURE__ */ jsxDEV(Tooltip, { label: tooltip ?? label, className: showLabel ? "courseoverview-dropdown--labelled" : void 0, children: /* @__PURE__ */ jsxDEV(
    MdsDropdown,
    {
      label,
      className: "courseoverview-dropdown",
      trigger,
      open,
      onOpenChange: setOpen,
      placement: align === "start" ? "bottom-start" : "bottom-end",
      children: [
        menuTitle && /* @__PURE__ */ jsxDEV(DropdownItemHeader, { label: menuTitle }, void 0, false, {
          fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
          lineNumber: 114,
          columnNumber: 31
        }, this),
        options.map((opt, i) => {
          const groupEnd = !!groupOf && i < options.length - 1 && groupOf(opt.value) !== groupOf(options[i + 1].value);
          return /* @__PURE__ */ jsxDEV(Fragment, { children: [
            /* @__PURE__ */ jsxDEV(
              DropdownItemSelect,
              {
                label: opt.label,
                selected: opt.value === current,
                startIcon: opt.icon ? faIcon(opt.icon) : void 0,
                onClick: () => {
                  onSelect(opt.value);
                  setOpen(false);
                }
              },
              void 0,
              false,
              {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 120,
                columnNumber: 29
              },
              this
            ),
            groupEnd && /* @__PURE__ */ jsxDEV(DropdownItemDivider, {}, void 0, false, {
              fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
              lineNumber: 129,
              columnNumber: 42
            }, this)
          ] }, opt.value, true, {
            fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
            lineNumber: 119,
            columnNumber: 25
          }, this);
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
      lineNumber: 105,
      columnNumber: 13
    },
    this
  ) }, void 0, false, {
    fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
    lineNumber: 104,
    columnNumber: 9
  }, this);
}
__name(Dropdown, "Dropdown");
export {
  Dropdown as default
};
//# sourceMappingURL=Dropdown.dev.js.map
