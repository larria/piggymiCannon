import type {Game,Tank} from './engine';
import {Terrain} from './terrain';
import {causalAIShotSafety} from './ai-distance';
import {safeAIPositions,solveAIShot,type AIShot} from './ai-planner';
import {chooseSafeAIShot} from './ai-safety';
import {originalWeapon,originalCrater} from './original-ballistics';
import type {WeaponId} from './catalog';
export type SupportReserve={hits:number;permanent:boolean;fall:number;out:boolean};
const usesSupportStrategy=(g:Game,t:Tank)=>causalAIShotSafety(g.gameVersion)&&['temple','moon'].includes(g.config.map)&&t.difficulty!=='easy';
/** Compare terrain endurance, not hypothetical HP damage. Each hit uses the
 * Cannon normal native scanlines at the current head contact; settle onto the
 * actual five-column support before the next hit, including lower platforms. */
function supportProbe(g:Game){
 const scratch=new Terrain(g.worldWidth,g.worldHeight),view=Object.create(g) as Game;view.land=scratch;
 scratch.protectedMask.set(g.land.protectedMask);
 const rows=originalCrater(originalWeapon('cannon-normal')!.round);
 return (tank:Tank):SupportReserve=>{
  scratch.mask.set(g.land.mask);scratch.surface.set(g.land.surface);scratch.revision=0;scratch.changes.length=0;
  const t={...tank,fallVelocity:0};let permanent=false,fall=0;
  for(let hit=0;hit<3;hit++){
   scratch.removeScanlines(t.x,t.y-33,rows);
   const ground=view.support(t.x,t.y+18);if(ground>=g.worldHeight)return {hits:hit,permanent:false,fall,out:true};
   fall+=Math.max(0,ground-(t.y+18));t.y=ground-18;
   permanent=[-16,-8,0,8,16].filter(dx=>{
    const x=Math.round(t.x+dx),y=view.support(x,t.y+18);return y<g.worldHeight&&scratch.protectedMask[y*scratch.stride+x]===1;
   }).length>=3;
  }
  return {hits:3,permanent,fall,out:false};
 };
}
export function aiSupportReserve(g:Game,t:Tank){return supportProbe(g)(t);}
function abovePermanent(g:Game,x:number,foot:number){
 const at=Math.round(x);for(let y=Math.max(0,Math.floor(foot));y<g.worldHeight;y++)if(g.land.protectedMask[y*g.land.stride+at])return true;return false;
}
function nearbySupports(g:Game,t:Tank){
 const positions=safeAIPositions(g,t),seen=new Set(positions.map(p=>p.x)),budget=Math.min(160,t.moveDistance*t.fuel/100*.85/(t.frozen?2:1));
 // Include the closest accessible column above a permanent mushroom on each
 // side, even when it falls between the standard movement sample distances.
 for(const direction of [-1,1])for(let distance=8;distance<=budget;distance+=8){
  const x=t.x+direction*distance;if(!abovePermanent(g,x,t.y+18))continue;
  const p=safeAIPositions(g,t,undefined,distance).find(p=>Math.abs(p.x-x)<.1);
  if(p&&!seen.has(p.x)){positions.push(p);seen.add(p.x);break;}
 }
 return positions;
}
export function chooseSupportedAIPosition(g:Game,t:Tank,weapons:WeaponId[],targets:Tank[],best:AIShot){
 if(!usesSupportStrategy(g,t)||t.fallVelocity>0||t.immobile||t.fuel<=0)return null;
 const probe=supportProbe(g),before=probe(t),original=probe({...t,x:best.x,y:best.y});
 if(original.hits===3)return null;
 const positions=[t,...nearbySupports(g,t)],rated=positions.map(position=>({position,reserve:probe(position)})).filter(p=>p.reserve.hits>original.hits||p.reserve.hits===original.hits&&p.reserve.permanent&&!original.permanent);
 rated.sort((a,b)=>(b.reserve.hits*200+Number(b.reserve.permanent)*250-Math.abs(b.position.x-t.x)*.2-b.reserve.fall*.1)-(a.reserve.hits*200+Number(a.reserve.permanent)*250-Math.abs(a.position.x-t.x)*.2-a.reserve.fall*.1));
 for(const {position,reserve} of rated.slice(0,3)){
  const shot=solveAIShot(g,position,weapons,targets);if(!shot.effective)continue;
  return {shot,before,original,after:reserve};
 }
 return null;
}
/** Transfer uses the same launch/integration and swept collision as live shell
 * carriers. Its parachute landing is based on the contacted connected platform,
 * not the map's first upper surface or a screen-coordinate guess. */
