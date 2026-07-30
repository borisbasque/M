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
 * Course overview toolbar (MDL-88972, MDL-88976).
 *
 * Left: server-computed action links (Manage / Create / Request course), shown
 * whenever the matching URL is supplied by PHP (capability-gated server-side).
 * Right: search, a labelled filter dropdown, and icon-only sort and layout
 * dropdowns. When the custom-field grouping is active a value selector appears.
 * Filter/sort/layout show an active state when their value is non-default;
 * defaults are filter = All, sort = A-Z, view = card. The available filter and
 * view options are limited to those enabled in the block's admin settings.
 *
 * @module     block_myoverview/components/Toolbar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import type {Config, Filter, Sort, View} from "../types";
import {DEFAULT_VIEW} from "../types";
import {useStrings} from "../state";
import Dropdown from "@moodle/lms/block_myoverview/components/Dropdown";
import SearchInput from "@moodle/lms/block_myoverview/components/SearchInput";


type ToolbarProps = {
    showControls: boolean;
    iszerostate: boolean;
    view: View;
    filter: Filter;
    sort: Sort;
    search: string;
    config: Config;
    createcourseurl?: string | null;
    managecourseurl?: string | null;
    requestcourseurl?: string | null;
    customfieldvalue: string | null;
    onView: (v: View) => void;
    onFilter: (f: Filter) => void;
    onSort: (s: Sort) => void;
    onSearch: (s: string) => void;
    onCustomFieldValue: (v: string) => void;
};


const VIEW_ICON: Record<View, string> = {
    card: "table-cells-large",
    list: "list",
    summary: "bars",
};

/**
 * Filter label lookup for the standard groupings.
 *
 * @param strings The resolved UI strings.
 * @param f The filter value.
 * @returns The localised filter label.
 */
function filterLabel(strings: ReturnType<typeof useStrings>, f: Filter): string {
    switch (f) {
        case "allincludinghidden": return strings.filterallincludinghidden;
        case "all": return strings.filterall;
        case "inprogress": return strings.filterinprogress;
        case "future": return strings.filterfuture;
        case "past": return strings.filterpast;
        case "favourites": return strings.filterfavourites;
        case "hidden": return strings.filterhidden;
        case "customfield": return strings.filtercustomfield;
        default: return f;
    }
}

/**
 * Semantic grouping for the filter menu dividers (Figma 4616:65101 / 4616:16251): a divider is
 * drawn where consecutive options fall into different groups. Keyed on filter values (not
 * labels) so translations never affect the grouping.
 *
 * @param val The filter option value (may be a cf:-encoded custom-field value).
 * @returns The group name.
 */
function filterGroup(val: string): string {
    if (val.startsWith("cf:")) {
        return "customfield";
    }
    switch (val) {
        case "all":
        case "allincludinghidden": return "default";
        case "inprogress":
        case "future":
        case "past": return "timeline";
        case "favourites": return "favourites";
        case "hidden": return "removed";
        default: return val;
    }
}

type ToolbarActionsProps = {
    showManage: boolean;
    showRequest: boolean;
    showCreate: boolean;
    managecourseurl?: string | null;
    requestcourseurl?: string | null;
    createcourseurl?: string | null;
};

/**
 * The Manage / Request / Create action links row.
 *
 * @param props Visibility flags and the capability-gated URLs.
 * @returns The actions group element.
 */
function ToolbarActions({
    showManage, showRequest, showCreate, managecourseurl, requestcourseurl, createcourseurl,
}: ToolbarActionsProps) {
    const strings = useStrings();
    return (
        <div className="courseoverview-toolbar__group courseoverview-toolbar__group--actions">
            {showManage && (
                <a className="btn btn-outline-primary btn-sm" href={managecourseurl as string}>
                    {strings.managecourses}
                </a>
            )}
            {showRequest && (
                <a className="btn btn-primary btn-sm" href={requestcourseurl as string}>
                    {strings.requestcoursebutton}
                </a>
            )}
            {showCreate && (
                <a className="btn btn-primary btn-sm" href={createcourseurl as string}>
                    <i className="fa-solid fa-plus" aria-hidden="true" /> {strings.createcourse}
                </a>
            )}
        </div>
    );
}

/**
 * Build the grouping options, only offering filters the admin has enabled.
 *
 * When the custom-field grouping is enabled and has values, its values are listed inline
 * (like the old block) so that selecting one applies the 'customfield' grouping and its
 * value together. Such options are encoded as `cf:<value>` and decoded in onFilterSelect.
 *
 * @param strings The resolved UI strings.
 * @param config The block configuration.
 * @returns The dropdown options.
 */
