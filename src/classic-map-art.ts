import type {Game} from './engine';
import {templeNodes,templeRail,templeCap,templeNode,factoryFloor,templeCanopy,templePlatformY,waveTemple} from './classic-maps';
export function classicBackdrop(c:CanvasRenderingContext2D,map:string,color:string){
  c.save();c.scale(1.5,1.5);c.fillStyle=color;c.strokeStyle=color;c.globalAlpha=.35;
  if(map==='factory'){
    for(const [x,h] of [[85,150],[280,120],[970,190],[1130,160]]){c.fillRect(x,430-h,72,h);c.fillRect(x+14,420-h-80,22,90);}
    c.lineWidth=7;c.beginPath();c.moveTo(120,240);c.lineTo(360,240);c.lineTo(650,360);c.lineTo(1060,360);c.stroke();
    c.globalAlpha=.12;for(let i=0;i<5;i++){c.beginPath();c.ellipse(124+i*26,165-i*22,35,15,0,0,7);c.fill();}
  }else if(map==='temple'){
    for(let x=105;x<1280;x+=210){c.fillRect(x,260,27,160);c.fillRect(x-12,251,51,12);c.fillRect(x-9,411,45,13);}
    c.beginPath();c.moveTo(145,230);c.lineTo(640,139);c.lineTo(1135,230);c.closePath();c.fill();
    c.lineWidth=3;c.beginPath();c.moveTo(100,431);c.lineTo(1180,431);c.stroke();
  }else if(map==='egypt'){
    for(const [x,y,r] of [[170,420,155],[655,390,180],[1120,410,135]]){c.beginPath();c.moveTo(x-r,y);c.lineTo(x,y-r);c.lineTo(x+r,y);c.closePath();c.fill();}
    c.fillRect(805,252,15,185);c.beginPath();c.moveTo(802,252);c.lineTo(812,228);c.lineTo(823,252);c.closePath();c.fill();
  }
  c.restore();
}
export function classicDetails(c:CanvasRenderingContext2D,g:Game){
  const width=g.worldWidth,scale=g.layoutScale;
  c.save();
  if(g.config.map==='factory'){
    c.fillStyle='#c9d5d3';for(let x=48;x<width;x+=56)for(const y of (scale>1?[.29,.46,.60,.69].map(f=>f*g.worldHeight+9).concat(factoryFloor(x,scale)+9):[474,622,factoryFloor(x)+9]))if(g.land.solid(x,y)){c.beginPath();c.arc(x,y,2.3,0,7);c.fill();}
    c.strokeStyle='#d2c182';c.lineWidth=2;c.beginPath();for(let x=0;x<=width;x+=2){const y=factoryFloor(x,scale)+2;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.strokeStyle='#99a9aa';c.lineWidth=1.5;for(let x=0;x<width;x+=44){const y=factoryFloor(x,scale)+14;c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y+9);c.stroke();}
    c.fillStyle='#d2dcdb';c.font='11px sans-serif';c.fillText('永久 Z 形底板',30,g.worldHeight-35);
  }else if(g.config.map==='temple'){
    if(waveTemple(g.gameVersion)){
      for(const node of templeNodes(scale)){
        const cap=templeCanopy(node,scale),left=node-cap.radius,right=node+cap.radius;
        c.fillStyle='#976839';c.fillRect(node-cap.stem,cap.hem,2*cap.stem+1,cap.bottom-cap.hem);
        c.save();c.beginPath();c.moveTo(left,cap.top(left));
        for(let x=left+1;x<=right;x++)c.lineTo(x,cap.top(x));
        c.lineTo(right,cap.hem);c.lineTo(left,cap.hem);c.closePath();c.clip();
        c.fillStyle='#e8c778';c.fillRect(left,cap.crown,2*cap.radius,cap.hem-cap.crown);
        c.fillStyle='#b98252';c.beginPath();c.moveTo(left,cap.crown);c.lineTo(node-4,cap.crown);c.quadraticCurveTo(node-16,cap.crown+10,node-19,cap.hem);c.lineTo(left,cap.hem);c.fill();
        c.beginPath();c.moveTo(node+3,cap.crown);c.lineTo(right,cap.crown);c.lineTo(right,cap.hem);c.lineTo(node+18,cap.hem);c.quadraticCurveTo(node+14,cap.crown+12,node+3,cap.crown);c.fill();
        c.fillStyle='#f3d99f';c.fillRect(left,cap.crown,2*cap.radius,7);c.fillStyle='#9d6e44';c.fillRect(left,cap.hem-2,2*cap.radius,2);
        c.restore();
        c.strokeStyle='#f0d399';c.lineWidth=1.5;c.beginPath();for(let x=left;x<=right;x++){const y=cap.top(x)+1;x===left?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
      }
      const level=scale>1?.46:547.5/960,left=scale>1?width*.47+8:830,right=scale>1?width*.53-8:1090;
      c.fillStyle='#e8d7b1';for(let x=left;x<right;x+=28){const top=Math.ceil(templePlatformY(x,width,level,g.worldHeight*level));if(g.land.solid(x,top)&&g.land.solid(x,top+29))c.fillRect(x,top+6,7,24);}
    }else{
      c.strokeStyle='#ead391';c.fillStyle='#c7ac60';c.lineWidth=2;
      for(const node of templeNodes(scale)){
        const {radius,stem,stemStart,bottom}=templeNode(node,scale),left=Math.max(0,node-radius),right=Math.min(width,node+radius);c.beginPath();for(let x=left;x<=right;x+=2){const y=templeCap(x,node,scale)+1;x===left?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
        c.strokeStyle='#a88e50';c.lineWidth=1;for(let x=node-stem+2;x<node+stem;x+=3){c.beginPath();c.moveTo(x,templeRail(node,scale)+stemStart+1);c.lineTo(x,bottom-1);c.stroke();}
        c.strokeStyle='#ead391';c.lineWidth=2;
      }
      const top=scale>1?g.worldHeight*.46:555,left=scale>1?g.worldWidth*.47+8:858,right=scale>1?g.worldWidth*.53-8:1088;
      if(g.land.solid(g.worldWidth/2,Math.ceil(top))){c.fillStyle='#e8d7b1';for(let x=left;x<right;x+=28)c.fillRect(x,Math.ceil(top)+6,7,24);}
    }
  }else if(g.config.map==='egypt'){
    c.strokeStyle='#efd4a3';c.lineWidth=1.2;for(let y=578*scale;y<780*scale;y+=24)for(let x=143*scale;x<1845*scale;x+=34)if(g.land.solid(x,y)&&g.land.solid(x+26,y)){c.beginPath();c.moveTo(x,y);c.lineTo(x+26,y);c.stroke();}
    if(g.land.solid(960*scale,518*scale)){c.fillStyle='#edd29d';c.font='12px serif';for(const [i,s]of ['◇','│','○','◇'].entries())c.fillText(s,951*scale,530*scale+i*27);}
  }
  c.restore();
}
