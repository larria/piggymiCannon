import type {Tank} from './engine';
/** The same upright head / snout / chassis shapes used by the battlefield art. */
export function pointHitsTank(t:Tank,x:number,y:number,slope:number){
  const dx=x-t.x,dy=y-t.y,c=Math.cos(slope),s=Math.sin(slope);
  const localX=(dx*c+dy*s)*t.direction,localY=-dx*s+dy*c;
  const ellipse=(cx:number,cy:number,rx:number,ry:number)=>((localX-cx)/rx)**2+((localY-cy)/ry)**2<=1;
  return (Math.abs(localX)<=29&&localY>=-6&&localY<=23)||ellipse(-3,-23,21,19)||ellipse(9,-15,10,7);
}
