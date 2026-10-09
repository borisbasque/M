import i from"@moodle/lms/core/config";import{fetchOne as a}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const g=3e4,u=e=>a({methodname:"core_my_get_dashboard",args:{sitedefault:e}}),h=(e,r)=>a({methodname:"core_my_get_dashboard_block",args:{sitedefault:e,blockid:r}}),p=(e,r,n=[],t="",o=0,s=null)=>a({methodname:"core_my_update_dashboard",args:{action:e,sitedefault:r,layout:n,blockname:t,blockid:o,revision:s}},{timeout:g}),f=(e,r,n,t)=>{const o=new URL(`${i.wwwroot}/lib/ajax/service.php`);o.searchParams.set("sesskey",i.sesskey),o.searchParams.set("info","core_my_update_dashboard");const s=(l,c,d)=>({index:l,methodname:"core_my_update_dashboard",args:{action:c,sitedefault:e,layout:[],blockname:"",blockid:0,...d}});return navigator.sendBeacon(o,JSON.stringify([s(0,"remove",{blockid:r,revision:t}),s(1,"save",{layout:n,revision:t===null?null:t+1})]))};export{g as UPDATE_TIMEOUT_MS,f as beaconRemoval,u as getDashboard,h as getDashboardBlock,p as updateDashboard};
