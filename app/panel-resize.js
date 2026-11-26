const storageKey='feature-atlas-inspector-width';

export function setupInspectorResize(workspace,handle){
 const inspector=workspace.querySelector('.inspector');
 const desktop=window.matchMedia('(min-width: 861px)');
 let preferredWidth=null,drag=null;
 try{const saved=Number(localStorage.getItem(storageKey));if(Number.isFinite(saved)&&saved>=340)preferredWidth=saved;}catch{}
 const limits=()=>({min:340,max:Math.max(340,Math.floor(workspace.clientWidth-320))});
 const clamp=width=>Math.min(limits().max,Math.max(limits().min,width));
 function update(){
  if(!desktop.matches||getComputedStyle(inspector).display==='none')return;
  if(preferredWidth!==null)workspace.style.setProperty('--inspector-width',clamp(preferredWidth)+'px');
  const {min,max}=limits(),width=Math.round(inspector.getBoundingClientRect().width);
  handle.setAttribute('aria-valuemin',min);
  handle.setAttribute('aria-valuemax',max);
  handle.setAttribute('aria-valuenow',width);
  handle.setAttribute('aria-valuetext',`右侧面板宽度 ${width} 像素`);
 }
 function save(){try{localStorage.setItem(storageKey,String(preferredWidth));}catch{}}
 function finish(){
  if(!drag)return;
  const pointerId=drag.pointerId;drag=null;
  document.body.classList.remove('resizing-inspector');
  if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
  if(preferredWidth!==null)save();
 }
 handle.addEventListener('pointerdown',event=>{
  if(!desktop.matches||event.button!==0)return;
  event.preventDefault();handle.focus();
  drag={pointerId:event.pointerId,x:event.clientX,width:inspector.getBoundingClientRect().width};
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add('resizing-inspector');
 });
 handle.addEventListener('pointermove',event=>{
  if(!drag||drag.pointerId!==event.pointerId)return;
  preferredWidth=clamp(drag.width+drag.x-event.clientX);update();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,finish);
 handle.addEventListener('keydown',event=>{
  if(!desktop.matches)return;
  const width=inspector.getBoundingClientRect().width,step=event.shiftKey?80:24;
  const next={ArrowLeft:width+step,ArrowRight:width-step,Home:limits().min,End:limits().max}[event.key];
  if(next===undefined)return;
  event.preventDefault();preferredWidth=clamp(next);update();save();
 });
 handle.addEventListener('dblclick',()=>{
  preferredWidth=null;workspace.style.removeProperty('--inspector-width');
  try{localStorage.removeItem(storageKey);}catch{}
  update();
 });
 window.addEventListener('resize',()=>{if(!desktop.matches)finish();update()});
 new ResizeObserver(update).observe(inspector);
 update();
}
