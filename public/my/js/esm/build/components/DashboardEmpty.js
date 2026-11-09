import{Button as i}from"@moodlehq/design-system";import{renderIcon as m}from"./Icon";import{jsx as a,jsxs as o}from"react/jsx-runtime";/**
 * What the dashboard shows outside edit mode when it has no blocks.
 *
 * People who can edit it get a way to start (turning on edit mode, where blocks are added) and,
 * on their own dashboard, to put back the site's default blocks. Everyone else gets a short note.
 * Figma: Dashboard empty state (V2).
 *
 * @module     core_my/components/DashboardEmpty
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const c=({labels:e,icons:t,canEdit:r,onCustomise:s,onReset:d})=>o("section",{className:"core-my-dashboard-empty","aria-labelledby":"core-my-dashboard-empty-title",children:[a("span",{className:"core-my-dashboard-empty__icon","aria-hidden":"true",children:a("i",{className:"fa-solid fa-table-cells-large"})}),o("div",{className:"core-my-dashboard-empty__text",children:[a("h2",{id:"core-my-dashboard-empty-title",className:"core-my-dashboard-empty__title",children:e.emptytitle}),a("p",{className:"core-my-dashboard-empty__description",children:r?e.emptydescription:e.emptyreadonly})]}),r&&o("div",{className:"core-my-dashboard-empty__actions",children:[s&&a(i,{variant:"primary",size:"lg",label:e.customise,startIcon:m(t.edit),onClick:s}),d&&a(i,{variant:"outline-secondary",size:"lg",label:e.resettodefault,startIcon:m(t.reset),onClick:d})]})]});var l=c;export{l as default};
