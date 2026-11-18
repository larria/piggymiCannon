import {launchGravityMultiplier,sourceRangeModel,sourceRange} from './source-range';
import {originalBallistics,originalWeapon,ORIGINAL_TANKS,sourceMaximum,sourceDistance,sourceDamage} from './original-ballistics';
import {precisionPolish,impactPolish} from './match-polish';
import {salvoProfile} from './salvo';
import {PIERCING_DAMAGE,permanentPiercingContact} from './piercing';
import {impactDamageScale,preciseContact} from './impact-damage';
import {damageAffinity,applyDamageAffinity} from './source-attributes';
import {referenceCalibration,tankArtScale} from './reference-calibration';
import {SHOT_WIND_GAIN,type Game,type Tank} from './engine';
import {weaponById,weaponDamage,weaponBlastRadius,launchDamageScale,excavation,type WeaponId} from './catalog';
import {aimGeometry,muzzleGeometry} from './aim';
import {pointHitsTank} from './tank-hitbox';
import {launchSpeed} from './ballistics';
import {sourceHoming,homingProbe,sourceHomingVelocity,SOURCE_HOMING_RADIUS} from './source-homing';
import {finalAIRecovery} from './ai-distance';
import {battleViewWidth} from './world-layout';

export interface AIShot {angle:number;power:number;direction:number;weapon:WeaponId;target:number;utility:number;effective:boolean;x:number;y:number}
type Body={tank:Tank;slope:number;hostile:boolean;eligible:boolean};
type World={game:Game;bodies:Body[];shooter:Tank;slope:number;missAim?:{x:number;y:number}};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
function world(game:Game,shooter:Tank,targets:Tank[],offset=0,miss=false,targetId?:number):World{
 const bodies=game.tanks.filter(t=>game.bodyOccupies(t)).map(t=>{
  const known=t.id===shooter.id?shooter:targets.find(e=>e.id===t.id),tank=known?{...known,x:known.x+(t.team!==shooter.team&&!miss?offset:0)}:t;
  return {tank,slope:known?game.tankSlope({...known,x:known.x}):game.tankSlope(t),hostile:t.hp>0&&t.team!==shooter.team,eligible:t.hp>0&&game.canDamage(t,shooter.id)};
 });
 const target=targets.find(t=>t.id===targetId)??targets[0];
 return {game,bodies,shooter,slope:game.tankSlope(shooter),missAim:miss?{x:target.x+offset,y:target.y}:undefined};
}
// Read-only flight model. Same integration order, wind, gravity, collision grace,
// homing turn rate and helix offset as live projectiles. It never changes RNG,
// terrain, HP, ammo, weather, particles or the live volley-lock map.
export function traceAIShot(w:World,angle:number,power:number,weapon:WeaponId,dt=1/180,phase=0,speedScale=1,aimOffsetX=0,aimOffsetY=0,verticalScale=speedScale){
 const {game:g,shooter:t,slope}=w,modernGeometry=originalBallistics(g.gameVersion),spec=weaponById(weapon),v=aimGeometry(angle,slope,t.direction);
 const speed=launchSpeed(weapon,Math.max(g.minimumShotPower,power),weapon==='sniper'?2:spec.speed??1,g.gravity*launchGravityMultiplier(weapon,weapon==='sniper'?.27:spec.gravity??1,g.gameVersion),g.gameVersion)*speedScale;
 const muzzle=muzzleGeometry(t,angle,slope,t.direction,tankArtScale(g.gameVersion));
 let x=muzzle.x,y=muzzle.y,vx=v.x*speed,vy=v.y*speed*verticalScale/speedScale;
 let age=0,wx=0,wy=0,lock:Body|undefined,boost=t.boost?1.5:1,orbital=false;
 const sourceTracking=sourceHoming(g.gameVersion)&&(spec.effect==='homing'||weapon==='homing');
 let direct:Body|undefined,landed=false;
 for(let i=0;i<12/dt;i++){
  age+=dt;
  if(spec.effect==='helix'){x-=wx;y-=wy;}
  const oldX=x,oldY=y;
  if(!sourceTracking||!lock)vx+=orbital?0:g.wind*SHOT_WIND_GAIN*(weapon==='sniper'?.25:1)*dt;
  if(sourceTracking&&!lock&&vy>0&&age>=.09){
   const probe=homingProbe({x,y,vx,vy},g.gravity);
   const target=w.bodies.filter(b=>b.eligible&&(weapon!=='homing'||b.hostile)).map(b=>({b,x:Math.trunc(b.tank.x/3)*3,y:Math.trunc((b.tank.y+18)/3)*3})).filter(b=>Math.hypot(b.x-probe.x,b.y-probe.y)<SOURCE_HOMING_RADIUS).sort((a,b)=>Math.hypot(a.x-probe.x,a.y-probe.y)-Math.hypot(b.x-probe.x,b.y-probe.y)||a.b.tank.id-b.b.tank.id)[0];
   if(target){lock=target.b;const velocity=sourceHomingVelocity({x,y},{x:target.x+aimOffsetX,y:target.y+aimOffsetY},g.gravity);vx=velocity.vx;vy=velocity.vy;}
  }
  if(!sourceTracking&&(spec.effect==='homing'||weapon==='homing')&&(vy>0||lock)){
   if(!lock&&age>.18&&y>g.ground(x)-130){
    let closest=Infinity;for(const b of w.bodies)if(b.eligible){const d=Math.hypot(b.tank.x-x,b.tank.y-y);if(d<closest){closest=d;lock=b;}}
    if(closest>=(spec.homingRadius??140))lock=undefined;
   }
   if(lock){const a=Math.atan2(lock.tank.y+aimOffsetY-y,lock.tank.x+aimOffsetX-x),s=Math.max(250,Math.hypot(vx,vy)),blend=Math.min(1,dt*5);vx+=(Math.cos(a)*s-vx)*blend;vy+=(Math.sin(a)*s-vy)*blend;}
  }
  vy+=(orbital||sourceTracking&&lock?0:g.gravity*launchGravityMultiplier(weapon,weapon==='sniper'?.27:spec.gravity??1,g.gameVersion))*dt;x+=vx*dt;y+=vy*dt;
  if(spec.effect==='pierce'){
   const contact=permanentPiercingContact(g.land,oldX,oldY,x,y);
   if(contact){x=contact.x;y=contact.y;vx=0;vy=0;}
  }
  if(spec.effect==='helix'){const s=Math.max(1,Math.hypot(vx,vy)),o=Math.sin(age*17+phase)*18*Math.min(1,age*5);wx=-vy/s*o;wy=vx/s*o;x+=wx;y+=wy;}
  if(g.fireLine&&boost===1&&(oldX-g.fireLine.x)*(x-g.fireLine.x)<=0&&y>=g.fireLine.top&&y<=g.fireLine.bottom)boost=1.5;
  if(modernGeometry){const p={owner:t.id,age,healing:false,weapon,sub:orbital} as any,contact=g.firstImpact(p,oldX,oldY,x,y,w.bodies);if(contact){x=contact.x;y=contact.y;direct=contact.tank?w.bodies.find(b=>b.tank.id===contact.tank!.id):undefined;if(spec.effect==='orbital'&&!orbital){y=-50;vx=0;vy=680;orbital=true;age=0;direct=undefined;continue;}landed=true;break;}}
  else if(age>=.09)direct=w.bodies.find(b=>b.eligible&&g.projectileCollisionAllowed(b.tank,t.id)&&Math.abs(b.tank.x-x)<50&&Math.abs(b.tank.y-y)<62&&pointHitsTank(b.tank,x,y,b.slope,g.gameVersion));
  if(g.land.solid(x,y)||direct){
   if(spec.effect==='orbital'&&!orbital){y=-50;vx=0;vy=680;orbital=true;age=0;direct=undefined;continue;}
   landed=true;break;
  }
  if(x< -50||x>g.worldWidth+50||y>g.worldHeight+70)break;
 }
 const hits=w.bodies.map(b=>{
  const d=Math.hypot(b.tank.x-x,b.tank.y-y),hit=direct?.tank.id===b.tank.id;
  const scale=impactDamageScale(b.tank,x,y,b.slope,weaponBlastRadius(weapon,g.gameVersion),hit,g.gameVersion,{vx,vy},weapon);
  const mine=spec.effect==='mine'?1/3:1;
  const rage=t.vehicleId==='sea'&&t.hp<t.maxHP*.5?1.5:1,snow=t.vehicleId==='water'&&g.snow?1.25:1;
  const affinity=damageAffinity(weapon,t.vehicleId,b.tank.vehicleId,g.gameVersion),beforeAffinity=(modernGeometry&&weapon!=='missile-normal'&&b.tank.vehicleId?100/ORIGINAL_TANKS[b.tank.vehicleId].defence:1)*weaponDamage(weapon,g.gameVersion)*launchDamageScale(!!t.vehicleId,weapon)*boost*rage*snow*mine*scale,raw=beforeAffinity*affinity.value;
  let damage=landed&&b.eligible&&(hit||d<=weaponBlastRadius(weapon,g.gameVersion)+26)?(hit&&weapon==='missile-normal'&&impactPolish(g.gameVersion)&&preciseContact(b.tank,x,y,b.slope,g.gameVersion,{vx,vy},weapon)?PIERCING_DAMAGE.reduce((n,f)=>n+Math.round(raw*f),0):Math.round(raw)):0;
  const native=modernGeometry&&weapon!=='missile-normal'?originalWeapon(weapon):null;
  if(referenceCalibration(g.gameVersion)&&damage>0&&!native)damage=hit&&weapon==='missile-normal'&&preciseContact(b.tank,x,y,b.slope,g.gameVersion,{vx,vy},weapon)?PIERCING_DAMAGE.reduce((n,f)=>n+applyDamageAffinity(Math.round(beforeAffinity*f),affinity),0):applyDamageAffinity(Math.round(beforeAffinity),affinity);
  if(native&&landed&&b.eligible){const d=sourceDamage(native.power,native.round,sourceDistance(b.tank,x,y,b.slope,weapon,g.gameVersion),b.tank.vehicleId?ORIGINAL_TANKS[b.tank.vehicleId].defence:100,boost*rage*snow);damage=referenceCalibration(g.gameVersion)?Math.round(applyDamageAffinity(d,affinity)*mine):Math.round(d*mine*affinity.value);}


  return {body:b,damage,direct:hit};
 });
 return {x,y,hits,age,boost,vx,vy};
}
function grade(w:World,angle:number,power:number,weapon:WeaponId,dt:number):AIShot{
 const spec=weaponById(weapon),impact=traceAIShot(w,angle,power,weapon,dt);
 const count=spec.shots??(weapon==='triple'?3:1);
 const samples=dt===1/180&&count>1?[0,Math.floor((count-1)/2),count-1]:[Math.floor((count-1)/2)];
 const rays=samples.flatMap(i=>{
  const profile=salvoProfile(w.shooter.vehicleId,weapon,i,count,w.game.gameVersion);
  const p=count===1?impact:traceAIShot(w,angle+profile.angle,power,weapon,dt,i*Math.PI*2/count,profile.vx,profile.aimX,profile.aimY,profile.vy);
  return p.hits.map(h=>({...h,damage:h.damage*count/samples.length}));
 });
 const combined=new Map<number,typeof rays[number]>();
 for(const h of rays){const old=combined.get(h.body.tank.id);if(old){old.damage+=h.damage;old.direct ||= h.direct;}else combined.set(h.body.tank.id,{...h});}
 const hits=[...combined.values()];
 let utility=0,effective=false,target=-1,largest=0;
 for(const h of hits){
  const t=h.body.tank;
  if(h.body.hostile){
   const nearby=finalAIRecovery(w.game.gameVersion)&&Math.hypot(t.x-w.shooter.x,t.y-w.shooter.y)<=battleViewWidth(w.game.worldWidth)*.2;
   // Removing an immediate nearby threat is worth more than farming damage on
   // a distant full-health tank. Lapse grading below still suppresses hits.
   const damage=Math.min(t.hp+t.shield,h.damage),value=damage+(h.damage>=t.hp+t.shield?(nearby?400:100):0);
   utility+=value;
   if(value>largest){largest=value;target=t.id;}
   if(h.damage>0&&(h.direct||h.damage>=Math.max(30,t.maxHP*.05)))effective=true;
   if(spec.effect==='freeze'&&h.damage>0&&!t.immobile)utility+=25;
   if(spec.effect==='poison'&&h.damage>0&&!t.poisoned&&t.hp>t.maxHP*.3)utility+=25;
   if(!h.direct&&spec.digDepth>0){
    const dig=excavation(weapon,false,w.game.gameVersion),dx=Math.abs(impact.x-t.x),bottom=w.game.land.bottom(t.x,t.y+13);
    const reach=dx<dig.radius?dig.depth*Math.sqrt(1-(dx/dig.radius)**2):0;
    if(dx<dig.radius-18&&impact.y-reach<=t.y+18&&impact.y+reach>=bottom&&bottom<w.game.worldHeight)utility+=45;
   }
  }else if(h.body.eligible)utility-=h.damage*(t.id===w.shooter.id?3:1.8);
 }
 const foes=w.bodies.filter(b=>b.hostile),distance=Math.min(...foes.map(b=>Math.hypot(impact.x-b.tank.x,(impact.y-b.tank.y)*.7)));
 if(target<0)target=foes.reduce((a,b)=>Math.abs(a.tank.x-impact.x)<Math.abs(b.tank.x-impact.x)?a:b).tank.id;
 // Distance is only a tie-break/fallback. No penalty for landing close to the
 // shooter when the damage switches make that shot legal.
 utility-=Math.min(distance,1800)*.12+impact.age*4;
 if(w.missAim){
  // A difficulty lapse means an incorrect aim point, not hidden damage changes.
  // A projectile caught by a visible enemy before reaching that point cannot
  // count as the intended overshoot. Model those collisions normally.
  const hostileDamage=hits.filter(h=>h.body.hostile).reduce((n,h)=>n+h.damage,0);
  const friendlyRisk=hits.filter(h=>!h.body.hostile&&h.body.eligible).reduce((n,h)=>n+h.damage*(h.body.tank.id===w.shooter.id?3:1.8),0);
  utility=-hostileDamage*3-friendlyRisk-Math.hypot(impact.x-w.missAim.x,(impact.y-w.missAim.y)*.7)*.12;
 }
 return {angle,power,direction:w.shooter.direction,weapon,target,utility,effective,x:w.shooter.x,y:w.shooter.y};
}
function grid(min:number,max:number,step:number){const values:number[]=[];for(let v=min;v<=max;v+=step)values.push(v);if(values.at(-1)!==max)values.push(max);return values;}
function search(w:World,weapons:WeaponId[],fine:boolean):AIShot{
 const minimum=(weapon:WeaponId)=>sourceRangeModel(w.game.gameVersion)&&sourceRange(weapon)!==undefined?w.game.minimumShotPower:10;
 // Even a lapse aims toward a known enemy side; model a wrong landing point,
 // rather than deliberately turning toward an empty side at close range.
 const directions=[...new Set(w.bodies.filter(b=>b.hostile).map(b=>b.tank.x>w.shooter.x?1:-1))];
 const best:AIShot[]=[];
 const face=(direction:number)=>{w.shooter={...w.shooter,direction};const body=w.bodies.find(b=>b.tank.id===w.shooter.id);if(body)body.tank={...w.shooter};};
 const offer=(shot:AIShot)=>{if(best.length===4&&shot.utility<=best[3].utility)return;best.push(shot);best.sort((a,b)=>b.utility-a.utility);best.splice(4);};
 for(const direction of directions){face(direction);for(const weapon of weapons){
  if(weapon==='airstrike')continue;
  for(const angle of grid(w.shooter.minAngle,w.shooter.maxAngle,4))for(const power of grid(minimum(weapon),100,4))offer(grade(w,angle,power,weapon,1/60));
 }}
 if(!best.length)throw new Error('AI has no projectile weapon');
 if(fine){
  const anchors=[...best];best.length=0;
  for(const b of anchors){face(b.direction);for(const a of grid(Math.max(w.shooter.minAngle,b.angle-4),Math.min(w.shooter.maxAngle,b.angle+4),1))for(const p of grid(Math.max(minimum(b.weapon),b.power-4),Math.min(100,b.power+4),1))offer(grade(w,a,p,b.weapon,1/180));}
  const local=[...best].slice(0,2);for(const b of local){face(b.direction);for(const a of grid(Math.max(w.shooter.minAngle,b.angle-.75),Math.min(w.shooter.maxAngle,b.angle+.75),.25))for(const p of grid(Math.max(minimum(b.weapon),b.power-.75),Math.min(100,b.power+.75),.25))offer(grade(w,a,p,b.weapon,1/180));}
 }
 return best[0];
}
export function solveAIShot(game:Game,tank:Tank,weapons:WeaponId[],targets:Tank[],offset=0,fine=true,miss=false,targetId?:number){return search(world(game,{...tank},targets,offset,miss,targetId),weapons,fine);}
export function predictAIImpact(game:Game,tank:Tank,weapon:WeaponId,angle=tank.angle,power=tank.power){return traceAIShot(world(game,{...tank},game.opponents(tank)),angle,power,weapon);}
export function safeAIPositions(game:Game,tank:Tank,targets?:Tank[],travelLimit=160){
 if(tank.fallVelocity>0||tank.immobile||tank.fuel<=0)return [];
 const budget=tank.moveDistance*tank.fuel/100/(tank.frozen>0?2:1),positions:Tank[]=[];
 for(const direction of [-1,1])for(const distance of [...new Set([8,24,64,128,Math.min(travelLimit,budget*.85)].map(d=>Math.min(d,budget)))]){
  if(distance<4)continue;const x=tank.x+direction*distance,foot=game.traversable(tank,x);
  if(foot===null||!Number.isFinite(foot))continue;
  const lo=Math.min(tank.x,x),hi=Math.max(tank.x,x);
  if(game.movementBodyBlocked(tank,x,game.tanks.map(actual=>targets?.find(t=>t.id===actual.id)??actual),true))continue;
  if(game.fires.some(f=>Math.abs(f.x-x)<f.radius&&game.canDamage(tank,f.owner))||game.gases.some(f=>Math.abs(f.x-x)<f.radius&&Math.abs(f.y-(foot-18))<50&&game.canDamage(tank,f.owner)))continue;
  if(game.fires.some(f=>game.canDamage(tank,f.owner)&&Math.abs(f.x-tank.x)>=f.radius&&f.x+f.radius>lo&&f.x-f.radius<hi&&Math.abs((f.y??game.ground(f.x))-foot)<40))continue;
  if(game.gases.some(f=>game.canDamage(tank,f.owner)&&Math.abs(f.x-tank.x)>=f.radius&&f.x+f.radius>lo&&f.x-f.radius<hi&&Math.abs(f.y-(foot-18))<50))continue;
  if(tank.vehicleId!=='water'&&tank.vehicleId!=='laser'&&game.mines.some(m=>(!precisionPolish(game.gameVersion)||game.tanks[m.owner]?.team===tank.team)&&m.x>lo-30&&m.x<hi+30&&Math.abs(m.y-foot)<36&&game.canDamage(tank,m.owner)))continue;
  positions.push({...tank,x,y:foot-18});
 }
 return positions;
}
export function chooseAIPosition(game:Game,tank:Tank,weapons:WeaponId[],targets:Tank[],existingStay?:AIShot){
 const stay=existingStay??solveAIShot(game,tank,weapons,targets),danger=game.fires.some(f=>Math.abs(f.x-tank.x)<f.radius&&game.canDamage(tank,f.owner));
 // A solid firing solution needs no gratuitous travel. Fuel, time and movement
 // delay all count, even though AI matches retain their cyclic turn order.
 const potential=Math.max(...weapons.map(id=>{const w=weaponById(id);return weaponDamage(id,game.gameVersion)*launchDamageScale(!!tank.vehicleId,id)*(w.shots??1)*(id==='missile-normal'&&impactPolish(game.gameVersion)?PIERCING_DAMAGE.reduce((n,f)=>n+f,0):1)*(w.effect==='mine'?1/3:1)*(tank.boost?1.5:1)*(tank.vehicleId==='sea'&&tank.hp<tank.maxHP*.5?1.5:1)*(tank.vehicleId==='water'&&game.snow?1.25:1)*Math.max(...targets.map(t=>damageAffinity(id,tank.vehicleId,t.vehicleId,game.gameVersion).value));}));
 if(stay.effective&&stay.utility>=potential*.65&&!danger)return {stay,best:stay};
 let best=stay,bestValue=stay.utility-(danger?160:0);
 for(const position of safeAIPositions(game,tank,targets)){
  const shot=solveAIShot(game,position,weapons,targets,0,false),distance=Math.abs(position.x-tank.x),cost=distance*.18+distance/tank.moveSpeed*2+distance/tank.moveDistance*12;
  if(shot.utility-cost>bestValue+12){best=shot;bestValue=shot.utility-cost;}
 }
 if(!best.effective&&!danger){
  // A short-range vehicle may need more than one turn to clear a long ceiling.
  // Look for a genuinely usable firing position within two movement budgets,
  // then advance only to a legal waypoint reachable with THIS turn's fuel.
  // No future fuel is granted and no world/actor state is changed by this probe.
  const waypoints=safeAIPositions(game,tank,targets);
  let future:AIShot|undefined;
  for(const position of safeAIPositions(game,{...tank,fuel:200},targets,320)){
   if(Math.abs(position.x-tank.x)<=tank.moveDistance*tank.fuel/100)continue;
   const shot=solveAIShot(game,position,weapons,targets,0,false);
   if(shot.effective&&(!future||shot.utility>future.utility))future=shot;
  }
  if(future){
   const direction=Math.sign(future.x-tank.x),reachable=waypoints.filter(p=>Math.sign(p.x-tank.x)===direction&&Math.abs(p.x-tank.x)<=Math.abs(future.x-tank.x));
   const waypoint=reachable.sort((a,b)=>Math.abs(a.x-future!.x)-Math.abs(b.x-future!.x))[0];
   if(waypoint)best=solveAIShot(game,waypoint,[future.weapon],targets,0,false);
  }
 }
 if(best.x!==stay.x)best=solveAIShot(game,{...tank,x:best.x,y:best.y},weapons,targets);
 return {stay,best};
}

/** Reuse body/slope probes for the fixed-angle assistance sweep. All rays share
 * the live weapon dispersion, homing and collision model without consuming RNG. */
export function fixedAnglePredictor(game:Game,tank:Tank,weapon:WeaponId){
 const w=world(game,{...tank},game.opponents(tank)),count=weaponById(weapon).shots??(weapon==='triple'?3:1);
 return function*(power:number){for(let i=0;i<count;i++){const p=salvoProfile(tank.vehicleId,weapon,i,count,game.gameVersion);yield traceAIShot(w,tank.angle+p.angle,power,weapon,1/180,i*Math.PI*2/count,p.vx,p.aimX,p.aimY,p.vy);}};
}
