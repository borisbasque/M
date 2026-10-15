var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The Move and Resize dialogs: step a block one space at a time, with a live preview on the grid.
 *
 * @module     core_my/components/PositionDialog
 * @copyright  2026 Kieran Gray
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useRef } from "react";
import { Button } from "@moodlehq/design-system";
const PositionDialog = /* @__PURE__ */ __name(({
  mode,
  heading,
  help,
  status,
  displaces,
  steps,
  saveLabel,
  cancelLabel,
  onStep,
  onSave,
  onCancel
}) => {
  const dialogRef = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }
  }, []);
  return /* @__PURE__ */ jsxDEV(
    "dialog",
    {
      ref: dialogRef,
      className: `core-my-dashboard-position core-my-dashboard-position--${mode}`,
      "aria-labelledby": `${id}-title`,
      "aria-describedby": `${id}-help`,
      "aria-modal": "true",
      onCancel: (event) => {
        event.preventDefault();
        onCancel();
      },
      children: [
        /* @__PURE__ */ jsxDEV("h2", { id: `${id}-title`, children: heading }, void 0, false, {
          fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
          lineNumber: 85,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("p", { id: `${id}-help`, children: help }, void 0, false, {
          fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
          lineNumber: 86,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-position__steps", role: "group", "aria-label": heading, children: steps.map((step) => /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: `core-my-dashboard-position__step core-my-dashboard-position__step--${step.key}`,
            children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  className: "btn btn-secondary",
                  "aria-disabled": step.reason ? true : void 0,
                  "aria-describedby": step.reason ? `${id}-${step.key}-reason` : void 0,
                  "data-step": step.key,
                  onClick: () => {
                    if (!step.reason) {
                      onStep(step.key);
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsxDEV("i", { className: `fa ${step.icon}`, "aria-hidden": "true" }, void 0, false, {
                      fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
                      lineNumber: 104,
                      columnNumber: 21
                    }),
                    " ",
                    step.label
                  ]
                },
                void 0,
                true,
                {
                  fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
                  lineNumber: 92,
                  columnNumber: 17
                }
              ),
              step.reason && /* @__PURE__ */ jsxDEV(
                "span",
                {
                  id: `${id}-${step.key}-reason`,
                  className: "core-my-dashboard-position__reason",
                  children: step.reason
                },
                void 0,
                false,
                {
                  fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
                  lineNumber: 106,
                  columnNumber: 33
                }
              )
            ]
          },
          step.key,
          true,
          {
            fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
            lineNumber: 88,
            columnNumber: 32
          }
        )) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
          lineNumber: 87,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-position__status", role: "status", "aria-atomic": "true", children: [
          /* @__PURE__ */ jsxDEV("p", { children: status }, void 0, false, {
            fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
            lineNumber: 113,
            columnNumber: 13
          }),
          displaces && /* @__PURE__ */ jsxDEV("p", { children: displaces }, void 0, false, {
            fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
            lineNumber: 114,
            columnNumber: 27
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
          lineNumber: 112,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-confirm__actions", children: [
          /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: cancelLabel, onClick: onCancel }, void 0, false, {
            fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
            lineNumber: 117,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV(Button, { variant: "primary", label: saveLabel, onClick: onSave }, void 0, false, {
            fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
            lineNumber: 118,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
          lineNumber: 116,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/PositionDialog.tsx",
      lineNumber: 73,
      columnNumber: 12
    }
  );
}, "PositionDialog");
var PositionDialog_default = PositionDialog;
export {
  PositionDialog_default as default
};
//# sourceMappingURL=PositionDialog.dev.js.map
