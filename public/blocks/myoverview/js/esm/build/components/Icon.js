import{jsx as i}from"react/jsx-runtime";/**
 * Thin FontAwesome icon wrapper (FA6 ships with Boost).
 *
 * @module     block_myoverview/components/Icon
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function s({name:a,variant:r="solid",className:n=""}){return i("i",{className:`fa-${r} fa-${a} ${n}`.trim(),"aria-hidden":"true"})}const o=a=>i("i",{className:`fa-solid fa-${a}`,"aria-hidden":"true"});export{s as default,o as faIcon};
