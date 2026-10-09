import{fetchOne as e}from"@moodle/lms/core/ajax";/**
 * Dashboard web-service repository.
 *
 * @module     core_my/repository
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const a=3e4,l=t=>e({methodname:"core_my_get_dashboard",args:{sitedefault:t}}),g=(t,r,o=[],i="",s=0)=>e({methodname:"core_my_update_dashboard",args:{action:t,sitedefault:r,layout:o,blockname:i,blockid:s}},{timeout:a});export{a as UPDATE_TIMEOUT_MS,l as getDashboard,g as updateDashboard};
