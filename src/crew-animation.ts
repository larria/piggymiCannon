import type {Tank} from './engine';

export const CREW_QUIET_SECONDS=20;
export const CREW_IDLE_SECONDS=2.6;
export const CREW_LANDING_TEARS_SECONDS=1;
export const CREW_HEAL_SECONDS=2.4;
const SHORT_FALL_LIMIT=48;
export const significantCrewFall=(fromY:number,footY:number,bottom:number)=>footY>=bottom||footY-(fromY+18)>SHORT_FALL_LIMIT;

interface QuietPose {
 x:number;y:number;hp:number;shield:number;angle:number;direction:number;shots:number;since:number;
 fallCryAt:number|null;landedAt:number;healedAt:number;
}

export const reactionSeconds=(kind:NonNullable<Tank['reaction']>['kind'])=>kind==='direct'?1.4:kind==='fall'?1.2:.7;

/** Cosmetic only: use match time, so pausing a match or replay also pauses this clock. */
export class CrewAnimationClock {
 private readonly poses=new Map<number,QuietPose>();
 private readonly tears=new Map<number,{reaction:NonNullable<Tank['reaction']>;from:number;until:number}>();
 private elapsed=-Infinity;
 reset(){this.poses.clear();this.tears.clear();this.elapsed=-Infinity;}
 update(t:Tank,elapsed:number,busy:boolean,predictLanding?:(tank:Tank)=>{footY:number;bottom:number}){
  if(elapsed<this.elapsed)this.reset();
  this.elapsed=elapsed;
  const prior=this.poses.get(t.id),tear=this.tears.get(t.id);
  const alive=t.hp>0&&!t.outOfBounds;
  if(!alive)this.tears.delete(t.id);
  else if(t.reaction&&t.reaction!==tear?.reaction){
   const duration=reactionSeconds(t.reaction.kind),from=elapsed-(duration-t.reaction.remaining);
   this.tears.set(t.id,{reaction:t.reaction,from,until:from+duration*2});
  }else if(tear&&elapsed>=tear.until)this.tears.delete(t.id);
  const falling=isCrewFalling(t);
  let fallCryAt=prior?.fallCryAt??null,landedAt=prior?.landedAt??-Infinity,healedAt=prior?.healedAt??-Infinity;
  if(falling){
   // This is total predicted drop from takeoff, not the distance remaining above the landing.
   if(fallCryAt===null&&predictLanding){
    const {footY,bottom}=predictLanding(t);
    if(significantCrewFall(t.fallStart,footY,bottom))fallCryAt=elapsed;
   }
  }else{
   if(fallCryAt!==null&&alive&&!t.parachute)landedAt=elapsed;
   fallCryAt=null;
  }
  if(!alive){landedAt=-Infinity;healedAt=-Infinity;}
  else if(prior&&t.hp<prior.hp)healedAt=-Infinity;
  else if(prior&&prior.hp>0&&t.hp>prior.hp)healedAt=elapsed;
  else if(elapsed<healedAt+CREW_HEAL_SECONDS&&(fallCryAt!==null||elapsed<landedAt+CREW_LANDING_TEARS_SECONDS||t.reaction||elapsed<(this.tears.get(t.id)?.until??-Infinity)))
   healedAt=elapsed; // Let a recent heal show after an ongoing hit or long-fall reaction.
  if(!prior||busy||t.reaction||t.fallVelocity>0||!alive||
   prior.x!==t.x||prior.y!==t.y||prior.hp!==t.hp||prior.shield!==t.shield||prior.angle!==t.angle||prior.direction!==t.direction||prior.shots!==t.shots){
   this.poses.set(t.id,{x:t.x,y:t.y,hp:t.hp,shield:t.shield,angle:t.angle,direction:t.direction,shots:t.shots,since:elapsed,fallCryAt,landedAt,healedAt});
  }else Object.assign(prior,{fallCryAt,landedAt,healedAt});
 }
 cryAge(id:number,elapsed:number){
  const tear=this.tears.get(id),pose=this.poses.get(id),landed=pose?.landedAt??-Infinity;
  const from=Math.max(tear&&elapsed<tear.until?tear.from:-Infinity,pose?.fallCryAt??-Infinity,elapsed<landed+CREW_LANDING_TEARS_SECONDS?landed:-Infinity);
  return Number.isFinite(from)?Math.max(0,elapsed-from):null;
 }
 healAge(id:number,elapsed:number){
  const age=elapsed-(this.poses.get(id)?.healedAt??-Infinity);
  return age>=0&&age<CREW_HEAL_SECONDS?age:null;
 }
 idleAge(id:number,elapsed:number){
  const pose=this.poses.get(id);if(!pose)return null;
  const age=(elapsed-pose.since)%(CREW_QUIET_SECONDS+CREW_IDLE_SECONDS)-CREW_QUIET_SECONDS;
  return age>=0?age:null;
 }
}

export function isCrewFalling(t:Tank){
 return t.hp>0&&!t.outOfBounds&&!t.parachute&&t.fallVelocity>0;
}
