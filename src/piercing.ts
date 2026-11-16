import type {Terrain} from './terrain';

export const PIERCING_SECTIONS=4;
export const PIERCING_INTERVAL=.025;
/** User-confirmed descending sections; the exact percentages are our tuning. */
export const PIERCING_DAMAGE=[1,.8,.6,.4] as const;
export const piercingDamageScale=(section:number)=>PIERCING_DAMAGE[Math.max(0,Math.min(PIERCING_SECTIONS-1,section))];

/** A permanent surface stops the carrier even during the section cooldown.
 * Sample the swept segment at <=1px so a thin cap cannot be skipped. Nothing
 * is excavated here: each remaining section still goes through normal impact,
 * damage switches, distance attenuation, shields and explosion handling. */
export function permanentPiercingContact(land:Terrain,x:number,y:number,nextX:number,nextY:number){
 const permanent=(px:number,py:number)=>{
  const ix=Math.floor(px),iy=Math.floor(py);
  if(ix<0||ix>=land.stride||iy<0||iy>=land.mask.length/land.stride)return false;
  const index=iy*land.stride+ix;return land.mask[index]===1&&land.protectedMask[index]===1;
 };
 if(permanent(x,y))return {x,y,entered:false};
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(nextX-x),Math.abs(nextY-y))));
 for(let i=1;i<=steps;i++){
  const px=x+(nextX-x)*i/steps,py=y+(nextY-y)*i/steps;
  if(permanent(px,py))return {x:px,y:py,entered:true};
 }
 return null;
}
