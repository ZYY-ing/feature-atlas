const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={function:'函数',decision:'判断',operation:'内部逻辑',binding:'注册 / 绑定',state:'状态',boundary:'其他分支'};
function wrapLabel(label){const tokens=label.match(/[A-Za-z0-9_().]+|[^A-Za-z0-9_().]/g)||[''];const lines=[];let line='',size=0;for(const token of tokens){const weight=/^[\x00-\xff]+$/.test(token)?token.length:2;if(size+weight>12&&line.trim()){lines.push(line.trim());line='';size=0}line+=token;size+=weight}if(line.trim())lines.push(line.trim());return lines;}
function renderLane(nodes,tools){return [...new Set(nodes.map(n=>n.row))].sort((a,b)=>a-b).map(row=>`<div class="map-row" style="grid-row:${row+2};grid-column:1/-1">${nodes.filter(n=>n.row===row).map(n=>{
 const r=n.definition,slot=n.slot||[1,6];
 return `<article class="map-node ${n.type}" data-map-node="${esc(n.id)}" style="grid-column:${slot[0]}/span ${slot[1]}"><span class="map-node-kind">${kinds[n.type]||n.type}</span><strong class="trace-function">${esc(n.title||r.symbol)}</strong><p>${esc(n.purpose)}</p><a class="map-location" href="${esc(r.url.split('#')[0]+'#L'+r.line)}" title="${esc(r.file)}" target="_blank" rel="noreferrer">${esc(r.file.split('/').at(-1))} : ${r.line}</a><details class="map-code"><summary>查看源码 <small>L${n.sources[0]?.line||r.line}</small></summary><div class="map-source">${n.sources.map(e=>tools.render(e)).join('')}</div></details></article>`;
 }).join('')}</div>`).join('')}
