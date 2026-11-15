import type {Tank} from './engine';
/** Body-local collision envelope; the new broad Dad/fox/fish heads are included. */
export function pointHitsTank(t:Tank,x:number,y:number,slope:number){
  const dx=x-t.x,dy=y-t.y,c=Math.cos(slope),s=Math.sin(slope);
  const localX=(dx*c+dy*s)*t.direction,localY=-dx*s+dy*c;
  const ellipse=(cx:number,cy:number,rx:number,ry:number)=>((localX-cx)/rx)**2+((localY-cy)/ry)**2<=1;
  const portrait=t.crew==='dad'?ellipse(-11,-28,22,19):t.crew==='fish'?ellipse(-12,-26,20,16):t.crew==='fox'?ellipse(-12,-26,17,17):ellipse(-10,-27,16,16);
  return portrait||(Math.abs(localX)<=29&&localY>=-6&&localY<=23)||ellipse(-3,-23,21,19)||ellipse(9,-15,10,7);
}
