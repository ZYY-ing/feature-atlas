// Source is immutable. Only annotations are editable. No credentials or backend.
export const notesKey='feature-atlas:line-notes:v1';
export const noteKey=(file,line)=>`${file.repo}@${file.sha}:${file.file}:${line}`;
export function validateNote(n,files){
 const f=Object.values(files).find(f=>f.repo===n.repo&&f.sha===n.sha&&f.file===n.file);
 if(!f||n.sourceHash!==f.hash||!Number.isInteger(n.line)||n.line<1||n.line>f.lineCount||typeof n.text!=='string'||n.text.length>20000||typeof n.originalLine!=='string')throw Error('笔记版本、文件校验或格式不匹配；未导入任何笔记。');
 return n;
}
export class NotesStore{
 constructor(storage,files){this.storage=storage;this.files=files;this.notes={};this.error='';try{const raw=storage.getItem(notesKey);if(raw){const doc=JSON.parse(raw);if(doc.version!==1||!Array.isArray(doc.notes))throw Error();for(const n of doc.notes){try{validateNote(n,files);this.notes[noteKey(n,n.line)]=n}catch{/* Keep other-version notes in browser storage when saving, below. */}}}}catch{this.error='浏览器笔记存储不可用或数据损坏；请导出备份。'}}
 get(file,line){return this.notes[noteKey(file,line)]?.text||''}
 save(file,line,originalLine,text){
  const n={repo:file.repo,sha:file.sha,file:file.file,sourceHash:file.hash,line,originalLine,text,updatedAt:new Date().toISOString()};validateNote(n,this.files);
  if(text.trim())this.notes[noteKey(file,line)]=n;else delete this.notes[noteKey(file,line)];
  try{
   // Update only this anchor, preserving other tabs and other source versions.
   const prior=JSON.parse(this.storage.getItem(notesKey)||'{"version":1,"notes":[]}');
   const other=(prior.notes||[]).filter(item=>noteKey(item,item.line)!==noteKey(n,line));
   const merged=[...other,...(text.trim()?[n]:[])];
   this.storage.setItem(notesKey,JSON.stringify({version:1,notes:merged}));
   for(const item of merged)try{validateNote(item,this.files);this.notes[noteKey(item,item.line)]=item}catch{}
   this.error='';return true;
  }catch{this.error='浏览器未能保存；当前笔记仍可导出，请立即备份。';return false;}
 }
 export(){return JSON.stringify({version:1,notes:Object.values(this.notes)},null,2)}
 import(raw){
  const doc=JSON.parse(raw);if(doc.version!==1||!Array.isArray(doc.notes)||doc.notes.length>10000)throw Error('不支持的笔记文件。');
  const candidates=doc.notes.map(n=>validateNote(n,this.files));
  // Validate everything before mutating the current notes.
  for(const n of candidates){const f=Object.values(this.files).find(f=>f.repo===n.repo&&f.sha===n.sha&&f.file===n.file);this.save(f,n.line,n.originalLine,n.text)}
  return candidates.length;
 }
}
