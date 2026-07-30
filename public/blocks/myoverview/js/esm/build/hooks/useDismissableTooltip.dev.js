var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Escape dismissal for the pure-CSS `data-tooltip` tooltips (WCAG 2.1 1.4.13).
 *
 * The tooltip itself is ::after content shown on :hover / :focus-visible, so it
 * has no DOM of its own to attach behaviour to. This hook suppresses it by
 * dropping the data-tooltip attribute while Escape has been pressed during the
 * current hover/focus; leaving and re-entering shows it again, which is the
 * dismissal model 1.4.13 asks for. A document-level listener is attached only
 * while the trigger is hovered or focused, so Escape works for pointer users
 * whose focus is elsewhere.
 *
 * Migrate to the design-system Tooltip (which owns this behaviour) once Boost
 * vendors its CSS (MDL-89292).
 *
 * @module     block_myoverview/hooks/useDismissableTooltip
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useCallback, useEffect, useRef, useState } from "react";
function useDismissableTooltip() {
  const [suppressed, setSuppressed] = useState(false);
  const activeRef = useRef(0);
  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setSuppressed(true);
    }
  }, []);
  const enter = useCallback(() => {
    activeRef.current++;
    if (activeRef.current === 1) {
      document.addEventListener("keydown", onKeyDown, true);
    }
  }, [onKeyDown]);
  const leave = useCallback(() => {
    activeRef.current = Math.max(0, activeRef.current - 1);
    if (activeRef.current === 0) {
      document.removeEventListener("keydown", onKeyDown, true);
      setSuppressed(false);
    }
  }, [onKeyDown]);
  useEffect(() => () => document.removeEventListener("keydown", onKeyDown, true), [onKeyDown]);
  return {
    tooltipAttr: /* @__PURE__ */ __name((text) => suppressed ? void 0 : text, "tooltipAttr"),
    tooltipTriggerProps: {
      onMouseEnter: enter,
      onMouseLeave: leave,
      onFocus: enter,
      onBlur: leave
    }
  };
}
__name(useDismissableTooltip, "useDismissableTooltip");
export {
  useDismissableTooltip
};
//# sourceMappingURL=useDismissableTooltip.dev.js.map