export function callPathsHtml(paths,tools){return paths.map(path=>{
 const count=Math.max(...path.nodes.map(n=>n.row))+1;
 return `<section class="logic-graph" data-logic-graph="${esc(path.id)}"><p class="transition-intro">${esc(path.description)}</p><details class="transition-scope"><summary>范围与源码核对边界</summary><p>${esc(path.scope)}</p><p>固定 SHA 的静态阅读图，未运行 NPU 推理；覆盖图中关键分支，未声称穷举所有 Python 动态调用。</p></details><div class="map-toolbar"><button data-expand-map>展开大图</button><button data-collapse-code>收起全部源码</button><label class="map-compact-label"><input type="checkbox" data-map-compact checked> 精简函数说明</label><span data-open-count>已展开 0 处源码</span></div><div class="map-legend"><span class="call">实线：调用</span><span class="flow">点线：内部流程 / 条件</span><span class="binding">紫虚线：注册 / 类绑定</span><span class="return">绿虚线：沿栈返回</span></div><p class="map-hint">左右两个框各自对应一个仓库；箭头说明关系。横向空间不足时可展开大图。</p><div class="call-map-scroll" tabindex="0" aria-label="跨仓调用逻辑图"><div class="call-map compact" style="--map-rows:${count}" data-map="${esc(path.id)}"><svg class="map-links" aria-label="函数与分支之间的关系"><defs><marker id="${esc(path.id)}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z"/></marker></defs><g></g></svg>${['vllm','ascend'].map(repo=>`<section class="repo-frame ${repo}" data-map-repo="${repo}" aria-label="${repo==='vllm'?'vLLM 上游':'vLLM-Ascend 插件'}"><h3 class="repo-frame-title">${repo==='vllm'?'vLLM':'vLLM-Ascend'}<small>${repo==='vllm'?'上游核心与模型实现':'平台插件、NPU 执行与适配'}</small></h3>${renderLane(path.nodes.filter(n=>n.definition.repo.includes('ascend')===(repo==='ascend')),tools)}</section>`).join('')}</div></div><details class="edge-index"><summary>查看全部连线依据（${path.edges.length} 条）</summary>${path.edges.map(e=>`<div><b>${esc(path.nodes.find(n=>n.id===e.from)?.title||path.nodes.find(n=>n.id===e.from)?.definition.symbol)} → ${esc(path.nodes.find(n=>n.id===e.to)?.title||path.nodes.find(n=>n.id===e.to)?.definition.symbol)}</b><span>${esc(e.label)} · ${esc(e.kind)}</span>${e.description?`<p>${esc(e.description)}</p>`:''}${e.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.file)} : ${s.line}</a>`).join('')}</div>`).join('')}</details></section>`;
 }).join('')}

export function bindCallPaths(root,paths,{flush=()=>{}}={}){
 const cleanups=[];
 root.querySelectorAll('[data-logic-graph]').forEach(section=>{
  const path=paths.find(p=>p.id===section.dataset.logicGraph),map=section.querySelector('.call-map'),svg=map.querySelector('svg'),lines=svg.querySelector('g');
  let frame=0;
  function draw(){
   const base=map.getBoundingClientRect(),width=map.offsetWidth,height=map.offsetHeight;
   svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
   const pos=new Map([...map.querySelectorAll('[data-map-node]')].map(el=>{const r=el.getBoundingClientRect(),row=el.closest('.map-row').getBoundingClientRect();return [el.dataset.mapNode,{x:r.left-base.left,y:r.top-base.top,w:r.width,h:r.height,rowY:row.top-base.top,rowBottom:row.bottom-base.top,repo:el.closest('[data-map-repo]').dataset.mapRepo}]}));
   const frames=new Map([...map.querySelectorAll('[data-map-repo]')].map(el=>{const r=el.getBoundingClientRect();return [el.dataset.mapRepo,{x:r.left-base.left,w:r.width}]}));
   lines.innerHTML=path.edges.map((e,i)=>{
    const p=pos.get(e.from),q=pos.get(e.to);if(!p||!q)return '';
    let d,tx,ty;const cross=p.repo!==q.repo,sameRow=Math.abs(p.y-q.y)<4;
    if(cross){
     const right=p.x<q.x,pf=frames.get(p.repo),qf=frames.get(q.repo);
     const pBlocked=right?p.x+p.w<pf.x+pf.w-30:p.x>pf.x+30;
     const qBlocked=right?q.x>qf.x+30:q.x+q.w<qf.x+qf.w-30;
     const x1=pBlocked?p.x+p.w/2:right?p.x+p.w:p.x,x2=qBlocked?q.x+q.w/2:right?q.x:q.x+q.w;
     const y1=pBlocked?p.y+p.h:p.y+p.h/2,y2=qBlocked?q.y:q.y+q.h/2;
     const exitY=pBlocked?p.rowBottom+20:y1,enterY=qBlocked?q.rowY-20:y2;
     const left=frames.get('vllm'),middle=left.x+left.w+44+(e.channel||0)*9-9;
     d=`M${x1} ${y1}V${exitY}H${middle}V${enterY}H${x2}V${y2}`;tx=middle;ty=sameRow?Math.min(exitY,enterY)-12:(exitY+enterY)/2;
    }else{
     const f=frames.get(p.repo),far=Math.abs(q.y-p.y)>p.h+220||q.y<p.y;
     if(far||e.side){const right=e.side==='right',x=right?f.x+f.w-7-(e.channel||0)*5:f.x+7+(e.channel||0)*5,x1=right?p.x+p.w:p.x,x2=right?q.x+q.w:q.x,y1=p.y+p.h/2,y2=q.y+q.h/2;d=`M${x1} ${y1}H${x}V${y2}H${x2}`;tx=right?x-34:x+34;ty=q.y-14;}
     else{const x1=p.x+p.w/2,y1=p.y+p.h,x2=q.x+q.w/2,y2=q.y,mid=(p.rowBottom+q.rowY)/2;d=`M${x1} ${y1}V${mid}H${x2}V${y2}`;tx=(x1+x2)/2;ty=mid-6;}
    }
    const parts=wrapLabel(e.label);
    const evidence=e.sources.map(s=>s.file+':'+s.line).join('；');
    return `<g class="map-edge ${e.kind}" data-map-edge="${i}" data-map-from="${esc(e.from)}" data-map-to="${esc(e.to)}"><path d="${d}" marker-end="url(#${esc(path.id)}-arrow)"/><text x="${tx}" y="${ty}" text-anchor="middle">${parts.map((s,j)=>`<tspan x="${tx}" dy="${j?13:0}">${esc(s)}</tspan>`).join('')}</text><title>${esc(e.label+'；'+(e.description||'')+'；'+evidence)}</title></g>`;
   }).join('');
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)};
   const count=()=>{section.querySelector('[data-open-count]').textContent=`已展开 ${map.querySelectorAll('.map-code[open]').length} 处源码`;schedule()};
  section.querySelector('[data-expand-map]').textContent=document.body.classList.contains('trace-expanded')?'恢复右侧窗口':'展开大图';
  map.querySelectorAll('.map-code').forEach(el=>el.addEventListener('toggle',count));
  section.querySelector('[data-collapse-code]').onclick=()=>{flush();map.querySelectorAll('.map-code[open]').forEach(el=>el.open=false);count()};
  section.querySelector('[data-expand-map]').onclick=()=>{const expanded=document.body.classList.toggle('trace-expanded');section.querySelector('[data-expand-map]').textContent=expanded?'恢复右侧窗口':'展开大图';schedule()};
  section.querySelector('[data-map-compact]').onchange=e=>{map.classList.toggle('compact',e.target.checked);schedule()};
  const observer=new ResizeObserver(schedule);observer.observe(map);map.querySelectorAll('.map-node').forEach(el=>observer.observe(el));schedule();
  cleanups.push(()=>{observer.disconnect();cancelAnimationFrame(frame)});
 });
 return ()=>cleanups.forEach(fn=>fn());
}
