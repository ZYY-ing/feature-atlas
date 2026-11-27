import {setupInspectorResize} from './panel-resize.js';
import {createSourceTools} from './source-reader.js';
import {callPathsHtml} from './call-path.js';
const registry=await fetch(new URL('../features/registry.json',import.meta.url)).then(r=>r.json());
const feature=registry.find(f=>f.id===new URLSearchParams(location.search).get('feature'))||registry[0];
const atlasUrl=new URL('../features/'+feature.data.replace(/^\.\//,''),import.meta.url);
const atlas=await fetch(atlasUrl).then(r=>{if(!r.ok)throw Error('无法载入特性数据');return r.json()});
const sourceTools=createSourceTools({files:atlas.sourceFiles||{},baseUrl:atlasUrl});
const {nodes,scenes,manifest}=atlas, byId=new Map(nodes.map(n=>[n.id,n]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=items=>`<ol>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`;
const logo='<svg viewBox="0 0 32 32"><rect x="3" y="3" width="10" height="10" rx="3"/><rect x="19" y="19" width="10" height="10" rx="3"/><path d="M13 8h11v11M8 13v11h11" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
let state={scene:'overview',selected:null,tab:'principle',backend:'ALLTOALL',zoom:1};
function restore(){const q=new URLSearchParams(location.hash.slice(1));if(scenes.some(s=>s.id===q.get('view')))state.scene=q.get('view');state.selected=byId.has(q.get('node'))?q.get('node'):null;if(['ALLTOALL','ALLGATHER','MC2','FUSED_MC2'].includes(q.get('backend')))state.backend=q.get('backend');if(['principle','tensor','code'].includes(q.get('tab')))state.tab=q.get('tab');}
restore();
function scene(){const s=scenes.find(s=>s.id===state.scene)||scenes[0];return {...s,...s.variants?.[state.backend]};}
function urlState(){history.replaceState(null,'',`#view=${state.scene}${state.selected?'&node='+state.selected:''}${scene().variants?'&backend='+state.backend:''}${state.tab!=='principle'?'&tab='+state.tab:''}`)}
document.body.classList.toggle('dark',localStorage.getItem('feature-atlas-theme')==='dark');
document.querySelector('#app').innerHTML=`
<header class="topbar"><a class="brand" href="#view=overview">${logo}<span>Feature<span class="light">Atlas</span><small>读懂特性，沿着源码走</small></span></a><label class="feature-pick"><select aria-label="选择特性">${registry.map(f=>`<option value="${esc(f.id)}" ${f.id===feature.id?'selected':''}>${esc(f.label)}</option>`).join('')}</select></label><div class="versions">${Object.entries(manifest.versions).map(([key,v])=>`<a href="https://github.com/${v.repo}/tree/${v.sha}" target="_blank" rel="noreferrer">${key==='vllm'?'vLLM':'Ascend'} <code>${v.sha.slice(0,7)}</code></a>`).join('')}<span class="badge">MRv2</span></div><div class="header-actions"><button id="help">版本与核查</button><button id="theme" aria-label="切换明暗主题">◐</button><a href="https://github.com/ZYY-ing/feature-atlas" target="_blank" rel="noreferrer">GitHub</a></div></header>
<nav class="framework-nav" aria-label="框架索引">${scenes.map(s=>`<button data-scene="${s.id}" class="${s.parent==='forward'?'nested':''}">${esc(s.navLabel||s.name.split('：')[0])}</button>`).join('')}</nav>
<div class="workspace"><main class="main-panel"><div class="page-heading"><div class="breadcrumbs" id="breadcrumbs"></div><div class="heading-row"><h1 id="scene-title"></h1><button id="guide">本框架导读</button></div><p id="scene-description"></p></div>
<div class="graph-toolbar"><div><span class="repo-dot vllm"></span> vLLM <span class="repo-dot ascend"></span> Ascend <span id="node-count"></span></div><div class="graph-actions"><select id="backend" aria-label="通信后端阅读路径"></select><button id="zoom-out" aria-label="缩小画布">−</button><button id="fit">适应</button><button id="zoom-in" aria-label="放大画布">＋</button></div></div>
<div class="graph-stage" id="stage"><div id="canvas-wrap"><div id="canvas"></div></div></div><div class="graph-note" id="graph-note"></div><footer class="graph-footer"><span>点击节点读原理和源码 · 蓝色入口展开子流程</span><button id="show-detail">查看讲解</button></footer></main>
<div class="panel-resizer" role="separator" aria-label="调整右侧面板宽度" aria-orientation="vertical" aria-controls="detail" tabindex="0" title="左右拖动调整宽度；双击恢复默认；方向键微调"></div><aside class="inspector" aria-label="节点详情"><div class="inspector-heading"><span>阅读助手 <small>PRINCIPLE · TENSOR · SOURCE</small></span><button id="close-detail" aria-label="收起讲解">×</button></div><div id="detail"></div></aside></div>
<dialog id="info-dialog"><button class="dialog-close" aria-label="关闭版本说明">×</button><span class="eyebrow">FIXED SOURCE / ${esc(manifest.version)}</span><h2>版本与核查说明</h2><p>${esc(manifest.audit?.intro||manifest.coverage)}</p><table><tr><th>材料</th><th>版本</th></tr>${[...Object.entries(manifest.versions).map(([k,v])=>({label:'本站 '+k,sha:v.sha})),...(manifest.audit?.comparison||[])].map(v=>`<tr><td>${esc(v.label)}</td><td><code>${esc(v.sha)}</code></td></tr>`).join('')}</table><p>${esc(manifest.audit?.conclusion||manifest.coverage)}</p>${manifest.audit?.report?`<a href="${esc(manifest.audit.report)}" target="_blank" rel="noreferrer">阅读逐项核查与源码依据</a>`:''}<p>${manifest.audit?.reference?`<a href="${esc(manifest.audit.reference)}" target="_blank" rel="noreferrer">课程参考</a> · `:''}<a href="https://github.com/ZYY-ing/feature-atlas/blob/main/docs/adding-features.md" target="_blank" rel="noreferrer">开发者：扩展新特性</a></p></dialog>`;

document.querySelector('.brand').onclick=e=>{e.preventDefault();changeScene('overview')};
document.querySelector('.feature-pick select').onchange=e=>{location.href='?feature='+encodeURIComponent(e.target.value)};
document.querySelector('.framework-nav').onclick=e=>{const b=e.target.closest('[data-scene]');if(b)changeScene(b.dataset.scene)};
document.querySelector('#guide').onclick=()=>choose(null);
document.querySelector('#help').onclick=()=>document.querySelector('dialog').showModal();
document.querySelector('.dialog-close').onclick=()=>document.querySelector('dialog').close();
document.querySelector('#theme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('feature-atlas-theme',document.body.classList.contains('dark')?'dark':'light')};
document.querySelector('#close-detail').onclick=()=>{document.body.classList.remove('detail-open');document.body.classList.add('inspector-hidden')};
document.querySelector('#show-detail').onclick=()=>{document.body.classList.remove('inspector-hidden');document.body.classList.add('detail-open')};
setupInspectorResize(document.querySelector('.workspace'),document.querySelector('.panel-resizer'));
document.querySelector('#zoom-in').onclick=()=>zoom(.1);document.querySelector('#zoom-out').onclick=()=>zoom(-.1);document.querySelector('#fit').onclick=fit;
document.querySelector('#backend').onchange=e=>{state.backend=e.target.value;state.selected=null;state.tab='principle';render();urlState()};
window.addEventListener('hashchange',()=>{restore();render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('detail-open')});
const stage=document.querySelector('#stage');let drag=null;
stage.onpointerdown=e=>{if(e.target.closest('button,a,select'))return;drag={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId)};
stage.onpointermove=e=>{if(drag){stage.scrollLeft=drag.left-(e.clientX-drag.x);stage.scrollTop=drag.top-(e.clientY-drag.y)}};
stage.onpointerup=stage.onpointercancel=()=>{drag=null};
function changeScene(id){state.scene=id;state.selected=null;state.tab='principle';state.zoom=1;render();urlState();stage.scrollTop=0;}
function choose(id){state.selected=id;state.tab='principle';document.body.classList.remove('inspector-hidden');document.body.classList.add('detail-open');document.querySelectorAll('.graph-node').forEach(e=>e.classList.toggle('selected',e.dataset.id===id));renderDetail();urlState();}
function render(){
 const s=scene();
 document.querySelector('#scene-title').textContent=s.name;document.querySelector('#scene-description').textContent=s.desc;
 document.querySelector('.main-panel').classList.toggle('overview-panel',!!s.modules);
 document.querySelector('#node-count').textContent=`${s.ids.length} ${s.modules?'模块':'节点'}`;
 document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===s.id));
 const parents=[];let cur=s;while(cur){parents.unshift(cur);cur=scenes.find(v=>v.id===cur.parent)}
 document.querySelector('#breadcrumbs').innerHTML=`<span>EP</span> / `+parents.map(p=>`<button data-crumb="${p.id}" ${p.id===s.id?'aria-current="page"':''}>${esc(p.id==='overview'?'总框架':p.name.split('：')[0])}</button>`).join('<span>/</span>');
 document.querySelectorAll('[data-crumb]').forEach(b=>b.onclick=()=>changeScene(b.dataset.crumb));
 const backend=document.querySelector('#backend');backend.hidden=!s.variants;if(s.variants)backend.innerHTML=Object.entries(s.variants).map(([key,v])=>`<option value="${key}" ${state.backend===key?'selected':''}>${v.label}</option>`).join('');
 const single=s.rows.every(r=>r.length===1),canvas=document.querySelector('#canvas');canvas.className=`${s.modules?'macro-map':'node-map'} ${single?'single-column':''}`;
 canvas.innerHTML=`<svg class="connections" aria-label="阶段与数据关系"><defs><marker id="end" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z"/></marker></defs><g id="edges"></g></svg><div class="flow-grid">${s.rows.map((row,i)=>row.map((id,col)=>{if(!id)return '';const n=byId.get(id),m=s.modules?.[id],drill=m?.view||s.drills?.[id];return `<article class="graph-node ${n.repo} ${state.selected===id?'selected':''} ${m?'module-card':''}" data-id="${id}" style="grid-row:${i+1};grid-column:${col+1}"><button class="node-select" data-select="${id}" ${m?'data-module="'+m.view+'"':''}><span class="node-meta"><span>${m?'FRAMEWORK':n.repo==='vllm'?'vLLM · 上游':'ASCEND · 适配'}</span><span>${String(s.ids.indexOf(id)+1).padStart(2,'0')}</span></span><strong>${esc(m?.title||n.title)}</strong><span class="node-subtitle">${esc(m?.subtitle||n.lesson.steps[0])}</span>${m?'':`<code>${esc(n.symbol)}</code>`}</button>${drill?`<button class="drill" data-drill="${drill}">展开${m?'框架':'子流程'} <span>＋</span></button>`:''}</article>`}).join('')).join('')}</div>`;
 canvas.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>b.dataset.module?changeScene(b.dataset.module):choose(b.dataset.select));
 canvas.querySelectorAll('[data-drill]').forEach(b=>b.onclick=()=>changeScene(b.dataset.drill));
 document.querySelector('#graph-note').innerHTML=(s.notes||[]).map(n=>`<p>${esc(n)}</p>`).join('');
 renderDetail();requestAnimationFrame(()=>{drawEdges();applyZoom()});
}
function drawEdges(){
 const s=scene(),canvas=document.querySelector('#canvas'),grid=canvas.querySelector('.flow-grid');
 const width=grid.offsetWidth,height=grid.offsetHeight;canvas.style.width=width+'px';canvas.style.height=height+'px';
 const svg=canvas.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
 const positions=new Map([...canvas.querySelectorAll('.graph-node')].map(el=>[el.dataset.id,{x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight}]));
 document.querySelector('#edges').innerHTML=s.edges.map(([a,b,label])=>{
  const p=positions.get(a),q=positions.get(b);if(!p||!q)return '';
  const sameRow=Math.abs(q.y-p.y)<3,feedback=q.y<p.y||(sameRow&&q.x<p.x),far=q.y>p.y+p.h+170,cross=Math.abs(p.x-q.x)>20;
  let d,tx,ty;
  if(s.modules&&cross&&!sameRow){const x1=p.x+p.w/2+(feedback?18:-18),y1=feedback?p.y:p.y+p.h,x2=q.x+q.w/2+(feedback?18:-18),y2=feedback?q.y+q.h:q.y,mid=(y1+y2)/2+(feedback?12:-12);d=`M${x1} ${y1}V${mid}H${x2}V${y2}`;tx=(x1+x2)/2;ty=mid+(feedback?7:-7);}
  else if(sameRow){const x1=feedback?p.x:p.x+p.w,y1=p.y+p.h/2,x2=feedback?q.x+q.w:q.x,y2=q.y+q.h/2,mid=(x1+x2)/2;d=`M${x1} ${y1}H${mid}V${y2}H${x2}`;tx=mid;ty=label.length>6?Math.min(p.y,q.y)-11:Math.min(y1,y2)-9;}
  else if(feedback){const right=width-8,x1=p.x+p.w,y1=p.y+p.h/2,x2=q.x+q.w,y2=q.y+q.h/2;d=`M${x1} ${y1}H${right}V${y2}H${x2}`;tx=right-8;ty=(y1+y2)/2;}
  else if(far){const side=cross?width-8:8;d=`M${p.x+(cross?p.w:0)} ${p.y+p.h/2}H${side}V${q.y-24}H${q.x+q.w/2}V${q.y}`;tx=side+10;ty=q.y-30;}
  else{const x1=p.x+p.w/2,y1=p.y+p.h,x2=q.x+q.w/2,y2=q.y,mid=y1+(y2-y1)/2;d=`M${x1} ${y1}V${mid}H${x2}V${y2}`;tx=(x1+x2)/2;ty=mid-7;}
  tx=Math.max(12+label.length*5,Math.min(width-12-label.length*5,tx));
  return `<g class="edge ${feedback||/条件|分支|后续|依赖|注册|资格/.test(label)?'dashed':''}"><path d="${d}"/><text x="${tx}" y="${ty}" text-anchor="middle">${esc(label)}</text><title>${esc(byId.get(a).title+' → '+byId.get(b).title+'：'+label)}</title></g>`;
 }).join('');
}
function applyZoom(){const c=document.querySelector('#canvas');c.style.transform=`scale(${state.zoom})`;document.querySelector('#canvas-wrap').style.width=c.offsetWidth*state.zoom+'px';document.querySelector('#canvas-wrap').style.height=c.offsetHeight*state.zoom+'px';}
function zoom(d){state.zoom=Math.max(.55,Math.min(1.4,state.zoom+d));applyZoom()}
function fit(){state.zoom=Math.min(1,(stage.clientWidth-24)/document.querySelector('#canvas').offsetWidth);applyZoom()}
function exampleDetailsHtml(details=[]){return details.map(block=>{
 if(block.type==='table')return `<div class="example-table-wrap"><table class="example-table"><caption>${esc(block.caption)}</caption><thead><tr>${block.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 if(block.type==='paragraph')return `<p>${esc(block.text)}</p>`;
 if(block.type==='note')return `<p class="example-note">${esc(block.text)}</p>`;
 if(block.type==='formula')return `<div class="formula example-formula">${esc(block.text)}</div>`;
 if(block.type==='flow')return `<div class="example-figure"><h4>${esc(block.caption)}</h4><div class="example-flow">${block.steps.map((step,i)=>`<div class="example-flow-step"><span class="example-step-number">${i+1}</span><div><strong>${esc(step.title)}</strong><p>${esc(step.text)}</p></div></div>`).join('')}</div></div>`;
 if(block.type==='ranks')return `<div class="example-figure"><h4>${esc(block.caption)}</h4><div class="example-ranks">${block.ranks.map((r,i)=>`<div class="example-rank example-rank-${i}"><b>global rank ${esc(r.global)}</b><span>EP rank ${esc(r.ep)}</span><div class="example-slots">${r.experts.map((e,j)=>`<div><small>槽位 ${j}</small><strong>E${esc(e)}</strong></div>`).join('')}</div></div>`).join('')}</div></div>`;
 if(block.type==='bars')return `<div class="example-figure"><h4>${esc(block.caption)}</h4>${block.rows.map((r,i)=>`<div class="example-bar-row"><span>${esc(r.label)}</span><div class="example-bar-track"><i class="example-fill-${i}" style="width:${Math.max(0,Math.min(100,r.value/block.max*100))}%"></i></div><b>${esc(r.value)}</b></div>`).join('')}</div>`;
 if(block.type==='token-path')return `<div class="example-figure example-token-path"><h4>${esc(block.caption)}</h4><div class="example-token-origin"><small>来源：${esc(block.source)}</small><strong>${esc(block.selection)}</strong></div><div class="example-token-branches">${block.branches.map(b=>`<div class="example-rank example-rank-${b.color}"><b>${esc(b.expert)} · 本地槽位 ${esc(b.slot)}</b><span>${esc(b.location)}</span><small>路由权重 ${esc(b.weight)}</small></div>`).join('')}</div><div class="example-token-return"><small>贡献回到 ${esc(block.source)}</small><div class="formula example-formula">${esc(block.result)}</div></div></div>`;
 return '';
 }).join('')}
function exampleContextHtml(context){if(!context)return '';return `<details class="example-context ${context.kind==='variant'?'variant':''}"><summary>${esc(context.title)}</summary><p>${esc(context.text)}</p><div class="example-metrics">${context.metrics.map(([label,value])=>`<span><b>${esc(value)}</b>${esc(label)}</span>`).join('')}</div>${context.reference?exampleDetailsHtml([{type:'table',caption:'同一 EP 组内的基准归属',headers:['global rank','EP rank','槽位 0','槽位 1'],rows:context.reference}]):''}</details>`}
function lessonHtml(l,tab){
 if(tab==='tensor')return `<h3>核心公式 / 数据契约</h3><div class="formula">${esc(l.formula)}</div><h3>把符号代回例子</h3><p>${esc(l.example)}</p><h3>通用符号</h3><table class="symbols"><tr><td>T / T_global</td><td>当前布局的 Token 行数 / 全组有效 Token 数</td></tr><tr><td>H / E / k</td><td>隐藏维 / 逻辑路由专家总数 / 每 Token 选中专家数</td></tr><tr><td>P / Qᵣ</td><td>SP 的物理 TP 大小 / rank r 接收的专家任务数</td></tr><tr><td>α / Fₑ / S</td><td>路由系数 / 专家网络 / 可选共享专家</td></tr></table><div class="callout">${esc(l.trap||'公式帮助理解语义；实际 shape、量化格式与通信分支请以固定源码为准。')}</div>`;
 return `<h3>为什么需要这一步</h3><p>${esc(l.why)}</p><h3>输入与输出</h3>${ioHtml(l.io)}<h3>它具体做什么</h3>${list(l.steps)}<div class="example"><span>跟着一个小例子理解</span>${exampleContextHtml(l.exampleContext)}<p>${esc(l.example)}</p>${exampleDetailsHtml(l.exampleDetails)}</div><h3>沿源码怎么读</h3>${list(l.read)}${l.trap?`<div class="callout"><b>理解边界</b><p>${esc(l.trap)}</p></div>`:''}`;
}
function ioHtml(io){return io?`<div class="io-contract">${[['input','输入'],['output','输出']].map(([key,title])=>`<section><b>${title}：</b><span>${esc(io[key].meaning)}</span><div><small>样例数据</small><code>${esc(io[key].sample)}</code></div></section>`).join('')}</div><p class="io-boundary">这里说明本步骤读取、产生或更新的数据；初始化函数可能通过对象或全局组状态生效，不表示 Python 必有这些返回值。H/I 为隐藏维/专家中间维。</p>`:''}
function sourceHtml(n,s){const paths=(atlas.callPaths||[]).filter(p=>n?p.nodeIds.includes(n.id):s.id==='init');return `${sourceTools.controls()}${callPathsHtml(paths,sourceTools)}${n?`<h3>本节点源码</h3><p>${esc(n.summary)}</p>${list(n.lesson.read)}${n.sources.map(e=>sourceTools.render(e)).join('')}<p class="evidence-note">◇ 阅读提示 · ● 已有个人笔记 · 完整文件保留原始行号和版权声明。</p>${n.note?`<div class="callout">${esc(n.note)}</div>`:''}`:`<h3>本框架的源码入口</h3><p>选择节点阅读对应原始源码；上方调用链可以逐阶段展开核对。</p>${s.ids.map(id=>jump(id)).join('')}`}`}
function renderDetail(){
 sourceTools.flush?.(document.querySelector('#detail'));sourceTools.reset();
 const s=scene(),n=byId.get(state.selected),l=s.nodeLessons?.[n?.id]||n?.lesson||s.lesson;
 const tabs=[['principle','原理'],['tensor','张量 / 公式'],['code','源码与笔记']];
 document.querySelector('#detail').innerHTML=`<div class="detail-top"><span class="eyebrow">${n?(n.repo==='vllm'?'vLLM · UPSTREAM':'ASCEND · ADAPTER'):'FRAMEWORK GUIDE'}</span><h2>${esc(n?.title||s.name)}</h2>${n?`<code class="detail-symbol">${esc(n.symbol)}</code>`:'<p>先理解目的与数据，再进入具体函数。</p>'}</div><div class="detail-tabs" role="tablist">${tabs.map(([id,title])=>`<button role="tab" aria-selected="${state.tab===id}" data-tab="${id}">${title}</button>`).join('')}</div><div class="detail-content">${['principle','tensor'].includes(state.tab)?lessonHtml(l,state.tab):sourceHtml(n,s)}<div class="detail-bottom"><button id="back-guide">回到本框架导读</button></div></div>`;
 if(state.tab==='code')sourceTools.bind(document.querySelector('#detail'));
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderDetail();urlState()});
 document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>choose(b.dataset.jump));
 document.querySelector('#back-guide').onclick=()=>choose(null);
}
function jump(id,label=''){const n=byId.get(id);return `<button class="relation-node" data-jump="${id}">${label?`<small>${esc(label)}</small>`:''}<b>${esc(n.title)}</b><code>${esc(n.symbol)}</code></button>`}
let resizing;new ResizeObserver(()=>{clearTimeout(resizing);resizing=setTimeout(()=>{const c=document.querySelector('#canvas');if(c){c.style.width='';c.style.height='';drawEdges();applyZoom()}},60)}).observe(stage);
render();
document.fonts.ready.then(()=>{drawEdges();applyZoom()});
