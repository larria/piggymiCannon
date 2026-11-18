import {fixedAnglePredictor} from './ai-planner';
import type {Game,Tank} from './engine';
import {weaponById,weaponDamage,launchDamageScale,type WeaponId} from './catalog';
import {originalWeapon,sourceDamage,ORIGINAL_TANKS} from './original-ballistics';
import {PIERCING_DAMAGE} from './piercing';
import {damageAffinity,applyDamageAffinity} from './source-attributes';
import {isRaging} from './health';
export const ASSIST_SETTLE_MS=30,ASSIST_POWER_STEP=.5,ASSIST_SLICE_MS=4;
export type AssistBand={target:number;samples:Float32Array};
export function assistanceSignature(g:Game,t:Tank){
 const weapon=t.id===g.current?g.selected:t.selectedWeapon;
 return [g.land.revision,t.id,t.x,t.y,t.angle,t.direction,weapon,t.boost,isRaging(t),t.vehicleId,g.wind,g.gravity,g.snow,g.fog,g.config.powerAssist,g.phase,g.paused,g.introLocked,g.fireLine?.x,g.fireLine?.top,g.fireLine?.bottom,g.config.friendlyFire,g.config.selfDamage,g.restoring,g.teleporting,...g.tanks.flatMap(b=>[b.id,b.x,b.y,b.hp>0,b.vehicleId,b.direction,b.outOfBounds])].join('|');
}
/** Each target keeps its own band, so overlapping ranges blend naturally. Prediction
 * is an estimate at 0.5% resolution, not a guarantee after terrain/targets change.
 * No visibility leak through fog; no RNG, damage, dig, ammo or replay writes. */
export function* assistanceSweep(g:Game,t:Tank):Generator<void,AssistBand[]>{
 const weapon:WeaponId=t.id===g.current?g.selected:t.selectedWeapon;
 const count=1+Math.round((100-g.minimumShotPower)/ASSIST_POWER_STEP);
 const enemies=g.opponents(t).filter(b=>g.visible(b)),bands=enemies.map(b=>({target:b.id,samples:new Float32Array(count)}));
 const predict=fixedAnglePredictor(g,t,weapon),spec=weaponById(weapon),native=originalWeapon(weapon);
 const extraBoost=(isRaging(t)?1.5:1)*(t.vehicleId==='water'&&g.snow?1.25:1);
 const maximum=(b:Tank,boost:number)=>{
  const affinity=damageAffinity(weapon,t.vehicleId,b.vehicleId,g.gameVersion);
  const value=native&&weapon!=='missile-normal'?applyDamageAffinity(sourceDamage(native.power,native.round,0,b.vehicleId?ORIGINAL_TANKS[b.vehicleId].defence:100,boost*extraBoost),affinity)*(spec.effect==='mine'?1/3:1):weaponDamage(weapon,g.gameVersion)*launchDamageScale(!!t.vehicleId,weapon)*boost*extraBoost*affinity.value*(weapon==='missile-normal'?PIERCING_DAMAGE.reduce((a,b)=>a+b,0):1);
  return Math.max(1,value);
 };
 for(let i=0;i<count;i++){
  const power=g.minimumShotPower+i*ASSIST_POWER_STEP;
  for(const ray of predict(power)){
   for(const band of bands){const hit=ray.hits.find(h=>h.body.tank.id===band.target);if(!hit)continue;
    // Mines act after landing; do not advertise a remote mine as an immediate hit.
    if(spec.effect==='mine'&&!hit.direct&&Math.hypot(hit.body.tank.x-ray.x,hit.body.tank.y+18-ray.y)>30)continue;
    const q=Math.min(1,hit.damage/maximum(hit.body.tank,ray.boost));
    if(q>0)band.samples[i]=Math.max(band.samples[i],q);
   }
   yield;
  }
 }
 return bands;
}
/** One cancellable short task at a time. Reuse results while charging; stop work
 * when inputs resume, a match changes or the page/dialog is hidden. */
export class PowerAssistance {
 private owner=0;private game:Game|null=null;private key='';private stableAt=0;private job:ReturnType<typeof assistanceSweep>|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;private generation=0;private complete=false;private suspended=false;
 private bands:AssistBand[]=[];private paintKey='';
 constructor(private canvas:HTMLCanvasElement){}
 clear(){this.cancel();this.game=null;this.key='';this.complete=false;this.bands=[];this.canvas.hidden=true;}
 private cancel(){this.generation++;if(this.timer!==null)clearTimeout(this.timer);this.timer=null;this.job=null;}
 update(g:Game,t:Tank,allowed:boolean,inputActive:boolean,now:number,charging=false){
  this.suspended=charging;
  if(!g.config.powerAssist||!allowed||!g.humanTurn||t.id!==g.current||t.controller!=='human'||t.hp<=0||t.fallVelocity>0||g.phase!=='aiming'||g.restoring||g.teleporting||(t.id===g.current?g.selected:t.selectedWeapon)==='airstrike'){this.clear();return;}
  const key=assistanceSignature(g,t);
  if(this.game!==g||key!==this.key||inputActive){this.cancel();this.game=g;this.owner=t.id;this.key=key;this.stableAt=now;this.complete=false;this.bands=[];this.canvas.hidden=true;}
  if(!inputActive&&!charging&&!this.complete&&!this.job&&now-this.stableAt>=ASSIST_SETTLE_MS){this.job=assistanceSweep(g,{...t});this.schedule();}
  if(this.job&&this.timer===null&&!charging)this.schedule();
  if(this.complete)this.paint();
 }
 private schedule(){if(this.timer!==null||!this.job)return;const generation=this.generation;
  this.timer=setTimeout(()=>{this.timer=null;if(generation!==this.generation||this.suspended||!this.job)return;
   if(!this.game||assistanceSignature(this.game,this.game.tanks[this.owner])!==this.key){this.cancel();return;}
   const start=performance.now();do{const r=this.job.next();if(r.done){this.bands=r.value;this.job=null;this.complete=true;this.paintKey='';this.paint();return;}}while(performance.now()-start<ASSIST_SLICE_MS);
   this.schedule();
  },16);
 }
 private paint(){
  const box=this.canvas.parentElement!,width=Math.max(1,Math.round(box.clientWidth-4)),height=8,dpr=Math.min(2,window.devicePixelRatio||1),key=`${width}:${dpr}`;
  if(this.paintKey===key)return;this.paintKey=key;this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
  const c=this.canvas.getContext('2d')!;c.scale(dpr,dpr);c.clearRect(0,0,width,height);
  let visible=false;
  for(const b of this.bands){for(let i=0;i<b.samples.length;i++){const q=b.samples[i];if(q<=0)continue;visible=true;c.fillStyle=`rgba(60,104,83,${.15+.8*q*q})`;const x=(this.game!.minimumShotPower+i*ASSIST_POWER_STEP-ASSIST_POWER_STEP/2)/100*width;c.fillRect(x,0,ASSIST_POWER_STEP/100*width+.2,height);}}
  this.canvas.hidden=!visible;
 }
}
