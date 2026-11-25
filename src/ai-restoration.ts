import {crossedFireLine} from './weather';
import {originalBallistics} from './original-ballistics';
import {restoreRadius,restoreFraction} from './item-combos';
import {DIFFICULTIES} from './catalog';
import type {Game,Tank} from './engine';import {SHOT_WIND_GAIN} from './engine';import {pointHitsTank} from './tank-hitbox';import {impactDamageScale} from './impact-damage';
export interface RestorePlan {target:number;angle:number;power:number;direction:number;x:number;y:number;gain:number;score:number;self:boolean;inaccurate?:boolean}
export function gradedAIRestoration(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=11);}
export const needsAIRestoration=(receiver:Tank|undefined,shooter:Tank)=>!!receiver&&receiver.team===shooter.team&&receiver.hp>0&&receiver.hp*5<receiver.maxHP*2;
/** Read-only healing flight: same launch, wind, collision grace, fire line and falloff. */
type RestoreBody={tank:Tank;slope:number};
function evaluate(g:Game,t:Tank,target:Tank,angle:number,power:number,direction:number,bodies:RestoreBody[],aim?:{minimum:number;maxFalloff:number}):RestorePlan|null{
 const modernGeometry=originalBallistics(g.gameVersion),shooter={...t,direction},p=g.launch(shooter,'cannon-normal',angle,power);p.healing=true;let boosted=t.boost;
 if(power<=g.minimumShotPower)Object.assign(p,{x:t.x,y:t.y-45,vx:0,vy:0});
 let hit:number|undefined,landed=false;const dt=1/240;
 for(let i=0;i<8/dt;i++){
  const oldX=p.x,oldY=p.y;p.age+=dt;p.vx+=g.wind*SHOT_WIND_GAIN*dt;p.vy+=g.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(g.fireLine&&!boosted&&crossedFireLine(g.fireLine,oldX,p.x,p.y,g.fullHeightFireLine))boosted=true;
  if(p.x< -50||p.x>g.worldWidth+50||p.y>g.worldHeight+70)return null;
  if(modernGeometry){const c=g.firstImpact(p,oldX,oldY,p.x,p.y,bodies);if(c){p.x=c.x;p.y=c.y;hit=c.tank?.id;landed=true;break;}}
  else if(p.age>=.09)hit=bodies.find(b=>g.projectileCollisionAllowed(b.tank,t.id)&&g.canRestore(b.tank,t.id)&&Math.abs(b.tank.x-p.x)<50&&Math.abs(b.tank.y-p.y)<62&&pointHitsTank(b.tank,p.x,p.y,b.slope,g.gameVersion))?.tank.id;
  if(g.land.solid(p.x,p.y)||hit!==undefined){if(hit===undefined&&p.vx===0)p.y=g.ground(p.x,oldY);landed=true;break;}
 }
 if(!landed)return null;
 let score=0,targetGain=0,targetFalloff=0;
 for(const {tank:b,slope} of bodies){
  if(!g.canRestore(b,t.id)||hit!==b.id&&Math.hypot(b.x-p.x,b.y-p.y)>restoreRadius(g.gameVersion)+26)continue;
  const selfCentred=b.id===t.id&&power<=g.minimumShotPower&&Math.abs(p.x-t.x)<=3&&Math.abs(p.y-(t.y+18))<=4;
  const factor=selfCentred?1:impactDamageScale(b,p.x,p.y,slope,restoreRadius(g.gameVersion),hit===b.id,g.gameVersion,{vx:p.vx,vy:p.vy},'cannon-normal');
  const gain=Math.min(b.maxHP-b.hp,Math.round(b.maxHP*restoreFraction(g.gameVersion)*(boosted?1.5:1)*factor));
  score+=gain*(b.team===t.team?1+(1-b.hp/b.maxHP)*.5:-1.25);if(b.id===target.id){targetGain=gain;targetFalloff=factor;}
 }
 if(targetGain<target.maxHP*(aim?.minimum??.12)||aim&&targetFalloff>aim.maxFalloff)return null;
 return {target:target.id,angle,power,direction,x:p.x,y:p.y,gain:targetGain,score,self:target.id===t.id};
}
function addAimError(g:Game,t:Tank,plan:RestorePlan|null,bodies:RestoreBody[],rng:()=>number){
 if(!plan)return null;
 const level=Math.max(0,DIFFICULTIES.findIndex(d=>d.id===t.difficulty));
 if(rng()>=DIFFICULTIES[level].missChance)return plan;
 const target=g.tanks.find(b=>b.id===plan.target)!;
 const wanted=plan.gain*([.37,.52,.65,.79][level]+(rng()-.5)*.16);
 // Try small variations around the well-aimed shot first. Each alternative is
 // simulated: large errors can still heal by splash, but never aim into a void.
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 const angles=[...new Set([plan.angle,...[-14,-8,-4,-2,2,4,8,14].map(d=>clamp(plan.angle+d,t.minAngle,t.maxAngle)),t.minAngle,t.maxAngle])];
 const powers=plan.self?[2,4,7,10,14,19,25]:[...new Set([-24,-16,-10,-6,-3,-1,0,1,3,6,10,16,24].map(d=>clamp(plan.power+d,2,100)))];
 let best:RestorePlan|null=null,quality=Infinity;
 for(const direction of plan.self?[plan.direction,-plan.direction]:[plan.direction])for(const angle of angles)for(const power of powers){
  const p=evaluate(g,t,target,angle,power,direction,bodies,{minimum:.025,maxFalloff:.95});
  if(!p||p.score<=0||p.gain>=plan.gain)continue;
  const value=Math.abs(p.gain-wanted)+Math.max(0,p.gain-p.score)*.5+(direction===plan.direction?0:2);
  if(value<quality){quality=value;best=p;}
 }
 return best?{...best,inaccurate:true}:plan;
}
export function planAIRestoration(g:Game,t:Tank,rng?:()=>number):RestorePlan|null{
 if(t.fallVelocity>0)return null;
 const graded=gradedAIRestoration(g.gameVersion);
 const allies=g.tanks.filter(b=>b.id!==t.id&&b.team===t.team&&b.hp>0&&(graded?needsAIRestoration(b,t):b.hp<=b.maxHP*.55)&&b.fallVelocity===0);
 const selfEligible=graded?needsAIRestoration(t,t):t.hp<=t.maxHP*.7&&t.maxHP-t.hp>=t.maxHP*.12;
 if(graded&&!selfEligible&&!allies.length)return null;
 const known=new Map(g.knownAITargets().map(b=>[b.id,b]));
 const bodies=g.tanks.filter(b=>g.bodyOccupies(b)).map(b=>{const tank=g.fog&&b.team!==t.team?known.get(b.id)??b:b;return {tank,slope:g.tankSlope(tank)};});
 const result=(plan:RestorePlan|null)=>graded&&rng?addAimError(g,t,plan,bodies,rng):plan;
 const self=selfEligible?evaluate(g,t,t,(t.minAngle+t.maxAngle)/2,g.minimumShotPower,t.direction,bodies):null;
 if(self&&t.hp<=t.maxHP*.35)return result(self);
 let best=self&&self.score>0?self:null;
 for(const ally of allies){
  const direction=ally.x>=t.x?1:-1,angles=[...new Set([t.minAngle,t.maxAngle,(t.minAngle+t.maxAngle)/2,...Array.from({length:Math.floor((t.maxAngle-t.minAngle)/5)+1},(_,i)=>t.minAngle+i*5)])];
  const powers=[2,4,8,10,...Array.from({length:23},(_,i)=>12+i*4)];let candidate:RestorePlan|null=null;
  for(const angle of angles)for(const power of powers){const p=evaluate(g,t,ally,angle,power,direction,bodies);if(p&&(!candidate||p.score>candidate.score))candidate=p;}
  if(candidate){const coarse=candidate;for(let da=-3;da<=3;da++)for(let dp=-3;dp<=3;dp++){const angle=Math.max(t.minAngle,Math.min(t.maxAngle,coarse.angle+da)),power=Math.max(2,Math.min(100,coarse.power+dp)),p=evaluate(g,t,ally,angle,power,direction,bodies);if(p&&p.score>candidate.score)candidate=p;}}
  if(candidate&&candidate.score>0&&(!best||candidate.score>best.score+40))best=candidate;
 }
 return result(best);
}
