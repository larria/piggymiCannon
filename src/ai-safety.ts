import type {Game,Tank} from './engine';
import {fixedAnglePredictor,safeAIPositions,solveAIShot,type AIShot} from './ai-planner';
import {originalWeapon,originalCrater,originalCraterAxes} from './original-ballistics';
import {weaponById,excavation,type WeaponId} from './catalog';
import {adaptiveAI,causalAIShotSafety} from './ai-distance';
type Hole={x:number;y:number;rx:number;ry:number;rows?:Map<number,{left:number;width:number}>};
type SupportChange={baselineGround:number;predictedGround:number;baselineOut:boolean;predictedOut:boolean;baselineFall:number;predictedFall:number};
export type ShotSafety={unsafe:boolean;out:boolean;fall:number;selfDamage:number;ground:number;holes:number;friendlyCost?:number;enemyBenefit?:number;supportChange?:SupportChange;allies?:{target:number;out:boolean;fall:number;damage:number;lethal:boolean;supportChange?:SupportChange}[]};
export const blockedAIShot=(risk:ShotSafety)=>risk.unsafe||(risk.friendlyCost??0)>(risk.enemyBenefit??0)*1.1;
/** Read-only local virtual excavation: use exact native integer scanlines and
 * permanent cells, not just distance to a crater. Mirrors five-column support.
 * Later salvo impacts are conservative at their initial predicted locations. */
