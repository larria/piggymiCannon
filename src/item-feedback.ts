import type {ItemId} from './catalog';
import {paintItemGlyph,ITEM_CUE_LABELS} from './item-art';
import {turnItemPolish} from './turn-item-polish';
export interface ItemCue {tank:number;item:ItemId;age:number}
export const ITEM_CUE_SECONDS=1.4;
const PREVIOUS_CUE_SECONDS=1.1;
export const itemCueSeconds=(version:string)=>turnItemPolish(version)?ITEM_CUE_SECONDS:PREVIOUS_CUE_SECONDS;
/** One finite gesture per use; a paused game keeps its exact visual state. */
export function itemCuePose(age:number,duration=ITEM_CUE_SECONDS){
 const t=Math.max(0,Math.min(duration,age)),p=1-Math.pow(1-Math.min(1,t/.36),3);
 const beat=Math.max(0,1-t/.56)*Math.sin(Math.PI*Math.min(1,t/.56));
 return {alpha:Math.max(0,Math.min(1,t/.08,(duration-t)/.22)),rise:10*p,scale:.92+.08*p,progress:p,beat};
}

export interface CueBounds {left:number;right:number;top:number;bottom:number}
/** Keep the full ticket (including its animated rise) clear of the marker and other tickets. */
export function placeItemCue(x:number,y:number,scale:number,view:CueBounds,occupied:CueBounds[]){
 const dx=46*scale,up=27*scale,down=17*scale,gap=5*scale;
 const bounded=(v:number,lo:number,hi:number)=>hi>=lo?Math.min(hi,Math.max(lo,v)):(lo+hi)/2;
 x=bounded(x,view.left+dx,view.right-dx);
 const at=(cx:number,cy:number)=>({left:cx-dx,right:cx+dx,top:cy-up,bottom:cy+down});
 const fits=(slot:CueBounds)=>slot.left>=view.left&&slot.right<=view.right&&slot.top>=view.top&&slot.bottom<=view.bottom&&
  occupied.every(o=>slot.right<=o.left||slot.left>=o.right||slot.bottom<=o.top||slot.top>=o.bottom);
 const candidates=[{x,y},{x,y:Math.max(view.top+up,y)}];
 // At a high spawn, move to the side of the marker instead of covering it.
 for(const o of occupied)if(o.right>x-dx&&o.left<x+dx){
  candidates.push({x,y:o.top-down-gap},{x:o.right+dx+gap,y:bounded(y,view.top+up,view.bottom-down)},
   {x:o.left-dx-gap,y:bounded(y,view.top+up,view.bottom-down)},{x,y:o.bottom+up+gap});
 }
 const chosen=candidates.find(p=>fits(at(p.x,p.y)));if(!chosen)return null;
 occupied.push(at(chosen.x,chosen.y));return chosen;
}

export function paintItemCue(c:CanvasRenderingContext2D,cue:ItemCue,x:number,y:number,color:string,reduced=false,duration=ITEM_CUE_SECONDS){
 const pose=itemCuePose(cue.age,duration);if(pose.alpha===0)return;
 c.save();c.translate(x,y-(reduced?0:pose.rise));c.scale(reduced?1:pose.scale,reduced?1:pose.scale);c.globalAlpha=pose.alpha;
 c.fillStyle='#fff9eb';c.strokeStyle='#aab397';c.lineWidth=1;c.beginPath();c.roundRect(-44,-16,88,32,8);c.fill();c.stroke();
 c.fillStyle=color;c.beginPath();c.roundRect(-41,-10,2,20,1);c.fill();
 c.save();c.translate(-23,0);
 c.fillStyle='#eee8d0';c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.fill();
 if(!reduced&&pose.beat>0){
  c.save();c.globalAlpha*=pose.beat;c.strokeStyle=color;c.lineWidth=1.2;c.lineCap='round';
  for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(-1,-13);c.lineTo(-2,-16+pose.beat);c.stroke();}
  c.restore();
  c.translate(0,-2*pose.beat);c.rotate(-.16*pose.beat);c.scale(1+.48*pose.beat,1+.48*pose.beat);
 }
 paintItemGlyph(c,cue.item,23,reduced?undefined:cue.age);c.restore();
 c.fillStyle='#465941';c.textAlign='left';c.textBaseline='middle';c.font='600 9px sans-serif';c.fillText(ITEM_CUE_LABELS[cue.item],-5,0);
 c.restore();
}
