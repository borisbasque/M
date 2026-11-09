var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * What the dashboard shows outside edit mode when it has no blocks.
 *
 * People who can edit it get a way to start (turning on edit mode, where blocks are added) and,
 * on their own dashboard, to put back the site's default blocks. Everyone else gets a short note.
 * Figma: Dashboard empty state (V2).
 *
 * @module     core_my/components/DashboardEmpty
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Button } from "@moodlehq/design-system";
import { renderIcon } from "./Icon";
const DashboardEmpty = /* @__PURE__ */ __name(({ labels, icons, canEdit, onCustomise, onReset }) => /* @__PURE__ */ jsxDEV("section", { className: "core-my-dashboard-empty", "aria-labelledby": "core-my-dashboard-empty-title", children: [
  /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-empty__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("i", { className: "fa-solid fa-table-cells-large" }, void 0, false, {
    fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
    lineNumber: 38,
    columnNumber: 13
  }) }, void 0, false, {
    fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
    lineNumber: 37,
    columnNumber: 9
  }),
  /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-empty__text", children: [
    /* @__PURE__ */ jsxDEV("h2", { id: "core-my-dashboard-empty-title", className: "core-my-dashboard-empty__title", children: labels.emptytitle }, void 0, false, {
      fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
      lineNumber: 41,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-empty__description", children: canEdit ? labels.emptydescription : labels.emptyreadonly }, void 0, false, {
      fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
      lineNumber: 42,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
    lineNumber: 40,
    columnNumber: 9
  }),
  canEdit && /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-empty__actions", children: [
    onCustomise && /* @__PURE__ */ jsxDEV(
      Button,
      {
        variant: "primary",
        size: "lg",
        label: labels.customise,
        startIcon: renderIcon(icons.edit),
        onClick: onCustomise
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
        lineNumber: 47,
        columnNumber: 29
      }
    ),
    onReset && /* @__PURE__ */ jsxDEV(
      Button,
      {
        variant: "outline-secondary",
        size: "lg",
        label: labels.resettodefault,
        startIcon: renderIcon(icons.reset),
        onClick: onReset
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
        lineNumber: 54,
        columnNumber: 25
      }
    )
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
    lineNumber: 46,
    columnNumber: 21
  })
] }, void 0, true, {
  fileName: "public/my/js/esm/src/components/DashboardEmpty.tsx",
  lineNumber: 36,
  columnNumber: 5
}), "DashboardEmpty");
var DashboardEmpty_default = DashboardEmpty;
export {
  DashboardEmpty_default as default
};
//# sourceMappingURL=DashboardEmpty.dev.js.map