export function shotSafety(g:Game,t:Tank,weapon:WeaponId,angle=t.angle,power=t.power,direction=t.direction):ShotSafety{
 if(!adaptiveAI(g.gameVersion)||g.restoring||g.teleporting)return {unsafe:false,out:false,fall:0,selfDamage:0,ground:t.y+18,holes:0};
 const shooter={...t,angle,power,direction},holes:Hole[]=[],spec=weaponById(weapon),protectedTanks=g.tanks.filter(b=>b.hp>0&&b.team===t.team).map(b=>b.id===t.id?shooter:b),damage=new Map<number,number>(),enemyDamage=new Map<number,number>();let selfDamage=0,enemyBenefit=0;
 const add=(x:number,y:number,section=0)=>{const native=originalWeapon(weapon,section),axes=native?originalCraterAxes(native.round):excavation(weapon,false,g.gameVersion);
  if(!protectedTanks.some(b=>Math.abs(x-b.x)<=axes.radius+18))return;
  holes.push({x:native?Math.floor(x/3)*3:x,y:native?Math.floor(y/3)*3:y,rx:axes.radius,ry:axes.depth,rows:native?new Map(originalCrater(native.round).map(r=>[r.y,{left:r.left,width:r.width}])):undefined});
 };
 for(const ray of fixedAnglePredictor(g,shooter,weapon)(power)){
  selfDamage+=ray.hits.find(h=>h.body.tank.id===t.id)?.damage??0;
  for(const h of ray.hits){if(h.body.tank.team===t.team)damage.set(h.body.tank.id,(damage.get(h.body.tank.id)??0)+h.damage);else enemyDamage.set(h.body.tank.id,(enemyDamage.get(h.body.tank.id)??0)+h.damage);}
  if(ray.age>=12||ray.x<0||ray.x>g.worldWidth||ray.y>=g.worldHeight||spec.effect==='mine'&&!ray.hits.some(h=>h.direct))continue;
  add(ray.x,ray.y);
  if(spec.effect==='pierce'){
   const pinned=ray.hits.some(h=>h.direct),length=Math.max(1,Math.hypot(ray.vx,ray.vy)),dx=ray.vx/length,dy=ray.vy/length;
   let x=ray.x,y=ray.y;for(let i=1;i<4;i++){if(!pinned){const previous=originalCraterAxes(originalWeapon(weapon,i-1)!.round);x+=dx*previous.radius;y+=dy*previous.depth;}add(x,y,i);}
  }
 }
 if(t.doubleShot)selfDamage*=2;
 enemyBenefit=[...enemyDamage].reduce((n,[id,d])=>n+Math.min(g.tanks[id].hp+g.tanks[id].shield,d*(t.doubleShot?2:1)),0);
 const solid=(x:number,y:number)=>{
  x=Math.floor(x);y=Math.floor(y);if(!g.land.solid(x,y))return false;
  if(g.land.protectedMask[y*g.land.stride+x])return true;
  return !holes.some(h=>{
   if(h.rows){const row=h.rows.get(Math.floor((y-h.y)/3));return !!row&&x>=h.x+row.left*3&&x<h.x+(row.left+row.width)*3;}
   return ((x-h.x)/h.rx)**2+((y-h.y)/Math.max(1,h.ry))**2<=1;
  });
 };
 const surface=(x:number,foot:number)=>{x=Math.round(x);let y=Math.max(0,Math.floor(foot-14));while(y<g.worldHeight&&!solid(x,y))y++;while(y>0&&solid(x,y-1))y--;return y;};
 const risks=protectedTanks.map(b=>{
  const center=surface(b.x,b.y+18),left=surface(b.x-8,center),right=surface(b.x+8,center),ground=[surface(b.x-16,left),left,center,right,surface(b.x+16,right)].sort((a,b)=>a-b)[2];
  const predictedFall=Math.max(0,ground-(b.y+18)),directLoss=Math.max(0,(damage.get(b.id)??0)*(t.doubleShot?2:1)-b.shield),shieldLoss=Math.min(b.shield,(damage.get(b.id)??0)*(t.doubleShot?2:1));
  if(causalAIShotSafety(g.gameVersion)){
   // ground is a FOOT/support coordinate, not the body's center. The live
   // engine accepts every support below height; subtracting 18 rejected valid
   // bottom platforms. Compare with untouched terrain so an existing fall or
   // missing support cannot veto an unrelated shot elsewhere on the map.
   const baselineGround=g.support(b.x,b.y+18),baselineOut=baselineGround>=g.worldHeight,predictedOut=ground>=g.worldHeight,baselineFall=Math.max(0,baselineGround-(b.y+18));
   const start=b.fallVelocity>0?b.fallStart:b.y;
   const landingDamage=(floor:number,out:boolean)=>{const distance=Math.max(0,floor-18-start);return g.config.fallDamage&&!out&&distance>48?Math.round((distance-35)*.3):0;};
   const baselineDamage=landingDamage(baselineGround,baselineOut),predictedDamage=landingDamage(ground,predictedOut),baselineLethal=baselineOut||baselineDamage>=b.hp;
   const out=predictedOut&&!baselineOut,fall=Math.max(0,predictedFall-baselineFall),hpLoss=directLoss+Math.max(0,predictedDamage-baselineDamage);
   return {target:b.id,out,fall,damage:hpLoss,shieldLoss,lethal:!baselineLethal&&(predictedOut||directLoss+predictedDamage>=b.hp),ground,weight:b.hp<b.maxHP*.5?4.5:3,supportChange:{baselineGround,predictedGround:ground,baselineOut,predictedOut,baselineFall,predictedFall}};
  }
  const fall=predictedFall,out=ground>=g.worldHeight-18,fallDamage=g.config.fallDamage&&fall>48?Math.round((fall-35)*.3):0,hpLoss=directLoss+fallDamage;
  return {target:b.id,out,fall,damage:hpLoss,shieldLoss,lethal:out||hpLoss>=b.hp,ground,weight:b.hp<b.maxHP*.5?4.5:3};
 });
 const own=risks.find(b=>b.target===t.id)!,friendlyCost=risks.reduce((n,b)=>n+b.damage*b.weight+b.shieldLoss*.7+Math.max(0,b.fall-12)*.15,0);
 return {unsafe:risks.some(b=>b.lethal),out:own.out,fall:own.fall,selfDamage,ground:own.ground,holes:holes.length,friendlyCost,enemyBenefit,allies:risks.filter(b=>b.target!==t.id).map(({weight,ground,...r})=>r),...(own.supportChange?{supportChange:own.supportChange}:{})};
}
/** Prefer the original attack, then small legal variations and reachable firing
 * positions. Never grant fuel or alter a hit/damage/RNG result to make it safe. */
