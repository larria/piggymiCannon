import {templeCanopy,templeNodes,waveTemple} from './classic-maps';
import {thickIceEdges} from './sky-map';
import type {Game} from './engine';
import {MAPS} from './catalog';

export function paintMapOverview(c:CanvasRenderingContext2D,g:Game,width:number,height:number){
  c.clearRect(0,0,width,height);c.fillStyle=['moon','sky'].includes(g.config.map)?'#dcecf1':g.config.map==='egypt'?'#f3e6ce':'#e8eee0';c.fillRect(0,0,width,height);
  const branchStart=thickIceEdges(g.gameVersion)?g.worldHeight*.63:720*g.layoutScale;
  const color=MAPS.find(m=>m.id===g.config.map)!.color;
  for(let x=0;x<=g.worldWidth;x+=8){
    let start=0,kind=0;
    for(let y=0;y<=g.worldHeight;y++){
      const at=y*g.land.stride+x,next=y<g.worldHeight&&g.land.mask[at]?(g.land.protectedMask[at]?2:g.config.map==='moon'&&y>branchStart?3:1):0;
      if(next===kind)continue;
      if(kind){c.fillStyle=kind===2?'#d7bf73':kind===3?'#999879':color;c.fillRect(x/g.worldWidth*width,start/g.worldHeight*height,Math.max(1,8/g.worldWidth*width),Math.max(1.8,(y-start)/g.worldHeight*height));}
      kind=next;start=y;
    }
  }
  if(g.config.map==='temple'&&waveTemple(g.gameVersion)){
    // This drawn profile still shows up when a whole canopy is only a few map pixels wide.
    c.save();c.scale(width/g.worldWidth,height/g.worldHeight);c.fillStyle='#ad773e';
    for(const node of templeNodes(g.layoutScale)){
      const {radius,crown,hem,top}=templeCanopy(node,g.layoutScale);
      c.beginPath();c.moveTo(node-radius,top(node-radius));c.quadraticCurveTo(node,2*crown-top(node-radius),node+radius,top(node+radius));c.lineTo(node+radius,hem);c.lineTo(node-radius,hem);c.closePath();c.fill();
    }
    c.restore();
  }
}
