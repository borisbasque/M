var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Replaceable confirmation dialog built with Moodle Design System controls.
 *
 * @module     core_my/components/ConfirmationDialog
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useRef } from "react";
import { Button } from "@moodlehq/design-system";
const ConfirmationDialog = /* @__PURE__ */ __name(({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}) => {
  const dialogRef = useRef(null);
  const headingId = useId();
  const messageId = useId();
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  return /* @__PURE__ */ jsxDEV(
    "dialog",
    {
      ref: dialogRef,
      className: "core-my-dashboard-confirm",
      "aria-labelledby": headingId,
      "aria-describedby": messageId,
      onCancel,
      children: [
        /* @__PURE__ */ jsxDEV("h2", { id: headingId, children: title }, void 0, false, {
          fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
          lineNumber: 54,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("p", { id: messageId, children: message }, void 0, false, {
          fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
          lineNumber: 55,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-dashboard-confirm__actions", children: [
          /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: cancelLabel, onClick: onCancel }, void 0, false, {
            fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
            lineNumber: 57,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV(Button, { variant: "primary", label: confirmLabel, onClick: onConfirm }, void 0, false, {
            fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
            lineNumber: 58,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
          lineNumber: 56,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/ConfirmationDialog.tsx",
      lineNumber: 47,
      columnNumber: 12
    }
  );
}, "ConfirmationDialog");
var ConfirmationDialog_default = ConfirmationDialog;
export {
  ConfirmationDialog_default as default
};
//# sourceMappingURL=ConfirmationDialog.dev.js.map
