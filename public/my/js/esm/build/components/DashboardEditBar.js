import{Button as s,Dropdown as y,DropdownItemSelect as i}from"@moodlehq/design-system";import g from"@moodle/lms/core/config";import v,{renderIcon as n}from"./Icon";import{Fragment as f,jsx as a,jsxs as d}from"react/jsx-runtime";/**
 * The edit bar: a floating bar pinned to the bottom of the page while the dashboard is being edited.
 *
 * On the left it says what is being edited. People who may also edit the default dashboard for all
 * users get a subtle design system Dropdown there to switch between the two; everyone else sees
 * plain text. On the right are the actions, Add block being the only primary one. People leave Edit
 * mode with the page's own Edit mode switch.
 *
 * @module     core_my/components/DashboardEditBar
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const w=({siteDefault:r,canEditDefault:l,canUndo:p,labels:o,icons:e,onReset:m,onUndo:b,onAdd:h})=>{const c=t=>{window.location.href=`${g.wwwroot}${t}`};return d("div",{className:"core-my-dashboard-toolbar","data-region":"dashboard-edit-bar",children:[d("div",{className:"core-my-dashboard-toolbar__scope",children:[a(v,{markup:e.edit,className:"core-my-dashboard-toolbar__icon"}),l?d(f,{children:[a("span",{className:"core-my-dashboard-toolbar__label",children:o.editing}),d(y,{label:r?o.scopedefaultshort:o.scopeownshort,appearance:"subtle",children:[a(i,{label:o.scopeownshort,selected:!r,onClick:()=>r&&c("/my/")}),a(i,{label:o.scopedefaultshort,selected:r,onClick:()=>!r&&c("/my/indexsys.php")})]})]}):a("p",{className:"core-my-dashboard-scope",children:r?o.scopesitedefault:o.scopeown})]}),d("div",{className:"core-my-dashboard-toolbar__actions",children:[!r&&a(s,{variant:"ghost",size:"lg",label:o.resettodefault,startIcon:n(e.reset),onClick:m}),a(s,{variant:"outline-secondary",size:"lg",label:o.undo,startIcon:n(e.undo),disabled:!p,onClick:b}),a("span",{className:"core-my-dashboard-toolbar__divider","aria-hidden":"true"}),a(s,{variant:"primary",size:"lg","data-action":"add-block",label:o.addblockshort,startIcon:n(e.add),onClick:t=>h(t.currentTarget)})]})]})};var I=w;export{I as default};
