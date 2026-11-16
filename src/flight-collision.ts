import type {Terrain} from './terrain';import type {Tank} from './engine';import {pointHitsTank} from './tank-hitbox';import {bodyBroadPhase} from './tank-geometry';
/** Sweep two-unit samples, so a fast shell cannot skip a four-unit rail or a visible body.
 * Shared by the live flight and the read-only aim model; no damage or terrain mutation.
 */
export function flightCollision(land:Terrain,from:{x:number;y:number},to:{x:number;y:number},bodies:{tank:Tank;slope:number;eligible:boolean}[],age:number){
 const dx=to.x-from.x,dy=to.y-from.y,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/2));
 const minX=Math.min(from.x,to.x),maxX=Math.max(from.x,to.x),minY=Math.min(from.y,to.y),maxY=Math.max(from.y,to.y);
 const candidates=age<.09?[]:bodies.filter(b=>{if(!b.eligible)return false;const box=bodyBroadPhase(b.tank);return b.tank.x+box.x>=minX&&b.tank.x-box.x<=maxX&&b.tank.y+box.y>=minY&&b.tank.y-box.y<=maxY;});
 for(let i=1;i<=steps;i++){
  const x=from.x+dx*i/steps,y=from.y+dy*i/steps;
  const body=candidates.find(b=>pointHitsTank(b.tank,x,y,b.slope));
  if(body||land.solid(x,y))return {x,y,body};
 }
 return null;
}
