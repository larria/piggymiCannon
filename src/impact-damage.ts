import {bodyScale} from './tank-geometry';
import type {Tank} from './engine';
export const FULL_BLAST_DISTANCE=18;
/** Collision still includes visible cheeks/treads; only the central core gives
 * full direct damage. Near misses retain the existing outer blast reach. */
export function impactDamageScale(t:Tank,x:number,y:number,slope:number,radius:number,direct:boolean){
 const dx=x-t.x,dy=y-t.y;
 if(direct){
  const c=Math.cos(slope),s=Math.sin(slope),localX=(dx*c+dy*s)*t.direction/bodyScale(t),localY=(-dx*s+dy*c-18)/bodyScale(t)+18;
  const rim=Math.hypot(localX/23,(localY+9)/32);
  return Math.max(.65,Math.min(1,1-Math.max(0,rim-1)*.45));
 }
 const d=Math.hypot(dx,dy);
 return d<=FULL_BLAST_DISTANCE?1:Math.max(.1,Math.min(1,1-(d-FULL_BLAST_DISTANCE)/(radius+18)));
}
