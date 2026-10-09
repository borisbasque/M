var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * A short, temporary message that can carry one action, such as Undo or Cancel.
 *
 * The Moodle Design System has no toast yet (see MDL-89740), and core/toast is an AMD module with no
 * action button. This component follows the same rules a design-system toast would, so it can move
 * there unchanged:
 *
 * - it is its own polite status region, so it is announced without taking focus. A page showing a
 *   toast should not announce the same words a second time through its own live region;
 * - only the newest message is shown: passing a new message replaces the current one;
 * - it closes itself after `duration` milliseconds (6 seconds by default) unless `persist` is set,
 *   and the timer pauses while the pointer is over it or it has keyboard focus, so its action can
 *   never vanish while someone is reaching for it;
 * - its action and close button are each at least 24 × 24px (WCAG 2.2 SC 2.5.8).
 *
 * @module     core/Toast
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useRef, useState } from "react";
const TOAST_DURATION_MS = 6e3;
const Toast = /* @__PURE__ */ __name(({ message, closeLabel, onClose }) => {
  const [held, setHeld] = useState(0);
  const timer = useRef(void 0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!message) {
      setHeld(0);
    }
  }, [message]);
  useEffect(() => {
    clearTimeout(timer.current);
    if (!message || message.persist || held > 0) {
      return void 0;
    }
    timer.current = setTimeout(() => onCloseRef.current(), message.duration ?? TOAST_DURATION_MS);
    return () => clearTimeout(timer.current);
  }, [message, held]);
  const hold = useCallback(() => setHeld((count) => count + 1), []);
  const release = useCallback(() => setHeld((count) => Math.max(0, count - 1)), []);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `core-toast${message ? " core-toast--visible" : ""}`,
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      onMouseEnter: message ? hold : void 0,
      onMouseLeave: message ? release : void 0,
      onFocus: message ? hold : void 0,
      onBlur: message ? release : void 0,
      children: message && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "core-toast__text", children: message.text }, void 0, false, {
          fileName: "public/lib/js/esm/src/Toast.tsx",
          lineNumber: 104,
          columnNumber: 13
        }),
        message.action && /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "core-toast__action",
            onClick: message.action.onClick,
            children: message.action.label
          },
          void 0,
          false,
          {
            fileName: "public/lib/js/esm/src/Toast.tsx",
            lineNumber: 105,
            columnNumber: 32
          }
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "core-toast__close",
            "aria-label": closeLabel,
            title: closeLabel,
            onClick: () => onCloseRef.current(),
            children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "\xD7" }, void 0, false, {
              fileName: "public/lib/js/esm/src/Toast.tsx",
              lineNumber: 117,
              columnNumber: 17
            })
          },
          void 0,
          false,
          {
            fileName: "public/lib/js/esm/src/Toast.tsx",
            lineNumber: 110,
            columnNumber: 13
          }
        )
      ] }, void 0, true, {
        fileName: "public/lib/js/esm/src/Toast.tsx",
        lineNumber: 103,
        columnNumber: 21
      })
    },
    void 0,
    false,
    {
      fileName: "public/lib/js/esm/src/Toast.tsx",
      lineNumber: 93,
      columnNumber: 12
    }
  );
}, "Toast");
var Toast_default = Toast;
export {
  TOAST_DURATION_MS,
  Toast_default as default
};
//# sourceMappingURL=Toast.dev.js.map
