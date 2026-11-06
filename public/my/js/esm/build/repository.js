import{fetchOne as e}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const s=t=>e({methodname:"core_my_get_dashboard",args:{sitedefault:t}}),d=(t,a,r=[],o="",i=0)=>e({methodname:"core_my_update_dashboard",args:{action:t,sitedefault:a,layout:r,blockname:o,blockid:i}});export{s as getDashboard,d as updateDashboard};
