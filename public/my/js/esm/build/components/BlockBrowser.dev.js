var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
/**
 * The block browser: a dialog for choosing one block to add to the dashboard.
 *
 * A search field over a grid of design-system Choicebox cards, one per block, each with the block's
 * icon, name and a short description. The cards are one native radio group, so they are a single
 * Tab stop and the arrow keys move between them and select. Enter, Insert or a double-click adds
 * the selected block.
 *
 * The design system has no dialog, so this is a native <dialog> laid out like core/modal: title and
 * close button, body, then the footer's secondary action before its primary one.
 *
 * @module     core_my/components/BlockBrowser
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Choicebox, CloseButton } from "@moodlehq/design-system";
const initialsFor = /* @__PURE__ */ __name((title) => title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase(), "initialsFor");
const BlockBrowser = /* @__PURE__ */ __name(({ labels, blocks, discoverUrl, onInsert, onClose }) => {
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const groupRef = useRef(null);
  const openerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [failedIcons, setFailedIcons] = useState(/* @__PURE__ */ new Set());
  const iconHtml = useMemo(() => new Map(blocks.map((block) => [block.name, { __html: block.iconhtml }])), [blocks]);
  const iconFor = /* @__PURE__ */ __name((block) => {
    if (!block.iconhtml || failedIcons.has(block.name)) {
      return /* @__PURE__ */ jsxDEV("i", { className: "core-my-block-browser__initials", children: initialsFor(block.title) }, void 0, false, {
        fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
        lineNumber: 72,
        columnNumber: 20
      });
    }
    return /* @__PURE__ */ jsxDEV(
      "i",
      {
        className: "core-my-block-browser__icon",
        dangerouslySetInnerHTML: iconHtml.get(block.name),
        ref: (element) => {
          const fail = /* @__PURE__ */ __name(() => setFailedIcons((failed) => /* @__PURE__ */ new Set([...failed, block.name])), "fail");
          element?.addEventListener("error", fail, { capture: true, once: true });
          return () => element?.removeEventListener("error", fail, { capture: true });
        }
      },
      void 0,
      false,
      {
        fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
        lineNumber: 74,
        columnNumber: 16
      }
    );
  }, "iconFor");
  useEffect(() => {
    openerRef.current = document.activeElement;
    dialogRef.current?.showModal();
    searchRef.current?.focus();
    return () => {
      if (openerRef.current instanceof HTMLElement && openerRef.current.isConnected) {
        openerRef.current.focus();
      }
    };
  }, []);
  const query = search.trim().toLocaleLowerCase();
  const matching = useMemo(() => blocks.filter((block) => !query || `${block.title} ${block.description}`.toLocaleLowerCase().includes(query)), [blocks, query]);
  const addable = matching.filter((block) => !block.added);
  const current = addable.find((block) => block.name === selected) ?? addable[0] ?? null;
  const insert = /* @__PURE__ */ __name((block) => {
    if (block && !block.added) {
      onInsert(block);
    }
  }, "insert");
  const focusSelected = /* @__PURE__ */ __name(() => {
    const radio = groupRef.current?.querySelector("input:checked") ?? groupRef.current?.querySelector("input");
    radio?.focus();
    return Boolean(radio);
  }, "focusSelected");
  const clearSearch = /* @__PURE__ */ __name(() => {
    setSearch("");
    searchRef.current?.focus();
  }, "clearSearch");
  return /* @__PURE__ */ jsxDEV(
    "dialog",
    {
      ref: dialogRef,
      className: "core-my-block-browser",
      "aria-labelledby": "core-my-block-browser-title",
      onCancel: (event) => {
        event.preventDefault();
        onClose();
      },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-block-browser__header", children: [
          /* @__PURE__ */ jsxDEV("h2", { id: "core-my-block-browser-title", children: labels.addblock }, void 0, false, {
            fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
            lineNumber: 131,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV(CloseButton, { "aria-label": labels.close, title: labels.close, onClick: onClose }, void 0, false, {
            fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
            lineNumber: 132,
            columnNumber: 13
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
          lineNumber: 130,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-block-browser__body", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "core-my-block-browser__search", children: [
            /* @__PURE__ */ jsxDEV("i", { className: "fa fa-magnifying-glass", "aria-hidden": "true" }, void 0, false, {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 136,
              columnNumber: 17
            }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                ref: searchRef,
                type: "search",
                className: "form-control",
                placeholder: labels.browsersearch,
                "aria-label": labels.browsersearch,
                autoComplete: "off",
                value: search,
                onChange: (event) => setSearch(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    insert(current);
                  } else if (event.key === "ArrowDown" && focusSelected()) {
                    event.preventDefault();
                  }
                }
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                lineNumber: 137,
                columnNumber: 17
              }
            ),
            search && /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: "core-my-block-browser__clear",
                "aria-label": labels.clearsearch,
                title: labels.clearsearch,
                onClick: clearSearch,
                children: /* @__PURE__ */ jsxDEV("i", { className: "fa fa-xmark", "aria-hidden": "true" }, void 0, false, {
                  fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                  lineNumber: 161,
                  columnNumber: 18
                })
              },
              void 0,
              false,
              {
                fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                lineNumber: 155,
                columnNumber: 28
              }
            )
          ] }, void 0, true, {
            fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
            lineNumber: 135,
            columnNumber: 13
          }),
          addable.length ? /* @__PURE__ */ jsxDEV(
            "div",
            {
              ref: groupRef,
              className: "core-my-block-browser__grid",
              role: "radiogroup",
              "aria-label": labels.browserblocks,
              children: addable.map((block) => /* @__PURE__ */ jsxDEV(
                Choicebox,
                {
                  name: "core-my-block-browser-choice",
                  value: block.name,
                  label: block.title,
                  supportingText: block.description || labels.browserfallbackdescription,
                  icon: iconFor(block),
                  checked: current?.name === block.name,
                  onChange: () => setSelected(block.name),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      insert(block);
                    }
                  },
                  onDoubleClick: () => insert(block)
                },
                block.name,
                false,
                {
                  fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                  lineNumber: 169,
                  columnNumber: 39
                }
              ))
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 163,
              columnNumber: 31
            }
          ) : /* @__PURE__ */ jsxDEV("div", { className: "core-my-block-browser__none", children: [
            /* @__PURE__ */ jsxDEV("p", { children: query ? labels.browsernomatch.replace("{$a}", search.trim()) : labels.browserallpresent }, void 0, false, {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 187,
              columnNumber: 17
            }),
            query && /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: labels.clearsearch, onClick: clearSearch }, void 0, false, {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 188,
              columnNumber: 27
            })
          ] }, void 0, true, {
            fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
            lineNumber: 186,
            columnNumber: 22
          })
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
          lineNumber: 134,
          columnNumber: 9
        }),
        /* @__PURE__ */ jsxDEV("div", { className: "core-my-block-browser__footer", children: [
          discoverUrl && /* @__PURE__ */ jsxDEV(
            "a",
            {
              className: "core-my-block-browser__discover",
              href: discoverUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              children: [
                labels.browserdiscover,
                /* @__PURE__ */ jsxDEV("i", { className: "fa fa-arrow-up-right-from-square", "aria-hidden": "true" }, void 0, false, {
                  fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                  lineNumber: 199,
                  columnNumber: 17
                }),
                /* @__PURE__ */ jsxDEV("span", { className: "visually-hidden", children: labels.opensinnewwindow }, void 0, false, {
                  fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
                  lineNumber: 200,
                  columnNumber: 17
                })
              ]
            },
            void 0,
            true,
            {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 192,
              columnNumber: 29
            }
          ),
          /* @__PURE__ */ jsxDEV(Button, { variant: "secondary", label: labels.cancel, onClick: onClose }, void 0, false, {
            fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
            lineNumber: 202,
            columnNumber: 13
          }),
          /* @__PURE__ */ jsxDEV(
            Button,
            {
              variant: "primary",
              label: labels.browserinsert,
              disabled: !current,
              onClick: () => insert(current)
            },
            void 0,
            false,
            {
              fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
              lineNumber: 203,
              columnNumber: 13
            }
          )
        ] }, void 0, true, {
          fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
          lineNumber: 191,
          columnNumber: 9
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "public/my/js/esm/src/components/BlockBrowser.tsx",
      lineNumber: 121,
      columnNumber: 12
    }
  );
}, "BlockBrowser");
var BlockBrowser_default = BlockBrowser;
export {
  BlockBrowser_default as default,
  initialsFor
};
//# sourceMappingURL=BlockBrowser.dev.js.map
