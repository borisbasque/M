var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
/**
 * The add blocks modal, listing the blocks that can be added as a grid of cards.
 *
 * Each block is a button with its icon, name and what it does. Clicking one adds it (to the space that
 * opened the modal, or the first free space) and closes the modal. Blocks that allow only one and are
 * already on the dashboard are listed too, last, with a tick and disabled, so nobody is left looking
 * for them. Search narrows the list by name and description. Escape, the close button or a click outside
 * closes the modal.
 *
 * @module     core_my/components/AddBlocksDialog
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CloseButton, Link, SearchInput } from "@moodlehq/design-system";
import Icon, { renderIcon } from "./Icon";
const MARKETPLACE_URL = "https://moodle.org/plugins/?q=type:block";
const PaletteItem = /* @__PURE__ */ __name(({ block, labels, icons, onAdd }) => {
  const initials = block.title.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase();
  const content = /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("span", { className: "core-my-palette-item__icon", "aria-hidden": "true", children: block.icon ? /* @__PURE__ */ jsxDEV(Icon, { markup: block.icon }, void 0, false, {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 43,
      columnNumber: 27
    }) : initials }, void 0, false, {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 42,
      columnNumber: 9
    }),
    /* @__PURE__ */ jsxDEV("span", { className: "core-my-palette-item__text", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "core-my-palette-item__name", children: block.title }, void 0, false, {
        fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
        lineNumber: 46,
        columnNumber: 13
      }),
      block.description && /* @__PURE__ */ jsxDEV("span", { className: "core-my-palette-item__description", children: block.description }, void 0, false, {
        fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
        lineNumber: 47,
        columnNumber: 35
      })
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 45,
      columnNumber: 9
    })
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
    lineNumber: 41,
    columnNumber: 21
  });
  return /* @__PURE__ */ jsxDEV("li", { "data-blockname": block.name, children: block.added ? /* @__PURE__ */ jsxDEV("div", { className: "core-my-palette-item core-my-palette-item--added", children: [
    content,
    /* @__PURE__ */ jsxDEV("span", { className: "core-my-palette-item__added", children: [
      /* @__PURE__ */ jsxDEV(Icon, { markup: icons.added }, void 0, false, {
        fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
        lineNumber: 55,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: labels.onpage }, void 0, false, {
        fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
        lineNumber: 56,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 54,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
    lineNumber: 52,
    columnNumber: 15
  }) : /* @__PURE__ */ jsxDEV("button", { type: "button", className: "core-my-palette-item", onClick: () => onAdd(block), children: content }, void 0, false, {
    fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
    lineNumber: 59,
    columnNumber: 15
  }) }, void 0, false, {
    fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
    lineNumber: 50,
    columnNumber: 12
  });
}, "PaletteItem");
const AddBlocksDialog = /* @__PURE__ */ __name(({ blocks, labels, icons, onAdd, onClose }) => {
  const dialogRef = useRef(null);
  const headingId = useId();
  const [query, setQuery] = useState("");
  useEffect(() => {
    dialogRef.current?.showModal();
    dialogRef.current?.focus();
  }, []);
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    const matching = words ? blocks.filter((block) => `${block.title} ${block.description ?? ""}`.toLowerCase().includes(words)) : blocks;
    return [...matching.filter((block) => !block.added), ...matching.filter((block) => block.added)];
  }, [blocks, query]);
  return /* @__PURE__ */ jsxDEV(
    "dialog",
    {
      ref: dialogRef,
      className: "core-my-add-blocks",
      "aria-labelledby": headingId,
      tabIndex: -1,
      onCancel: onClose,
      onClick: (event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      },
      children: /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__panel", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__header", children: [
          /* @__PURE__ */ jsxDEV("h2", { id: headingId, className: "core-my-add-blocks__title", children: labels.addblocks }, void 0, false, {
            fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
            lineNumber: 108,
            columnNumber: 17
          }),
          /* @__PURE__ */ jsxDEV(CloseButton, { "aria-label": labels.close, onClick: onClose }, void 0, false, {
            fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
            lineNumber: 109,
            columnNumber: 17
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
          lineNumber: 107,
          columnNumber: 13
        }),
        /* @__PURE__ */ jsxDEV(
          SearchInput,
          {
            className: "core-my-add-blocks__search",
            label: labels.searchblocks,
            hideLabel: true,
            clearLabel: labels.clearsearch,
            placeholder: labels.searchblocks,
            value: query,
            onChange: (event) => setQuery(event.target.value)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
            lineNumber: 111,
            columnNumber: 13
          }
        ),
        shown.length ? /* @__PURE__ */ jsxDEV("ul", { className: "core-my-add-blocks__list", children: shown.map((block) => /* @__PURE__ */ jsxDEV(
          PaletteItem,
          {
            block,
            labels,
            icons,
            onAdd
          },
          block.name,
          false,
          {
            fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
            lineNumber: 122,
            columnNumber: 41
          }
        )) }, void 0, false, {
          fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
          lineNumber: 121,
          columnNumber: 19
        }) : /* @__PURE__ */ jsxDEV("p", { className: "core-my-add-blocks__empty", role: "status", children: labels.noblocksfound }, void 0, false, {
          fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
          lineNumber: 130,
          columnNumber: 19
        }),
        /* @__PURE__ */ jsxDEV(
          Link,
          {
            className: "core-my-add-blocks__marketplace",
            href: MARKETPLACE_URL,
            target: "_blank",
            rel: "noopener",
            label: labels.marketplace,
            endIcon: renderIcon(icons.external)
          },
          void 0,
          false,
          {
            fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
            lineNumber: 131,
            columnNumber: 13
          }
        )
      ] }, void 0, true, {
        fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
        lineNumber: 106,
        columnNumber: 9
      })
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 93,
      columnNumber: 12
    }
  );
}, "AddBlocksDialog");
var AddBlocksDialog_default = AddBlocksDialog;
export {
  AddBlocksDialog_default as default
};
//# sourceMappingURL=AddBlocksDialog.dev.js.map
