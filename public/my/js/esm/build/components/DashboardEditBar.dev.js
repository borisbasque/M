var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The edit bar: a floating bar pinned to the bottom of the page while the dashboard is being edited.
 *
 * On the left it says what is being edited. People who may also edit the default dashboard for all
 * users get a subtle design system Dropdown there to switch between the two; everyone else sees
 * plain text. On the right are the actions, Add block being the only primary one. People leave Edit
 * mode with the page's own Edit mode switch.
 *
 * @module     core_my/components/DashboardEditBar
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Button, Dropdown, DropdownItemSelect } from "@moodlehq/design-system";
import config from "@moodle/lms/core/config";
import Icon, { renderIcon } from "./Icon";
const DashboardEditBar = /* @__PURE__ */ __name(({
  siteDefault,
  canEditDefault,
  canUndo,
  labels,
  icons,
  onReset,
  onUndo,
  onAdd
}) => {
  const goTo = /* @__PURE__ */ __name((path) => {
    window.location.href = `${config.wwwroot}${path}`;
  }, "goTo");
  return /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar", "data-region": "dashboard-edit-bar", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar__scope", children: [
      /* @__PURE__ */ jsxDEV(Icon, { markup: icons.edit, className: "core-my-dashboard-toolbar__icon" }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
        lineNumber: 55,
        columnNumber: 13
      }),
      canEditDefault ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-toolbar__label", children: labels.editing }, void 0, false, {
          fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
          lineNumber: 57,
          columnNumber: 17
        }),
        /* @__PURE__ */ jsxDEV(
          Dropdown,
          {
            label: siteDefault ? labels.scopedefaultshort : labels.scopeownshort,
            appearance: "subtle",
            children: [
              /* @__PURE__ */ jsxDEV(
                DropdownItemSelect,
                {
                  label: labels.scopeownshort,
                  selected: !siteDefault,
                  onClick: () => siteDefault && goTo("/my/")
                },
                void 0,
                false,
                {
                  fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
                  lineNumber: 62,
                  columnNumber: 21
                }
              ),
              /* @__PURE__ */ jsxDEV(
                DropdownItemSelect,
                {
                  label: labels.scopedefaultshort,
                  selected: siteDefault,
                  onClick: () => !siteDefault && goTo("/my/indexsys.php")
                },
                void 0,
                false,
                {
                  fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
                  lineNumber: 67,
                  columnNumber: 21
                }
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
            lineNumber: 58,
            columnNumber: 17
          }
        )
      ] }, void 0, true, {
        fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
        lineNumber: 56,
        columnNumber: 31
      }) : /* @__PURE__ */ jsxDEV("p", { className: "core-my-dashboard-scope", children: siteDefault ? labels.scopesitedefault : labels.scopeown }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
        lineNumber: 73,
        columnNumber: 19
      })
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
      lineNumber: 54,
      columnNumber: 9
    }),
    /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-toolbar__actions", children: [
      !siteDefault && /* @__PURE__ */ jsxDEV(
        Button,
        {
          variant: "ghost",
          size: "lg",
          label: labels.resettodefault,
          startIcon: renderIcon(icons.reset),
          onClick: onReset
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
          lineNumber: 76,
          columnNumber: 30
        }
      ),
      /* @__PURE__ */ jsxDEV(
        Button,
        {
          variant: "outline-secondary",
          size: "lg",
          label: labels.undo,
          startIcon: renderIcon(icons.undo),
          disabled: !canUndo,
          onClick: onUndo
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
          lineNumber: 83,
          columnNumber: 13
        }
      ),
      /* @__PURE__ */ jsxDEV("span", { className: "core-my-dashboard-toolbar__divider", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
        lineNumber: 91,
        columnNumber: 13
      }),
      /* @__PURE__ */ jsxDEV(
        Button,
        {
          variant: "primary",
          size: "lg",
          "data-action": "add-block",
          label: labels.addblockshort,
          startIcon: renderIcon(icons.add),
          onClick: (event) => onAdd(event.currentTarget)
        },
        void 0,
        false,
        {
          fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
          lineNumber: 92,
          columnNumber: 13
        }
      )
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
      lineNumber: 75,
      columnNumber: 9
    })
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/DashboardEditBar.tsx",
    lineNumber: 53,
    columnNumber: 12
  });
}, "DashboardEditBar");
var DashboardEditBar_default = DashboardEditBar;
export {
  DashboardEditBar_default as default
};
//# sourceMappingURL=DashboardEditBar.dev.js.map
