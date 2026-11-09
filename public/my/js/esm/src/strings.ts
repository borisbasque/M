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
 * Language strings for the dashboard application.
 *
 * Strings are fetched through core/str (the stringUtils ESM module), as the React guidelines ask,
 * rather than shipped through the get_dashboard web service payload: the fixed set the application
 * needs is fetched once in a single batched request by useDashboardLabels(), and the per-block
 * strings (which take the block's title as a placeholder) by useString(), which leaves the
 * placeholder substitution to Moodle's own string formatting instead of reimplementing it here.
 *
 * @module     core_my/strings
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useState} from 'react';
import Pending from '@moodle/lms/core/pending';
import {getString, getStrings, type StringParams} from '@moodle/lms/core/stringUtils';

/** The fixed set of strings the application needs, by the short name the components use. */
export interface DashboardLabels {
    addblock: string;
    addblockhere: string;
    addblocks: string;
    addblockshort: string;
    cancel: string;
    clearsearch: string;
    close: string;
    confirm: string;
    confirmreset: string;
    down: string;
    edithint: string;
    editing: string;
    hiddenfromstudents: string;
    left: string;
    loading: string;
    movecontrols: string;
    moveinstructions: string;
    marketplace: string;
    noblocksfound: string;
    emptytitle: string;
    emptydescription: string;
    emptyreadonly: string;
    customise: string;
    onpage: string;
    reset: string;
    resetheading: string;
    resettodefault: string;
    resize: string;
    resizecontrols: string;
    resizeinstructions: string;
    right: string;
    scopedefaultshort: string;
    scopeown: string;
    scopeownshort: string;
    searchblocks: string;
    scopesitedefault: string;
    undo: string;
    up: string;
}

const LABEL_STRINGS: Record<keyof DashboardLabels, {key: string; component: string}> = {
    addblock: {key: 'addblock', component: 'core'},
    addblockhere: {key: 'addblockhere', component: 'my'},
    addblocks: {key: 'dashboardaddblocks', component: 'my'},
    addblockshort: {key: 'dashboardaddblock', component: 'my'},
    cancel: {key: 'dashboardcancel', component: 'my'},
    clearsearch: {key: 'clearsearch', component: 'core'},
    close: {key: 'closebuttontitle', component: 'core'},
    confirm: {key: 'confirm', component: 'core'},
    confirmreset: {key: 'confirmresetdashboard', component: 'my'},
    down: {key: 'dashboarddown', component: 'my'},
    edithint: {key: 'dashboardedithint', component: 'my'},
    editing: {key: 'dashboardediting', component: 'my'},
    hiddenfromstudents: {key: 'hiddenfromstudents', component: 'core'},
    left: {key: 'dashboardleft', component: 'my'},
    loading: {key: 'loading', component: 'core'},
    movecontrols: {key: 'dashboardmovecontrols', component: 'my'},
    moveinstructions: {key: 'dashboardmovehandleinstructions', component: 'my'},
    marketplace: {key: 'dashboardmarketplace', component: 'my'},
    noblocksfound: {key: 'dashboardnoblocksfound', component: 'my'},
    emptytitle: {key: 'dashboardemptytitle', component: 'my'},
    emptydescription: {key: 'dashboardemptydescription', component: 'my'},
    emptyreadonly: {key: 'dashboardemptyreadonly', component: 'my'},
    customise: {key: 'dashboardcustomise', component: 'my'},
    onpage: {key: 'dashboardblockonpage', component: 'my'},
    reset: {key: 'resetpage', component: 'my'},
    resetheading: {key: 'resetdashboardheading', component: 'my'},
    resettodefault: {key: 'dashboardreset', component: 'my'},
    resize: {key: 'resizeblock', component: 'my'},
    resizecontrols: {key: 'dashboardresizecontrols', component: 'my'},
    resizeinstructions: {key: 'dashboardresizehandleinstructions', component: 'my'},
    right: {key: 'dashboardright', component: 'my'},
    scopedefaultshort: {key: 'dashboardscopedefaultshort', component: 'my'},
    scopeown: {key: 'dashboardscopeown', component: 'my'},
    scopeownshort: {key: 'dashboardscopeownshort', component: 'my'},
    searchblocks: {key: 'dashboardsearchblocks', component: 'my'},
    scopesitedefault: {key: 'dashboardscopesitedefault', component: 'my'},
    undo: {key: 'dashboardundo', component: 'my'},
    up: {key: 'dashboardup', component: 'my'},
};

/**
 * Fetch the application's fixed set of strings, once, as one batched request.
 *
 * @return The labels, or null until they have been fetched.
 */
export const useDashboardLabels = (): DashboardLabels | null => {
    const [labels, setLabels] = useState<DashboardLabels | null>(null);

    useEffect(() => {
        let cancelled = false;
        const names = Object.keys(LABEL_STRINGS) as (keyof DashboardLabels)[];
        // Pending JavaScript (core/pending) for the same reason as the payload fetch in index.tsx:
        // the grid cannot render until these arrive, so whatever waits for the page must wait too.
        const pending = new Pending('core_my/dashboard:strings');
        getStrings(names.map(name => LABEL_STRINGS[name])).then(values => {
            if (!cancelled) {
                setLabels(Object.fromEntries(names.map((name, index) => [name, values[index]])) as DashboardLabels);
            }
            return undefined;
        }).catch(() => {
            // Leave the labels unresolved: the application keeps showing its loading state, and
            // the failed string request is already reported by core/str itself.
        }).finally(() => pending.resolve());
        return () => {
            cancelled = true;
        };
    }, []);

    return labels;
};

/**
 * Fetch one string, with placeholder values substituted by Moodle's string formatting.
 *
 * @param identifier The string identifier.
 * @param component The string's component.
 * @param params Placeholder values, if the string takes any.
 * @return The formatted string, or an empty string until it has been fetched.
 */
export const useString = (identifier: string, component: string, params?: StringParams): string => {
    const [value, setValue] = useState('');
    const paramsKey = JSON.stringify(params ?? null);

    useEffect(() => {
        let cancelled = false;
        getString(identifier, component, params).then(resolved => {
            if (!cancelled) {
                setValue(resolved);
            }
            return undefined;
        }).catch(() => {
            // As above: leave the value empty rather than guessing at it.
        });
        return () => {
            cancelled = true;
        };
        // The params object is identified by its serialised form (paramsKey), so that a
        // fresh-but-equal object on every render does not refetch.
    }, [identifier, component, paramsKey]);

    return value;
};
