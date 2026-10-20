<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace core_my\local;

use block_manager;
use core_block\grid_size;
use core_block\local\directory_details;
use context_system;
use context_user;
use moodle_url;

/**
 * Server-side support for the responsive dashboard grid.
 *
 * @package    core_my
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class dashboard {
    /** Canonical number of columns used for persisted layouts: the Block API's grid width. */
    public const MAX_COLUMNS = grid_size::MAX_COLUMNS;

    /** Minimum size of a block that declares none, or declares an unusable one. */
    private const DEFAULT_MINIMUM = ['columns' => 1, 'rows' => 2];

    /** Default grid row span for legacy and newly-added blocks, until they are sized to their content. */
    public const DEFAULT_ROWS = 3;

    /** The tallest, in rows, that a block sized to its content opens at; taller content scrolls in the tile. */
    public const AUTO_ROWS_CAP = 8;

    /** Default grid row span for the first legacy block in each stack (two rows taller than the rest). */
    public const DEFAULT_ROWS_FIRST = 5;

    /** First column (zero-based) of the legacy centre-column stack, leaving an empty column to its left. */
    public const CONTENT_COLUMN = 1;

    /** Column span of the legacy centre-column stack, and of newly-added blocks. */
    public const CONTENT_COLUMNS = 3;

    /** First column (zero-based) of the legacy block-drawer stack, directly after the centre stack. */
    public const DRAWER_COLUMN = 4;

    /** Column span of the legacy block-drawer stack. */
    public const DRAWER_COLUMNS = 1;

    /** Legacy regions which may still be attached to dashboard blocks. */
    private const REGIONS = ['content', 'side-pre', 'side-post'];

    /**
     * Legacy block editing-control classes still offered from the dashboard's block actions menu.
     *
     * Move and hide/show are superseded by the grid's own controls, and delete lives in the
     * tile's discrete delete button instead of being duplicated inside the menu as well.
     * Assign roles is dropped too: role assignment on a single user's own private block instance
     * is not a meaningful action on this personal, per-user surface. Configure ('editing_edit') is
     * kept - blocks like block_html only have a title/content to set through it - but its own form
     * (@see \block_edit_form) hides the where-this-block-appears/region/weight fields when
     * rendered here, since {@see self::get_layout()} owns page position for the dashboard instead.
     * Permissions review stays too, since who can do what with a block instance is still
     * meaningful to check and change on the dashboard.
     */
    private const MENU_ACTION_ALLOWED = ['edit', 'permissions', 'checkroles'];

    /**
     * Set up Moodle's block manager for a user or site-default dashboard.
     *
     * @param bool $sitedefault Whether to load the site-default dashboard.
     * @param bool $includeinvisible Whether invisible blocks should be loaded.
     * @return array The page record and context.
     */
    public static function initialise_page(bool $sitedefault, bool $includeinvisible = false): array {
        global $CFG, $PAGE, $USER;

        require_once($CFG->dirroot . '/my/lib.php');

        if ($sitedefault) {
            $context = context_system::instance();
            require_capability('moodle/my:configsyspages', $context);
            $mypage = my_get_page(null, MY_PAGE_PRIVATE);
            $PAGE->set_blocks_editing_capability('moodle/my:configsyspages');
        } else {
            $context = context_user::instance($USER->id);
            $mypage = my_get_page($USER->id, MY_PAGE_PRIVATE);
            $PAGE->set_blocks_editing_capability('moodle/my:manageblocks');
            if ($mypage && !$mypage->userid && !empty($USER->editing) && self::can_edit(false, $context)) {
                $mypage = my_copy_page($USER->id, MY_PAGE_PRIVATE);
            }
        }

        if (!$mypage) {
            throw new \moodle_exception('mymoodlesetup');
        }

        $PAGE->set_context($context);
        $PAGE->set_url($sitedefault ? '/my/indexsys.php' : '/my/index.php');
        $PAGE->set_pagelayout('mydashboard');
        $PAGE->set_pagetype('my-index');
        foreach (self::REGIONS as $region) {
            $PAGE->blocks->add_region($region);
        }
        $PAGE->set_subpage($mypage->id);
        $PAGE->blocks->load_blocks($includeinvisible);
        $PAGE->blocks->create_all_block_instances();

        return [$mypage, $context];
    }

    /**
     * Return the current dashboard payload for the React application: the layout, and every block's
     * title, size rules and actions, but none of their content.
     *
     * Rendering blocks is the expensive part of a dashboard (each runs its own queries), so it is
     * left to get_block(), one block per request: the layout arrives quickly, each block then loads
     * on its own, and a slow block never holds up the others. That makes this cheap enough not to
     * cache, so nothing large is kept in the viewer's session.
     *
     * @param bool $sitedefault Whether to load the site default.
     * @return array
     */
    public static function get(bool $sitedefault): array {
        return self::get_uncached($sitedefault);
    }

    /**
     * Build the dashboard payload, unconditionally, without consulting or populating the cache.
     *
     * @param bool $sitedefault Whether to load the site default.
     * @return array
     */
    private static function get_uncached(bool $sitedefault): array {
        global $OUTPUT, $PAGE, $USER;

        $context = $sitedefault ? context_system::instance() : context_user::instance($USER->id);
        $canedit = self::can_edit($sitedefault, $context);
        $editing = $canedit && !empty($USER->editing);
        $othercontext = $sitedefault ? context_user::instance($USER->id) : context_system::instance();
        $caneditotherscope = self::can_edit(!$sitedefault, $othercontext);
        [$mypage] = self::initialise_page($sitedefault, $editing);

        // Nothing is rendered here (see get()), so no JavaScript is collected either: each block's
        // comes with its content from get_block().

        $blocks = [];
        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
                $blocks[] = self::export_block_metadata($instance, $region);
            }
        }

        $layout = self::get_layout($mypage->id, $context->id, $instances);

        return [
            'blocks' => $blocks,
            'layout' => $layout,
            'availableblocks' => $editing ? self::get_available_blocks() : [],
            'grid' => [
                'minsize' => self::get_minimum_size(),
                'autorowscap' => self::AUTO_ROWS_CAP,
            ],
            // Whether this is the viewer's own stored dashboard, as opposed to the site default
            // shown to someone who has not customised theirs: only then may measured heights be saved.
            'ownlayout' => !$sitedefault && (int) $mypage->userid === (int) $USER->id,
            'revision' => self::get_revision($sitedefault),
            'discoverurl' => directory_details::get_discover_url(),
            'canedit' => $canedit,
            'editing' => $editing,
            'sitedefault' => $sitedefault,
            'caneditotherscope' => $caneditotherscope,
            'urls' => [
                'ownpage' => (new moodle_url('/my/index.php'))->out(false),
                'sitedefault' => (new moodle_url('/my/indexsys.php'))->out(false),
            ],
            'javascript' => '',
            'labels' => [
                'addblock' => get_string('addblock'),
                'addblocktop' => get_string('addblocktop', 'my'),
                'addblockbottom' => get_string('addblockbottom', 'my'),
                'close' => get_string('closebuttontitle'),
                'confirm' => get_string('confirm'),
                'confirmremove' => get_string('confirmremoveblock', 'my'),
                'confirmreset' => get_string('confirmresetdashboard', 'my'),
                'cancel' => get_string('dashboardcancel', 'my'),
                'done' => get_string('dashboarddone', 'my'),
                'emptycell' => get_string('emptygridcell', 'my'),
                'gridcell' => get_string('gridcellposition', 'my'),
                'loading' => get_string('loading'),
                'move' => get_string('moveblock', 'block'),
                'movehere' => get_string('dashboardmovehere', 'my'),
                'moveinstructions' => get_string('dashboardmovehandleinstructions', 'my'),
                'placemove' => get_string('dashboardplacemove', 'my'),
                'placeresize' => get_string('dashboardplaceresize', 'my'),
                'remove' => get_string('deleteblock', 'block'),
                'removeheading' => get_string('removeblockheading', 'my'),
                'reset' => get_string('resetpage', 'my'),
                'resetheading' => get_string('resetdashboardheading', 'my'),
                'resize' => get_string('resizeblock', 'my'),
                'resizehere' => get_string('dashboardresizehere', 'my'),
                'resizeinstructions' => get_string('dashboardresizehandleinstructions', 'my'),
                'retry' => get_string('retry'),
                'savefailed' => get_string('dashboardsavefailed', 'my'),
                'saveoffline' => get_string('dashboardsaveoffline', 'my'),
                'saveretrying' => get_string('dashboardsaveretrying', 'my'),
                'scopeown' => get_string('dashboardscopeown', 'my'),
                'scopesitedefault' => get_string('dashboardscopesitedefault', 'my'),
                'switchtoown' => get_string('dashboardswitchtoown', 'my'),
                'switchtositedefault' => get_string('dashboardswitchtositedefault', 'my'),
                'tile' => get_string('dashboardtile', 'my'),
                'undo' => get_string('dashboardundo', 'my'),
                'blockactions' => get_string('dashboardblockactions', 'my'),
                'blockfailed' => get_string('dashboardblockfailed', 'my'),
                'addblockhere' => get_string('dashboardaddblockhere', 'my'),
                'dashboardblocks' => get_string('dashboardblocks', 'my'),
                'emptyregion' => get_string('dashboardemptyregion', 'my'),
                'browserallpresent' => get_string('browserallpresent', 'my'),
                'browserblocks' => get_string('browserblocks', 'my'),
                'browserdiscover' => get_string('browserdiscover', 'my'),
                'browserfallbackdescription' => get_string('browserfallbackdescription', 'my'),
                'browserinsert' => get_string('browserinsert', 'my'),
                'browsernomatch' => get_string('browsernomatch', 'my'),
                'browsersearch' => get_string('browsersearch', 'my'),
                'clearsearch' => get_string('clearsearch'),
                'empty' => get_string('dashboardempty', 'my'),
                'opensinnewwindow' => get_string('opensinnewwindow'),
                'restoredefault' => get_string('dashboardrestoredefault', 'my'),
            ],
        ];
    }

    /**
     * Export one rendered block for the React client.
     *
     * @param \block_contents $content The block's rendered content.
     * @param \block_base $instance The block instance.
     * @param string $region The legacy region the block was rendered in.
     * @return array
     */
    private static function export_block(\block_contents $content, \block_base $instance, string $region): array {
        return [
            'id' => (int) $content->blockinstanceid,
            'name' => $instance->instance->blockname,
            'title' => (string) $content->title,
            'content' => (string) $content->content,
            'footer' => (string) $content->footer,
            'region' => $region,
            'weight' => (int) $instance->instance->weight,
            'actions' => self::get_menu_actions($content->controls, $instance->instance->blockname),
            'asynccontent' => $instance->has_async_content(),
            'minsize' => self::get_minimum_size($instance),
            'preferredrows' => self::get_preferred_size($instance)['rows'],
            'maxrows' => self::get_maximum_rows($instance),
            'loaded' => true,
        ];
    }

    /**
     * Describe a block for the dashboard without rendering it: everything but its content.
     *
     * @param \block_base $instance The block instance.
     * @param string $region The legacy region the block is in.
     * @return array As export_block(), with empty content and loaded false.
     */
    private static function export_block_metadata(\block_base $instance, string $region): array {
        global $PAGE;

        $controls = $PAGE->user_is_editing() && $instance->instance_can_be_edited()
            ? $PAGE->blocks->edit_controls($instance) : [];
        return [
            'id' => (int) $instance->instance->id,
            'name' => $instance->instance->blockname,
            // As block_base::get_content_for_output() does: a block hiding its header has no title.
            'title' => $instance->hide_header() ? '' : (string) $instance->title,
            'content' => '',
            'footer' => '',
            'region' => $region,
            'weight' => (int) $instance->instance->weight,
            'actions' => self::get_menu_actions($controls, $instance->instance->blockname),
            'asynccontent' => $instance->has_async_content(),
            'minsize' => self::get_minimum_size($instance),
            'preferredrows' => self::get_preferred_size($instance)['rows'],
            'maxrows' => self::get_maximum_rows($instance),
            'loaded' => false,
        ];
    }

    /**
     * Render every block on the current user's own dashboard at once, as the mobile app's
     * core_my_get_dashboard_blocks returns them.
     *
     * The web dashboard loads each block on its own instead (see get_block()); the app asks for them
     * all in one request.
     *
     * @return array Rendered blocks (see export_block()), leaving out any with nothing to show.
     */
    public static function get_rendered_blocks(): array {
        global $OUTPUT, $PAGE;

        self::initialise_page(false);
        $OUTPUT->header();
        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
            }
        }
        $blocks = [];
        foreach ($PAGE->blocks->get_content_for_all_regions($OUTPUT) as $region => $contents) {
            foreach ($contents as $content) {
                if (!empty($content->blockinstanceid) && isset($instances[$content->blockinstanceid])) {
                    $blocks[] = self::export_block($content, $instances[$content->blockinstanceid], $region);
                }
            }
        }
        return $blocks;
    }

    /**
     * The dashboard, exactly as core_my_get_dashboard returns it, for sending with the page.
     *
     * The first view of the dashboard then needs no separate request for its layout, which on a
     * slow connection is a visible wait before any block can start loading. This is a reviewed
     * exception to React components getting their data through web services (MDL-87936): it is
     * built by the same function, with the same permission checks, and cleaned against the same
     * return structure. Later reloads still use the web service.
     *
     * It is built on a page of its own, so the page being output is left exactly as it was.
     *
     * @param bool $sitedefault Whether to load the site default.
     * @return array|null The payload, or null if it could not be built (the client then asks for it).
     */
    public static function get_initial_data(bool $sitedefault): ?array {
        global $OUTPUT, $PAGE;

        // Setting up a page also replaces the global renderer with its own, so keep both.
        $realpage = $PAGE;
        $realoutput = $OUTPUT;
        $PAGE = new \moodle_page();
        try {
            return \core_external\external_api::clean_returnvalue(
                \core_my\external\get_dashboard::execute_returns(),
                self::get($sitedefault),
            );
        } catch (\Throwable $error) {
            debugging('The dashboard could not be sent with the page: ' . $error->getMessage(), DEBUG_DEVELOPER);
            return null;
        } finally {
            $PAGE = $realpage;
            $OUTPUT = $realoutput;
        }
    }

    /**
     * Render one block on the current user's dashboard, with the JavaScript it needs.
     *
     * Only a block on the dashboard being viewed can be rendered, and only for someone who may see
     * that dashboard: the page is set up exactly as for the whole dashboard (see initialise_page()).
     *
     * @param bool $sitedefault Whether the block is on the site default.
     * @param int $blockid The block instance id.
     * @return array The block (or null when it has nothing to show the viewer) and its JavaScript.
     * @throws \moodle_exception blockdoesnotexist when the block is not on this dashboard.
     */
    public static function get_block(bool $sitedefault, int $blockid): array {
        global $OUTPUT, $PAGE, $USER;

        $context = $sitedefault ? context_system::instance() : context_user::instance($USER->id);
        $editing = self::can_edit($sitedefault, $context) && !empty($USER->editing);
        self::initialise_page($sitedefault, $editing);
        $OUTPUT->header();
        $PAGE->start_collecting_javascript_requirements();

        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                if ((int) $instance->instance->id !== $blockid) {
                    continue;
                }
                // The page header may already have rendered the block, registering its JavaScript
                // before collecting started, and blocks keep their rendered content. Render this one
                // again so its JavaScript is collected - only this one, so no other block's is.
                $instance->refresh_content();
                $content = $instance->get_content_for_output($OUTPUT);
                return [
                    'block' => $content ? self::export_block($content, $instance, $region) : null,
                    'javascript' => $PAGE->requires->get_end_code(),
                ];
            }
        }
        throw new \moodle_exception('blockdoesnotexist', 'error');
    }

    /**
     * List the blocks the current user can add to the page set up in $PAGE, for the block browser.
     *
     * Each comes with its own description and icon where it declares them (see
     * block_base::get_description() and get_icon()). Blocks that allow only one instance and are
     * already on the dashboard are listed too, flagged as added, so the browser can say why they
     * are missing rather than leave people looking for them.
     *
     * @return array
     */
    private static function get_available_blocks(): array {
        global $OUTPUT, $PAGE;

        $addable = $PAGE->blocks->get_addable_blocks();
        $available = [];
        foreach (blocks_get_record() as $record) {
            $added = !isset($addable[$record->name]);
            if ($added && !self::is_added_single_instance($record)) {
                continue;
            }
            $block = block_instance($record->name);
            if (!$block) {
                continue;
            }
            $available[] = [
                'name' => $record->name,
                'title' => get_string('pluginname', 'block_' . $record->name),
                'description' => self::get_block_description($block),
                'iconhtml' => self::get_block_icon_html($block),
                'added' => $added,
            ];
        }
        \core_collator::asort_array_of_arrays_by_key($available, 'title');
        return array_values($available);
    }

    /**
     * What a block does, for the block browser: its own description, or else its summary from the
     * plugins directory, or else nothing (the browser then shows a generic line).
     *
     * @param \block_base $block The block.
     * @return string Plain text, or an empty string.
     */
    private static function get_block_description(\block_base $block): string {
        return $block->get_description() ?? directory_details::get_summary($block->name()) ?? '';
    }

    /**
     * A block's icon, rendered, for the block browser: its own, or else its icon from the plugins
     * directory as kept on this site, or else nothing (the browser then shows its initials).
     *
     * @param \block_base $block The block.
     * @return string HTML, or an empty string.
     */
    private static function get_block_icon_html(\block_base $block): string {
        global $OUTPUT;

        $icon = $block->get_icon();
        if ($icon) {
            return $OUTPUT->render($icon);
        }
        $url = directory_details::get_icon_url($block->name());
        // Decorative: the card already carries the block's name.
        return $url ? \html_writer::empty_tag('img', ['src' => $url->out(false), 'alt' => '', 'class' => 'icon']) : '';
    }

    /**
     * Whether a block type is missing from the addable blocks only because it allows one instance
     * per page and is already on this one.
     *
     * @param \stdClass $record The block type, from the block table.
     * @return bool
     */
    private static function is_added_single_instance(\stdClass $record): bool {
        global $PAGE;

        $block = block_instance($record->name);
        return $block && $record->visible
            && !$block->instance_allow_multiple()
            && $PAGE->blocks->is_block_present($record->name)
            && blocks_name_allowed_in_format($record->name, $PAGE->pagetype)
            && $block->user_can_addto($PAGE);
    }

    /**
     * Start again from a fresh $PAGE, after an earlier step of the same request has changed the
     * dashboard's blocks.
     *
     * A block_manager caches the blocks it loaded, so once add() or remove() has run, $PAGE no
     * longer describes the page. This is what external_api::call_external_function() already does
     * between calls in a batched AJAX request.
     */
    private static function reset_page(): void {
        global $PAGE;

        $PAGE = new \moodle_page();
    }

    /**
     * Render a single block just added by {@see self::add()}, for the client to insert on its own.
     *
     * Returning the new block from the same request that added it saves the client a full
     * dashboard reload (which would re-render, and re-run the JavaScript of, every other block)
     * and a second round trip - both of which matter most on slow or high-latency connections.
     *
     * @param bool $sitedefault Whether the block was added to the site default.
     * @param int $blockid The new block instance id.
     * @return array The block, its layout item (when it has one), the collected JavaScript it needs
     *     and the updated list of addable blocks.
     */
    public static function get_added_block(bool $sitedefault, int $blockid): array {
        global $OUTPUT, $PAGE, $USER;

        self::reset_page();
        [$mypage, $context] = self::initialise_page($sitedefault, !empty($USER->editing));

        $OUTPUT->header();
        $PAGE->start_collecting_javascript_requirements();

        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
            }
        }
        if (!isset($instances[$blockid])) {
            throw new \moodle_exception('blockdoesnotexist', 'error');
        }
        $instance = $instances[$blockid];
        // As in get_block(): render it again now that JavaScript is being collected.
        $instance->refresh_content();
        $content = $instance->get_content_for_output($OUTPUT);
        if (!$content) {
            throw new \moodle_exception('blockdoesnotexist', 'error');
        }

        $result = [
            'block' => self::export_block($content, $instance, $instance->instance->region ?? 'content'),
            'javascript' => $PAGE->requires->get_end_code(),
            'availableblocks' => self::get_available_blocks(),
        ];
        foreach (self::get_layout($mypage->id, $context->id, $instances) as $candidate) {
            if ($candidate['id'] === $blockid) {
                $result['layoutitem'] = $candidate;
                break;
            }
        }
        return $result;
    }

    /**
     * List the blocks that can be added after {@see self::remove()} has run in this request.
     *
     * @param bool $sitedefault Whether the site default was changed.
     * @return array
     */
    public static function get_available_blocks_after_change(bool $sitedefault): array {
        self::reset_page();
        self::initialise_page($sitedefault, true);
        return self::get_available_blocks();
    }

    /**
     * Translate a block's legacy editing controls into the dashboard's block actions menu.
     *
     * The menu reuses whichever controls {@see block_manager::edit_controls()} already builds
     * for the block, with the same capability checks and the same destination pages, filtered to
     * the small set the dashboard still has a use for (see MENU_ACTION_ALLOWED). Every other
     * control is either superseded by the grid's own controls, relocated to the tile's discrete
     * delete button, or simply redundant on a personal, per-user page.
     *
     * @param \action_link[] $controls The block's editing controls, from block_contents::$controls.
     * @param string $blockname The block's Frankenstyle name, e.g. 'html' or 'myoverview'.
     * @return array
     */
    private static function get_menu_actions(array $controls, string $blockname): array {
        $actions = [];
        foreach ($controls as $control) {
            $classes = explode(' ', (string) ($control->attributes['class'] ?? ''));
            $id = null;
            foreach ($classes as $class) {
                if (str_starts_with($class, 'editing_')) {
                    $id = substr($class, strlen('editing_'));
                    break;
                }
            }
            if ($id === null || !in_array($id, self::MENU_ACTION_ALLOWED, true)) {
                continue;
            }
            if ($id === 'edit' && !self::block_has_specific_config($blockname)) {
                // Configure would otherwise open a modal with nothing but the (hidden, on the
                // dashboard) where-this-block-appears fields to look at - see block_edit_form.
                continue;
            }
            $actions[] = [
                'id' => $id,
                'label' => (string) $control->text,
                'url' => $control->url->out(false),
                'modalform' => (string) ($control->attributes['data-blockform'] ?? ''),
            ];
        }
        return $actions;
    }

    /**
     * Whether a block type's edit form has any fields of its own beyond the base class's.
     *
     * The base {@see \block_edit_form} contributes nothing but the where-this-block-appears
     * fields, which are hidden on the dashboard (see that class). A block whose own edit form
     * (e.g. block_html_edit_form) does not override specific_definition() would therefore open a
     * Configure modal with nothing in it to edit - so this decides whether to offer it at all.
     *
     * @param string $blockname The block's Frankenstyle name, e.g. 'html' or 'myoverview'.
     * @return bool
     */
    private static function block_has_specific_config(string $blockname): bool {
        $formclass = \block_manager::get_block_edit_form_class($blockname);
        $method = new \ReflectionMethod($formclass, 'specific_definition');
        return $method->getDeclaringClass()->getName() !== \block_edit_form::class;
    }

    /**
     * The page's sticky footer that holds the dashboard's Edit mode controls.
     *
     * Only the empty container is rendered here: the React application (core_my/index) renders
     * the controls into it, so they share its state. Nothing is rendered outside Edit mode.
     *
     * @param array|null $initialdata The data from {@see self::get_initial_data()}.
     * @return string
     */
    public static function render_editing_footer(?array $initialdata): string {
        global $OUTPUT;
        if (empty($initialdata['editing'])) {
            return '';
        }
        $container = \html_writer::div('', 'core-my-dashboard-footer', ['data-region' => 'core-my-dashboard-footer']);
        return $OUTPUT->render(new \core\output\sticky_footer($container, 'core-my-dashboard-footer-content'));
    }

    /**
     * Return a loading placeholder which is visible before the React application starts.
     *
     * When {@see self::get_skeleton_layout()} could cheaply determine the real grid shape, this
     * server-rendered placeholder is positioned to match it: the very first thing the browser
     * paints, before any JavaScript has run, already looks like the user's real dashboard, rather
     * than a generic grid that gets replaced outright once React mounts.
     *
     * @param array $layout Layout items (id, column, row, columns, rows), or [] for a generic grid.
     * @return string
     */
    public static function get_loading_placeholder(array $layout = []): string {
        $label = get_string('loading');
        if (empty($layout)) {
            $line = \html_writer::div('', 'core-my-dashboard-loading__line');
            $tile = \html_writer::div(
                \html_writer::div('', 'core-my-dashboard-loading__heading')
                    . \html_writer::div('', 'core-my-dashboard-loading__line core-my-dashboard-loading__line--long')
                    . $line
                    . \html_writer::div('', 'core-my-dashboard-loading__line core-my-dashboard-loading__line--short'),
                'core-my-dashboard-loading__tile',
            );
            return \html_writer::div(
                \html_writer::span($label, 'visually-hidden')
                    . \html_writer::div(str_repeat($tile, 6), 'core-my-dashboard-loading__grid', ['aria-hidden' => 'true']),
                'core-my-dashboard-loading',
                ['role' => 'status', 'aria-label' => $label, 'aria-busy' => 'true'],
            );
        }

        $rows = 1;
        foreach ($layout as $item) {
            $rows = max($rows, $item['row'] + $item['rows']);
        }
        $tiles = '';
        foreach ($layout as $item) {
            $tiles .= \html_writer::div(
                \html_writer::div('', 'core-my-dashboard-loading__heading')
                    . \html_writer::div('', 'core-my-dashboard-loading__line core-my-dashboard-loading__line--long')
                    . \html_writer::div('', 'core-my-dashboard-loading__line'),
                'core-my-dashboard-tile core-my-dashboard-loading__tile core-my-dashboard-loading__tile--positioned',
                ['style' => sprintf(
                    'grid-column: %d / span %d; grid-row: %d / span %d;',
                    $item['column'] + 1,
                    $item['columns'],
                    $item['row'] + 1,
                    $item['rows'],
                )],
            );
        }
        return \html_writer::div(
            \html_writer::span($label, 'visually-hidden')
                . \html_writer::div($tiles, 'core-my-dashboard-grid core-my-dashboard-loading__grid--positioned', [
                    'aria-hidden' => 'true',
                    'style' => sprintf(
                        // The row unit is a CSS custom property on .core-my-dashboard-grid (see my.scss),
                        // shared with the React grid, rather than a pixel value repeated here.
                        'grid-template-columns: repeat(%d, minmax(0, 1fr)); '
                            . 'grid-template-rows: repeat(%d, var(--core-my-dashboard-row-height));',
                        self::MAX_COLUMNS,
                        $rows,
                    ),
                ]),
            'core-my-dashboard-loading',
            ['role' => 'status', 'aria-label' => $label, 'aria-busy' => 'true'],
        );
    }

    /**
     * Cheaply read the persisted grid shape for the initial page render, without loading blocks.
     *
     * Unlike {@see self::get()}, this never instantiates block objects or renders block content,
     * the expensive part of a dashboard load. It only reads {@see self::get_layout()}'s already
     * persisted grid columns/rows directly from the database, so the very first response can draw
     * loading placeholders in the shape of the user's real dashboard instead of a generic grid.
     *
     * Returns an empty array whenever the persisted data is incomplete (a block with no saved
     * position yet, for example right after it was added) rather than guessing: the caller is
     * expected to fall back to a generic placeholder in that case.
     *
     * @param bool $sitedefault Whether to read the site-default dashboard.
     * @return array Layout items (id, column, row, columns, rows), or [] if not cheaply knowable.
     */
    public static function get_skeleton_layout(bool $sitedefault): array {
        global $CFG, $DB, $USER;

        require_once($CFG->dirroot . '/my/lib.php');

        $userid = $sitedefault ? null : $USER->id;
        $mypage = my_get_page($userid, MY_PAGE_PRIVATE);
        if (!$mypage) {
            return [];
        }
        $context = $sitedefault ? context_system::instance() : context_user::instance($USER->id);

        $sql = "SELECT bi.id AS blockinstanceid, bp.gridcolumn, bp.gridrow, bp.gridcolumns, bp.gridrows
                  FROM {block_instances} bi
             LEFT JOIN {block_positions} bp
                    ON bp.blockinstanceid = bi.id
                   AND bp.contextid = :contextid
                   AND bp.pagetype = :pagetype
                   AND bp.subpage = :subpage
                 WHERE bi.parentcontextid = :parentcontextid
                   AND bi.pagetypepattern = :instancepagetype
                   AND bi.subpagepattern = :instancesubpage";
        $params = [
            'contextid' => $context->id,
            'pagetype' => 'my-index',
            'subpage' => (string) $mypage->id,
            'parentcontextid' => $context->id,
            'instancepagetype' => 'my-index',
            'instancesubpage' => (string) $mypage->id,
        ];
        $rows = $DB->get_records_sql($sql, $params);

        $layout = [];
        foreach ($rows as $row) {
            if (
                $row->gridcolumn === null || $row->gridrow === null
                    || $row->gridcolumns === null || $row->gridrows === null
            ) {
                // A block is missing its saved position: the real layout can't be known cheaply.
                return [];
            }
            $layout[] = [
                'id' => (int) $row->blockinstanceid,
                'column' => (int) $row->gridcolumn,
                'row' => (int) $row->gridrow,
                'columns' => (int) $row->gridcolumns,
                'rows' => (int) $row->gridrows,
            ];
        }

        usort($layout, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        // The first paint matches what the editor shows: gaps above a block close, and nothing is saved.
        $layout = self::rise_to_fill($layout);
        usort($layout, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        return $layout;
    }

    /**
     * Raise every block as far as it can, filling empty space above it.
     *
     * Vertical only, within the block's own column span: it keeps its column and width, and stops
     * when another block in that span, or the top of the grid, is in the way. Nothing moves
     * sideways. The same rules as riseToFill() in core_my/layout. Callers use this when drawing a
     * layout, not when saving one.
     *
     * @param array $layout Layout items (id, column, row, columns, rows), none overlapping.
     * @return array The risen layout, in the original order, or the same array when nothing moved.
     */
    public static function rise_to_fill(array $layout): array {
        if ($layout === []) {
            return $layout;
        }
        $ordered = $layout;
        usort($ordered, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);

        $occupied = [];
        $placed = [];
        $moved = false;
        foreach ($ordered as $item) {
            $row = max(0, (int) $item['row']);
            while ($row > 0 && self::rectangle_is_free($occupied, [
                'column' => $item['column'],
                'row' => $row - 1,
                'columns' => $item['columns'],
                'rows' => $item['rows'],
            ])) {
                $row--;
            }
            if ($row !== (int) $item['row']) {
                $item['row'] = $row;
                $moved = true;
            }
            for ($y = $item['row']; $y < $item['row'] + $item['rows']; $y++) {
                for ($x = $item['column']; $x < $item['column'] + $item['columns']; $x++) {
                    $occupied[$x . ':' . $y] = true;
                }
            }
            $placed[$item['id']] = $item;
        }
        if (!$moved) {
            return $layout;
        }
        return array_map(static fn(array $item): array => $placed[$item['id']], $layout);
    }

    /**
     * Get persisted grid positions, deriving safe defaults for unmigrated blocks.
     *
     * @param int $pageid Dashboard subpage id.
     * @param int $contextid Dashboard context id.
     * @param array $instances Block instances indexed by id.
     * @return array
     */
    public static function get_layout(int $pageid, int $contextid, array $instances): array {
        global $DB;

        $positions = $DB->get_records('block_positions', [
            'contextid' => $contextid,
            'pagetype' => 'my-index',
            'subpage' => (string) $pageid,
        ]);
        $byblock = [];
        foreach ($positions as $position) {
            $byblock[$position->blockinstanceid] = $position;
        }

        $nextrow = ['content' => 0, 'drawer' => 0];
        $layout = [];
        foreach ($instances as $id => $instance) {
            $position = $byblock[$id] ?? null;
            $region = $position->region
                ?? $instance->instance->region
                ?? $instance->instance->defaultregion;
            $isdrawer = $region !== 'content';
            $stack = $isdrawer ? 'drawer' : 'content';
            $columns = $isdrawer ? self::DRAWER_COLUMNS : self::CONTENT_COLUMNS;
            $row = $nextrow[$stack];
            if (
                $position && $position->gridcolumn !== null && $position->gridrow !== null
                    && $position->gridcolumns !== null && $position->gridrows !== null
            ) {
                $column = (int) $position->gridcolumn;
                $row = (int) $position->gridrow;
                $columns = (int) $position->gridcolumns;
                $rows = (int) $position->gridrows;
                $autorows = (bool) ($position->gridautorows ?? true);
            } else {
                // Leave an empty column on each side: legacy content blocks take the next
                // three columns, legacy side-region ("drawer") blocks take the column after.
                // The first block in each stack is two rows taller than the rest.
                $column = $isdrawer ? self::DRAWER_COLUMN : self::CONTENT_COLUMN;
                $rows = $row === 0 ? self::DEFAULT_ROWS_FIRST : self::DEFAULT_ROWS;
                $autorows = true;
            }
            $nextrow[$stack] = max($nextrow[$stack], $row + $rows);
            $layout[] = [
                'id' => (int) $id,
                'column' => $column,
                'row' => $row,
                'columns' => $columns,
                'rows' => $rows,
                'autorows' => $autorows,
            ];
        }

        usort($layout, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        return self::enforce_minimum_sizes($layout, $instances);
    }

    /**
     * Grow any block stored smaller than its minimum, pushing whatever it now overlaps downwards.
     *
     * A block can gain (or raise) a declared minimum after a layout was saved, for example when the
     * block plugin is upgraded. Growing it in place would overlap its neighbours, so every block is
     * re-placed in reading order at its stored position or, if that is now taken, the nearest free
     * rows below it. Only blocks in the way move, and only down.
     *
     * @param array $layout Layout items in reading order.
     * @param array $instances Block instances keyed by id.
     * @return array The layout, unchanged when every block already meets its minimum.
     */
    private static function enforce_minimum_sizes(array $layout, array $instances): array {
        $changed = false;
        foreach ($layout as &$item) {
            if (!isset($instances[$item['id']])) {
                continue;
            }
            $minimum = self::get_minimum_size($instances[$item['id']]);
            if ($item['columns'] < $minimum['columns'] || $item['rows'] < $minimum['rows']) {
                $item['columns'] = max($item['columns'], $minimum['columns']);
                $item['rows'] = max($item['rows'], $minimum['rows']);
                $item['column'] = min($item['column'], self::MAX_COLUMNS - $item['columns']);
                $changed = true;
            }
        }
        unset($item);
        if (!$changed) {
            return $layout;
        }

        $occupied = [];
        foreach ($layout as &$item) {
            while (!self::rectangle_is_free($occupied, $item)) {
                $item['row']++;
            }
            for ($row = $item['row']; $row < $item['row'] + $item['rows']; $row++) {
                for ($column = $item['column']; $column < $item['column'] + $item['columns']; $column++) {
                    $occupied[$column . ':' . $row] = true;
                }
            }
        }
        unset($item);
        usort($layout, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        return $layout;
    }

    /**
     * Whether none of a layout item's cells is already occupied.
     *
     * @param array $occupied Occupied cells, keyed "column:row".
     * @param array $item Layout item (column, row, columns, rows).
     * @return bool
     */
    private static function rectangle_is_free(array $occupied, array $item): bool {
        for ($row = $item['row']; $row < $item['row'] + $item['rows']; $row++) {
            for ($column = $item['column']; $column < $item['column'] + $item['columns']; $column++) {
                if (isset($occupied[$column . ':' . $row])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Persist a canonical six-column layout in block_positions.
     *
     * @param bool $sitedefault Whether to update the site default.
     * @param array $layout Layout items.
     */
    public static function save(bool $sitedefault, array $layout): void {
        global $DB, $PAGE;

        [$mypage, $context] = self::initialise_page($sitedefault, true);
        self::require_edit_capability($sitedefault, $context);

        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
            }
        }
        self::validate_layout($layout, $instances);

        $transaction = $DB->start_delegated_transaction();
        foreach ($layout as $item) {
            $instance = $instances[$item['id']]->instance;
            $position = $DB->get_record('block_positions', [
                'blockinstanceid' => $item['id'],
                'contextid' => $context->id,
                'pagetype' => 'my-index',
                'subpage' => (string) $mypage->id,
            ]);
            if (!$position) {
                $position = (object) [
                    'blockinstanceid' => $item['id'],
                    'contextid' => $context->id,
                    'pagetype' => 'my-index',
                    'subpage' => (string) $mypage->id,
                    'visible' => $instance->visible ?? 1,
                    'region' => $instance->region ?? $instance->defaultregion,
                    'weight' => $instance->weight ?? $instance->defaultweight,
                ];
            }
            $position->gridcolumn = $item['column'];
            $position->gridrow = $item['row'];
            $position->gridcolumns = $item['columns'];
            $position->gridrows = $item['rows'];
            $position->gridautorows = (int) ($item['autorows'] ?? true);
            if (!empty($position->id)) {
                $DB->update_record('block_positions', $position);
            } else {
                $DB->insert_record('block_positions', $position);
            }
        }
        $transaction->allow_commit();
        // No cache purge: the cache holds rendered blocks, not layout (see get()).
    }

    /**
     * Add a block to the end of the grid.
     *
     * @param bool $sitedefault Whether to update the site default.
     * @param string $blockname Block plugin name.
     * @return int New block instance id.
     */
    public static function add(bool $sitedefault, string $blockname): int {
        global $DB, $PAGE;

        [$mypage, $context] = self::initialise_page($sitedefault, true);
        self::require_edit_capability($sitedefault, $context);
        $addable = $PAGE->blocks->get_addable_blocks();
        if (!isset($addable[$blockname])) {
            throw new \moodle_exception('cannotaddthisblocktype');
        }
        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
            }
        }
        $layout = self::get_layout($mypage->id, $context->id, $instances);
        $bottom = array_reduce($layout, static fn(int $carry, array $item): int =>
            max($carry, $item['row'] + $item['rows']), 0);
        $contentblocks = $PAGE->blocks->get_blocks_for_region('content');
        $weight = array_reduce($contentblocks, static fn(int $carry, $instance): int =>
            max($carry, (int) $instance->instance->weight + 1), 0);
        $block = $PAGE->blocks->add_block(
            $blockname,
            'content',
            $weight,
            false,
            'my-index',
            (string) $mypage->id,
        );
        if (!$block) {
            throw new \moodle_exception('blockcannotadd');
        }
        $preferred = self::get_preferred_size($block);
        $columns = $preferred['columns'];
        $DB->insert_record('block_positions', (object) [
            'blockinstanceid' => $block->instance->id,
            'contextid' => $context->id,
            'pagetype' => 'my-index',
            'subpage' => (string) $mypage->id,
            'visible' => $block->instance->visible ?? 1,
            'region' => $block->instance->region ?? $block->instance->defaultregion,
            'weight' => $block->instance->weight ?? $block->instance->defaultweight,
            // At the block's preferred size, aligned with the centre column where it fits, below
            // everything already placed.
            'gridcolumn' => min(self::CONTENT_COLUMN, self::MAX_COLUMNS - $columns),
            'gridrow' => $bottom,
            'gridcolumns' => $columns,
            'gridrows' => $preferred['rows'] ?? self::DEFAULT_ROWS,
            'gridautorows' => $preferred['rows'] === null ? 1 : 0,
        ]);

        if (!$sitedefault) {
        }
        return (int) $block->instance->id;
    }

    /**
     * Remove a block owned by the current dashboard.
     *
     * @param bool $sitedefault Whether to update the site default.
     * @param int $blockid Block instance id.
     */
    public static function remove(bool $sitedefault, int $blockid): void {
        global $PAGE;

        [, $context] = self::initialise_page($sitedefault, true);
        self::require_edit_capability($sitedefault, $context);
        $block = $PAGE->blocks->find_instance($blockid);
        if (
            !$block || !$block->user_can_edit() || !$block->user_can_addto($PAGE)
                || in_array($block->instance->blockname, block_manager::get_undeletable_block_types(), true)
        ) {
            throw new \moodle_exception('nopermissions', '', $PAGE->url->out(), get_string('deleteablock'));
        }
        blocks_delete_instance($block->instance);

        if (!$sitedefault) {
        }
    }

    /**
     * Reset the current user's dashboard to the site default.
     */
    public static function reset(): void {
        global $CFG, $USER;

        require_once($CFG->dirroot . '/my/lib.php');
        $context = context_user::instance($USER->id);
        require_capability('moodle/my:manageblocks', $context);
        if (!my_reset_page($USER->id, MY_PAGE_PRIVATE)) {
            throw new \moodle_exception('reseterror', 'my');
        }
        $USER->editing = 0;
    }

    /**
     * Purge the current user's cached dashboard response after a change to their own dashboard.
     *
     * Only ever needed for the user's own dashboard: {@see self::get()} never caches the site
     * default.
     */
    /**
     * The revision of the dashboard the current user edits in a scope.
     *
     * A user who has not customised their dashboard yet has no page of their own, so its revision
     * is 0: their first change copies the site default, and then counts from there.
     *
     * @param bool $sitedefault Whether to read the site default.
     * @return int
     */
    public static function get_revision(bool $sitedefault): int {
        global $CFG, $DB, $USER;

        require_once($CFG->dirroot . '/my/lib.php');

        $conditions = $sitedefault
            ? ['userid' => null, 'private' => MY_PAGE_PRIVATE]
            : ['userid' => $USER->id, 'private' => MY_PAGE_PRIVATE];
        $revisions = $DB->get_fieldset('my_pages', 'revision', $conditions);
        return $revisions ? (int) max($revisions) : 0;
    }

    /**
     * Refuse a change made from a view of the dashboard that is no longer current.
     *
     * Every change sends the revision its window last saw. If the dashboard has changed since
     * (in another window or tab, or on another device), the change is refused and nothing is
     * written, so it can never silently undo the newer change.
     *
     * @param bool $sitedefault Whether the site default is being changed.
     * @param int|null $expected The revision the client last saw, or null to skip the check.
     * @throws \moodle_exception dashboardchanged when the dashboard has changed since.
     */
    public static function require_revision(bool $sitedefault, ?int $expected): void {
        // Only someone who may edit the dashboard learns whether it has changed.
        self::require_edit_capability(
            $sitedefault,
            $sitedefault ? context_system::instance() : context_user::instance($GLOBALS['USER']->id),
        );
        if ($expected !== null && $expected !== self::get_revision($sitedefault)) {
            throw new \moodle_exception('dashboardchanged', 'my');
        }
    }

    /**
     * Record that the dashboard in a scope has changed.
     *
     * @param bool $sitedefault Whether the site default changed.
     * @return int The new revision.
     */
    public static function bump_revision(bool $sitedefault): int {
        global $CFG, $DB, $USER;

        require_once($CFG->dirroot . '/my/lib.php');

        $page = $DB->get_record('my_pages', $sitedefault
            ? ['userid' => null, 'private' => MY_PAGE_PRIVATE]
            : ['userid' => $USER->id, 'private' => MY_PAGE_PRIVATE], 'id, revision', IGNORE_MULTIPLE);
        if (!$page) {
            return 0;
        }
        $DB->set_field('my_pages', 'revision', $page->revision + 1, ['id' => $page->id]);
        return $page->revision + 1;
    }

    /**
     * Resolve a block's minimum size: its own declaration, or the default.
     *
     * The single point every minimum-size check goes through: the editor (via the payload),
     * {@see self::validate_layout()} and {@see self::enforce_minimum_sizes()}.
     *
     * @param \block_base|null $block The block, or null for the default that applies to any block.
     * @return array{columns: int, rows: int}
     */
    public static function get_minimum_size(?\block_base $block = null): array {
        $default = self::DEFAULT_MINIMUM;
        if (!$block) {
            return $default;
        }
        $declared = self::read_size_declaration($block, 'get_grid_minimum_size');
        if (!$declared) {
            return $default;
        }
        $rows = $declared->rows ?? $default['rows'];
        if (!self::is_valid_span($declared->columns, self::MAX_COLUMNS) || !self::is_valid_span($rows, grid_size::MAX_ROWS)) {
            self::warn_size_declaration($block, 'get_grid_minimum_size', 'declares an unusable size ' .
                "({$declared->columns} × " . ($declared->rows ?? 'null') . '), so the default is used');
            return $default;
        }
        return ['columns' => $declared->columns, 'rows' => $rows];
    }

    /**
     * Resolve the most rows a block opens at when it is sized to its content.
     *
     * @param \block_base $block The block.
     * @return int|null The most rows, or null for no maximum.
     */
    public static function get_maximum_rows(\block_base $block): ?int {
        try {
            $declared = $block->get_grid_maximum_rows();
        } catch (\Throwable $exception) {
            self::warn_size_declaration($block, 'get_grid_maximum_rows', 'failed (' . $exception->getMessage() .
                '), so the default is used');
            return self::AUTO_ROWS_CAP;
        }
        if ($declared === null) {
            return self::AUTO_ROWS_CAP;
        }
        if ($declared === grid_size::NO_MAXIMUM_ROWS) {
            return null;
        }
        if ($declared < 0) {
            self::warn_size_declaration($block, 'get_grid_maximum_rows', "declares an unusable maximum ({$declared}), " .
                'so the default is used');
            return self::AUTO_ROWS_CAP;
        }
        return max($declared, self::get_minimum_size($block)['rows']);
    }

    /**
     * Resolve the size a block is given when it is first placed on the grid.
     *
     * @param \block_base $block The block.
     * @return array{columns: int, rows: int|null} Rows of null mean "as tall as its content".
     */
    public static function get_preferred_size(\block_base $block): array {
        $minimum = self::get_minimum_size($block);
        // A block that declares no preferred height follows its content.
        $default = [
            'columns' => max(self::CONTENT_COLUMNS, $minimum['columns']),
            'rows' => null,
        ];
        $declared = self::read_size_declaration($block, 'get_grid_preferred_size');
        if (!$declared) {
            return $default;
        }
        if (
            !self::is_valid_span($declared->columns, self::MAX_COLUMNS)
                || ($declared->rows !== null && !self::is_valid_span($declared->rows, grid_size::MAX_ROWS))
        ) {
            self::warn_size_declaration($block, 'get_grid_preferred_size', 'declares an unusable size ' .
                "({$declared->columns} × " . ($declared->rows ?? 'null') . '), so the default is used');
            return $default;
        }
        if ($declared->columns < $minimum['columns'] || ($declared->rows !== null && $declared->rows < $minimum['rows'])) {
            self::warn_size_declaration($block, 'get_grid_preferred_size', 'declares a size smaller than its minimum, so the minimum is used');
        }
        return [
            'columns' => max($declared->columns, $minimum['columns']),
            'rows' => $declared->rows === null ? null : max($declared->rows, $minimum['rows']),
        ];
    }

    /**
     * Call one of a block's optional size declarations, tolerating one that fails.
     *
     * @param \block_base $block The block.
     * @param string $method get_grid_minimum_size or get_grid_preferred_size.
     * @return grid_size|null The declaration, or null when there is none or it could not be read.
     */
    private static function read_size_declaration(\block_base $block, string $method): ?grid_size {
        try {
            return $block->$method();
        } catch (\Throwable $exception) {
            // For example a TypeError from a non-integer span: a coding error in the block, which
            // must not stop the dashboard from rendering.
            self::warn_size_declaration($block, $method, 'failed (' . $exception->getMessage() . '), so the default is used');
            return null;
        }
    }

    /**
     * Whether a declared span is a usable whole number of columns or rows.
     *
     * @param int $span The declared span.
     * @param int $maximum The largest span allowed.
     * @return bool
     */
    private static function is_valid_span(int $span, int $maximum): bool {
        return $span >= 1 && $span <= $maximum;
    }

    /**
     * Tell the block's developer, once per request and problem, that a size declaration was not used as given.
     *
     * @param \block_base $block The block.
     * @param string $method The declaring method.
     * @param string $problem What was wrong.
     */
    private static function warn_size_declaration(\block_base $block, string $method, string $problem): void {
        static $warned = [];
        $message = "The block {$block->name()} {$method}() {$problem}.";
        if (isset($warned[$message])) {
            return;
        }
        $warned[$message] = true;
        debugging($message, DEBUG_DEVELOPER);
    }

    /**
     * Require the appropriate editing capability.
     *
     * @param bool $sitedefault Whether the site default is being edited.
     * @param \context $context Dashboard context.
     */
    private static function require_edit_capability(bool $sitedefault, \context $context): void {
        require_capability($sitedefault ? 'moodle/my:configsyspages' : 'moodle/my:manageblocks', $context);
        if (!self::can_edit($sitedefault, $context)) {
            throw new \required_capability_exception($context, 'moodle/my:manageblocks', 'nopermissions', '');
        }
    }

    /**
     * Whether the current user may edit the given dashboard.
     *
     * Users' own dashboards cannot be edited while $CFG->forcedefaultmymoodle makes everyone use the
     * site default, exactly as on the legacy dashboard; the site default itself still can be.
     *
     * @param bool $sitedefault Whether this is the site default.
     * @param \context $context The dashboard's context.
     * @return bool
     */
    private static function can_edit(bool $sitedefault, \context $context): bool {
        global $CFG;

        if ($sitedefault) {
            return has_capability('moodle/my:configsyspages', $context);
        }
        return empty($CFG->forcedefaultmymoodle) && has_capability('moodle/my:manageblocks', $context);
    }

    /**
     * Validate layout ownership, bounds, minimum size, uniqueness and overlap.
     *
     * @param array $layout Layout items.
     * @param array $instances Available block instances.
     */
    private static function validate_layout(array $layout, array $instances): void {
        $seen = [];
        $occupied = [];
        foreach ($layout as $item) {
            if (!isset($instances[$item['id']]) || isset($seen[$item['id']])) {
                throw new \invalid_parameter_exception('The layout contains an invalid or duplicate block.');
            }
            $seen[$item['id']] = true;
            $minimum = self::get_minimum_size($instances[$item['id']]);
            if (
                $item['column'] < 0 || $item['row'] < 0
                    || $item['columns'] < $minimum['columns'] || $item['rows'] < $minimum['rows']
                    || $item['column'] + $item['columns'] > self::MAX_COLUMNS
            ) {
                throw new \invalid_parameter_exception('The layout contains an invalid grid rectangle.');
            }
            for ($row = $item['row']; $row < $item['row'] + $item['rows']; $row++) {
                for ($column = $item['column']; $column < $item['column'] + $item['columns']; $column++) {
                    $key = $column . ':' . $row;
                    if (isset($occupied[$key])) {
                        throw new \invalid_parameter_exception('Dashboard blocks may not overlap.');
                    }
                    $occupied[$key] = true;
                }
            }
        }
        if (count($seen) !== count($instances)) {
            throw new \invalid_parameter_exception('The layout must contain every dashboard block.');
        }
    }
}
