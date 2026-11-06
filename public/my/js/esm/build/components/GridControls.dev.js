var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * Replaceable directional controls built with the Moodle Design System Button: secondary, large,
 * icon-only, the same Button as the tile's Delete (minus) button, so its fill, hover, pressed state and
 * keyboard-only focus ring all come from the design system.
 *
 * @module     core_my/components/GridControls
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { Button } from "@moodlehq/design-system";
import { renderIcon } from "./Icon";
const directions = [
  { name: "up", horizontal: 0, vertical: -1 },
  { name: "left", horizontal: -1, vertical: 0 },
  { name: "right", horizontal: 1, vertical: 0 },
  { name: "down", horizontal: 0, vertical: 1 }
];
const GridControls = /* @__PURE__ */ __name(({ mode, labels, icons, onDirection }) => /* @__PURE__ */ jsxDEV(
  "div",
  {
    className: "core-my-grid-controls",
    role: "group",
    "aria-label": mode === "move" ? labels.movecontrols : labels.resizecontrols,
    children: directions.map((direction) => {
      const label = labels[direction.name];
      return /* @__PURE__ */ jsxDEV(
        Button,
        {
          size: "lg",
          variant: "secondary",
          className: `core-my-grid-controls__direction core-my-grid-controls__direction--${direction.name}`,
          "aria-label": label,
          tabIndex: -1,
          startIcon: renderIcon(icons[direction.name]),
          onPointerDown: (event) => {
            event.preventDefault();
            event.stopPropagation();
          },
          onClick: () => onDirection(direction.horizontal, direction.vertical)
        },
        direction.name,
        false,
        {
          fileName: "public/my/js/esm/src/components/GridControls.tsx",
          lineNumber: 45,
          columnNumber: 16
        }
      );
    })
  },
  void 0,
  false,
  {
    fileName: "public/my/js/esm/src/components/GridControls.tsx",
    lineNumber: 38,
    columnNumber: 81
  }
), "GridControls");
var GridControls_default = GridControls;
export {
  GridControls_default as default
};
//# sourceMappingURL=GridControls.dev.js.map