function buildFilterOptions(
    strings: ReturnType<typeof useStrings>,
    config: Config,
): Array<{value: string; label: string}> {
    const options: Array<{value: string; label: string}> = [];
    for (const f of config.enabledfilters) {
        if (f === "customfield") {
            for (const cfv of config.customfieldvalues ?? []) {
                options.push({value: `cf:${cfv.value}`, label: cfv.name});
            }
        } else {
            options.push({value: f, label: filterLabel(strings, f)});
        }
    }
    return options;
}

/**
 * Render the toolbar.
 *
 * @param props Toolbar state and handlers.
 * @returns The toolbar element.
 */
export default function Toolbar(props: ToolbarProps) {
    const {
        showControls, iszerostate, view, filter, sort, search, config,
        createcourseurl, managecourseurl, requestcourseurl, customfieldvalue,
        onView, onFilter, onSort, onSearch, onCustomFieldValue,
    } = props;
    const strings = useStrings();
    const currentViewIcon = VIEW_ICON[view] ?? "table-cells-large";

    const filterOptions = buildFilterOptions(strings, config);
    const currentFilterValue = filter === "customfield" ? `cf:${customfieldvalue ?? ""}` : filter;
    const onFilterSelect = (val: string) => {
        if (val.startsWith("cf:")) {
            onCustomFieldValue(val.slice(3));
            onFilter("customfield");
        } else {
            onFilter(val as Filter);
        }
    };

    const sortOptions = [
        {value: "title" as Sort, label: strings.sortcoursename},
        // Short name sort is only available when extended course names are shown.
        ...(config.showshortname ? [{value: "shortname" as Sort, label: strings.sortshortname}] : []),
        {value: "lastaccessed" as Sort, label: strings.sortlastaccessed},
        {value: "startdate" as Sort, label: strings.sortstartdate},
    ];

    const viewLabels: Record<View, string> = {
        card: strings.viewcard,
        list: strings.viewlist,
        summary: strings.viewsummary,
    };
    const viewOptions = config.enabledviews.map((v) => ({value: v, label: viewLabels[v]}));

    const selectedFilter = filterOptions.find((o) => o.value === currentFilterValue);
    const selectedSort = sortOptions.find((o) => o.value === sort);
    const selectedView = viewOptions.find((o) => o.value === view);

    // In a genuine zero-state the create/manage CTAs are rendered inside the empty-state card
    // (with context-aware labels), so the toolbar only keeps the persistent Request button there
    // to avoid duplicate CTAs. A filter/search that matches nothing is NOT a zero-state (its
    // "no results" card has no CTAs), so the toolbar keeps all applicable actions there.
    const showManage = !!managecourseurl && !iszerostate;
    const showCreate = !!createcourseurl && !iszerostate;
    const showRequest = !!requestcourseurl;
    const showActions = showManage || showCreate || showRequest;

    return (
        <div className="courseoverview-toolbar">
            {showActions && (
                <ToolbarActions
                    showManage={showManage}
                    showRequest={showRequest}
                    showCreate={showCreate}
                    managecourseurl={managecourseurl}
                    requestcourseurl={requestcourseurl}
                    createcourseurl={createcourseurl}
                />
            )}
            {showControls && (
            <div className="courseoverview-toolbar__group courseoverview-toolbar__group--search">
                <SearchInput value={search} onChange={onSearch} />
            </div>
            )}
            {showControls && (
            <div className="courseoverview-toolbar__group courseoverview-toolbar__group--tools">
                {filterOptions.length > 1 && (
                    <Dropdown<string>
                        label={strings.filterresults}
                        triggerAriaLabel={`${strings.filterresults}: ${selectedFilter?.label ?? ""}`}
                        tooltip={strings.tooltipfilter}
                        menuTitle={strings.filters}
                        options={filterOptions}
                        current={currentFilterValue}
                        onSelect={onFilterSelect}
                        // The filter shows its current selection as a visible label, so it keeps the
                        // default outline look rather than adopting the dark active-chip state that
                        // the icon-only sort/view buttons use to signal a non-default value.
                        active={false}
                        groupOf={filterGroup}
                        align="start"
                        showLabel
                    />
                )}
                <Dropdown<Sort>
                    label={strings.sortcourses}
                    triggerAriaLabel={`${strings.tooltipsort}: ${selectedSort?.label ?? ""}`}
                    tooltip={strings.tooltipsort}
                    icon="sort"
                    options={sortOptions}
                    current={sort}
                    onSelect={onSort}
                    active={sort !== config.defaultsort}
                    menuTitle={strings.sortby}
                />
                {viewOptions.length > 1 && (
                    <Dropdown<View>
                        label={strings.changelayout}
                        triggerAriaLabel={`${strings.tooltipview}: ${selectedView?.label ?? ""}`}
                        tooltip={strings.tooltipview}
                        icon={currentViewIcon}
                        options={viewOptions}
                        current={view}
                        onSelect={onView}
                        active={view !== DEFAULT_VIEW}
                        menuTitle={strings.viewlabel}
                    />
                )}
            </div>
            )}
        </div>
    );
}
