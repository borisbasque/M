/**
 * Small helpers for the dashboard application.
 *
 * @module     core_my/utils
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const e=t=>!t.includes("<")&&!t.includes("&")?t:new DOMParser().parseFromString(t,"text/html").body.textContent??"";export{e as htmlToText};
