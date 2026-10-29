var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
/**
 * The standard "Add a block" modal, opened for the dashboard grid.
 *
 * The grid does not draw an add-block palette of its own: it opens the very same modal every other
 * Moodle page uses (core/modal_cancel showing the core/add_block_body template, the one
 * core_block/add_modal builds), so adding a block looks and behaves the same here as anywhere else.
 * Only what happens on choosing a block differs. core_block/add_modal follows the chosen item's
 * link to ?bui_addblock=... and reloads the page; the grid instead adds the block over its own web
 * service and places it where the user asked for it (an empty cell, the start or the end of the
 * grid) without a reload. Block types which show their configuration form when added
 * (block_edit_form::display_form_when_adding(), e.g. block_html) still get that form, through
 * core_form/modalform exactly as core_block/add_modal opens it, and are placed once it is saved.
 *
 * The items keep their links to ?bui_addblock=... as a fallback, so even if the handler here never
 * ran the block would still be added the classic way.
 *
 * @module     core_my/addBlockModal
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { requireManyAsync } from "@moodle/lms/core/amd";
import config from "@moodle/lms/core/config";
import { getString } from "@moodle/lms/core/stringUtils";
const DASHBOARD_REGION = "content";
const addBlockFallbackUrl = /* @__PURE__ */ __name(() => {
  const params = new URLSearchParams({
    "bui_addblock": "",
    "sesskey": config.sesskey,
    "bui_blockregion": DASHBOARD_REGION
  });
  return `?${params.toString()}`;
}, "addBlockFallbackUrl");
const openAddBlockForm = /* @__PURE__ */ __name(async (block, options) => {
  const [ModalForm] = await requireManyAsync(["core_form/modalform"]);
  const form = new ModalForm({
    modalConfig: {
      title: getString("addblock", "core_block", block.title)
    },
    args: {
      blockname: block.name,
      pagehash: options.pagehash ?? "",
      blockregion: DASHBOARD_REGION
    },
    formClass: block.blockform ?? "",
    returnFocus: options.returnElement ?? void 0
  });
  form.addEventListener(form.events.FORM_SUBMITTED, () => options.onFormSubmitted(block));
  form.show();
}, "openAddBlockForm");
const openAddBlockModal = /* @__PURE__ */ __name(async (options) => {
  const [CancelModal, Templates] = await requireManyAsync(["core/modal_cancel", "core/templates"]);
  const modal = await CancelModal.create({
    title: options.title,
    returnElement: options.returnElement ?? void 0
  });
  modal.setBody(Templates.render("core/add_block_body", {
    blocks: options.blocks.map((block) => ({
      name: block.name,
      title: block.title,
      blockform: block.blockform ?? null
    })),
    url: addBlockFallbackUrl(),
    blockregion: DASHBOARD_REGION,
    pagehash: options.pagehash ?? ""
  }));
  modal.getRoot().get(0)?.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-blockname]");
    if (!link) {
      return;
    }
    event.preventDefault();
    const block = options.blocks.find((candidate) => candidate.name === link.dataset.blockname);
    modal.destroy();
    if (!block) {
      return;
    }
    if (block.blockform && options.pagehash) {
      void openAddBlockForm(block, options);
    } else {
      options.onSelect(block);
    }
  });
  modal.show();
}, "openAddBlockModal");
export {
  addBlockFallbackUrl,
  openAddBlockModal
};
//# sourceMappingURL=addBlockModal.dev.js.map
