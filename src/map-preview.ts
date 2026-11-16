import type {Game} from './engine';
import {MAPS} from './catalog';
import {WORLD_W,TERRAIN_H} from './terrain';

export function paintMapOverview(c:CanvasRenderingContext2D,g:Game,width:number,height:number){
  c.clearRect(0,0,width,height);c.fillStyle=g.config.map==='moon'?'#dcecf1':g.config.map==='egypt'?'#f3e6ce':'#e8eee0';c.fillRect(0,0,width,height);
  const color=MAPS.find(m=>m.id===g.config.map)!.color;
  for(let x=0;x<=WORLD_W;x+=8){
    let start=0,kind=0;
    for(let y=0;y<=TERRAIN_H;y++){
      const at=y*g.land.stride+x,next=y<TERRAIN_H&&g.land.mask[at]?(g.land.protectedMask[at]?2:g.config.map==='moon'&&y>720?3:1):0;
      if(next===kind)continue;
      if(kind){c.fillStyle=kind===2?'#d7bf73':kind===3?'#999879':color;c.fillRect(x/WORLD_W*width,start/TERRAIN_H*height,Math.max(1,8/WORLD_W*width),Math.max(1.8,(y-start)/TERRAIN_H*height));}
      kind=next;start=y;
    }
  }
}
