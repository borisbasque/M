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
import { Button, Tooltip } from "@moodlehq/design-system";
import GridControls from "./GridControls";
import { renderIcon } from "./Icon";
const resizeGrip = /* @__PURE__ */ jsxDEV(
  "svg",
  {
    className: "core-my-dashboard-icon core-my-dashboard-resize-grip",
    viewBox: "0 0 10 10",
    "aria-hidden": "true",
    focusable: "false",
    children: /* @__PURE__ */ jsxDEV("path", { d: "M9 1L1 9M9 5L5 9", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", fill: "none" }, void 0, false, {
      fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
      lineNumber: 47,
      columnNumber: 5
    })
  },
  void 0,
  false,
  {
    fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
    lineNumber: 41,
    columnNumber: 20
  }
);
const DashboardHandle = /* @__PURE__ */ __name(({
  mode,
  label,
  labels,
  icons,
  instructionsId,
  active,
  showControls,
  onStart,
  onKeyDown,
  onPointerDown,
  onDirection,
  onCommit
}) => /* @__PURE__ */ jsxDEV(
  "div",
  {
    className: `core-my-dashboard-handle-wrapper core-my-dashboard-handle-wrapper--${mode}${active ? " active" : ""}`,
    onBlur: (event) => {
      const nextTarget = event.relatedTarget;
      if (active && (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget))) {
        onCommit();
      }
    },
    children: [
      active && showControls && /* @__PURE__ */ jsxDEV(GridControls, { mode, labels, icons, onDirection }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
        lineNumber: 72,
        columnNumber: 32
      }),
      /* @__PURE__ */ jsxDEV(Tooltip, { label, children: /* @__PURE__ */ jsxDEV(
        Button,
        {
          size: "lg",
          variant: "ghost",
          className: `core-my-dashboard-handle core-my-dashboard-handle--${mode}`,
          "aria-label": label,
          "aria-describedby": instructionsId,
          "aria-pressed": active,
          startIcon: mode === "move" ? renderIcon(icons.move) : resizeGrip,
          onClick: (event) => {
            if (event.detail === 0 && !active) {
              onStart();
            }
          },
          onKeyDown,
          onPointerDown: (event) => {
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
          lineNumber: 76,
          columnNumber: 9
        }
      ) }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
        lineNumber: 75,
        columnNumber: 5
      })
    ]
  },
  void 0,
  true,
  {
    fileName: "public/my/js/esm/src/components/DashboardHandle.tsx",
    lineNumber: 63,
    columnNumber: 29
  }
), "DashboardHandle");
var DashboardHandle_default = DashboardHandle;
export {
  DashboardHandle_default as default
};
//# sourceMappingURL=DashboardHandle.dev.js.map
