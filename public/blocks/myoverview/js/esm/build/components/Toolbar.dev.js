var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { jsxDEV } from "react/jsx-dev-runtime";
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
import { DEFAULT_VIEW } from "../types";
import { useStrings } from "../state";
import Dropdown from "@moodle/lms/block_myoverview/components/Dropdown";
import SearchInput from "@moodle/lms/block_myoverview/components/SearchInput";
const VIEW_ICON = {
  card: "table-cells-large",
  list: "list",
  summary: "bars"
};
function filterLabel(strings, f) {
  switch (f) {
    case "allincludinghidden":
      return strings.filterallincludinghidden;
    case "all":
      return strings.filterall;
    case "inprogress":
      return strings.filterinprogress;
    case "future":
      return strings.filterfuture;
    case "past":
      return strings.filterpast;
    case "favourites":
      return strings.filterfavourites;
    case "hidden":
      return strings.filterhidden;
    case "customfield":
      return strings.filtercustomfield;
    default:
      return f;
  }
}
__name(filterLabel, "filterLabel");
function filterGroup(val) {
  if (val.startsWith("cf:")) {
    return "customfield";
  }
  switch (val) {
    case "all":
    case "allincludinghidden":
      return "default";
    case "inprogress":
    case "future":
    case "past":
      return "timeline";
    case "favourites":
      return "favourites";
    case "hidden":
      return "removed";
    default:
      return val;
  }
}
__name(filterGroup, "filterGroup");
function ToolbarActions({
  showManage,
  showRequest,
  showCreate,
  managecourseurl,
  requestcourseurl,
  createcourseurl
}) {
  const strings = useStrings();
  return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-toolbar__group courseoverview-toolbar__group--actions", children: [
    showManage && /* @__PURE__ */ jsxDEV("a", { className: "btn btn-outline-primary btn-sm", href: managecourseurl, children: strings.managecourses }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 131,
      columnNumber: 17
    }, this),
    showRequest && /* @__PURE__ */ jsxDEV("a", { className: "btn btn-primary btn-sm", href: requestcourseurl, children: strings.requestcoursebutton }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 136,
      columnNumber: 17
    }, this),
    showCreate && /* @__PURE__ */ jsxDEV("a", { className: "btn btn-primary btn-sm", href: createcourseurl, children: [
      /* @__PURE__ */ jsxDEV("i", { className: "fa-solid fa-plus", "aria-hidden": "true" }, void 0, false, {
        fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
        lineNumber: 142,
        columnNumber: 21
      }, this),
      " ",
      strings.createcourse
    ] }, void 0, true, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 141,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
    lineNumber: 129,
    columnNumber: 9
  }, this);
}
__name(ToolbarActions, "ToolbarActions");
function buildFilterOptions(strings, config) {
  const options = [];
  for (const f of config.enabledfilters) {
    if (f === "customfield") {
      for (const cfv of config.customfieldvalues ?? []) {
        options.push({ value: `cf:${cfv.value}`, label: cfv.name });
      }
    } else {
      options.push({ value: f, label: filterLabel(strings, f) });
    }
  }
  return options;
}
__name(buildFilterOptions, "buildFilterOptions");
function Toolbar(props) {
  const {
    showControls,
    iszerostate,
    view,
    filter,
    sort,
    search,
    config,
    createcourseurl,
    managecourseurl,
    requestcourseurl,
    customfieldvalue,
    onView,
    onFilter,
    onSort,
    onSearch,
    onCustomFieldValue
  } = props;
  const strings = useStrings();
  const currentViewIcon = VIEW_ICON[view] ?? "table-cells-large";
  const filterOptions = buildFilterOptions(strings, config);
  const currentFilterValue = filter === "customfield" ? `cf:${customfieldvalue ?? ""}` : filter;
  const onFilterSelect = /* @__PURE__ */ __name((val) => {
    if (val.startsWith("cf:")) {
      onCustomFieldValue(val.slice(3));
      onFilter("customfield");
    } else {
      onFilter(val);
    }
  }, "onFilterSelect");
  const sortOptions = [
    { value: "title", label: strings.sortcoursename },
    // Short name sort is only available when extended course names are shown.
    ...config.showshortname ? [{ value: "shortname", label: strings.sortshortname }] : [],
    { value: "lastaccessed", label: strings.sortlastaccessed },
    { value: "startdate", label: strings.sortstartdate }
  ];
  const viewLabels = {
    card: strings.viewcard,
    list: strings.viewlist,
    summary: strings.viewsummary
  };
  const viewOptions = config.enabledviews.map((v) => ({ value: v, label: viewLabels[v] }));
  const selectedFilter = filterOptions.find((o) => o.value === currentFilterValue);
  const selectedSort = sortOptions.find((o) => o.value === sort);
  const selectedView = viewOptions.find((o) => o.value === view);
  const showManage = !!managecourseurl && !iszerostate;
  const showCreate = !!createcourseurl && !iszerostate;
  const showRequest = !!requestcourseurl;
  const showActions = showManage || showCreate || showRequest;
  return /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-toolbar", children: [
    showActions && /* @__PURE__ */ jsxDEV(
      ToolbarActions,
      {
        showManage,
        showRequest,
        showCreate,
        managecourseurl,
        requestcourseurl,
        createcourseurl
      },
      void 0,
      false,
      {
        fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
        lineNumber: 234,
        columnNumber: 17
      },
      this
    ),
    showControls && /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-toolbar__group courseoverview-toolbar__group--search", children: /* @__PURE__ */ jsxDEV(SearchInput, { value: search, onChange: onSearch }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 245,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 244,
      columnNumber: 13
    }, this),
    showControls && /* @__PURE__ */ jsxDEV("div", { className: "courseoverview-toolbar__group courseoverview-toolbar__group--tools", children: [
      filterOptions.length > 1 && /* @__PURE__ */ jsxDEV(
        Dropdown,
        {
          label: strings.filterresults,
          triggerAriaLabel: `${strings.filterresults}: ${selectedFilter?.label ?? ""}`,
          tooltip: strings.tooltipfilter,
          menuTitle: strings.filters,
          options: filterOptions,
          current: currentFilterValue,
          onSelect: onFilterSelect,
          active: false,
          groupOf: filterGroup,
          align: "start",
          showLabel: true
        },
        void 0,
        false,
        {
          fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
          lineNumber: 251,
          columnNumber: 21
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        Dropdown,
        {
          label: strings.sortcourses,
          triggerAriaLabel: `${strings.tooltipsort}: ${selectedSort?.label ?? ""}`,
          tooltip: strings.tooltipsort,
          icon: "sort",
          options: sortOptions,
          current: sort,
          onSelect: onSort,
          active: sort !== config.defaultsort,
          menuTitle: strings.sortby
        },
        void 0,
        false,
        {
          fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
          lineNumber: 268,
          columnNumber: 17
        },
        this
      ),
      viewOptions.length > 1 && /* @__PURE__ */ jsxDEV(
        Dropdown,
        {
          label: strings.changelayout,
          triggerAriaLabel: `${strings.tooltipview}: ${selectedView?.label ?? ""}`,
          tooltip: strings.tooltipview,
          icon: currentViewIcon,
          options: viewOptions,
          current: view,
          onSelect: onView,
          active: view !== DEFAULT_VIEW,
          menuTitle: strings.viewlabel
        },
        void 0,
        false,
        {
          fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
          lineNumber: 280,
          columnNumber: 21
        },
        this
      )
    ] }, void 0, true, {
      fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
      lineNumber: 249,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "public/blocks/myoverview/js/esm/src/components/Toolbar.tsx",
    lineNumber: 232,
    columnNumber: 9
  }, this);
}
__name(Toolbar, "Toolbar");
export {
  Toolbar as default
};
//# sourceMappingURL=Toolbar.dev.js.map
