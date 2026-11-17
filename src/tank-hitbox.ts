import {originalBallistics,SOURCE_BODY_HEIGHT,SOURCE_BODY_WIDTH} from './original-ballistics';
import type {Tank} from './engine';
/** Body-local collision envelope; the new broad Dad/fox/fish heads are included. */
export function pointHitsTank(t:Tank,x:number,y:number,slope:number,version='4.0.4'){
  const dx=x-t.x,dy=y-t.y,c=Math.cos(slope),s=Math.sin(slope);
  const localX=(dx*c+dy*s)*t.direction,localY=-dx*s+dy*c;
  if(originalBallistics(version))return Math.abs(localX)<=SOURCE_BODY_WIDTH/2+1e-7&&localY>=18-SOURCE_BODY_HEIGHT-1e-7&&localY<=18+1e-7;
  const ellipse=(cx:number,cy:number,rx:number,ry:number)=>((localX-cx)/rx)**2+((localY-cy)/ry)**2<=1;
  const portrait=t.crew==='dad'?ellipse(-11,-28,22,19):t.crew==='fish'?ellipse(-12,-26,20,16):t.crew==='fox'?ellipse(-12,-26,17,17):ellipse(-10,-27,16,16);
  return portrait||(Math.abs(localX)<=29&&localY>=-6&&localY<=23)||ellipse(-3,-23,21,19)||ellipse(9,-15,10,7);
}

/** Slab intersection in body-local coordinates; returns the first real contact. */
export function tankSegmentContact(t:Tank,x:number,y:number,toX:number,toY:number,slope:number){
 const c=Math.cos(slope),s=Math.sin(slope),px=(x-t.x)*c+(y-t.y)*s,py=-(x-t.x)*s+(y-t.y)*c,dx=(toX-x)*c+(toY-y)*s,dy=-(toX-x)*s+(toY-y)*c;
 let lo=0,hi=1;for(const [pos,delta,min,max] of [[px,dx,-30,30],[py,dy,18-SOURCE_BODY_HEIGHT,18]]){if(Math.abs(delta)<1e-12){if(pos<min||pos>max)return null;}else{const a=(min-pos)/delta,b=(max-pos)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;}}
 return {x:x+(toX-x)*lo,y:y+(toY-y)*lo,fraction:lo};
}
