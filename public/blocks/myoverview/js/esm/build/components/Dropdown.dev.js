var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Generic single-select toolbar dropdown (used for filter, sort and layout).
 *
 * Shows a tooltip (title) and an active-state class when the current value is
 * non-default (MDL-88972). Opens on click, closes on outside click or Escape,
 * and returns focus to the trigger. Options are mutually exclusive.
 *
 * Keyboard: ArrowDown/ArrowUp move focus between items; Home/End jump to
 * first/last; Escape closes and returns focus to trigger; Tab closes.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useDismissableMenu } from "../hooks/useDismissableMenu";
import { useDismissableTooltip } from "../hooks/useDismissableTooltip";
import Icon from "@moodle/lms/block_myoverview/components/Icon";
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
  const { open, setOpen, containerRef, triggerRef, menuRef, handleMenuKeyDown } = useDismissableMenu("menuitemradio");
  const { tooltipAttr, tooltipTriggerProps } = useDismissableTooltip();
  const selected = options.find((o) => o.value === current);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `courseoverview-dropdown${showLabel ? " courseoverview-dropdown--labelled" : ""}`,
      ref: containerRef,
      children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            ref: triggerRef,
            className: `courseoverview-toolbtn${active ? " is-active" : ""}${showLabel ? " courseoverview-toolbtn--labelled" : ""}`,
            "aria-haspopup": "menu",
            "aria-expanded": open,
            "aria-label": triggerAriaLabel ?? label,
            "data-tooltip": tooltipAttr(tooltip ?? label),
            onClick: () => setOpen((v) => !v),
            ...tooltipTriggerProps,
            children: [
              icon && /* @__PURE__ */ jsxDEV(Icon, { name: icon }, void 0, false, {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 105,
                columnNumber: 26
              }, this),
              showLabel && /* @__PURE__ */ jsxDEV("span", { className: "courseoverview-toolbtn__label", children: selected?.label ?? label }, void 0, false, {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 106,
                columnNumber: 31
              }, this),
              showLabel && /* @__PURE__ */ jsxDEV(Icon, { name: "chevron-down", className: "courseoverview-toolbtn__caret" }, void 0, false, {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 107,
                columnNumber: 31
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
            lineNumber: 93,
            columnNumber: 13
          },
          this
        ),
        open && /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: `courseoverview-menu__list${align === "start" ? " courseoverview-menu__list--start" : ""}`,
            role: "menu",
            "aria-label": label,
            ref: menuRef,
            onKeyDown: handleMenuKeyDown,
            children: [
              menuTitle && /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-menu__group-label", "aria-hidden": "true", children: menuTitle }, void 0, false, {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 118,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("div", { role: "group", "aria-label": menuTitle ?? label, children: options.map((opt, i) => {
                const groupEnd = !!groupOf && i < options.length - 1 && groupOf(opt.value) !== groupOf(options[i + 1].value);
                return /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    type: "button",
                    role: "menuitemradio",
                    "aria-checked": opt.value === current,
                    className: `courseoverview-menu__item${opt.value === current ? " is-selected" : ""}${groupEnd ? " courseoverview-menu__item--group-end" : ""}`,
                    onClick: () => {
                      onSelect(opt.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    },
                    children: [
                      opt.icon && /* @__PURE__ */ jsxDEV(Icon, { name: opt.icon, className: "courseoverview-menu__icon" }, void 0, false, {
                        fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                        lineNumber: 138,
                        columnNumber: 46
                      }, this),
                      opt.label,
                      opt.value === current && /* @__PURE__ */ jsxDEV(Icon, { name: "check", className: "courseoverview-menu__check" }, void 0, false, {
                        fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                        lineNumber: 140,
                        columnNumber: 59
                      }, this)
                    ]
                  },
                  opt.value,
                  true,
                  {
                    fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                    lineNumber: 125,
                    columnNumber: 29
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
                lineNumber: 120,
                columnNumber: 21
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
            lineNumber: 110,
            columnNumber: 17
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "public/blocks/myoverview/js/esm/src/components/Dropdown.tsx",
      lineNumber: 89,
      columnNumber: 9
    },
    this
  );
}
__name(Dropdown, "Dropdown");
export {
  Dropdown as default
};
//# sourceMappingURL=Dropdown.dev.js.map
