import a from"@moodle/lms/core/config";import{fetchOne as i}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const d=3e4,u=e=>i({methodname:"core_my_get_dashboard",args:{sitedefault:e}}),p=(e,o,n=[],r="",t=0,s=null)=>i({methodname:"core_my_update_dashboard",args:{action:e,sitedefault:o,layout:n,blockname:r,blockid:t,revision:s}},{timeout:d}),h=(e,o,n,r)=>{const t=new URL(`${a.wwwroot}/lib/ajax/service.php`);t.searchParams.set("sesskey",a.sesskey),t.searchParams.set("info","core_my_update_dashboard");const s=(l,g,c)=>({index:l,methodname:"core_my_update_dashboard",args:{action:g,sitedefault:e,layout:[],blockname:"",blockid:0,...c}});return navigator.sendBeacon(t,JSON.stringify([s(0,"remove",{blockid:o,revision:r}),s(1,"save",{layout:n,revision:r===null?null:r+1})]))};export{d as UPDATE_TIMEOUT_MS,h as beaconRemoval,u as getDashboard,p as updateDashboard};
