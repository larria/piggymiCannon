export interface PortraitRect {left:number;right:number;top:number;bottom:number;tank:number}
/** Keep the portrait at chassis height; nearby medals need horizontal clearance,
 * rather than a whole extra row above the tank for a few overlapping pixels. */
import {sourceRangeModel} from './source-range';
export function placeTankPortrait(tank:number,x:number,y:number,scale:number,poisoned:boolean,occupied:readonly PortraitRect[],viewport?:{left:number;right:number},version='5.0.4'){
 const left=25*scale,right=(poisoned?82:43)*scale,gap=4;
 const box=(cx:number):PortraitRect=>({left:cx-left,right:cx+right,top:y-23*scale,bottom:y+32*scale,tank});
 const neighbours=occupied.filter(a=>y-23*scale<a.bottom+gap&&y+32*scale>a.top-gap);
 const bounded=viewport&&x>=viewport.left&&x<=viewport.right&&viewport.right-viewport.left>=left+right;
 const clamp=(cx:number)=>bounded?Math.max(viewport!.left+left,Math.min(viewport!.right-right,cx)):cx;
 if(sourceRangeModel(version)){const chosen=clamp(x);return {x:chosen,y,rect:box(chosen)};}
 const candidates=[x,...neighbours.flatMap(a=>[a.left-gap-right,a.right+gap+left])].map(clamp).sort((a,b)=>Math.abs(a-x)-Math.abs(b-x)||a-b);
 const overlaps=(cx:number)=>{const b=box(cx);return neighbours.some(a=>b.left<a.right+gap-1e-7&&b.right>a.left-gap+1e-7);};
 const chosen=candidates.find(cx=>!overlaps(cx))??clamp(x);
 return {x:chosen,y,rect:box(chosen)};
}
