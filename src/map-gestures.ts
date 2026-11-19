type Point={x:number;y:number};
import {wheelZoomFactor} from './battle-zoom';
type Actions={blocked?:(e:PointerEvent)=>boolean;pan:(dx:number,dy:number)=>void;tap:(p:Point)=>void;hold:(p:Point)=>void;start:()=>void;locate?:(p:Point)=>void;press?:(p:Point)=>void;zoom?:(factor:number,anchor:Point)=>void;zoomAllowed?:()=>boolean};
/** One-pointer drag with tap/hold disambiguation. Long press never sends a tap. */
export function installMapGestures(canvas:HTMLCanvasElement,actions:Actions){
  let pointer:number|null=null,start:Point={x:0,y:0},last=start,moved=false,held=false,timer=0,pinching=false;
  const touches=new Map<number,Point>();let pinch:{distance:number;center:Point}|null=null;
  const clear=()=>{clearTimeout(timer);pointer=null;touches.clear();pinch=null;pinching=false;};
  const capture=(id:number)=>{try{canvas.setPointerCapture(id);}catch{/* A cancelled pointer cannot be captured. */}};
  const sample=()=>{const [a,b]=[...touches.values()];return {distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};};
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    if(actions.zoom&&e.pointerType==='touch'&&actions.zoomAllowed?.()!==false){
      touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(touches.size>=2){clearTimeout(timer);pointer=null;pinching=true;pinch=sample();capture(e.pointerId);e.preventDefault();actions.start();return;}
    }
    if(pointer!==null||actions.blocked?.(e))return;pointer=e.pointerId;start=last={x:e.clientX,y:e.clientY};moved=held=false;capture(e.pointerId);actions.press?.(start);actions.locate?.(start);timer=window.setTimeout(()=>{held=true;actions.hold(start);},600);
  });
  canvas.addEventListener('pointermove',e=>{
    if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinching){e.preventDefault();if(touches.size>=2&&pinch){const next=sample();if(actions.zoomAllowed?.()!==false){actions.zoom?.(next.distance/pinch.distance,pinch.center);actions.pan(pinch.center.x-next.center.x,pinch.center.y-next.center.y);}pinch=next;}return;}
    if(pointer!==e.pointerId||held)return;const point={x:e.clientX,y:e.clientY};if(!moved&&Math.hypot(point.x-start.x,point.y-start.y)>7){moved=true;clearTimeout(timer);actions.start();}if(moved){if(actions.locate)actions.locate(point);else actions.pan(last.x-point.x,last.y-point.y);}last=point;
  });
  const end=(e:PointerEvent)=>{
    touches.delete(e.pointerId);if(pinching){if(touches.size<2)pinch=null;if(!touches.size)clear();return;}
    if(pointer!==e.pointerId)return;const tap=e.type==='pointerup'&&!moved&&!held;clear();if(tap)actions.tap({x:e.clientX,y:e.clientY});
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end as EventListener);
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  if(actions.zoom){
    let safariScale:number|null=null;
    canvas.addEventListener('wheel',e=>{if(actions.zoomAllowed?.()===false)return;e.preventDefault();if(safariScale!==null)return;actions.zoom!(wheelZoomFactor(e.deltaY,e.deltaMode,e.ctrlKey),{x:e.clientX,y:e.clientY});},{passive:false});
    // macOS Safari sends GestureEvents for trackpad pinch. iOS Pointer Events
    // already provide the two touches, so never apply both paths at once.
    const gesture=(event:Event)=>{const e=event as Event&{scale:number;clientX:number;clientY:number};if(event.type==='gestureend'){safariScale=null;return;}if(actions.zoomAllowed?.()===false)return;e.preventDefault();if(event.type==='gesturestart'){safariScale=1;return;}if(!pinching&&safariScale!==null&&e.scale>0)actions.zoom!(e.scale/safariScale,{x:e.clientX,y:e.clientY});safariScale=e.scale;};
    for(const name of ['gesturestart','gesturechange','gestureend'])canvas.addEventListener(name,gesture,{passive:false});
    window.addEventListener('blur',()=>safariScale=null);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)safariScale=null;});
  }
}
