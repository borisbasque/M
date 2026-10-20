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

/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import config from '@moodle/lms/core/config';
import {fetchOne} from '@moodle/lms/core/ajax';
import type {GridSize, LayoutItem} from './layout';

export interface BlockAction {
    id: string;
    label: string;
    url: string;
    modalform: string;
}

export interface DashboardBlock {
    id: number;
    name: string;
    title: string;
    content: string;
    footer: string;
    region: string;
    weight: number;
    actions: BlockAction[];
    // Whether the block reports when its asynchronously loaded content is in place
    // (block_base::has_async_content(), via the core_block/contentLoaded event).
    asynccontent: boolean;
    // The smallest size this block may be resized to: its own Block API declaration, or the default.
    minsize: GridSize;
    // The row span the block declares it prefers, or null to follow its content.
    preferredrows: number | null;
    // The most rows the block opens at when it follows its content, or null for no maximum
    // (block_base::get_grid_maximum_rows()). Absent from older payloads: the grid's autorowscap applies.
    maxrows?: number | null;
    // Whether content and footer are filled in. A dashboard load sends every block without them;
    // each block's own then loads separately (see getDashboardBlock()).
    loaded: boolean;
    // Set when the block's content could not be loaded.
    failed?: boolean;
}

/** One block's rendered content, loaded on its own. */
export interface DashboardBlockContent {
    // The block, rendered, or null when it has nothing to show the viewer.
    block: DashboardBlock | null;
    // The JavaScript the block needs to run.
    javascript: string;
}

export interface AvailableBlock {
    name: string;
    title: string;
    // What the block does, in one sentence, or '' when it declares none.
    description: string;
    // The block's icon, rendered by the server, or '' when it has none.
    iconhtml: string;
    // Already on the dashboard, and only one is allowed: listed only so the browser can say so.
    added: boolean;
}

export interface DashboardLabels {
    addblock: string;
    addblocktop: string;
    addblockbottom: string;
    blockactions: string;
    cancel: string;
    close: string;
    confirm: string;
    confirmremove: string;
    confirmreset: string;
    done: string;
    emptycell: string;
    loading: string;
    gridcell: string;
    move: string;
    movehere: string;
    moveinstructions: string;
    placemove: string;
    placeresize: string;
    remove: string;
    removeheading: string;
    reset: string;
    resetheading: string;
    resize: string;
    resizehere: string;
    resizeinstructions: string;
    retry: string;
    savefailed: string;
    saveoffline: string;
    saveretrying: string;
    scopeown: string;
    scopesitedefault: string;
    switchtoown: string;
    switchtositedefault: string;
    browserallpresent: string;
    browserblocks: string;
    browserdiscover: string;
    browserfallbackdescription: string;
    browserinsert: string;
    browsernomatch: string;
    browsersearch: string;
    clearsearch: string;
    empty: string;
    opensinnewwindow: string;
    restoredefault: string;
    addblockhere: string;
    blockfailed: string;
    dashboardblocks: string;
    emptyregion: string;
    tile: string;
    undo: string;
}

export interface DashboardUrls {
    ownpage: string;
    sitedefault: string;
}

/** Grid rules resolved by the server, which the editor enforces. */
export interface DashboardGrid {
    minsize: GridSize;
    // The most rows a block sized to its content opens at.
    autorowscap: number;
}

export interface DashboardData {
    blocks: DashboardBlock[];
    layout: LayoutItem[];
    availableblocks: AvailableBlock[];
    grid: DashboardGrid;
    // Whether this is the viewer's own stored dashboard: only then are measured heights saved.
    ownlayout: boolean;
    // The dashboard's revision: sent with each change, so one made from an out-of-date window is refused.
    revision: number;
    // Where to discover more blocks, or null when the site does not use the Moodle Marketplace.
    discoverurl: string | null;
    canedit: boolean;
    editing: boolean;
    sitedefault: boolean;
    caneditotherscope: boolean;
    urls: DashboardUrls;
    javascript: string;
    labels: DashboardLabels;
}

export interface UpdateResult {
    status: boolean;
    blockid: number;
    /** After 'add': the new block, rendered. */
    block?: DashboardBlock;
    /** After 'add': the new block's grid rectangle. */
    layoutitem?: LayoutItem;
    /** After 'add': the JavaScript the new block needs to run. */
    javascript?: string;
    /** After 'add' or 'remove': the blocks that can now be added. */
    availableblocks?: AvailableBlock[];
    /** After 'save', 'add' or 'remove': the dashboard's new revision. */
    revision?: number;
}

/**
 * How long to wait for a dashboard change before treating it as failed, in milliseconds.
 *
 * Without a limit a request on a stalled connection never settles, and every change queued behind
 * it (see saveQueue.ts) waits forever. Generous, because a slow connection is not a dead one.
 */
export const UPDATE_TIMEOUT_MS = 30000;

export const getDashboard = (siteDefault: boolean): Promise<DashboardData> => fetchOne<DashboardData>({
    methodname: 'core_my_get_dashboard',
    args: {sitedefault: siteDefault},
});

/**
 * Load one block's content, after the dashboard's layout has arrived without it.
 *
 * @param siteDefault Whether the block is on the site default dashboard.
 * @param blockid The block instance id.
 * @return The block, rendered, and the JavaScript it needs.
 */
export const getDashboardBlock = (siteDefault: boolean, blockid: number): Promise<DashboardBlockContent> =>
    fetchOne<DashboardBlockContent>({
        methodname: 'core_my_get_dashboard_block',
        args: {sitedefault: siteDefault, blockid},
    });

export const updateDashboard = (
    action: 'save' | 'add' | 'remove' | 'reset',
    siteDefault: boolean,
    layout: LayoutItem[] = [],
    blockname = '',
    blockid = 0,
    revision: number | null = null,
): Promise<UpdateResult> => fetchOne<UpdateResult>({
    methodname: 'core_my_update_dashboard',
    args: {
        action,
        sitedefault: siteDefault,
        layout,
        blockname,
        blockid,
        revision,
    },
}, {timeout: UPDATE_TIMEOUT_MS});

/**
 * Send a block's removal, and the layout without it, as the page is being left.
 *
 * Requests made through core/ajax are aborted when the page unloads, so this uses a beacon, which
 * the browser finishes sending after the page has gone - as the TinyMCE autosave and H5P do. Both
 * changes travel in one batched request, removal first, the layout carrying the revision the
 * removal moves the dashboard on to.
 *
 * @param siteDefault Whether the site default is being changed.
 * @param blockid The block to remove.
 * @param layout The layout without it.
 * @param revision The revision the removal is made from, or null to skip the check.
 * @return Whether the browser accepted the beacon for sending.
 */
export const beaconRemoval = (
    siteDefault: boolean,
    blockid: number,
    layout: LayoutItem[],
    revision: number | null,
): boolean => {
    const url = new URL(`${config.wwwroot}/lib/ajax/service.php`);
    url.searchParams.set('sesskey', config.sesskey);
    url.searchParams.set('info', 'core_my_update_dashboard');
    const call = (index: number, action: 'remove' | 'save', args: Record<string, unknown>) => ({
        index,
        methodname: 'core_my_update_dashboard',
        args: {action, sitedefault: siteDefault, layout: [], blockname: '', blockid: 0, ...args},
    });
    return navigator.sendBeacon(url, JSON.stringify([
        call(0, 'remove', {blockid, revision}),
        call(1, 'save', {layout, revision: revision === null ? null : revision + 1}),
    ]));
};
