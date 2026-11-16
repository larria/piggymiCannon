type Point={x:number;y:number};
type Actions={pan:(dx:number,dy:number)=>void;tap:(p:Point)=>void;hold:(p:Point)=>void;start:()=>void;locate?:(p:Point)=>void;press?:(p:Point)=>void};
/** One-pointer drag with tap/hold disambiguation. Long press never sends a tap. */
export function installMapGestures(canvas:HTMLCanvasElement,actions:Actions){
  let pointer:number|null=null,start:Point={x:0,y:0},last=start,moved=false,held=false,timer=0;
  const clear=()=>{clearTimeout(timer);pointer=null;};
  canvas.addEventListener('pointerdown',e=>{if(pointer!==null||e.button!==0)return;pointer=e.pointerId;start=last={x:e.clientX,y:e.clientY};moved=held=false;canvas.setPointerCapture(e.pointerId);actions.press?.(start);actions.locate?.(start);timer=window.setTimeout(()=>{held=true;actions.hold(start);},600);});
  canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||held)return;const point={x:e.clientX,y:e.clientY};if(!moved&&Math.hypot(point.x-start.x,point.y-start.y)>7){moved=true;clearTimeout(timer);actions.start();}if(moved){if(actions.locate)actions.locate(point);else actions.pan(last.x-point.x,last.y-point.y);}last=point;});
  canvas.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;const tap=!moved&&!held;clear();if(tap)actions.tap({x:e.clientX,y:e.clientY});});
  canvas.addEventListener('pointercancel',clear);canvas.addEventListener('lostpointercapture',clear);
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
}
