import type {ItemId} from './catalog';
import {paintItemGlyph,ITEM_CUE_LABELS} from './item-art';
export interface ItemCue {tank:number;item:ItemId;age:number}
export const ITEM_CUE_SECONDS=1.1;
/** One finite gesture per use; a paused game keeps its exact visual state. */
export function itemCuePose(age:number){
 const t=Math.max(0,Math.min(ITEM_CUE_SECONDS,age)),p=1-Math.pow(1-Math.min(1,t/.36),3);
 return {alpha:Math.max(0,Math.min(1,t/.08,(ITEM_CUE_SECONDS-t)/.22)),rise:10*p,scale:.92+.08*p,progress:p};
}
/** Quiet paper ticket above the portraits, never a damage particle or sound. */
export function paintItemCue(c:CanvasRenderingContext2D,cue:ItemCue,x:number,y:number,color:string,reduced=false){
 const pose=itemCuePose(cue.age);if(pose.alpha===0)return;
 c.save();c.translate(x,y-(reduced?0:pose.rise));c.scale(reduced?1:pose.scale,reduced?1:pose.scale);c.globalAlpha=pose.alpha;
 c.fillStyle='#fff9eb';c.strokeStyle='#aab397';c.lineWidth=1;c.beginPath();c.roundRect(-44,-16,88,32,8);c.fill();c.stroke();
 c.fillStyle=color;c.beginPath();c.roundRect(-41,-10,2,20,1);c.fill();
 c.save();c.translate(-22,0);paintItemGlyph(c,cue.item,24,reduced?undefined:cue.age);c.restore();
 c.fillStyle='#465941';c.textAlign='left';c.textBaseline='middle';c.font='600 9px sans-serif';c.fillText(ITEM_CUE_LABELS[cue.item],-4,0);
 c.restore();
}