export function predictAITransfer(g:Game,t:Tank,angle=t.angle,power=t.power,direction=t.direction){
 const p={...g.launch({...t,direction},'shell',angle,power),transfer:true},dt=1/180;
 for(let i=0;i<12/dt;i++){
  const x=p.x,y=p.y;p.age+=dt;p.vx+=g.wind*3*dt;p.vy+=g.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  const hit=g.firstImpact(p,x,y,p.x,p.y);
  if(hit){
   let start=hit.y-52;start=Math.min(start,g.support(hit.x,start+18)-52);
   const ground=g.support(hit.x,start+18),landing={...t,x:hit.x,y:ground-18,fallVelocity:0};
   if(hit.x<32||hit.x>g.worldWidth-32||ground>=g.worldHeight)return null;
   return {landing,impact:{x:hit.x,y:hit.y},age:p.age};
  }
  if(p.x<0||p.x>g.worldWidth||p.y>=g.worldHeight)return null;
 }
 return null;
}
export function planAIProtectiveTransfer(g:Game,t:Tank,trap=false){
 if(!causalAIShotSafety(g.gameVersion)||!trap&&!usesSupportStrategy(g,t)||t.difficulty!=='expert'||g.restoring||g.teleporting||t.doubleShot||g.itemUnavailable('teleport',true))return null;
 const probe=supportProbe(g),before=probe(t);if(!trap&&before.hits===3)return null;
 if(!trap&&nearbySupports(g,t).some(p=>probe(p).hits===3))return null; // Save the item when walking is enough.
 const angles=[t.minAngle,t.maxAngle,(t.minAngle+t.maxAngle)/2];for(let a=t.minAngle;a<=t.maxAngle;a+=8)angles.push(a);
 const seen=new Set<string>();let best:{angle:number;power:number;direction:number;landing:Tank;impact:{x:number;y:number};before:SupportReserve;after:SupportReserve;score:number}|null=null;
 for(const direction of [-1,1])for(const angle of [...new Set(angles)])for(const power of [g.minimumShotPower,5,10,18,30,45,60,80,100]){
  const hit=predictAITransfer(g,t,angle,power,direction);if(!hit)continue;
  const distance=Math.abs(hit.landing.x-t.x);if(distance<32&&Math.abs(hit.landing.y-t.y)<32||distance>900)continue;
  const bodies=[...g.tanks.filter(b=>b.team===t.team),...g.knownAITargets()];
  if(bodies.some(b=>b.id!==t.id&&g.bodyOccupies(b)&&Math.abs(b.x-hit.landing.x)<56&&Math.abs(b.y-hit.landing.y)<51))continue;
  const key=`${Math.round(hit.landing.x/24)}:${Math.round(hit.landing.y/24)}`;if(seen.has(key))continue;seen.add(key);
  const after=probe(hit.landing);if(!trap&&after.hits<=before.hits&&!after.permanent||after.out)continue;
  if(trap){
   const weapons=t.vehicleId?[`${t.vehicleId}-normal` as WeaponId,`${t.vehicleId}-special` as WeaponId]:['shell' as WeaponId];
   const shot=solveAIShot(g,hit.landing,weapons,g.knownAITargets());
   if(!shot.effective||!chooseSafeAIShot(g,hit.landing,weapons,g.knownAITargets(),shot))continue;
  }
  const score=after.hits*200+Number(after.permanent)*250-distance*.2-hit.age*10-150;
  if(!best||score>best.score)best={angle,power,direction,landing:hit.landing,impact:hit.impact,before,after,score};
 }
 return best;
}
