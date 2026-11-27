import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {nodes,versions} from '../features/ep/spec.mjs';
import {callPath} from '../features/ep/call-path.mjs';
import {transitionPaths} from '../features/ep/transitions.mjs';
export const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
export const cacheName=r=>r.repo+'--'+r.file.replaceAll('/','__');
export const sourceKey=r=>hash(versions[r.repo].repo+'@'+versions[r.repo].sha+':'+r.file).slice(0,24);
export function sourceRequests(){
 const refs=nodes.flatMap(n=>[n,...(n.additional||[]).map(a=>({...n,...a}))]);
 for(const g of callPath.groups)for(const e of g.edges)refs.push(e.from,e.to,e.site,...e.support);
 for(const p of transitionPaths)for(const s of p.steps)refs.push(s.definition,...s.sources);
 return [...new Map(refs.map(r=>[cacheName(r),{repo:r.repo,file:r.file}])).values()].sort((a,b)=>cacheName(a)<cacheName(b)?-1:cacheName(a)>cacheName(b)?1:0);
}
export function readSource(cache,r){return fs.readFileSync(path.join(cache,cacheName(r)),'utf8').replaceAll('\r\n','\n')}
export function extract(cache,n){
 const lines=readSource(cache,n).split('\n');let lower=0,upper=lines.length;
 if(n.within){
  lower=lines.findIndex(l=>new RegExp('^class '+n.within+'(?:\\(|:)').test(l));
  if(lower<0)throw Error(n.symbol+': enclosing class not found: '+n.within);
  const next=lines.findIndex((l,i)=>i>lower&&/^class /.test(l));if(next>=0)upper=next;
 }
 if(n.scope&&!n.anchor.startsWith('def ')){
  const method=n.scope.split('.').at(-1);
  const at=lines.findIndex((l,i)=>i>=lower&&i<upper&&l.trimStart().startsWith('def '+method+'('));
  if(at<0)throw Error(n.scope+': method not found');lower=at;
  const indent=lines[at].match(/^ */)[0].length;
  const next=lines.findIndex((l,i)=>i>at&&i<upper&&new RegExp('^ {0,'+indent+'}(?:(?:async )?def |class )').test(l));if(next>=0)upper=next;
 }
 const candidates=lines.map((l,i)=>i>=lower&&i<upper&&l.includes(n.anchor)?i:-1).filter(i=>i>=0);
 if(!candidates.length)throw Error(n.symbol+': anchor not found: '+n.anchor);
 if(candidates.length>1&&!n.occurrence)throw Error(n.symbol+': ambiguous anchor: '+n.anchor);
 const at=n.occurrence==='last'?candidates.at(-1):candidates[0];
 const start=Math.max(lower,at-2),end=Math.min(upper,at+(n.lines||30));const code=lines.slice(start,end).join('\n');
 const ver=versions[n.repo];
 return {repo:ver.repo,sha:ver.sha,file:n.file,symbol:n.symbol,start:start+1,end,line:at+1,code,sourceKey:sourceKey(n),hash:hash(code),url:`https://github.com/${ver.repo}/blob/${ver.sha}/${n.file}#L${start+1}-L${end}`};
}
