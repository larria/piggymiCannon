type Rect={left:number;top:number;width:number;height:number};type Point={x:number;y:number};
export const EDGE_PAN_MARGIN=24,EDGE_PAN_SPEED=420,EDGE_PAN_DWELL=.15;
export function edgeVector(p:Point,r:Rect){
 if(p.x<r.left||p.y<r.top||p.x>r.left+r.width||p.y>r.top+r.height)return {x:0,y:0};
 const component=(v:number,size:number)=>v<EDGE_PAN_MARGIN?-(1-v/EDGE_PAN_MARGIN):v>size-EDGE_PAN_MARGIN?1-(size-v)/EDGE_PAN_MARGIN:0;
 const x=component(p.x-r.left,r.width),y=component(p.y-r.top,r.height),length=Math.max(1,Math.hypot(x,y));return {x:x/length,y:y/length};
}
/** Event-driven geometry, frame-rate-independent motion; no extra timers or RAF. */
export function installEdgePanning(canvas:HTMLCanvasElement,allowed:()=>boolean){
 let vector={x:0,y:0},time=0,touch:number|null=null,last:Point|null=null;
 const reset=()=>{vector={x:0,y:0};time=0;touch=null;last=null;};
 const sample=(e:PointerEvent)=>{const p={x:e.clientX,y:e.clientY},next=edgeVector(p,canvas.getBoundingClientRect());if(last&&Math.hypot(last.x-p.x,last.y-p.y)>7)time=0;if(Math.sign(next.x)!==Math.sign(vector.x)||Math.sign(next.y)!==Math.sign(vector.y))time=0;last=p;vector=next;};
 canvas.addEventListener('pointerdown',e=>{if(!allowed()||e.button!==0)return;sample(e);if(e.pointerType==='touch'&&(vector.x||vector.y)){touch=e.pointerId;e.preventDefault();canvas.setPointerCapture(e.pointerId);}else reset();});
 canvas.addEventListener('pointermove',e=>{if(!allowed()){reset();return;}if(touch===e.pointerId||e.pointerType!=='touch'&&e.buttons===0)sample(e);else if(touch===null)reset();});
 canvas.addEventListener('pointerleave',()=>{if(touch===null)reset();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,reset);
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return {owns:(id:number)=>touch===id,reset,tick:(dt:number)=>{if(!allowed()){reset();return {x:0,y:0};}time+=Math.max(0,dt);const step=touch!==null||time>=EDGE_PAN_DWELL?Math.min(.05,Math.max(0,dt))*EDGE_PAN_SPEED:0;return {x:vector.x*step,y:vector.y*step};}};
}
