import a from"@moodle/lms/core/config";import{fetchOne as n}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const c=3e4,p=e=>n({methodname:"core_my_get_dashboard",args:{sitedefault:e}}),u=(e,r)=>n({methodname:"core_my_get_dashboard_block",args:{sitedefault:e,blockid:r}}),h=(e,r,s=[],t="",o=0,i=null)=>n({methodname:"core_my_update_dashboard",args:{action:e,sitedefault:r,layout:s,blockname:t,blockid:o,revision:i}},{timeout:c}),f=(e,r,s,t)=>{const o=new URL(`${a.wwwroot}/lib/ajax/service.php`);o.searchParams.set("sesskey",a.sesskey),o.searchParams.set("info","core_my_update_dashboard");const i=(l,g,d)=>({index:l,methodname:"core_my_update_dashboard",args:{action:g,sitedefault:e,layout:[],blockname:"",blockid:0,...d}});return navigator.sendBeacon(o,JSON.stringify([i(0,"remove",{blockid:r,revision:t}),i(1,"save",{layout:s,revision:t===null?null:t+1})]))};export{c as UPDATE_TIMEOUT_MS,f as beaconRemoval,p as getDashboard,u as getDashboardBlock,h as updateDashboard};
