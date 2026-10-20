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

namespace core_my\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use core_my\local\dashboard;

/**
 * Fetch the responsive dashboard data: blocks, layout, capabilities and UI labels the React
 * application needs to render a full dashboard load (see {@see \core_my\local\dashboard::get()}).
 * Called once on initial mount and again after any change that the client cannot safely predict
 * the server-side result of (e.g. adding a block, since its assigned position and rendered
 * content both come from the server).
 *
 * @package    core_my
 * @category   external
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class get_dashboard extends external_api {
    /**
     * Define parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sitedefault' => new external_value(PARAM_BOOL, 'Whether to fetch the site-default dashboard.'),
        ]);
    }

    /**
     * Execute the request.
     *
     * The site-default dashboard is a shared, admin-managed resource (context_system), so reading
     * it is gated by moodle/my:configsyspages; a user's own dashboard (context_user) needs no such
     * check here; whether the requesting user is even allowed to see it at all is already settled
     * by validate_context(), and whether they may edit it is a separate, less restrictive
     * capability check ('canedit' in the returned payload, not an access-control decision).
     *
     * @param bool $sitedefault Whether to fetch the site default.
     * @return array
     */
    public static function execute(bool $sitedefault): array {
        ['sitedefault' => $sitedefault] = self::validate_parameters(self::execute_parameters(), [
            'sitedefault' => $sitedefault,
        ]);
        $context = $sitedefault ? \context_system::instance() : \context_user::instance($GLOBALS['USER']->id);
        self::validate_context($context);
        if ($sitedefault) {
            require_capability('moodle/my:configsyspages', $context);
        }
        return dashboard::get($sitedefault);
    }

    /**
     * Define return data.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'blocks' => new external_multiple_structure(self::block_structure()),
            'layout' => new external_multiple_structure(self::layout_item_structure()),
            'availableblocks' => new external_multiple_structure(self::available_block_structure()),
            'grid' => new external_single_structure([
                'minsize' => new external_single_structure([
                    'columns' => new external_value(PARAM_INT, 'Minimum column span of a block.'),
                    'rows' => new external_value(PARAM_INT, 'Minimum row span of a block.'),
                ], 'Smallest size a block that declares no minimum of its own may be resized to.'),
                'autorowscap' => new external_value(PARAM_INT, 'The most rows a block sized to its content opens at.'),
            ], 'Grid rules the editor must enforce, as resolved by the server.'),
            'ownlayout' => new external_value(PARAM_BOOL, 'Whether this is the viewer\'s own stored dashboard.'),
            'revision' => new external_value(
                PARAM_INT,
                'The dashboard\'s current revision, to send with the first change made to it.',
            ),
            'discoverurl' => new external_value(
                PARAM_URL,
                'Where to discover more blocks, or null when the site does not use the Moodle Marketplace.',
                VALUE_REQUIRED,
                null,
                NULL_ALLOWED,
            ),
            'canedit' => new external_value(PARAM_BOOL, 'Whether the user may edit.'),
            'editing' => new external_value(PARAM_BOOL, 'Whether Edit mode is active.'),
            'sitedefault' => new external_value(PARAM_BOOL, 'Whether this is the site default.'),
            'caneditotherscope' => new external_value(
                PARAM_BOOL,
                'Whether the user may also edit the other dashboard scope (own page versus site default).'
            ),
            'urls' => new external_single_structure([
                'ownpage' => new external_value(PARAM_URL, 'URL of the user\'s own dashboard.'),
                'sitedefault' => new external_value(PARAM_URL, 'URL of the site-default dashboard.'),
            ]),
            'javascript' => new external_value(PARAM_RAW, 'Collected block JavaScript requirements.'),
            'labels' => new external_single_structure([
                'addblock' => new external_value(PARAM_RAW, 'Add block label.'),
                'blockactions' => new external_value(PARAM_RAW, 'Block actions menu trigger label.'),
                'addblocktop' => new external_value(PARAM_RAW, 'Top add block label.'),
                'addblockbottom' => new external_value(PARAM_RAW, 'Bottom add block label.'),
                'cancel' => new external_value(PARAM_RAW, 'Cancel label.'),
                'close' => new external_value(PARAM_RAW, 'Close label.'),
                'confirm' => new external_value(PARAM_RAW, 'Confirm label.'),
                'confirmremove' => new external_value(PARAM_RAW, 'Remove confirmation text.'),
                'confirmreset' => new external_value(PARAM_RAW, 'Reset confirmation text.'),
                'done' => new external_value(PARAM_RAW, 'Done label.'),
                'emptycell' => new external_value(PARAM_RAW, 'Empty cell label.'),
                'gridcell' => new external_value(PARAM_RAW, 'Grid cell position label.'),
                'loading' => new external_value(PARAM_RAW, 'Loading label.'),
                'move' => new external_value(PARAM_RAW, 'Move label.'),
                'movehere' => new external_value(PARAM_RAW, 'Shown on an empty space while a block is picked up to move.'),
                'moveinstructions' => new external_value(PARAM_RAW, 'Move handle instructions.'),
                'placemove' => new external_value(PARAM_RAW, 'An empty space\'s accessible name while a block is picked up to move.'),
                'placeresize' => new external_value(PARAM_RAW, 'An empty space\'s accessible name while a block is picked up to resize.'),
                'remove' => new external_value(PARAM_RAW, 'Remove label.'),
                'removeheading' => new external_value(PARAM_RAW, 'Remove dialog heading.'),
                'reset' => new external_value(PARAM_RAW, 'Reset label.'),
                'resetheading' => new external_value(PARAM_RAW, 'Reset dialog heading.'),
                'resize' => new external_value(PARAM_RAW, 'Resize label.'),
                'resizehere' => new external_value(PARAM_RAW, 'Shown on an empty space while a block is picked up to resize.'),
                'resizeinstructions' => new external_value(PARAM_RAW, 'Resize handle instructions.'),
                'retry' => new external_value(PARAM_RAW, 'Retry saving label.'),
                'savefailed' => new external_value(PARAM_RAW, 'Message shown when changes could not be saved.'),
                'saveoffline' => new external_value(PARAM_RAW, 'Message shown while offline with unsaved changes.'),
                'saveretrying' => new external_value(PARAM_RAW, 'Message shown while retrying a save.'),
                'scopeown' => new external_value(PARAM_RAW, 'Own-dashboard scope indicator label.'),
                'scopesitedefault' => new external_value(PARAM_RAW, 'Site-default scope indicator label.'),
                'switchtoown' => new external_value(PARAM_RAW, 'Switch-to-own-dashboard CTA label.'),
                'switchtositedefault' => new external_value(PARAM_RAW, 'Switch-to-site-default CTA label.'),
                'tile' => new external_value(PARAM_RAW, 'Dashboard tile label.'),
                'undo' => new external_value(PARAM_RAW, 'Undo label.'),
                'blockfailed' => new external_value(PARAM_RAW, 'Shown in a block whose content could not be loaded.'),
                'addblockhere' => new external_value(PARAM_RAW, 'Shown on an empty region on hover or focus.'),
                'dashboardblocks' => new external_value(PARAM_RAW, 'The grid\'s accessible name.'),
                'emptyregion' => new external_value(PARAM_RAW, 'An empty region\'s accessible name.'),
                'browserallpresent' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browserblocks' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browserdiscover' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browserfallbackdescription' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browserinsert' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browsernomatch' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'browsersearch' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'clearsearch' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'empty' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'opensinnewwindow' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
                'restoredefault' => new external_value(PARAM_RAW, 'Block browser or empty dashboard label.'),
            ]),
        ]);
    }

    /**
     * Structure of one rendered dashboard block, shared with {@see update_dashboard}.
     *
     * @param int $required VALUE_REQUIRED or VALUE_OPTIONAL.
     * @return external_single_structure
     */
    public static function block_structure(
        int $required = VALUE_REQUIRED,
        bool $allownull = NULL_NOT_ALLOWED,
    ): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Block instance id.'),
            'name' => new external_value(PARAM_PLUGIN, 'Block plugin name.'),
            'title' => new external_value(PARAM_RAW, 'Rendered block title.'),
            'content' => new external_value(PARAM_RAW, 'Rendered block content.'),
            'footer' => new external_value(PARAM_RAW, 'Rendered block footer.'),
            'region' => new external_value(PARAM_ALPHANUMEXT, 'Legacy block region.'),
            'weight' => new external_value(PARAM_INT, 'Legacy block weight.'),
            'actions' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_ALPHANUMEXT, 'Stable action identifier, e.g. edit or permissions.'),
                'label' => new external_value(PARAM_RAW, 'Action label.'),
                'url' => new external_value(PARAM_URL, 'Action URL.'),
                'modalform' => new external_value(
                    PARAM_RAW,
                    'Modal form class to open in place of navigating, or an empty string.'
                ),
            ]), 'The block\'s remaining editing-controls-menu actions.'),
            'asynccontent' => new external_value(
                PARAM_BOOL,
                'Whether the block reports when its asynchronously loaded content is in place.'
            ),
            'minsize' => new external_single_structure([
                'columns' => new external_value(PARAM_INT, 'Minimum column span.'),
                'rows' => new external_value(PARAM_INT, 'Minimum row span.'),
            ], 'The smallest size this block may be resized to: its own declaration, or the default.'),
            'preferredrows' => new external_value(
                PARAM_INT,
                'The row span the block declares it prefers, or null to follow its content.',
                VALUE_REQUIRED,
                null,
                NULL_ALLOWED,
            ),
            'maxrows' => new external_value(
                PARAM_INT,
                'The most rows the block opens at when sized to its content, or null for no maximum.',
                VALUE_REQUIRED,
                null,
                NULL_ALLOWED,
            ),
            'loaded' => new external_value(
                PARAM_BOOL,
                'Whether content and footer are filled in. A dashboard load sends none; '
                    . 'core_my_get_dashboard_block loads each block\'s own.',
            ),
        ], 'A dashboard block.', $required, null, $allownull);
    }

    /**
     * Structure of one dashboard layout item, shared with {@see update_dashboard}.
     *
     * @param int $required VALUE_REQUIRED or VALUE_OPTIONAL.
     * @return external_single_structure
     */
    public static function layout_item_structure(int $required = VALUE_REQUIRED): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Block instance id.'),
            'column' => new external_value(PARAM_INT, 'Zero-based column.'),
            'row' => new external_value(PARAM_INT, 'Zero-based row.'),
            'columns' => new external_value(PARAM_INT, 'Column span.'),
            'rows' => new external_value(PARAM_INT, 'Row span.'),
            'autorows' => new external_value(PARAM_BOOL, 'Whether the row span follows the block\'s content.'),
        ], 'A block\'s grid rectangle.', $required);
    }

    /**
     * Structure of one addable block, shared with {@see update_dashboard}.
     *
     * @return external_single_structure
     */
    public static function available_block_structure(): external_single_structure {
        return new external_single_structure([
            'name' => new external_value(PARAM_PLUGIN, 'Block plugin name.'),
            'title' => new external_value(PARAM_RAW, 'Block title.'),
            'description' => new external_value(
                PARAM_TEXT,
                'What the block does, in one sentence, or an empty string when it declares none.',
            ),
            'iconhtml' => new external_value(PARAM_RAW, 'The block\'s icon, rendered, or an empty string when it has none.'),
            'added' => new external_value(
                PARAM_BOOL,
                'Whether the block is already on the dashboard and allows only one, so cannot be added again.',
            ),
        ]);
    }
}
