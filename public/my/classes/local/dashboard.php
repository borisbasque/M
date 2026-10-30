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
use context_system;
use context_user;

/**
 * Server-side support for the responsive dashboard grid.
 *
 * @package    core_my
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class dashboard {
    /** Canonical number of columns used for persisted layouts. */
    public const MAX_COLUMNS = 6;

    /**
     * Every column count the grid is shown at, widest first: MAX_COLUMNS on a wide screen, then
     * the narrower counts the client derives from the grid's width (the thresholds live with
     * columnsForWidth() in js/esm/src/layout.ts, and again as container queries in
     * theme/boost/scss/moodle/my.scss for the server-rendered loading placeholder).
     */
    public const COLUMN_COUNTS = [6, 4, 2, 1];

    /**
     * Upper bound on the grid's height, in rows: no block may start at, or extend past, this row.
     *
     * The grid otherwise grows on demand, so this is deliberately generous (at ROW_HEIGHT_PX it is
     * tens of thousands of pixels tall) - its purpose is to bound the work a saved layout can ask
     * the server and the browser to do (validate_layout() visits every cell a block covers, the
     * client draws one placeholder per empty cell in edit mode), not to constrain real dashboards.
     */
    public const MAX_ROWS = 500;

    /** Default grid row span for legacy and newly-added blocks. */
    public const DEFAULT_ROWS = 3;

    /** Default grid row span for the first legacy block in each stack (taller than the rest). */
    public const DEFAULT_ROWS_FIRST = 5;

    /** Row height in pixels, matching the client's ROW_HEIGHT in js/esm/src/layout.ts. */
    private const ROW_HEIGHT_PX = 96;

    /** Legacy regions which may still be attached to dashboard blocks. */
    private const REGIONS = ['content', 'side-pre', 'side-post'];

    /** The React component (within @moodle/lms) rendering the dashboard grid. */
    private const REACT_COMPONENT = '@moodle/lms/core_my/index';

    /**
     * The context a dashboard request is validated against and its blocks load in.
     *
     * The site default lives in the system context. A user's own dashboard lives in their user
     * context, except for a guest, who only ever reads the site default (my/index.php makes the
     * same choice): the external functions validate this context, and {@see self::initialise_page()}
     * sets the page up in the same one, so the two never disagree.
     *
     * @param bool $sitedefault Whether the request is for the site default.
     * @return \context
     */
    public static function get_context(bool $sitedefault): \context {
        global $USER;

        if ($sitedefault || isguestuser()) {
            return context_system::instance();
        }
        return context_user::instance($USER->id);
    }

    /**
     * Set up Moodle's block manager for a user or site-default dashboard.
     *
     * @param bool $sitedefault Whether to load the site-default dashboard.
     * @param bool $includeinvisible Whether invisible blocks should be loaded.
     * @return array The page record and context.
     * @throws \moodle_exception If the administrator has disabled the Dashboard.
     */
    public static function initialise_page(bool $sitedefault, bool $includeinvisible = false): array {
        global $CFG, $PAGE, $USER;

        require_once($CFG->dirroot . '/my/lib.php');

        // The administrator can switch the Dashboard off altogether (Site administration >
        // Appearance > Navigation). my/index.php sends such a user on to their start page before
        // it gets here; every other route onto the dashboard - the web services behind the grid
        // and the mobile app, and the site default page - stops with an error instead, so that
        // switching the Dashboard off really does switch it off.
        if (empty($CFG->enabledashboard)) {
            throw new \moodle_exception('error:dashboardisdisabled', 'my');
        }

        if ($sitedefault) {
            $context = context_system::instance();
            require_capability('moodle/my:configsyspages', $context);
            $mypage = my_get_page(null, MY_PAGE_PRIVATE);
            $PAGE->set_blocks_editing_capability('moodle/my:configsyspages');
        } else if (isguestuser()) {
            // A guest only ever reads the site default, and only when the administrator allows
            // guests onto the Dashboard at all; my/index.php sends them to the front page otherwise.
            if (empty($CFG->allowguestmymoodle)) {
                throw new \moodle_exception('noguest', 'my');
            }
            $context = context_system::instance();
            $mypage = my_get_page(null, MY_PAGE_PRIVATE);
            $PAGE->set_blocks_editing_capability('moodle/my:configsyspages');
        } else {
            $context = context_user::instance($USER->id);
            $mypage = my_get_page($USER->id, MY_PAGE_PRIVATE);
            $PAGE->set_blocks_editing_capability('moodle/my:manageblocks');
            // A user editing the site default gets a copy of their own to edit, unless the site
            // forces the default dashboard on everyone: then no personal copy is ever made, as on
            // my/index.php, so nothing surfaces later when an administrator lifts that setting.
            if (
                $mypage && !$mypage->userid && !empty($USER->editing)
                    && empty($CFG->forcedefaultmymoodle)
                    && has_capability('moodle/my:manageblocks', $context)
            ) {
                $mypage = my_copy_page($USER->id, MY_PAGE_PRIVATE);
            }
        }

        if (!$mypage) {
            throw new \moodle_exception('mymoodlesetup');
        }

        // The external API documentation says not to call set_context() from an external function,
        // because validate_context() has already set it. It has, and this is the same context (or
        // the system context for a guest, as on the page itself): the rest of this page setup -
        // URL, layout, page type, sub page and regions - is what block_manager needs to load the
        // dashboard's blocks, and that is only possible on a page with its context set.
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
     * Return the current dashboard payload for the React application.
     *
     * Rendering every block's content is the expensive part of this (see the class-level note on
     * {@see self::get_skeleton_layout()}): each block instance re-runs its own queries on every
     * call, exactly as the classic dashboard did on every page view. The response is deliberately
     * not cached: block content changes for reasons the dashboard never sees (a file uploaded to
     * the private files area, a calendar event created elsewhere, a Text block edited on another
     * page), and there is no reliable way to purge a cached response on every such event, so a
     * cache would show users stale content on arrival. Blocks which fetch their own content after
     * mounting (Course overview, Timeline, Recently accessed items) cost little here either way.
     *
     * @param bool $sitedefault Whether to load the site default.
     * @return array
     */
    public static function get(bool $sitedefault): array {
        global $CFG, $OUTPUT, $PAGE, $USER;

        $context = self::get_context($sitedefault);
        $capability = $sitedefault ? 'moodle/my:configsyspages' : 'moodle/my:manageblocks';
        $canedit = has_capability($capability, $context)
            && ($sitedefault || (empty($CFG->forcedefaultmymoodle) && !isguestuser()));
        $editing = $canedit && !empty($USER->editing);
        [$mypage] = self::initialise_page($sitedefault, $editing);

        // Block renderers may register JavaScript which must be returned to the React client.
        $OUTPUT->header();
        $PAGE->start_collecting_javascript_requirements();
        $PAGE->blocks->refresh_cached_content();

        $blocks = [];
        $instances = [];
        foreach (self::REGIONS as $region) {
            foreach ($PAGE->blocks->get_blocks_for_region($region) as $instance) {
                $instances[$instance->instance->id] = $instance;
            }
        }

        $contents = $PAGE->blocks->get_content_for_all_regions($OUTPUT);
        foreach ($contents as $region => $regioncontents) {
            foreach ($regioncontents as $content) {
                if (empty($content->blockinstanceid) || !isset($instances[$content->blockinstanceid])) {
                    continue;
                }
                $instance = $instances[$content->blockinstanceid];
                $blocks[] = [
                    'id' => (int) $content->blockinstanceid,
                    'name' => $instance->instance->blockname,
                    'title' => (string) $content->title,
                    'content' => (string) $content->content,
                    'footer' => (string) $content->footer,
                    'region' => $region,
                    'weight' => (int) $instance->instance->weight,
                    'visible' => (bool) $instance->instance->visible,
                    'actions' => self::export_block_actions($content->controls),
                ];
            }
        }

        $layout = self::get_layout($mypage->id, $context->id, $instances);
        // The blocks the user may add, in the shape core/add_block_body (the standard "Add a block"
        // modal, which the grid reuses rather than drawing a palette of its own) takes: the same
        // name, title and blockform as core_block_fetch_addable_blocks returns, so that a block type
        // which shows its configuration form when added (block_html, for one) is added through that
        // form here too, exactly as it is on every other page.
        $available = [];
        if ($editing) {
            foreach ($PAGE->blocks->get_addable_blocks() as $block) {
                $formclass = \block_manager::get_block_edit_form_class($block->name);
                $available[] = [
                    'name' => $block->name,
                    'title' => get_string('pluginname', 'block_' . $block->name),
                    'blockform' => $formclass::display_form_when_adding() ? $formclass : null,
                ];
            }
        }
        $minimum = self::get_minimum_size();

        // Language strings are deliberately not part of this payload: the React application
        // fetches them itself through core/str (see js/esm/src/strings.ts), as the React
        // guidelines ask. Icons are the one piece of presentation that does come from here, so
        // that they go through $OUTPUT->pix_icon() - and therefore the theme's icon map - rather
        // than being hardcoded as FontAwesome class names on the client (the same approach the
        // core navigation React components take with their server-rendered item text).
        return [
            'blocks' => $blocks,
            'layout' => $layout,
            'availableblocks' => $available,
            'canedit' => $canedit,
            // Whether the edit bar may offer to switch to the default dashboard for all users.
            'caneditdefault' => has_capability('moodle/my:configsyspages', context_system::instance()),
            'editing' => $editing,
            'sitedefault' => $sitedefault,
            'limits' => [
                'mincolumns' => $minimum['columns'],
                'minrows' => $minimum['rows'],
                'maxcolumns' => self::MAX_COLUMNS,
                'maxrows' => self::MAX_ROWS,
            ],
            'icons' => [
                'move' => $OUTPUT->pix_icon('i/grip', ''),
                'resize' => $OUTPUT->pix_icon('e/resize', ''),
                'add' => $OUTPUT->pix_icon('t/add', ''),
                'up' => $OUTPUT->pix_icon('t/up', ''),
                'down' => $OUTPUT->pix_icon('t/down', ''),
                'left' => $OUTPUT->pix_icon('t/left', ''),
                'right' => $OUTPUT->pix_icon('t/right', ''),
                'remove' => $OUTPUT->pix_icon('t/less', ''),
                'menu' => $OUTPUT->pix_icon('i/menu', ''),
                'edit' => $OUTPUT->pix_icon('i/edit', ''),
                'undo' => $OUTPUT->pix_icon('e/undo', ''),
                'reset' => $OUTPUT->pix_icon('t/reset', ''),
            ],
            'javascript' => $PAGE->requires->get_end_code(),
        ];
    }

    /**
     * Export a block's standard editing controls for its tile's menu, the design system Dropdown.
     *
     * The same actions the classic block header offers on every other page (Configure, Hide or
     * Show, Assign roles, Manage permissions, Check permissions, Delete), as data rather than
     * rendered markup, so the client draws them with its own menu. Each keeps its link and its
     * data-* attributes, so the handlers core already attaches to the whole page still pick them up
     * (core_block/edit opens Configure's form; core/utility asks before following a link that
     * carries data-modal). Move is left out: the grid's own handle repositions a tile, and the
     * classic region picker has no regions here.
     *
     * @param array $controls The block's controls, as block_manager::edit_controls() builds them.
     * @return array The actions (key, label, url, icon, attributes as JSON, danger), none outside Edit mode.
     */
    private static function export_block_actions(array $controls): array {
        global $OUTPUT;

        $actions = [];
        foreach ($controls as $control) {
            if (!$control instanceof \action_menu_link) {
                continue;
            }
            $classes = explode(' ', (string) ($control->attributes['class'] ?? ''));
            if (in_array('editing_move', $classes, true)) {
                continue;
            }
            $key = 'action';
            foreach ($classes as $class) {
                if (str_starts_with($class, 'editing_')) {
                    $key = substr($class, strlen('editing_'));
                    break;
                }
            }
            $attributes = array_filter(
                $control->attributes,
                static fn($value, $name): bool => str_starts_with((string) $name, 'data-'),
                ARRAY_FILTER_USE_BOTH,
            );
            $actions[] = [
                'key' => $key,
                'label' => (string) $control->text,
                'url' => $control->url instanceof \moodle_url ? $control->url->out(false) : (string) $control->url,
                // Decorative: the label names the action.
                'icon' => $control->icon ? $OUTPUT->pix_icon($control->icon->pix, '', $control->icon->component) : '',
                'attributes' => json_encode((object) $attributes),
                'danger' => $key === 'delete',
            ];
        }
        return $actions;
    }

    /**
     * Render the React application's mount point for a dashboard page.
     *
     * Both dashboard pages (my/index.php for a user's own, my/indexsys.php for the site default)
     * share this: the only difference between them, from the React application's point of view,
     * is the siteDefault prop. The mount point's contents (get_loading_placeholder()'s output)
     * are only ever seen for the brief window before the React bundle finishes loading and
     * replaces them; get_skeleton_layout() reads the persisted grid shape cheaply (no block
     * instantiation) so that placeholder already matches the real layout instead of a generic
     * grid. That placeholder is also why this does not use html_writer::react_component(),
     * which renders an empty mount point: the data-react-component/data-react-props contract is
     * the same one core/react_autoinit reads to mount core_my/index.tsx here.
     *
     * Blocks may supply AMD initialisers as part of the dashboard data response, so the
     * page-level AMD loader is required here too, before the React application receives them.
     *
     * @param bool $sitedefault Whether the page is the site-default dashboard.
     * @return string
     */
    public static function render_mount_point(bool $sitedefault): string {
        global $PAGE;

        $PAGE->requires->js_call_amd('core/first');
        $initiallayout = self::get_skeleton_layout($sitedefault);
        return \html_writer::div(self::get_loading_placeholder($initiallayout), 'core-my-dashboard-mount', [
            'data-react-component' => self::REACT_COMPONENT,
            'data-react-props' => json_encode([
                'loadingLabel' => get_string('loading'),
                'initialLayout' => $initiallayout,
                'siteDefault' => $sitedefault,
                // The edited-page hash a block's own "add" form (block_edit_form, opened through
                // core_form/modalform from the standard "Add a block" modal) needs to find this page
                // again; null when not editing, exactly as core/add_block_button receives it.
                'pagehash' => $PAGE->get_edited_page_hash(),
            ]),
        ]);
    }

    /**
     * Whether a page is the flexible dashboard grid: a user's own dashboard, or the site default.
     *
     * Shared block code (block_manager::save_block_data(), block_edit_form) needs to tell the grid
     * apart from every other block-bearing page, including the ones that share its page layout
     * (message/index.php also uses 'mydashboard', and declares a block region of its own) or its
     * page type (my/courses.php is also 'my-index'). The dashboard is the private '__default'
     * my_pages page, so page type plus subpage identify it unambiguously - the same key
     * {@see self::get_layout()} stores positions under, and the same test
     * block_html::content_is_trusted() and blocks_add_default_system_blocks() apply.
     *
     * @param \moodle_page $page The page being checked.
     * @return bool
     */
    public static function is_dashboard_page(\moodle_page $page): bool {
        global $CFG, $DB;

        if ($page->pagetype !== 'my-index' || (string) $page->subpage === '') {
            return false;
        }
        require_once($CFG->dirroot . '/my/lib.php');
        return $DB->record_exists('my_pages', [
            'id' => (int) $page->subpage,
            'name' => MY_PAGE_DEFAULT,
            'private' => MY_PAGE_PRIVATE,
        ]);
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

        // The browser, not the server, knows how wide the grid will be, so the placeholder carries
        // its tile positions for every column count as custom properties, packed exactly as the
        // client packs the real grid at that width (see pack_layout()). The stylesheet picks the
        // set matching the grid's width with container queries, so the first paint on a phone is
        // the one-column stack React will measure its way to, not a six-column grid it repacks.
        $positions = [];
        $gridstyle = sprintf('--core-my-row-height: %dpx;', self::ROW_HEIGHT_PX);
        foreach (self::COLUMN_COUNTS as $columncount) {
            $rows = 1;
            foreach (self::pack_layout($layout, $columncount) as $item) {
                $rows = max($rows, $item['row'] + $item['rows']);
                $positions[$item['id']][] = sprintf(
                    '--core-my-column-%1$d: %2$d / span %3$d; --core-my-row-%1$d: %4$d / span %5$d;',
                    $columncount,
                    $item['column'] + 1,
                    $item['columns'],
                    $item['row'] + 1,
                    $item['rows'],
                );
            }
            $gridstyle .= sprintf(' --core-my-rows-%d: %d;', $columncount, $rows);
        }
        $tiles = '';
        foreach ($layout as $item) {
            $tiles .= \html_writer::div(
                \html_writer::div('', 'core-my-dashboard-loading__heading')
                    . \html_writer::div('', 'core-my-dashboard-loading__line core-my-dashboard-loading__line--long')
                    . \html_writer::div('', 'core-my-dashboard-loading__line'),
                'core-my-dashboard-tile core-my-dashboard-loading__tile core-my-dashboard-loading__tile--positioned',
                ['style' => implode(' ', $positions[$item['id']])],
            );
        }
        return \html_writer::div(
            \html_writer::span($label, 'visually-hidden')
                . \html_writer::div($tiles, 'core-my-dashboard-grid core-my-dashboard-loading__grid--positioned', [
                    'aria-hidden' => 'true',
                    'style' => $gridstyle,
                ]),
            'core-my-dashboard-loading',
            ['role' => 'status', 'aria-label' => $label, 'aria-busy' => 'true'],
        );
    }

    /**
     * Lay a canonical (MAX_COLUMNS wide) layout out at a narrower column count, exactly as the
     * client does for the real grid (packLayout() in js/esm/src/layout.ts): when every block
     * fits inside that many columns once the layout's empty left margin is shifted away, the
     * whole layout is shifted; otherwise each block, in reading order, keeps its column where
     * it can (pulled in if its span would overhang, its span clamped to the count) and otherwise
     * drops to the first free cell. Only the loading placeholder needs this on the server, so
     * the layout engine itself stays in one place: the two must agree, and the client's Jest
     * suite and this class's PHPUnit tests pin the same cases.
     *
     * @param array $layout Layout items (id, column, row, columns, rows) in canonical coordinates.
     * @param int $columncount The column count to lay out at.
     * @return array The same items, keyed as given, at the new coordinates.
     */
    public static function pack_layout(array $layout, int $columncount): array {
        if ($columncount >= self::MAX_COLUMNS || empty($layout)) {
            return $layout;
        }
        usort($layout, static fn(array $left, array $right): int =>
            $left['row'] <=> $right['row'] ?: $left['column'] <=> $right['column'] ?: $left['id'] <=> $right['id']);

        $mincolumn = min(array_column($layout, 'column'));
        $maxcolumn = max(array_map(static fn(array $item): int => $item['column'] + $item['columns'], $layout));
        if ($maxcolumn <= $columncount || $maxcolumn - $mincolumn <= $columncount) {
            $shift = max(0, $maxcolumn - $columncount);
            return array_map(static function (array $item) use ($shift): array {
                $item['column'] -= $shift;
                return $item;
            }, $layout);
        }

        $occupied = [];
        $fits = static function (int $column, int $row, int $columns, int $rows) use (&$occupied): bool {
            for ($y = $row; $y < $row + $rows; $y++) {
                for ($x = $column; $x < $column + $columns; $x++) {
                    if (isset($occupied["{$x}:{$y}"])) {
                        return false;
                    }
                }
            }
            return true;
        };
        $packed = [];
        foreach ($layout as $item) {
            $columns = min($item['columns'], $columncount);
            $column = max(0, min($item['column'], $columncount - $columns));
            $row = max(0, $item['row']);
            if (!$fits($column, $row, $columns, $item['rows'])) {
                $placed = false;
                for ($row = 0; $row < self::MAX_ROWS && !$placed; $row++) {
                    for ($column = 0; $column + $columns <= $columncount; $column++) {
                        if ($fits($column, $row, $columns, $item['rows'])) {
                            $placed = true;
                            break;
                        }
                    }
                    if ($placed) {
                        break;
                    }
                }
                if (!$placed) {
                    // Past the row ceiling: leave the block where it was rather than fail the page.
                    $column = max(0, min($item['column'], $columncount - $columns));
                    $row = max(0, $item['row']);
                }
            }
            for ($y = $row; $y < $row + $item['rows']; $y++) {
                for ($x = $column; $x < $column + $columns; $x++) {
                    $occupied["{$x}:{$y}"] = true;
                }
            }
            $item['column'] = $column;
            $item['row'] = $row;
            $item['columns'] = $columns;
            $packed[] = $item;
        }
        return $packed;
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
        // The first paint matches what the application shows: gaps above a block close.
        return self::rise_to_fill($layout);
    }

    /**
     * Raise every block as far as it can, filling empty space above it.
     *
     * Vertical only, within the block's own column span: it keeps its column and width, and stops
     * when another block in that span, or the top of the grid, is in the way. Nothing moves
     * sideways. The same rules as riseToFill() in core_my/layout. Used when drawing a layout, not
     * when saving one.
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
        $isfree = static function (int $column, int $row, int $columns, int $rows) use (&$occupied): bool {
            for ($y = $row; $y < $row + $rows; $y++) {
                for ($x = $column; $x < $column + $columns; $x++) {
                    if (isset($occupied[$x . ':' . $y])) {
                        return false;
                    }
                }
            }
            return true;
        };
        $placed = [];
        $moved = false;
        foreach ($ordered as $item) {
            $row = max(0, (int) $item['row']);
            while ($row > 0 && $isfree($item['column'], $row - 1, $item['columns'], $item['rows'])) {
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
            $columns = $isdrawer ? 1 : 3;
            $row = $nextrow[$stack];
            if (
                $position && $position->gridcolumn !== null && $position->gridrow !== null
                    && $position->gridcolumns !== null && $position->gridrows !== null
            ) {
                $column = (int) $position->gridcolumn;
                $row = (int) $position->gridrow;
                $columns = (int) $position->gridcolumns;
                $rows = (int) $position->gridrows;
            } else {
                // Leave an empty column on each side: legacy content blocks take the next
                // three columns, legacy side-region ("drawer") blocks take the column after.
                // The first block in each stack is a row taller than the rest.
                $column = $isdrawer ? 4 : 1;
                $rows = $row === 0 ? self::DEFAULT_ROWS_FIRST : self::DEFAULT_ROWS;
            }
            $nextrow[$stack] = max($nextrow[$stack], $row + $rows);
            $layout[] = [
                'id' => (int) $id,
                'column' => $column,
                'row' => $row,
                'columns' => $columns,
                'rows' => $rows,
            ];
        }

        usort($layout, static fn(array $left, array $right): int =>
            [$left['row'], $left['column'], $left['id']] <=> [$right['row'], $right['column'], $right['id']]);
        return $layout;
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
            if (!empty($position->id)) {
                $DB->update_record('block_positions', $position);
            } else {
                $DB->insert_record('block_positions', $position);
            }
        }
        $transaction->allow_commit();
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
        // In the leftmost column the dashboard already uses (the migrated default leaves an empty
        // margin column on each side), so the new block lands inside the window of columns a
        // narrower view shows and never forces that view into a reflow.
        // Never past the right edge, which validate_layout() would reject of a saved layout: the
        // leftmost block may itself sit in the last columns.
        $newcolumns = 2;
        $leftmost = min(
            array_reduce($layout, static fn(int $carry, array $item): int =>
                min($carry, $item['column']), $layout ? self::MAX_COLUMNS : 0),
            self::MAX_COLUMNS - $newcolumns,
        );
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
        $DB->insert_record('block_positions', (object) [
            'blockinstanceid' => $block->instance->id,
            'contextid' => $context->id,
            'pagetype' => 'my-index',
            'subpage' => (string) $mypage->id,
            'visible' => $block->instance->visible ?? 1,
            'region' => $block->instance->region ?? $block->instance->defaultregion,
            'weight' => $block->instance->weight ?? $block->instance->defaultweight,
            'gridcolumn' => $leftmost,
            'gridrow' => $bottom,
            'gridcolumns' => $newcolumns,
            'gridrows' => self::DEFAULT_ROWS,
        ]);

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
        // Edit mode stays as it was: the user is still editing, now a fresh copy of the site
        // default, which my/index.php (and initialise_page()) make for them on the next load.
    }

    /**
     * Resolve the default minimum block size, in grid cells.
     *
     * This is the single point the minimum is resolved through, on both sides: the server enforces
     * it in {@see self::validate_layout()}, and the client reads it from the 'limits' key of the
     * get_dashboard payload rather than keeping a copy of its own. MDL-89639 can substitute a
     * per-block declared value here (taking the block name as a parameter) without reworking the
     * enforcement on either side.
     *
     * @return array With 'columns' and 'rows' keys.
     */
    public static function get_minimum_size(): array {
        return ['columns' => 1, 'rows' => 2];
    }

    /**
     * Require the appropriate editing capability.
     *
     * @param bool $sitedefault Whether the site default is being edited.
     * @param \context $context Dashboard context.
     */
    private static function require_edit_capability(bool $sitedefault, \context $context): void {
        global $CFG;

        if (!$sitedefault && !empty($CFG->forcedefaultmymoodle)) {
            // The site forces the default dashboard on everyone: a user's own cannot be edited.
            throw new \moodle_exception('nopermissions', 'error', '', get_string('myhome'));
        }
        require_capability($sitedefault ? 'moodle/my:configsyspages' : 'moodle/my:manageblocks', $context);
    }

    /**
     * Validate layout ownership, bounds, minimum size, uniqueness and overlap.
     *
     * Every rectangle must sit inside the MAX_COLUMNS x MAX_ROWS grid. The row ceiling matters as
     * much as the column one: the overlap check below visits every cell a block covers, so an
     * unbounded row span would let a single request drive an unbounded loop here, and the client
     * would then try to draw it.
     *
     * @param array $layout Layout items.
     * @param array $instances Available block instances.
     */
    private static function validate_layout(array $layout, array $instances): void {
        $minimum = self::get_minimum_size();
        $seen = [];
        $occupied = [];
        foreach ($layout as $item) {
            if (!isset($instances[$item['id']]) || isset($seen[$item['id']])) {
                throw new \invalid_parameter_exception('The layout contains an invalid or duplicate block.');
            }
            $seen[$item['id']] = true;
            if (
                $item['column'] < 0 || $item['row'] < 0
                    || $item['columns'] < $minimum['columns'] || $item['rows'] < $minimum['rows']
                    || $item['column'] + $item['columns'] > self::MAX_COLUMNS
                    || $item['row'] + $item['rows'] > self::MAX_ROWS
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