export function chooseSafeAIShot(g:Game,t:Tank,weapons:WeaponId[],targets:Tank[],preferred:AIShot):AIShot|null{
 const risk=(s:AIShot)=>shotSafety(g,{...t,x:s.x,y:s.y},s.weapon,s.angle,s.power,s.direction);
 const safe=(s:AIShot)=>{const r=risk(s);return !r.unsafe&&(r.friendlyCost??0)<=(r.enemyBenefit??0)*1.1;};
 if(safe(preferred)&&(preferred.effective||Math.abs(preferred.x-t.x)>2)&&(risk(preferred).friendlyCost??0)===0)return preferred;
 const offers:AIShot[]=safe(preferred)?[{...preferred,utility:preferred.utility-(risk(preferred).friendlyCost??0)}]:[];
 for(const weapon of weapons){
  if(weapon!==preferred.weapon){const shot=solveAIShot(g,t,[weapon],targets);if(shot.effective&&safe(shot))offers.push({...shot,utility:shot.utility-(risk(shot).friendlyCost??0)});}
  for(const da of [-6,-3,0,3,6])for(const dp of [-10,0,10]){
   const angle=Math.max(t.minAngle,Math.min(t.maxAngle,preferred.angle+da)),power=Math.max(g.minimumShotPower,Math.min(100,preferred.power+dp));
   const safety=shotSafety(g,t,weapon,angle,power,preferred.direction);if(safety.unsafe||(safety.friendlyCost??0)>(safety.enemyBenefit??0)*1.1)continue;
   const rays=[...fixedAnglePredictor(g,{...t,angle,direction:preferred.direction},weapon)(power)],damage=rays.flatMap(r=>r.hits).filter(h=>h.body.hostile).reduce((n,h)=>n+h.damage,0);
   if(damage>0)offers.push({...preferred,x:t.x,y:t.y,weapon,angle,power,utility:(safety.enemyBenefit??damage)-(safety.friendlyCost??0),effective:true});
  }
 }
 if(offers.some(s=>s.effective||Math.abs(s.x-t.x)>2))return offers.filter(s=>s.effective||Math.abs(s.x-t.x)>2).sort((a,b)=>b.utility-a.utility)[0];
 for(const position of safeAIPositions(g,t).sort((a,b)=>Math.abs(a.x-t.x)-Math.abs(b.x-t.x))){const shot=solveAIShot(g,position,weapons,targets,0,false);if(shot.effective&&safe(shot))return shot;}
 return null;
}

/** Correct an already calibrated shot at the ACTUAL firing position. A harmless
 * miss is a valid difficulty outcome: it needs no enemy-damage benefit. Probe
 * deterministic alternatives without rerolling calibration or granting fuel.
 * Prefer a nearby safe miss for a lapse, then the least damaging safe option.
 * Fatal excavation and self/ally damage tradeoffs use the same final guard. */
export function recoverFinalAIShot(g:Game,t:Tank,weapon:WeaponId,intentionalMiss:boolean):{shot:AIShot;risk:ShotSafety}|null{
 const target=g.aiDecision?.target??g.enemy.id,seen=new Set<string>();
 let fallback:{shot:AIShot;risk:ShotSafety;change:number}|null=null;
 const probe=(angle:number,power:number)=>{
  angle=Math.max(t.minAngle,Math.min(t.maxAngle,angle));power=Math.max(g.minimumShotPower,Math.min(100,power));
  const key=`${angle}:${power}`;if(seen.has(key))return null;seen.add(key);
  const risk=shotSafety(g,t,weapon,angle,power,t.direction);if(blockedAIShot(risk))return null;
  const shot:AIShot={x:t.x,y:t.y,angle,power,direction:t.direction,weapon,target,utility:(risk.enemyBenefit??0)-(risk.friendlyCost??0),effective:(risk.enemyBenefit??0)>0};
  const candidate={shot,risk,change:Math.abs(angle-t.angle)+Math.abs(power-t.power)*.25};
  if(!intentionalMiss||((risk.enemyBenefit??0)===0&&(risk.friendlyCost??0)===0))return candidate;
  if(!fallback||(risk.enemyBenefit??0)<(fallback.risk.enemyBenefit??0)||risk.enemyBenefit===fallback.risk.enemyBenefit&&candidate.change<fallback.change)fallback=candidate;
  return null;
 };
 for(const da of [0,-2,2,-4,4,-8,8])for(const dp of [0,-2,2,-6,6,-12,12,-24,24]){const found=probe(t.angle+da,t.power+dp);if(found)return found;}
 const angles=[t.minAngle,t.maxAngle,(t.minAngle+t.maxAngle)/2];for(let a=t.minAngle;a<=t.maxAngle;a+=6)angles.push(a);
 for(const angle of angles)for(const power of [1,5,15,30,50,70,90,100]){const found=probe(angle,power);if(found)return found;}
 return fallback;
}
