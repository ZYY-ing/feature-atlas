import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {versions} from '../features/ep/spec.mjs';
import {sourceRequests,cacheName,hash} from './source-data.mjs';
const cache=process.argv[2]||'.cache/sources';fs.mkdirSync(cache,{recursive:true});
const lock=JSON.parse(fs.readFileSync('features/ep/sources.lock.json','utf8'));
const jobs=sourceRequests();let done=0;
const run=promisify(execFile);
async function download(r){
 const v=versions[r.repo],name=cacheName(r),dest=path.join(cache,name),expected=lock.files[name];
 if(!expected||lock.versions[r.repo].sha!==v.sha)throw Error('Source lock missing/outdated: '+name);
 if(fs.existsSync(dest)&&hash(fs.readFileSync(dest,'utf8').replaceAll('\r\n','\n'))===expected)return;
 let failure;
 for(let attempt=0;attempt<3;attempt++)try{
  // curl is available on GitHub's Ubuntu runner and honors proxy settings on
  // Windows. Keep TLS verification; Schannel may lack revocation connectivity.
  const args=['--fail','--silent','--show-error','--location','--proto','=https','--max-time','60',...(process.platform==='win32'?['--ssl-revoke-best-effort']:[]),`https://raw.githubusercontent.com/${v.repo}/${v.sha}/${r.file}`];
  const {stdout}=await run(process.platform==='win32'?'curl.exe':'curl',args,{maxBuffer:8*1024*1024,encoding:'utf8',windowsHide:true});
  const code=stdout.replaceAll('\r\n','\n');
  if(hash(code)!==expected)throw Error('Source checksum mismatch: '+name);
  fs.writeFileSync(dest,code);return;
 }catch(e){failure=e;}
 throw Error('Could not fetch '+name+': '+failure.message);
}
await Promise.all(Array.from({length:4},async()=>{while(jobs.length){const r=jobs.shift();await download(r);done++}}));
console.log(`Verified ${done} pinned source files in ${cache}`);
