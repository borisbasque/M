var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * Shared keyboard/pointer behaviour for a pop-up menu with a trigger button.
 *
 * Encapsulates the open state, the container/trigger/menu refs, focusing the
 * first item on open, closing on outside click or Escape (Escape returns focus
 * to the trigger), and roving focus across items via arrow/Home/End keys with
 * Tab closing the menu. Used by both the toolbar Dropdown (menuitemradio items)
 * and the card overflow menu (menuitem items).
 *
 * @module     block_myoverview/hooks/useDismissableMenu
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useRef, useState } from "react";
function useDismissableMenu(itemRole) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemSelector = `[role="${itemRole}"]`;
  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.querySelector(itemSelector)?.focus();
    }
  }, [open, itemSelector]);
  useEffect(() => {
    if (!open) {
      return void 0;
    }
    const onDocClick = /* @__PURE__ */ __name((e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }, "onDocClick");
    const onKey = /* @__PURE__ */ __name((e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }, "onKey");
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const handleMenuKeyDown = /* @__PURE__ */ __name((e) => {
    const items = Array.from(menuRef.current?.querySelectorAll(itemSelector) ?? []);
    const idx = items.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }, "handleMenuKeyDown");
  return { open, setOpen, containerRef, triggerRef, menuRef, handleMenuKeyDown };
}
__name(useDismissableMenu, "useDismissableMenu");
export {
  useDismissableMenu
};
//# sourceMappingURL=useDismissableMenu.dev.js.map
