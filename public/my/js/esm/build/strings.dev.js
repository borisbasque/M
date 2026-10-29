var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
import { useEffect, useState } from "react";
import Pending from "@moodle/lms/core/pending";
import { getString, getStrings } from "@moodle/lms/core/stringUtils";
const LABEL_STRINGS = {
  addblock: { key: "addblock", component: "core" },
  addblocktop: { key: "addblocktop", component: "my" },
  cancel: { key: "dashboardcancel", component: "my" },
  confirm: { key: "confirm", component: "core" },
  confirmreset: { key: "confirmresetdashboard", component: "my" },
  down: { key: "dashboarddown", component: "my" },
  emptycell: { key: "emptygridcell", component: "my" },
  left: { key: "dashboardleft", component: "my" },
  loading: { key: "loading", component: "core" },
  movecontrols: { key: "dashboardmovecontrols", component: "my" },
  moveinstructions: { key: "dashboardmovehandleinstructions", component: "my" },
  reset: { key: "resetpage", component: "my" },
  resetheading: { key: "resetdashboardheading", component: "my" },
  resize: { key: "resizeblock", component: "my" },
  resizecontrols: { key: "dashboardresizecontrols", component: "my" },
  resizeinstructions: { key: "dashboardresizehandleinstructions", component: "my" },
  right: { key: "dashboardright", component: "my" },
  scopeown: { key: "dashboardscopeown", component: "my" },
  scopesitedefault: { key: "dashboardscopesitedefault", component: "my" },
  up: { key: "dashboardup", component: "my" }
};
const useDashboardLabels = /* @__PURE__ */ __name(() => {
  const [labels, setLabels] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const names = Object.keys(LABEL_STRINGS);
    const pending = new Pending("core_my/dashboard:strings");
    getStrings(names.map((name) => LABEL_STRINGS[name])).then((values) => {
      if (!cancelled) {
        setLabels(Object.fromEntries(names.map((name, index) => [name, values[index]])));
      }
      return void 0;
    }).catch(() => {
    }).finally(() => pending.resolve());
    return () => {
      cancelled = true;
    };
  }, []);
  return labels;
}, "useDashboardLabels");
const useString = /* @__PURE__ */ __name((identifier, component, params) => {
  const [value, setValue] = useState("");
  const paramsKey = JSON.stringify(params ?? null);
  useEffect(() => {
    let cancelled = false;
    getString(identifier, component, params).then((resolved) => {
      if (!cancelled) {
        setValue(resolved);
      }
      return void 0;
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [identifier, component, paramsKey]);
  return value;
}, "useString");
export {
  useDashboardLabels,
  useString
};
//# sourceMappingURL=strings.dev.js.map
