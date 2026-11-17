import {originalBallistics,originalWeapon,sourceDistance,sourceFalloff,sourceRadius} from './original-ballistics';
import type {WeaponId} from './catalog';
import type {Tank} from './engine';
import {precisionPolish} from './match-polish';
export const FULL_BLAST_DISTANCE=18;
export const PRECISE_BLAST_DISTANCE=6;
export const PRECISE_CORE={xRadius:10,yRadius:14,yCenter:-9};
export const SEA_RING_CORE={xRadius:3,yRadius:4,yCenter:-9};
export const contactCore=(weapon?:WeaponId)=>weapon==='sea-special'?SEA_RING_CORE:PRECISE_CORE;
export type Incoming={vx:number;vy:number};
function bodyRim(t:Tank,x:number,y:number,slope:number,rx:number,ry:number,incoming?:Incoming){
 const dx=x-t.x,dy=y-t.y,c=Math.cos(slope),s=Math.sin(slope);
 const px=(dx*c+dy*s)*t.direction/rx,py=(-dx*s+dy*c+9)/ry;
 if(incoming){
  const speed=Math.hypot(incoming.vx,incoming.vy);
  if(speed>0){const vx=(incoming.vx*c+incoming.vy*s)*t.direction/speed/rx,vy=(-incoming.vx*s+incoming.vy*c)/speed/ry;
   // Test the incoming ray through the visible body, not the oversized outer
   // cheeks/treads. A centred shell first touches that outer surface.
   const along=Math.max(0,Math.min(48,-(px*vx+py*vy)/(vx*vx+vy*vy)));
   return Math.hypot(px+vx*along,py+vy*along);
  }
 }
 return Math.hypot(px,py);
}
/** Collision remains broad; only this small rotated centre qualifies as a bullseye. */
export function preciseContact(t:Tank,x:number,y:number,slope:number,version='development',incoming?:Incoming,weapon?:WeaponId){
 if(originalBallistics(version)&&weapon&&weapon!=='missile-normal'&&originalWeapon(weapon)){const p=originalWeapon(weapon)!;return sourceFalloff(sourceDistance(t,x,y,slope,weapon),p.round)===1;}
 const core=contactCore(weapon);return !precisionPolish(version)||bodyRim(t,x,y,slope,core.xRadius,core.yRadius,incoming)<=1;
}
export function fullDamageArea(version:string,weapon?:WeaponId){if(originalBallistics(version)&&weapon&&weapon!=='missile-normal'&&originalWeapon(weapon)){const p=originalWeapon(weapon)!,radius=sourceRadius(p.round);return {blastDistance:(radius-Math.floor(radius))*3,directCore:{xRadius:1.5,yRadius:1.5,yCenter:-33},reference:weapon==='mine-special'||weapon==='ion-special'?'foot':'head',model:'source-radial'};}return precisionPolish(version)?{blastDistance:weapon==='sea-special'?1:PRECISE_BLAST_DISTANCE,directCore:contactCore(weapon)}:{blastDistance:FULL_BLAST_DISTANCE,directCore:{xRadius:23,yRadius:32,yCenter:-9}};}
export function impactDamageScale(t:Tank,x:number,y:number,slope:number,radius:number,direct:boolean,version='development',incoming?:Incoming,weapon?:WeaponId,section=0){
 if(originalBallistics(version)&&weapon&&weapon!=='missile-normal'&&originalWeapon(weapon)){const p=originalWeapon(weapon,section)!;return sourceFalloff(sourceDistance(t,x,y,slope,weapon),p.round);}
 const modern=precisionPolish(version),core=contactCore(weapon);
 if(direct){const rim=bodyRim(t,x,y,slope,modern?core.xRadius:23,modern?core.yRadius:32,modern?incoming:undefined);return Math.max(modern?.35:.65,Math.min(1,1-Math.max(0,rim-1)*(modern?.35:.45)));}
 const d=Math.hypot(x-t.x,y-t.y),full=modern?(weapon==='sea-special'?1:PRECISE_BLAST_DISTANCE):FULL_BLAST_DISTANCE;
 return d<=full?1:Math.max(.1,Math.min(1,1-(d-full)/(radius+18)));
}
