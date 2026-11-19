import type {Game,Tank} from './engine';
import {fixedAnglePredictor,safeAIPositions,type AIShot} from './ai-planner';
import {shotSafety,type ShotSafety} from './ai-safety';
import {causalAIShotSafety} from './ai-distance';
import {weaponById,excavation,type WeaponId} from './catalog';
import {originalWeapon,originalCraterAxes} from './original-ballistics';
import {vehicleById} from './vehicles';
export interface AIStuckState {turn:number;x:number;y:number;slope:number;terrain:number}
function localTerrain(g:Game,t:Tank){
 let hash=2166136261;
 for(let y=Math.max(0,Math.floor(t.y-160));y<Math.min(g.worldHeight,Math.ceil(t.y+120));y++)for(let x=Math.max(0,Math.floor(t.x-128));x<=Math.min(g.worldWidth,Math.ceil(t.x+128));x++){
  const at=y*g.land.stride+x;hash=Math.imul(hash^(g.land.mask[at]|g.land.protectedMask[at]<<1),16777619);
 }
 return hash>>>0;
}
export function rememberAIWait(g:Game,t:Tank){
 if(causalAIShotSafety(g.gameVersion))t.aiStuck={turn:t.turnsTaken,x:t.x,y:t.y,slope:g.tankSlope(t),terrain:localTerrain(g,t)};
}
export function unchangedAIWait(g:Game,t:Tank){
 const prior=t.aiStuck;if(!causalAIShotSafety(g.gameVersion)||!prior)return false;
 const same=Math.abs(prior.x-t.x)<=.5&&Math.abs(prior.y-t.y)<=.5&&Math.abs(prior.slope-g.tankSlope(t))<=.01&&prior.terrain===localTerrain(g,t);
 if(!same){delete t.aiStuck;return false;}
 return t.turnsTaken>prior.turn;
}
/** A deliberate excavation has no enemy-damage requirement. It may cause a
 * survivable self drop, but may not harm or dislodge teammates for its benefit. */
export function blockedAIRescue(risk:ShotSafety){return risk.unsafe||risk.out||risk.allies?.some(a=>a.damage>0||a.out||a.fall>0)===true;}
const allowed=(id:WeaponId)=>!['mine','fire','gas','poison'].includes(weaponById(id).effect??'shell')&&!['drill','bounce','cluster','airstrike'].includes(id);
/** Confirm the COMPLETE live projectile chain in an isolated game. This catches
 * piercing sections, salvos, double shots, permanent cells and mine chains;
 * no one-impact surrogate is allowed to certify a rescue as nonfatal. */
export function simulateAIRescue(g:Game,t:Tank,shot:AIShot){
 const snapshot=g.battleSnapshot();
 Object.assign(snapshot.current,{paused:false,introLocked:false,weatherObservation:null,observation:null,phase:'aiming',current:t.id,selected:shot.weapon,projectiles:[],blasts:[],aiDecision:null,aiPending:null,aiMoveGoal:null});
 const sim=(g.constructor as typeof Game).fromBattleSnapshot(snapshot),actor=sim.tanks[t.id];
 Object.assign(actor,{angle:shot.angle,power:shot.power,direction:shot.direction,controller:'human'});
 // Cosmetic work and user notifications are unnecessary in this private copy.
 sim.burst=()=>{};(sim as any).float=()=>{};(sim as any).emit=()=>{};
 const before=g.tanks.map(b=>{
  const ground=g.support(b.x,b.y+18),out=ground>=g.worldHeight,start=b.fallVelocity>0?b.fallStart:b.y,distance=Math.max(0,ground-18-start);
  const fallDamage=g.config.fallDamage&&!out&&distance>48?Math.round((distance-35)*.3):0;
  return {hp:b.hp,expectedHP:out?0:Math.max(0,b.hp-fallDamage),shield:b.shield,y:Math.max(b.y,ground-18),out:b.outOfBounds||out};
 });
 if(!sim.fire(false))return null;actor.controller='ai';
 let settled=false;
 for(let i=0;i<900;i++){
  sim.update(1/60);
  if(sim.projectiles.length===0&&sim.tanks.every(b=>b.hp<=0||b.fallVelocity===0)){settled=true;break;}
  if(actor.hp<=0||actor.outOfBounds)return null;
 }
 if(!settled||actor.hp<=0||actor.outOfBounds)return null;
 // Compare with untouched support/landing damage here too. An ally already
 // falling elsewhere cannot veto the rescue just because time has advanced.
 if(sim.tanks.some(b=>b.id!==t.id&&b.team===t.team&&before[b.id].hp>0&&(b.hp<before[b.id].expectedHP||b.shield<before[b.id].shield||b.outOfBounds&&!before[b.id].out||!before[b.id].out&&b.y>before[b.id].y+1)))return null;
 let cleared=0;
 for(let y=Math.max(0,Math.floor(t.y-110));y<Math.min(g.worldHeight,Math.ceil(t.y+36));y++)for(let x=Math.max(0,Math.floor(t.x-76));x<=Math.min(g.worldWidth,Math.ceil(t.x+76));x++){
  const at=y*g.land.stride+x;if(g.land.mask[at]&&!sim.land.mask[at])cleared++;
 }
 if(cleared<12)return null;
 const reach=(game:Game,b:Tank)=>Math.max(0,...safeAIPositions(game,b).map(p=>Math.abs(p.x-b.x)));
 return {cleared,selfDamage:Math.max(0,t.hp-actor.hp),fall:Math.max(0,actor.y-t.y),beforeReach:reach(g,t),afterReach:reach(sim,actor),position:{x:actor.x,y:actor.y},slope:sim.tankSlope(actor)};
}
/** Used only after a completed safe skip in the same local trap. Normal safe
 * attacks/positioning are tried first. Probe a bounded set and live-confirm the
 * shortlist; do not consume RNG, grant fuel, alter damage or bypass colliders. */
