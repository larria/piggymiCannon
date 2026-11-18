import {markerPercent} from './match-polish';
export const BAR_HOLD_MS=200;
export interface PowerMarkerHooks {allowed:()=>boolean;mark:(power:number,owner?:number)=>void;owner?:()=>number;canCharge?:()=>boolean;start:(event:PointerEvent,startedAt:number)=>boolean;finish:(event:PointerEvent)=>void;cancel:()=>void;pending:()=>void;now?:()=>number}
/** A short release marks; holding hands off to the same charge controller at 200ms.
 * Pointer capture loss is not a cancellation, and a moved short tap never marks. */
export function installPowerMarkers(bar:HTMLElement,hooks:PowerMarkerHooks){
 let state:{event:PointerEvent;start:number;x:number;y:number;holding:boolean;owner?:number}|null=null,timer=0;
 const now=hooks.now??(()=>performance.now());
 const reset=()=>{window.clearTimeout(timer);timer=0;state=null;hooks.pending();};
 const start=()=>{if(!state||state.holding)return;if(!hooks.allowed()||hooks.owner&&state.owner!==hooks.owner()){reset();return;}if(hooks.canCharge?.()===false){timer=0;hooks.pending();return;}const current=state;current.holding=hooks.start(current.event,current.start);if(!current.holding)reset();hooks.pending();};
 const down=(e:PointerEvent)=>{if(e.button!==0||state||!hooks.allowed())return;e.preventDefault();state={event:e,start:now(),x:e.clientX,y:e.clientY,holding:false,owner:hooks.owner?.()};try{bar.setPointerCapture(e.pointerId);}catch{/* Document listeners remain authoritative. */}timer=window.setTimeout(start,BAR_HOLD_MS);hooks.pending();};
 const up=(e:PointerEvent)=>{if(!state||state.event.pointerId!==e.pointerId)return;e.preventDefault();if(!state.holding&&now()-state.start>=BAR_HOLD_MS)start();const current=state;if(!current)return;reset();if(current.holding)hooks.finish(e);else if(hooks.allowed()&&(!hooks.owner||current.owner===hooks.owner())&&Math.hypot(e.clientX-current.x,e.clientY-current.y)<=10){const r=bar.getBoundingClientRect();hooks.mark(markerPercent(e.clientX,r.left,r.width),current.owner);}};
 const cancel=(e:PointerEvent)=>{if(!state||state.event.pointerId!==e.pointerId)return;const holding=state.holding;reset();if(holding)hooks.cancel();};
 const move=(e:PointerEvent)=>{if(state&&!state.holding&&state.event.pointerId===e.pointerId&&Math.hypot(e.clientX-state.x,e.clientY-state.y)>10)reset();};
 bar.addEventListener('pointerdown',down);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('pointermove',move,true);
 return {reset,get pendingStart(){return state&&!state.holding&&hooks.canCharge?.()!==false?state.start:null;},destroy(){reset();bar.removeEventListener('pointerdown',down);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('pointermove',move,true);}};
}
