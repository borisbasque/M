import{useEffect as i,useRef as t}from"react";import{requireAsync as E}from"@moodle/lms/core/amd";/**
 * Tell the page hosting the block when its courses are in place.
 *
 * The block declares that it loads its content separately (block_myoverview::has_async_content()),
 * so pages that host blocks, such as the flexible dashboard, wait for it to report through
 * core_block/events instead of guessing. While the first load is outstanding the block's root is
 * marked busy and a core/pending key is held; when it settles, succeeded or failed, the
 * core_block/contentLoaded event fires. After that, the block reports again whenever what it shows
 * changes: a later load finishing (filter, sort, search, a page not yet loaded) or a change of view
 * or page, once the new content has rendered. A page can then fit the block to its content again.
 *
 * @module     block_myoverview/hooks/useReportContentLoaded
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function w(u,r,s,v){const o=t(null),a=t(!1),l=t(!1),f=t(!1),d=t(null),m=()=>{const e=u.current;if(!l.current||!e)return;const n=requestAnimationFrame(()=>d.current?.notifyBlockContentLoaded(e,s));return()=>cancelAnimationFrame(n)};i(()=>{const e=u.current;if(!e)return;const n=new Promise((c,k)=>{o.current={resolve:c,reject:k}});E("core_block/events").then(c=>(d.current=c,c.trackBlockContentLoading(e,n))).catch(()=>null)},[u]),i(()=>{const e=f.current&&!r;f.current=r,r&&(a.current=!0);const n=o.current;if(!n)return e?m():void 0;s?(o.current=null,l.current=!0,n.reject(new Error("Course overview could not load its courses."))):a.current&&!r&&(o.current=null,l.current=!0,n.resolve())},[r,s]),i(()=>m(),[v])}export{w as useReportContentLoaded};
