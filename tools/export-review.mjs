import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const read=p=>fs.readFileSync(p,'utf8');
const json=x=>JSON.stringify(x).replaceAll('<','\\u003c');
function moduleBody(file){return read(file).replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:function|const|class) )/g,'')}
export function exportReview(output){
 const atlas=JSON.parse(read('features/ep/generated/atlas.json'));
 const sources=Object.fromEntries(Object.values(atlas.sourceFiles).map(f=>[f.key,JSON.parse(read('features/ep/generated/'+f.url))]));
 let main=moduleBody('app/main.js');
 main=main.replace(/^const registry=.*$/m,()=>`const registry=${read('features/registry.json').trim()};`);
 main=main.replace(/^const atlas=await fetch.*$/m,()=>`const atlas=${json(atlas)};`);
 main=main.replace('files:atlas.sourceFiles||{},baseUrl:atlasUrl','files:atlas.sourceFiles||{},baseUrl:atlasUrl,loadSource:async meta=>reviewSources[meta.key]');
 main=main.replace('<span class="badge">MRv2</span>','<span class="badge">MRv2 · 本地审阅</span>');
 const storage='const reviewStorage={getItem(k){try{return localStorage.getItem(k)}catch{return null}},setItem(k,v){try{localStorage.setItem(k,v)}catch{}},removeItem(k){try{localStorage.removeItem(k)}catch{}}};';
 main=main.replace(/\blocalStorage\b/g,'reviewStorage');
 const parts=[storage,`const reviewSources=${json(sources)};`,
  `const {setupInspectorResize}=(()=>{${moduleBody('app/panel-resize.js')}\nreturn {setupInspectorResize};})();`,
  `const {NotesStore}=(()=>{${moduleBody('app/notes-store.js')}\nreturn {NotesStore};})();`,
  `const {createSourceTools}=(()=>{${moduleBody('app/source-reader.js')}\nreturn {createSourceTools};})();`,
  `const {callPathsHtml}=(()=>{${moduleBody('app/call-path.js')}\nreturn {callPathsHtml};})();`,main];
 const css=read('app/style.css').replace(/^@import[^\n]*\n/m,'');
 const license=`<script type="application/json" id="third-party-license">${json({notice:read('THIRD_PARTY_NOTICES.md'),license:read('LICENSES/Apache-2.0.txt')})}</script>`;
 const html=read('index.html').replace('<link rel="stylesheet" href="./app/style.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="./app/main.js"></script>',()=>license+'<script type="module">'+parts.join('\n')+'</script>');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log('Exported offline review: '+output);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))exportReview(process.argv[2]||'.scratch/feature-atlas-review.html');
