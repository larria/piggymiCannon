import type {Game} from './engine';
import {MAPS} from './catalog';

export function paintMapOverview(c:CanvasRenderingContext2D,g:Game,width:number,height:number){
  c.clearRect(0,0,width,height);c.fillStyle=['moon','sky'].includes(g.config.map)?'#dcecf1':g.config.map==='egypt'?'#f3e6ce':'#e8eee0';c.fillRect(0,0,width,height);
  const color=MAPS.find(m=>m.id===g.config.map)!.color;
  for(let x=0;x<=g.worldWidth;x+=8){
    let start=0,kind=0;
    for(let y=0;y<=g.worldHeight;y++){
      const at=y*g.land.stride+x,next=y<g.worldHeight&&g.land.mask[at]?(g.land.protectedMask[at]?2:g.config.map==='moon'&&y>720*g.layoutScale?3:1):0;
      if(next===kind)continue;
      if(kind){c.fillStyle=kind===2?'#d7bf73':kind===3?'#999879':color;c.fillRect(x/g.worldWidth*width,start/g.worldHeight*height,Math.max(1,8/g.worldWidth*width),Math.max(1.8,(y-start)/g.worldHeight*height));}
      kind=next;start=y;
    }
  }
}
