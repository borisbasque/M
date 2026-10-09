import{isMoodleAjaxError as r}from"@moodle/lms/core/ajax";/**
 * An ordered, retrying queue for dashboard changes, built for slow and unreliable connections.
 *
 * The dashboard applies every move, resize and removal on screen straight away and sends it to the
 * server afterwards. This queue is what makes that safe:
 *
 * - Changes are sent one at a time, in the order they were made, so a slow earlier request can
 *   never land after (and overwrite) a later one.
 * - Layout saves coalesce. Each save carries the whole layout, so while one is in flight, any
 *   further drops only replace the single queued save instead of each sending its own request.
 * - Transient failures (the request never reached the server, timed out, or the server was
 *   unavailable) are retried with a growing delay, or as soon as the browser reports it is back
 *   online. A definitive rejection from the server (a Moodle exception) is never retried.
 *
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const u=[1e3,2e3,4e3,8e3,16e3],l=a=>!r(a),i=()=>typeof navigator<"u"&&navigator.onLine===!1,y=a=>new Promise(t=>{const e=()=>{clearTimeout(n),window.removeEventListener("online",e),t()},n=i()?void 0:setTimeout(e,a);window.addEventListener("online",e)});class d{tasks=[];running=!1;sendLayout;onStatus;retryDelays;constructor({sendLayout:t,onStatus:e=()=>{},retryDelays:n=u}){this.sendLayout=t,this.onStatus=e,this.retryDelays=n}saveLayout(t){return new Promise((e,n)=>{const s={resolve:()=>e(),reject:n},o=this.tasks[this.tasks.length-1];o&&o.kind==="layout"&&(this.tasks.length>1||!this.running)?(o.layout=t,o.waiters.push(s)):this.tasks.push({kind:"layout",layout:t,waiters:[s]}),this.pump()})}call(t,e){return new Promise((n,s)=>{this.tasks.push({kind:"call",run:t,retryable:e,waiters:[{resolve:n,reject:s}]}),this.pump()})}get busy(){return this.running||this.tasks.length>0}async pump(){if(!this.running){for(this.running=!0;this.tasks.length;){const t=this.tasks[0];this.onStatus("saving");try{const e=await this.attempt(t);t.waiters.forEach(n=>n.resolve(e))}catch(e){t.waiters.forEach(n=>n.reject(e))}this.tasks.shift()}this.running=!1,this.onStatus("idle")}}async attempt(t){const e=t.kind==="layout"||t.retryable;for(let n=0;;n++)try{return await(t.kind==="layout"?this.sendLayout(t.layout):t.run())}catch(s){if(!e||!l(s)||n>=this.retryDelays.length)throw s;this.onStatus(i()?"offline":"retrying"),await y(this.retryDelays[n]),this.onStatus("saving")}}}export{u as DEFAULT_RETRY_DELAYS,d as SaveQueue,l as isTransientError};
