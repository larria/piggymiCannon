import type {Tank} from './engine';
import {paintCrew} from './crew-art';
/** One shared defeated-character path during battle and final celebration. */
export function defeatedPig(c:CanvasRenderingContext2D,t:Tank,time:number,_slope?:number,scale=1){
  const pose=t.defeat;
  if(t.hp>0||t.outOfBounds||!pose)return false;
  c.save();c.translate(pose.x,pose.y);c.rotate(pose.slope);c.scale(pose.direction,1);
  if(scale!==1){c.translate(0,18);c.scale(scale,scale);c.translate(0,-18);}
  paintCrew(c,t,time,'lose');c.restore();return true;
}
export function victoryConfetti(c:CanvasRenderingContext2D,t:Tank,time:number){
  c.save();c.translate(t.x,t.y);const colors=['#e89978','#bacb82','#e1bd69','#93c3d0'];
  for(let i=0;i<18;i++){const p=(time*.6+i/18)%1,x=Math.sin(i*7.3)*55*(.3+p),y=-110+p*100;
    c.save();c.translate(x,y);c.rotate(time*3+i);c.globalAlpha=Math.sin(p*Math.PI);c.fillStyle=colors[i%4];c.fillRect(-2,-4,4,8);c.restore();}
  c.restore();
}
