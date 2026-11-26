import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const a=JSON.parse(fs.readFileSync('features/ep/generated/atlas.json','utf8'));const ids=new Set(a.nodes.map(n=>n.id));
test('all graph endpoints exist and belong to their scenes',()=>{assert.equal(ids.size,a.nodes.length);for(const s of a.scenes){assert.ok(s.ids.every(id=>ids.has(id)));for(const [from,to,label] of s.edges){assert.ok(s.ids.includes(from)&&s.ids.includes(to),s.id+': dangling edge');assert.ok(label)}}});
test('evidence has immutable links, original line ranges and matching checksums',()=>{for(const {evidence:e} of a.nodes){assert.match(e.sha,/^[a-f0-9]{40}$/);assert.equal(e.end-e.start+1,e.code.split('\n').length);assert.equal(e.hash,crypto.createHash('sha256').update(e.code).digest('hex'));assert.ok(e.url.includes('/'+e.sha+'/'));assert.ok(e.start>0)}});
test('source evidence refers to the expected executable regions',()=>{const n=id=>a.nodes.find(n=>n.id===id);assert.match(n('factory').evidence.code,/runner = runner_cls/);assert.match(n('combine').evidence.code,/def token_combine/);assert.match(n('async').evidence.code,/def start_async_worker/);assert.match(n('mlp').evidence.code,/apply_gmm2/);assert.ok(n('offload-check').note===''||typeof n('offload-check').note==='string')});
test('fused backend does not imply a separate ordinary MLP call',()=>{const s=a.scenes.find(s=>s.id==='comm').variants.FUSED_MC2;assert.ok(!s.ids.includes('mlp'));for(const [from,to] of s.edges)assert.ok(s.ids.includes(from)&&s.ids.includes(to))});
test('hierarchical views, every variant and teaching text are complete',()=>{
 const scenes=new Map(a.scenes.map(s=>[s.id,s]));
 for(const s of a.scenes){
  if(s.parent)assert.ok(scenes.has(s.parent));
  for(const dest of Object.values(s.drills||{}))assert.ok(scenes.has(dest));
  for(const m of Object.values(s.modules||{}))assert.ok(scenes.has(m.view));
  for(const v of [s,...Object.values(s.variants||{})]){
   assert.deepEqual(v.rows.flat().filter(Boolean),v.ids);
   for(const [x,y] of v.edges)assert.ok(v.ids.includes(x)&&v.ids.includes(y));
  }
  assert.ok(s.lesson.why&&s.lesson.formula&&s.lesson.read.length);
 }
 for(const n of a.nodes){assert.ok(n.lesson.why.length>30,n.id);assert.ok(n.lesson.example&&n.lesson.steps.length&&n.lesson.read.length);}
});
test('comm source anchors resolve inside their actual dispatcher class',()=>{
 const n=id=>a.nodes.find(n=>n.id===id);
 const sequence=['mc2-dispatch','mc2-combine','ag-dispatch','ag-combine','alltoall','combine'].map(id=>n(id).evidence.start);
 assert.deepEqual(sequence,[...sequence].sort((a,b)=>a-b));
 for(const id of ['mc2-dispatch','ag-dispatch','alltoall'])assert.match(n(id).evidence.code,/def token_dispatch/);
 for(const id of ['mc2-combine','ag-combine','combine'])assert.match(n(id).evidence.code,/def token_combine/);
 for(const node of a.nodes)for(const e of node.sources){assert.equal(e.hash,crypto.createHash('sha256').update(e.code).digest('hex'));assert.equal(e.end-e.start+1,e.code.split('\n').length);}
});
test('forward retains prepare/router/quant/finalize and actual output merge',()=>{
 const s=a.scenes.find(s=>s.id==='forward'),r=a.scenes.find(s=>s.id==='routed');
 for(const id of ['prepare','router','quant','comm','load','finalize'])assert.ok(r.ids.includes(id));
 for(const id of ['shared','output'])assert.ok(s.ids.includes(id));
 assert.equal(s.drills.routed,'routed');
 assert.ok(!s.edges.some(([x,y])=>x==='finalize'&&y==='return'));
 const output=a.nodes.find(n=>n.id==='output').evidence.code;assert.match(output,/_foreach_add/);assert.match(output,/_maybe_reduce_final_output/);
});
test('MRv2 EPLB has explicit commit before routing-table use',()=>{
 const s=a.scenes.find(s=>s.id==='eplb');assert.ok(s.ids.indexOf('commit')<s.ids.indexOf('lookup'));
 const code=a.nodes.find(n=>n.id==='commit').evidence.code;
 assert.ok(code.indexOf('refresh_model_routing_tables')<code.indexOf('deferred_event.flush()'));
 assert.ok(s.ids.includes('step')&&s.ids.includes('policy')&&s.ids.includes('transfer'));
 assert.ok(!s.ids.includes('offload-exec'));
});
