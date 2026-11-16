export const ANGLE_HOLD_DELAY=350,ANGLE_REPEAT_INTERVAL=100,ANGLE_ACCELERATE_AT=1200,ANGLE_FAST_INTERVAL=60;
/** Frame-driven repeat: no permanent timers, and no burst after a delayed frame. */
export class AngleRepeat {
 private delivered=0;
 constructor(private started:number){}
 take(now:number){const age=Math.max(0,now-this.started);if(age<ANGLE_HOLD_DELAY)return 0;
  const total=1+Math.floor((Math.min(age,ANGLE_ACCELERATE_AT)-ANGLE_HOLD_DELAY)/ANGLE_REPEAT_INTERVAL)+Math.max(0,Math.floor((age-ANGLE_ACCELERATE_AT)/ANGLE_FAST_INTERVAL));
  const steps=Math.max(0,Math.min(4,total-this.delivered));this.delivered=total;return steps;
 }
}
type Options={enabled:()=>boolean;actor:()=>unknown;step:(direction:number,steps:number)=>void};
export function installAngleNudges(up:HTMLButtonElement,down:HTMLButtonElement,options:Options){
 type Latch={skip:boolean;expires:number};
 let held:{button:HTMLButtonElement;pointer:number;owner:unknown;direction:number;repeat:AngleRepeat;latch:Latch}|null=null;
 const cancel=()=>{if(!held)return;held.button.classList.remove('is-held');held.latch.expires=performance.now()+800;held=null;};
 const release=(e:PointerEvent)=>{if(e.pointerId===held?.pointer)cancel();};
 for(const [button,direction] of [[up,1],[down,-1]] as const){const latch:Latch={skip:false,expires:0};
  button.addEventListener('pointerdown',e=>{if(e.button!==0||button.disabled||!options.enabled()||held)return;e.preventDefault();latch.skip=true;latch.expires=Infinity;
   held={button,pointer:e.pointerId,owner:options.actor(),direction,repeat:new AngleRepeat(performance.now()),latch};button.classList.add('is-held');options.step(direction,1);
   try{button.setPointerCapture(e.pointerId);}catch{/* Document release is also handled. */}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release as EventListener);
  button.addEventListener('click',e=>{if(latch.skip&&performance.now()<latch.expires){latch.skip=false;return;}latch.skip=false;if(e.detail===0&&!button.disabled&&options.enabled())options.step(direction,1);});
  // SPACE on these buttons activates the angle control, not the charge control.
  button.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();e.stopPropagation();latch.skip=false;if(!e.repeat&&!button.disabled&&options.enabled())options.step(direction,1);});
  button.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();}});
 }
 document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',release,true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 return {cancel,update(now:number){const enabled=options.enabled();if(up.disabled===enabled)up.disabled=!enabled;if(down.disabled===enabled)down.disabled=!enabled;if(!held)return;if(!enabled||options.actor()!==held.owner){cancel();return;}const steps=held.repeat.take(now);if(steps)options.step(held.direction,steps);}};
}
