import{fetchOne as e}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const n=t=>e({methodname:"core_my_get_dashboard",args:{sitedefault:t}}),l=(t,r,i=[],s="",o=0)=>e({methodname:"core_my_update_dashboard",args:{action:t,sitedefault:r,layout:i,blockname:s,blockid:o}});export{n as getDashboard,l as updateDashboard};
