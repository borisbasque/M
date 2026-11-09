var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The add blocks modal, listing the blocks that can be added as a grid of design system Choiceboxes.
 *
 * Each block is a Choicebox with its icon, name and what it does, all in one radio group: picking one
 * and then Add block (or Enter) adds it, to the space that opened the modal or the first free space,
 * and closes the modal. A dashboard has one block of each type, so the types already on it are listed
 * too, last, ticked and disabled, so nobody is left looking for them. Search narrows the list by name
 * and description. Escape, the close button or a click outside closes the modal.
 *
 * @module     core_my/components/AddBlocksDialog
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, Choicebox, CloseButton, Link, SearchInput } from "@moodlehq/design-system";
import { renderIcon } from "./Icon";
const MARKETPLACE_URL = "https://moodle.org/plugins/?q=type:block";
const blockIcon = /* @__PURE__ */ __name((block) => {
  if (block.icon) {
    return renderIcon(block.icon);
  }
  const initials = block.title.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase();
  return /* @__PURE__ */ jsxDEV("i", { className: "core-my-add-blocks__initials", "aria-hidden": "true", children: initials }, void 0, false, {
    fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
    lineNumber: 42,
    columnNumber: 12
  });
}, "blockIcon");
const AddBlocksDialog = /* @__PURE__ */ __name(({ blocks, labels, icons, onAdd, onClose }) => {
  const dialogRef = useRef(null);
  const headingId = useId();
  const groupName = useId();
  const addedId = useId();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(null);
  useEffect(() => {
    dialogRef.current?.showModal();
    dialogRef.current?.focus();
  }, []);
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    const matching = words ? blocks.filter((block) => `${block.title} ${block.description ?? ""}`.toLowerCase().includes(words)) : blocks;
    return [...matching.filter((block) => !block.added), ...matching.filter((block) => block.added)];
  }, [blocks, query]);
  const choice = shown.find((block) => !block.added && block.name === chosen) ?? null;
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
      children: /* @__PURE__ */ jsxDEV(
        "form",
        {
          className: "core-my-add-blocks__panel",
          onSubmit: (event) => {
            event.preventDefault();
            if (choice) {
              onAdd(choice);
            }
          },
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__header", children: [
              /* @__PURE__ */ jsxDEV("h2", { id: headingId, className: "core-my-add-blocks__title", children: labels.addblocks }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 104,
                columnNumber: 17
              }),
              /* @__PURE__ */ jsxDEV(CloseButton, { "aria-label": labels.close, onClick: onClose }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 105,
                columnNumber: 17
              })
            ] }, void 0, true, {
              fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
              lineNumber: 103,
              columnNumber: 13
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__content", children: [
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
                  lineNumber: 108,
                  columnNumber: 17
                }
              ),
              shown.length ? /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__list", role: "radiogroup", "aria-labelledby": headingId, children: shown.map((block) => block.added ? /* @__PURE__ */ jsxDEV(
                Choicebox,
                {
                  className: "core-my-add-blocks__block",
                  "data-blockname": block.name,
                  label: block.title,
                  supportingText: block.description ?? void 0,
                  icon: blockIcon(block),
                  checked: true,
                  readOnly: true,
                  disabled: true,
                  "aria-describedby": addedId
                },
                block.name,
                false,
                {
                  fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                  lineNumber: 120,
                  columnNumber: 31
                }
              ) : /* @__PURE__ */ jsxDEV(
                Choicebox,
                {
                  className: "core-my-add-blocks__block",
                  "data-blockname": block.name,
                  name: groupName,
                  value: block.name,
                  label: block.title,
                  supportingText: block.description ?? void 0,
                  icon: blockIcon(block),
                  checked: chosen === block.name,
                  onChange: () => setChosen(block.name)
                },
                block.name,
                false,
                {
                  fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                  lineNumber: 132,
                  columnNumber: 31
                }
              )) }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 118,
                columnNumber: 23
              }) : /* @__PURE__ */ jsxDEV("p", { className: "core-my-add-blocks__empty", role: "status", children: labels.noblocksfound }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 145,
                columnNumber: 23
              }),
              /* @__PURE__ */ jsxDEV("span", { id: addedId, className: "visually-hidden", children: labels.onpage }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 146,
                columnNumber: 17
              })
            ] }, void 0, true, {
              fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
              lineNumber: 107,
              columnNumber: 13
            }),
            /* @__PURE__ */ jsxDEV("div", { className: "core-my-add-blocks__footer", children: [
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
                  lineNumber: 149,
                  columnNumber: 17
                }
              ),
              /* @__PURE__ */ jsxDEV(Button, { type: "submit", variant: "primary", size: "lg", label: labels.addblockshort, disabled: !choice }, void 0, false, {
                fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
                lineNumber: 157,
                columnNumber: 17
              })
            ] }, void 0, true, {
              fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
              lineNumber: 148,
              columnNumber: 13
            })
          ]
        },
        void 0,
        true,
        {
          fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
          lineNumber: 94,
          columnNumber: 9
        }
      )
    },
    void 0,
    false,
    {
      fileName: "public/my/js/esm/src/components/AddBlocksDialog.tsx",
      lineNumber: 81,
      columnNumber: 12
    }
  );
}, "AddBlocksDialog");
var AddBlocksDialog_default = AddBlocksDialog;
export {
  AddBlocksDialog_default as default
};
//# sourceMappingURL=AddBlocksDialog.dev.js.map
