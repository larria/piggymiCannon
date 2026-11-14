import type {Game} from './engine';
import {TEMPLE_NODES,templeRail} from './classic-maps';
export function classicBackdrop(c:CanvasRenderingContext2D,map:string,color:string){
  c.save();c.fillStyle=color;c.strokeStyle=color;c.globalAlpha=.35;
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
  c.save();
  if(g.config.map==='factory'){
    c.fillStyle='#c9d5d3';for(let x=48;x<1280;x+=56)for(const y of [316,415,556])if(g.land.solid(x,y)){c.beginPath();c.arc(x,y,2.3,0,7);c.fill();}
    c.strokeStyle='#99a9aa';c.lineWidth=1.5;for(let x=0;x<1280;x+=44){c.beginPath();c.moveTo(x,564);c.lineTo(x+16,576);c.stroke();}
    c.fillStyle='#d2dcdb';c.font='11px sans-serif';c.fillText('永久底板',30,576);
  }else if(g.config.map==='temple'){
    c.strokeStyle='#ead391';c.fillStyle='#c7ac60';c.lineWidth=2;
    for(const x of TEMPLE_NODES){const y=templeRail(x);c.beginPath();c.arc(x,y+4,5,0,7);c.fill();c.stroke();}
    if(g.land.solid(640,370)){c.fillStyle='#e8d7b1';for(let x=572;x<725;x+=28)c.fillRect(x,370,7,24);}
  }else if(g.config.map==='egypt'){
    c.strokeStyle='#efd4a3';c.lineWidth=1.2;for(let y=385;y<520;y+=24)for(let x=95;x<1230;x+=34)if(g.land.solid(x,y)&&g.land.solid(x+26,y)){c.beginPath();c.moveTo(x,y);c.lineTo(x+26,y);c.stroke();}
    if(g.land.solid(640,345)){c.fillStyle='#edd29d';c.font='12px serif';for(const [i,s]of ['◇','│','○','◇'].entries())c.fillText(s,634,353+i*27);}
  }
  c.restore();
}
