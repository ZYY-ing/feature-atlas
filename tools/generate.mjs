import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {nodes,manifest,versions} from '../features/ep/spec.mjs';
import {scenes} from '../features/ep/views.mjs';
import {lessons,sceneLessons} from '../features/ep/learning.mjs';
const cache=process.argv[2];
if(!cache)throw Error('Usage: node tools/generate.mjs /path/to/pinned-source-cache');
function extract(n){
 const file=path.join(cache,n.repo+'--'+n.file.replaceAll('/','__'));
 const lines=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n').split('\n');
 let lower=0,upper=lines.length;
 if(n.within){
  lower=lines.findIndex(l=>l.startsWith('class '+n.within+'('));
  if(lower<0)throw Error(n.id+': enclosing class not found');
  const next=lines.findIndex((l,i)=>i>lower&&/^class /.test(l));
  if(next>=0)upper=next;
 }
 const candidates=lines.map((l,i)=>i>=lower&&i<upper&&l.includes(n.anchor)?i:-1).filter(i=>i>=0);
 if(!candidates.length)throw Error(n.id+': anchor not found');
 if(candidates.length>1&&!n.occurrence)throw Error(n.id+': ambiguous anchor, scope it to a class or occurrence');
 const at=n.occurrence==='last'?candidates.at(-1):candidates[0];
 const start=Math.max(lower,at-2),end=Math.min(upper,at+(n.lines||30));
 const code=lines.slice(start,end).join('\n');
 return {repo:versions[n.repo].repo,sha:versions[n.repo].sha,file:n.file,symbol:n.symbol,start:start+1,end,code,
 hash:crypto.createHash('sha256').update(code).digest('hex'),url:`https://github.com/${versions[n.repo].repo}/blob/${versions[n.repo].sha}/${n.file}#L${start+1}-L${end}`};
}
const generated=nodes.map(n=>{
 if(!lessons[n.id])throw Error(n.id+': teaching content missing');
 const evidence=extract(n),sources=[evidence,...(n.additional||[]).map(a=>extract({...n,...a,additional:undefined,within:a.within}))];
 return {...n,lesson:lessons[n.id],evidence,sources};
});
for(const s of scenes){s.lesson=sceneLessons[s.id];if(!s.lesson)throw Error(s.id+': framework lesson missing');}
fs.mkdirSync('features/ep/generated',{recursive:true});
fs.writeFileSync('features/ep/generated/atlas.json',JSON.stringify({manifest,nodes:generated,scenes},null,2)+'\n');
console.log(`Indexed ${generated.length} nodes, ${scenes.length} frameworks with original source lines.`);
