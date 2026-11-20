import type {Tank} from './engine';

export const CREW_QUIET_SECONDS=20;
export const CREW_IDLE_SECONDS=2.6;
export const CREW_LANDING_TEARS_SECONDS=2;

interface QuietPose {x:number;y:number;hp:number;shield:number;angle:number;direction:number;shots:number;since:number;falling:boolean;landedAt:number}

export const reactionSeconds=(kind:NonNullable<Tank['reaction']>['kind'])=>kind==='direct'?1.4:kind==='fall'?1.2:.7;

/** Cosmetic only: use match time, so pausing a match or replay also pauses this clock. */
export class CrewAnimationClock {
 private readonly poses=new Map<number,QuietPose>();
 private readonly tears=new Map<number,{reaction:NonNullable<Tank['reaction']>;from:number;until:number}>();
 reset(){this.poses.clear();this.tears.clear();}
 update(t:Tank,elapsed:number,busy:boolean){
  const tear=this.tears.get(t.id);
  if(t.reaction&&t.reaction!==tear?.reaction){
   const duration=reactionSeconds(t.reaction.kind),from=elapsed-(duration-t.reaction.remaining);
   this.tears.set(t.id,{reaction:t.reaction,from,until:from+duration*2});
  }else if(tear&&elapsed>=tear.until)this.tears.delete(t.id);
  const prior=this.poses.get(t.id);
  const falling=isCrewFalling(t);
  if(prior?.falling&&!falling&&t.hp>0&&!t.outOfBounds&&!t.parachute)prior.landedAt=elapsed;
  if(!prior||prior.falling!==falling||elapsed<prior.since||busy||t.reaction||t.fallVelocity>0||t.hp<=0||t.outOfBounds||
   prior.x!==t.x||prior.y!==t.y||prior.hp!==t.hp||prior.shield!==t.shield||prior.angle!==t.angle||prior.direction!==t.direction||prior.shots!==t.shots){
   if(prior)Object.assign(prior,{x:t.x,y:t.y,hp:t.hp,shield:t.shield,angle:t.angle,direction:t.direction,shots:t.shots,since:elapsed,falling});
   else this.poses.set(t.id,{x:t.x,y:t.y,hp:t.hp,shield:t.shield,angle:t.angle,direction:t.direction,shots:t.shots,since:elapsed,falling,landedAt:-Infinity});
  }
 }
 cryAge(id:number,elapsed:number){
  const tear=this.tears.get(id),landed=this.poses.get(id)?.landedAt??-Infinity;
  const from=Math.max(tear&&elapsed<tear.until?tear.from:-Infinity,elapsed<landed+CREW_LANDING_TEARS_SECONDS?landed:-Infinity);
  return Number.isFinite(from)?Math.max(0,elapsed-from):null;
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
