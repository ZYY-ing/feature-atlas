import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {NotesStore,notesKey} from '../app/notes-store.js';
import {callPathsHtml} from '../app/call-path.js';
const a=JSON.parse(fs.readFileSync('features/ep/generated/atlas.json','utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function full(e){const m=a.sourceFiles[e.sourceKey];assert.ok(m,e.file);const f=JSON.parse(fs.readFileSync('features/ep/generated/'+m.url,'utf8'));assert.equal(sha(f.code),m.hash);return f.code.split('\n')}
function evidence(e){const lines=full(e);assert.equal(lines.slice(e.start-1,e.end).join('\n'),e.code,e.symbol);assert.equal(sha(e.code),e.hash);assert.ok(e.line>=e.start&&e.line<=e.end);assert.ok(lines[e.line-1].trim());}
test('every node/framework/backend/scene override has meaningful IO and worked data',()=>{
 const check=(l,label)=>{for(const k of ['input','output']){assert.ok(l.io?.[k]?.meaning.length>3,label);assert.ok(l.io[k].sample.length>12,label)}};
 for(const n of a.nodes)check(n.lesson,n.id);
 for(const s of a.scenes){check(s.lesson,s.id);for(const v of Object.values(s.variants||{}))check(v.lesson,v.label);for(const [id,l] of Object.entries(s.nodeLessons||{}))check(l,id)}
 assert.match(a.scenes.find(s=>s.id==='offload').nodeLessons.router.io.input.meaning,/单 worker/);
 assert.match(a.nodes.find(n=>n.id==='placement').lesson.io.output.sample,/local_num_experts=2/);
});
test('every excerpt and call edge can be recovered from the bundled immutable full file',()=>{
 for(const n of a.nodes)for(const e of n.sources)evidence(e);
 for(const p of a.callPaths)for(const g of p.groups)for(const e of g.edges){for(const ref of [e.from,e.to,e.site,...e.support])evidence(ref);assert.equal(e.from.file,e.site.file);assert.equal(e.from.repo,e.site.repo);assert.ok(e.description.length>10);assert.ok(['call','dispatch','conditional','return','continuation','inheritance','construct','callback','registration'].includes(e.kind));}
});
test('EP construction returns to orchestrator; factory is reached through model construction and Ascend binding',()=>{
 const edges=a.callPaths[0].groups.flatMap(g=>g.edges);
 assert.ok(!edges.some(e=>e.from.symbol==='initialize_model_parallel'&&e.to.symbol.includes('FusedMoE')));
 assert.ok(edges.some(e=>e.from.symbol==='initialize_model_parallel'&&e.kind==='return'&&e.to.symbol==='WorkerProc.__init__'));
 assert.ok(edges.some(e=>e.kind==='registration'&&e.from.symbol==='DeepseekV2MoE.__init__'&&e.to.symbol==='_ascend_FusedMoE'&&e.support.some(s=>s.code.includes('_fused_moe_layer.FusedMoEFactory = _ascend_FusedMoE'))));
 assert.ok(edges.some(e=>e.kind==='inheritance'&&e.from.file.includes('worker/v2/')&&e.to.file.includes('worker/gpu/')));
 for(const e of edges.filter(e=>e.kind==='call'))assert.ok(!/^\s*def /.test(full(e.site)[e.site.line-1]));
});
test('two connector graphs have explicit repository frames, branches and recoverable evidence',()=>{
 const scene=a.scenes.find(s=>s.id==='init');assert.equal(scene.connectors.length,2);
 assert.ok(scene.connectors.some(c=>!c.from&&c.to==='groups'));
 assert.ok(scene.connectors.some(c=>c.from==='groups'&&c.to==='factory'));
 for(const c of scene.connectors){
  const p=a.transitionPaths.find(p=>p.id===c.path);assert.ok(p);
  const ids=new Set(p.nodes.map(n=>n.id));assert.equal(ids.size,p.nodes.length);
  const symbols=p.nodes.filter(n=>n.type==='function').map(n=>n.definition.symbol);assert.equal(new Set(symbols).size,symbols.length);
  for(const n of p.nodes){evidence(n.definition);for(const e of n.sources)evidence(e);assert.ok(n.row>=0);}
  for(const e of p.edges){assert.ok(ids.has(e.from)&&ids.has(e.to));assert.ok(e.sources.length);for(const s of e.sources)evidence(s);}
  const html=callPathsHtml([p],{render:()=>'<div>source</div>'});
  assert.equal((html.match(/class="repo-frame /g)||[]).length,2);
  assert.equal((html.match(/class="map-code"/g)||[]).length,p.nodes.length);
  assert.ok(html.includes('收起全部源码'));assert.ok(!html.includes('trace-arrow'));
 }
});
test('key decisions remain visible and registration is not mislabeled as a runtime call',()=>{
 const before=a.transitionPaths.find(p=>p.id==='startup-groups'),after=a.transitionPaths.find(p=>p.id==='groups-factory');
 assert.equal(before.edges.filter(e=>e.from==='ready?').length,2);
 for(const id of ['encoder?','elastic?','given?','dense','router?','class?'])assert.ok(!after.nodes.some(n=>n.id===id),id);
 assert.equal(after.edges.find(e=>e.from==='factory-binding'&&e.to==='moe').kind,'binding');
 assert.equal(after.edges.find(e=>e.from==='ep'&&e.to==='npu-init').kind,'return');
 const originalCall=after.edges.find(e=>e.from==='ascend-factory'&&e.to==='factory');assert.equal(originalCall.kind,'call');assert.equal(originalCall.callName,'_original_FusedMoE');assert.ok(originalCall.sources.some(s=>s.code.includes('runner = _original_FusedMoE(')));
 assert.ok(after.nodes.some(n=>n.definition.symbol==='determine_expert_map'));
 assert.ok(!after.edges.some(e=>e.from==='ep'&&e.to==='factory'));
});
test('direct call edges include their target call name in pinned call-site evidence',()=>{
 for(const p of a.transitionPaths)for(const e of p.edges.filter(e=>e.kind==='call')){
  const target=p.nodes.find(n=>n.id===e.to);if(target.type!=='function')continue;
  const parts=target.definition.symbol.split('.'),name=e.callName||(parts.at(-1)==='__init__'?parts.at(-2):parts.at(-1));
  assert.ok(e.sources.some(s=>s.code.includes(name+'(')),`${p.id}: ${e.from} → ${e.to}`);
 }
});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
const meta=Object.values(a.sourceFiles)[0];const code=JSON.parse(fs.readFileSync('features/ep/generated/'+meta.url,'utf8')).code.split('\n');
test('notes persist separately from source, survive reload, export/import, and delete cleanly',()=>{
 const storage=memory(),s=new NotesStore(storage,a.sourceFiles),before=code[0];s.save(meta,1,code[0],'这行的解释 <script>');assert.equal(new NotesStore(storage,a.sourceFiles).get(meta,1),'这行的解释 <script>');assert.equal(code[0],before);
 const restored=new NotesStore(memory(),a.sourceFiles);assert.equal(restored.import(s.export()),1);assert.equal(restored.get(meta,1),'这行的解释 <script>');restored.save(meta,1,code[0],'');assert.equal(restored.get(meta,1),'');
});
test('one note import restores annotations for different module source files',()=>{
 const metas=['groups','factory'].map(id=>a.sourceFiles[a.nodes.find(n=>n.id===id).evidence.sourceKey]);
 const s=new NotesStore(memory(),a.sourceFiles);for(const [i,f] of metas.entries()){const lines=JSON.parse(fs.readFileSync('features/ep/generated/'+f.url,'utf8')).code.split('\n');s.save(f,1,lines[0],'模块笔记 '+i)}
 const restored=new NotesStore(memory(),a.sourceFiles);assert.equal(restored.import(s.export()),2);
 assert.equal(restored.get(metas[0],1),'模块笔记 0');assert.equal(restored.get(metas[1],1),'模块笔记 1');
});
test('a mismatched note import is rejected before any existing note is changed',()=>{
 const s=new NotesStore(memory(),a.sourceFiles);s.save(meta,1,code[0],'原有笔记');const good=JSON.parse(s.export()).notes[0];const bad={...good,sha:'0'.repeat(40)};
 assert.throws(()=>s.import(JSON.stringify({version:1,notes:[{...good,text:'不应写入'},bad]})));assert.equal(s.get(meta,1),'原有笔记');
 assert.throws(()=>s.import(JSON.stringify({version:1,notes:[{...good,line:meta.lineCount+1}]})));
});
test('saving from two open readers does not overwrite notes on other lines',()=>{
 const storage=memory(),one=new NotesStore(storage,a.sourceFiles),two=new NotesStore(storage,a.sourceFiles);
 one.save(meta,1,code[0],'第一窗口');two.save(meta,2,code[1],'第二窗口');
 const fresh=new NotesStore(storage,a.sourceFiles);assert.equal(fresh.get(meta,1),'第一窗口');assert.equal(fresh.get(meta,2),'第二窗口');
 one.save(meta,1,code[0],'');assert.equal(new NotesStore(storage,a.sourceFiles).get(meta,2),'第二窗口');
});
test('notes for another pinned version are preserved; blocked browser storage still allows export',()=>{
 const storage=memory(),foreign={repo:meta.repo,sha:'0'.repeat(40),file:meta.file,line:1,text:'旧版'};storage.setItem(notesKey,JSON.stringify({version:1,notes:[foreign]}));const s=new NotesStore(storage,a.sourceFiles);s.save(meta,1,code[0],'新版');assert.equal(JSON.parse(storage.getItem(notesKey)).notes.length,2);
 const blocked=new NotesStore({getItem(){throw Error()},setItem(){throw Error()}},a.sourceFiles);assert.equal(blocked.save(meta,1,code[0],'可导出'),false);assert.equal(JSON.parse(blocked.export()).notes[0].text,'可导出');
});
