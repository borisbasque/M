import{useCallback as F,useLayoutEffect as q,useRef as p,useState as I}from"react";import{getCourses as G}from"../repository";import{PAGE_SIZE as T}from"../types";/**
 * Server-side paging orchestration for the course overview block.
 *
 * Each page is fetched with limit PAGE_SIZE, chaining offsets through the web
 * service's returned nextoffset — the only offset arithmetic valid for every
 * classification (favourites/customfield filter after retrieval, so the number
 * of records kept is smaller than the number processed). Whenever the current
 * page is full, the next page is silently prefetched, matching the old AMD
 * block's two-pages-per-fetch model; "Next" only enables once that prefetch
 * confirms a non-empty page. A failed prefetch is retried a bounded number of
 * times so a transient error cannot permanently disable "Next".
 *
 * A search is mutually exclusive with the grouping filter (the search
 * classification overrides it, as the old block behaved) and never touches the
 * filter preference.
 *
 * Guards: queryKeyRef ignores responses that land after the query changed
 * (fetchOne has no per-call cancellation); generationRef ignores responses that
 * land after refetchAfterToggle() replaced the paged data; inflightRef prevents
 * duplicate fetches of the same page.
 *
 * @module     block_myoverview/hooks/usePagedCourses
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const K=3;function Z({state:M,dispatch:u,config:O,debouncedSearch:y}){const{view:P,filter:S,sort:d,page:h,customfieldvalue:C,pages:E,pageOffsets:k}=M,A=y.trim()!=="",b=P==="summary",l=JSON.stringify(A?["search",d,y,b]:[S,d,C,b]),o=p(null),a=p(0),f=p(new Set),g=p(new Map),[D,L]=I(0),R=p({page:h,filter:S,sort:d,view:P,customfieldvalue:C,searching:A,debouncedSearch:y});R.current={page:h,filter:S,sort:d,view:P,customfieldvalue:C,searching:A,debouncedSearch:y};const _=i=>{const e=R.current,t=!e.searching&&e.filter==="customfield";return{classification:e.searching?"search":e.filter,sort:e.sort,limit:T,offset:i,view:e.view,customfieldname:t?O.customfieldname:void 0,customfieldvalue:t?e.customfieldvalue??void 0:void 0,searchvalue:e.searching?e.debouncedSearch:void 0}};q(()=>{if(o.current!==l){o.current=l,a.current++,f.current.clear(),g.current.clear(),u({type:"RESET_PAGES"});return}const i=a.current,e=async(r,m)=>{f.current.add(r),m||u({type:"SET_LOADING"});try{const{courses:n,nextoffset:c}=await G(_(k[r]??0));if(o.current!==l||a.current!==i)return;f.current.delete(r),g.current.delete(r),u({type:"PAGE_LOADED",index:r,courses:n,nextoffset:c})}catch{if(o.current!==l||a.current!==i)return;if(f.current.delete(r),!m){u({type:"SET_ERROR",error:"loadfailed"});return}const n=(g.current.get(r)??0)+1;g.current.set(r,n),n<K&&L(c=>c+1)}},t=h-1;if(E[t]===void 0){f.current.has(t)||e(t,!1);return}const s=t+1;E[t].length===T&&E[s]===void 0&&!f.current.has(s)&&e(s,!0)},[l,h,E,D]);const U=F(()=>{const i=o.current,e=++a.current;f.current.clear(),g.current.clear();const t=R.current.page;(async()=>{const s=[],r=[0];let m=0;try{for(let c=0;c<t;c++){const{courses:v,nextoffset:w}=await G(_(m));if(o.current!==i||a.current!==e)return;if(s[c]=v,r[c+1]=w,m=w,v.length<T)break}}catch{if(o.current!==i||a.current!==e)return;u({type:"RESET_PAGES"});return}if(R.current.page!==t)return;let n=Math.min(t,s.length);for(;n>1&&(s[n-1]??[]).length===0;)n--;u({type:"REPLACE_PAGES",pages:s,pageOffsets:r,page:Math.max(1,n)})})()},[u]);return{searching:A,refetchAfterToggle:U}}export{Z as usePagedCourses};
