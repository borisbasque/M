var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Accessible move and resize handle for dashboard tiles.
 *
 * @module     core_my/components/DashboardHandle
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Button } from "@moodlehq/design-system";
const DashboardHandle = /* @__PURE__ */ __name(({
  mode,
  label,
  instructionsId,
  active,
  tapping = false,
  onStart,
  onKeyDown,
  onPointerDown,
  onCommit
}) => /* @__PURE__ */ jsxDEV(
  "div",
  {
    className: `core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${mode}${active ? " active" : ""}`,
    onBlur: (event) => {
      const nextTarget = event.relatedTarget;
      if (!active || tapping || nextTarget instanceof Element && nextTarget.closest(".core-toast")) {
        return;
      }
      if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
        onCommit();
      }
    },
    children: /* @__PURE__ */ jsxDEV(
      Button,
      {
        size: "md",
        variant: "ghost",
        className: `core-my-dashboard-handle core-my-dashboard-handle--${mode}`,
        "aria-label": label,
        "aria-describedby": instructionsId,
        "aria-pressed": active,
        title: label,
        startIcon: mode === "move" ? /* @__PURE__ */ jsxDEV("i", { className: "fa fa-grip-vertical", "aria-hidden": "true" }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
          lineNumber: 66,
          columnNumber: 15
        }) : /* @__PURE__ */ jsxDEV(
          "svg",
          {
            className: "core-my-dashboard-handle__corner",
            viewBox: "0 0 12 12",
            width: "12",
            height: "12",
            "aria-hidden": "true",
            focusable: "false",
            children: /* @__PURE__ */ jsxDEV("path", { d: "M11 4 4 11M11 8 8 11", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", fill: "none" }, void 0, false, {
              fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
              lineNumber: 77,
              columnNumber: 17
            })
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
            lineNumber: 69,
            columnNumber: 15
          }
        ),
        onClick: (event) => {
          if (event.detail === 0 && !active) {
            onStart();
          }
        },
        onKeyDown,
        onPointerDown: (event) => {
          if (tapping) {
            event.preventDefault();
            return;
          }
          if (active) {
            event.preventDefault();
            onCommit();
            return;
          }
          event.currentTarget.focus();
          onPointerDown(event);
        }
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
        lineNumber: 57,
        columnNumber: 5
      }
    )
  },
  void 0,
  false,
  {
    fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
    lineNumber: 43,
    columnNumber: 29
  }
), "DashboardHandle");
var DashboardHandle_default = DashboardHandle;
export {
  DashboardHandle_default as default
};
//# sourceMappingURL=DashboardHandle.dev.js.map
