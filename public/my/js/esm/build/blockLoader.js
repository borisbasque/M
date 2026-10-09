/**
 * Loads dashboard blocks' content one block per request, a few at a time, visible blocks first.
 *
 * The dashboard's layout arrives first, without any block's content (see core_my_get_dashboard).
 * Each block's content then loads on its own (core_my_get_dashboard_block), so one slow block never
 * holds up the others, and a limit on requests at once keeps a busy dashboard from flooding the
 * server or a slow connection. Blocks start in reading order; a block scrolled into view jumps the
 * queue.
 *
 * @module     core_my/blockLoader
 * @copyright  2026 Moodle Pty Ltd <support@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const e=4;class o{waiting=[];started=new Set;running=0;stopped=!1;options;constructor(i){this.options={concurrency:4,...i}}enqueue(i){i.forEach(t=>{!this.started.has(t)&&!this.waiting.includes(t)&&this.waiting.push(t)}),this.pump()}prioritise(i){const t=this.waiting.indexOf(i);t>0&&(this.waiting.splice(t,1),this.waiting.unshift(i))}stop(){this.stopped=!0,this.waiting.length=0}pump(){for(;!this.stopped&&this.running<this.options.concurrency&&this.waiting.length;){const i=this.waiting.shift();this.started.add(i),this.running++,this.options.fetch(i).then(t=>{this.stopped||this.options.onLoaded(i,t)},t=>{this.stopped||this.options.onFailed(i,t)}).finally(()=>{this.running--,this.pump()})}}}export{e as BLOCK_LOAD_CONCURRENCY,o as BlockLoader};
