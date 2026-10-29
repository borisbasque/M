import{useEffect as d,useState as m}from"react";import l from"@moodle/lms/core/pending";import{getString as y,getStrings as g}from"@moodle/lms/core/stringUtils";/**
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
 */const i={addblock:{key:"addblock",component:"core"},addblocktop:{key:"addblocktop",component:"my"},cancel:{key:"dashboardcancel",component:"my"},confirm:{key:"confirm",component:"core"},confirmreset:{key:"confirmresetdashboard",component:"my"},down:{key:"dashboarddown",component:"my"},emptycell:{key:"emptygridcell",component:"my"},left:{key:"dashboardleft",component:"my"},loading:{key:"loading",component:"core"},movecontrols:{key:"dashboardmovecontrols",component:"my"},moveinstructions:{key:"dashboardmovehandleinstructions",component:"my"},reset:{key:"resetpage",component:"my"},resetheading:{key:"resetdashboardheading",component:"my"},resize:{key:"resizeblock",component:"my"},resizecontrols:{key:"dashboardresizecontrols",component:"my"},resizeinstructions:{key:"dashboardresizehandleinstructions",component:"my"},right:{key:"dashboardright",component:"my"},scopeown:{key:"dashboardscopeown",component:"my"},scopesitedefault:{key:"dashboardscopesitedefault",component:"my"},up:{key:"dashboardup",component:"my"}},u=()=>{const[o,t]=m(null);return d(()=>{let e=!1;const s=Object.keys(i),a=new l("core_my/dashboard:strings");return g(s.map(n=>i[n])).then(n=>{e||t(Object.fromEntries(s.map((r,c)=>[r,n[c]])))}).catch(()=>{}).finally(()=>a.resolve()),()=>{e=!0}},[]),o},k=(o,t,e)=>{const[s,a]=m(""),n=JSON.stringify(e??null);return d(()=>{let r=!1;return y(o,t,e).then(c=>{r||a(c)}).catch(()=>{}),()=>{r=!0}},[o,t,n]),s};export{u as useDashboardLabels,k as useString};
