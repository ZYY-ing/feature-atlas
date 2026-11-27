import fs from 'node:fs';
import {nodes,manifest,versions} from '../features/ep/spec.mjs';
import {scenes} from '../features/ep/views.mjs';
import {lessons,sceneLessons} from '../features/ep/learning.mjs';
import {applyUnifiedExamples} from '../features/ep/unified-examples.mjs';
import {applyContracts} from '../features/ep/contracts.mjs';
import {callPath} from '../features/ep/call-path.mjs';
import {transitionPaths} from '../features/ep/logic-graphs.mjs';
import {extract as extractSource,sourceRequests,readSource,sourceKey,cacheName,hash} from './source-data.mjs';
applyUnifiedExamples(lessons,sceneLessons,scenes);
applyContracts(nodes,lessons,sceneLessons,scenes);
const cache=process.argv[2]||'.cache/sources';
const extract=n=>extractSource(cache,n);
const requests=sourceRequests(),files=Object.fromEntries(requests.map(r=>[cacheName(r),hash(readSource(cache,r))]));
if(process.argv.includes('--write-source-lock'))fs.writeFileSync('features/ep/sources.lock.json',JSON.stringify({versions,files},null,2)+'\n');
const lock=JSON.parse(fs.readFileSync('features/ep/sources.lock.json','utf8'));
if(JSON.stringify(lock.versions)!==JSON.stringify(versions)||JSON.stringify(lock.files)!==JSON.stringify(files))throw Error('Pinned source lock does not match cache; verify provenance before updating the lock.');
const generated=nodes.map(n=>{
 if(!lessons[n.id])throw Error(n.id+': teaching content missing');
 const evidence=extract(n),sources=[evidence,...(n.additional||[]).map(a=>extract({...n,...a,additional:undefined,within:a.within}))];
 return {...n,lesson:lessons[n.id],evidence,sources};
});
for(const s of scenes){s.lesson=sceneLessons[s.id];if(!s.lesson)throw Error(s.id+': framework lesson missing');}
fs.mkdirSync('features/ep/generated',{recursive:true});
const sourceFiles={};
fs.mkdirSync('features/ep/generated/sources',{recursive:true});
const wantedSourceFiles=new Set(requests.map(r=>sourceKey(r)+'.json'));
for(const file of fs.readdirSync('features/ep/generated/sources'))if(/^[a-f0-9]{24}\.json$/.test(file)&&!wantedSourceFiles.has(file))fs.unlinkSync('features/ep/generated/sources/'+file);
for(const r of requests){const key=sourceKey(r),text=readSource(cache,r),meta={key,repo:versions[r.repo].repo,sha:versions[r.repo].sha,file:r.file,hash:hash(text),lineCount:text.split('\n').length};sourceFiles[key]={...meta,url:'sources/'+key+'.json'};fs.writeFileSync('features/ep/generated/sources/'+key+'.json',JSON.stringify({...meta,code:text})+'\n');}
const pathData={...callPath,groups:callPath.groups.map(g=>({...g,edges:g.edges.map(e=>({...e,from:extract(e.from),to:extract(e.to),site:extract(e.site),support:e.support.map(extract)}))}))};
const transitions=transitionPaths.map(p=>({...p,nodes:p.nodes.map(n=>({...n,definition:extract(n.definition),sources:n.sources.map(extract)})),edges:p.edges.map(e=>({...e,sources:e.sources.map(extract)}))}));
fs.writeFileSync('features/ep/generated/atlas.json',JSON.stringify({manifest,nodes:generated,scenes,sourceFiles,callPaths:[pathData],transitionPaths:transitions},null,2)+'\n');
console.log(`Indexed ${generated.length} nodes, ${scenes.length} frameworks with original source lines.`);
