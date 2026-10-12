import{useEffect as s,useRef as u}from"react";import{requireAsync as d}from"@moodle/lms/core/amd";/**
 * Tell the page hosting the block when its first page of courses is in place.
 *
 * The block declares that it loads its content separately (block_myoverview::has_async_content()),
 * so pages that host blocks, such as the flexible dashboard, wait for it to report through
 * core_block/events instead of guessing. While the first load is outstanding the block's root is
 * marked busy and a core/pending key is held; when it settles, succeeded or failed, the
 * core_block/contentLoaded event fires. Reported once per mount.
 *
 * @module     block_myoverview/hooks/useReportContentLoaded
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function k(t,o,c){const r=u(null),l=u(!1);s(()=>{const e=t.current;if(!e)return;const i=new Promise((n,f)=>{r.current={resolve:n,reject:f}});d("core_block/events").then(n=>n.trackBlockContentLoading(e,i)).catch(()=>null)},[t]),s(()=>{o&&(l.current=!0);const e=r.current;e&&(c?(r.current=null,e.reject(new Error("Course overview could not load its courses."))):l.current&&!o&&(r.current=null,e.resolve()))},[o,c])}export{k as useReportContentLoaded};