export function planAISelfRescue(g:Game,t:Tank,weapons:WeaponId[]){
 if(!unchangedAIWait(g,t)||t.fallVelocity>0||t.immobile)return null;
 const native=t.vehicleId?vehicleById(t.vehicleId):null;
 const options=[...new Set([...weapons,...(native?[native.normal,native.special]:[])])].filter(id=>t.ammo[id]>0&&allowed(id));
 const angles=[t.minAngle,t.maxAngle,(t.minAngle+t.maxAngle)/2];for(let a=t.minAngle;a<=t.maxAngle;a+=8)angles.push(a);
 const offers:{shot:AIShot;score:number}[]=[];
 for(const weapon of options)for(const direction of [-1,1])for(const angle of [...new Set(angles)])for(const power of [g.minimumShotPower,3,6,10,16,24,36,50,70,100]){
  const rays=[...fixedAnglePredictor(g,{...t,angle,direction},weapon)(power)],native=originalWeapon(weapon),axes=native?originalCraterAxes(native.round):excavation(weapon,false,g.gameVersion);
  let score=0;
  for(const ray of rays){
   if(ray.age>=12||ray.y<0||ray.y>=g.worldHeight||Math.abs(ray.x-t.x)>axes.radius+40)continue;
   for(let dy=-axes.depth;dy<=axes.depth;dy+=6)for(let dx=-axes.radius;dx<=axes.radius;dx+=6){
    if((dx/axes.radius)**2+(dy/axes.depth)**2>1)continue;
    const x=Math.floor(ray.x+dx),y=Math.floor(ray.y+dy),at=y*g.land.stride+x;
    if(Math.abs(x-t.x)>76||y<t.y-110||y>t.y+36||!g.land.solid(x,y)||g.land.protectedMask[at])continue;
    score+=y<t.y-20?3:1;
   }
  }
  if(score<=0)continue;
  const risk=shotSafety(g,t,weapon,angle,power,direction);if(blockedAIRescue(risk))continue;
  offers.push({shot:{x:t.x,y:t.y,angle,power,direction,weapon,target:t.id,utility:score,effective:false},score:score-(risk.friendlyCost??0)*2});
 }
 offers.sort((a,b)=>b.score-a.score);
 // Different aim/weapon regions avoid spending all confirmations on one crater.
 const tested=new Set<string>();let trials=0;
 for(const {shot} of offers){
  const key=`${shot.weapon}:${shot.direction}:${Math.round(shot.angle/8)}:${Math.round(shot.power/16)}`;if(tested.has(key))continue;tested.add(key);
  const result=simulateAIRescue(g,t,shot);if(result)return {shot,result,wait:t.aiStuck};
  if(++trials>=4)break;
 }
 return null;
}
