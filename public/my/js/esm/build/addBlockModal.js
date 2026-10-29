import{requireManyAsync as i}from"@moodle/lms/core/amd";import c from"@moodle/lms/core/config";import{getString as m}from"@moodle/lms/core/stringUtils";/**
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
 */const a="content",g=()=>`?${new URLSearchParams({bui_addblock:"",sesskey:c.sesskey,bui_blockregion:a}).toString()}`,k=async(e,n)=>{const[l]=await i(["core_form/modalform"]),o=new l({modalConfig:{title:m("addblock","core_block",e.title)},args:{blockname:e.name,pagehash:n.pagehash??"",blockregion:a},formClass:e.blockform??"",returnFocus:n.returnElement??void 0});o.addEventListener(o.events.FORM_SUBMITTED,()=>n.onFormSubmitted(e)),o.show()},M=async e=>{const[n,l]=await i(["core/modal_cancel","core/templates"]),o=await n.create({title:e.title,returnElement:e.returnElement??void 0});o.setBody(l.render("core/add_block_body",{blocks:e.blocks.map(t=>({name:t.name,title:t.title,blockform:t.blockform??null})),url:g(),blockregion:a,pagehash:e.pagehash??""})),o.getRoot().get(0)?.addEventListener("click",t=>{const s=t.target.closest("a[data-blockname]");if(!s)return;t.preventDefault();const r=e.blocks.find(d=>d.name===s.dataset.blockname);o.destroy(),r&&(r.blockform&&e.pagehash?k(r,e):e.onSelect(r))}),o.show()};export{g as addBlockFallbackUrl,M as openAddBlockModal};
