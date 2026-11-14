import type {Tank} from './engine';
import {CREW} from './crew';
// The whole character uses one parent transform; the head never receives a separate jump.
export function paintCrew(c:CanvasRenderingContext2D,t:Tank,time:number,state:'idle'|'move'|'fire'|'hurt'|'win'|'lose',breath=false){
 const fox=t.crew==='fox',fish=t.crew==='fish';
 const pulse=Math.sin(time*(state==='win'?7:state==='hurt'?22:state==='move'?16:4));
 c.save();c.translate(-12,-14);
 if(state==='lose'){
  // A single prone silhouette lies just ABOVE the supported feet, rather than
  // rotating a seated character into the platform. Body and face overlap.
  c.translate(5,23+Math.sin(time*9)*.7);
  const skin=fox?'#cf744c':'#e6c563',ink='#685846';
  const e=(x:number,y:number,rx:number,ry:number,color:string)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();};
  if(fox){e(-7,-2,19,8,skin);e(14,-5,14,11,skin);e(20,-2,8,6,'#f6e6ce');c.fillStyle=skin;c.beginPath();c.moveTo(4,-12);c.lineTo(2,-27);c.lineTo(14,-14);c.moveTo(17,-15);c.lineTo(26,-25);c.lineTo(26,-7);c.fill();e(-26,-3,10,6,skin);e(-33,-3,5,5,'#f6e6ce');}
  else{e(7,-3,23,10,skin);c.fillStyle='#d5b14b';c.beginPath();c.moveTo(-12,-3);c.lineTo(-29,-13);c.lineTo(-27,5);c.closePath();c.fill();c.beginPath();c.moveTo(0,-12);c.lineTo(7,-22);c.lineTo(16,-12);c.fill();}
  c.strokeStyle=ink;c.lineWidth=1.8;c.beginPath();c.moveTo(13,-10);c.lineTo(18,-7);c.lineTo(13,-4);c.stroke();e(27,-3,2.5,2,ink);
  for(let i=0;i<3;i++)e(18+i*5,-3+(time*15+i*3)%9,2,2.8,'#8dc9de');e(25,8,13,2,'#8dc9de66');c.restore();return;
 }
 if(state==='win'){c.translate(0,-Math.abs(pulse)*11);c.rotate(pulse*.12);}
 else if(state==='hurt'){c.translate(pulse*3,2);c.rotate(pulse*.1);}
 else if(state==='move')c.translate(0,pulse*1.6);
 else if(state==='fire')c.rotate(-.13);
 else if(breath){c.translate(0,pulse*3);c.scale(1,1+pulse*.08);}
 else c.translate(0,pulse*.6);
 const skin=fox?'#cf744c':fish?'#e6c563':'#efb69f',ink='#685846';c.strokeStyle=ink;c.lineWidth=1.4;c.lineJoin='round';
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();};
 // Torso, arms and head always overlap at the neck.
 ellipse(0,2,9,8,skin);
 if(fox){c.fillStyle='#cf744c';c.beginPath();c.moveTo(-7,7);c.quadraticCurveTo(-28,2,-22,-16);c.quadraticCurveTo(-28,-3,-8,12);c.fill();ellipse(-22,-11,4,6,'#f2e5cf');}
 if(fish){c.fillStyle='#d5b14b';c.beginPath();c.moveTo(-8,-4);c.lineTo(-23,-16-pulse*2);c.lineTo(-21,9+pulse*2);c.closePath();c.fill();c.beginPath();c.moveTo(-3,-20);c.lineTo(3,-31);c.lineTo(9,-17);c.fill();}
 if(state==='win'||breath){c.strokeStyle=skin;c.lineWidth=5;c.beginPath();c.moveTo(-6,0);c.lineTo(-15,state==='win'?-25:9);c.moveTo(6,0);c.lineTo(16,state==='win'?-27:-3);c.stroke();}
 if(!fish){c.fillStyle=skin;c.beginPath();c.moveTo(-10,-14);c.lineTo(-15,fox?-38:-28);c.lineTo(-1,-23);c.moveTo(3,-22);c.lineTo(fox?18:15,fox?-37:-28);c.lineTo(12,-13);c.fill();if(fox){c.fillStyle='#efe1ca';c.beginPath();c.moveTo(-10,-24);c.lineTo(-12,-33);c.lineTo(-4,-24);c.moveTo(8,-24);c.lineTo(15,-32);c.lineTo(12,-20);c.fill();}}
 ellipse(0,-12,fish?18:14,fish?13:15,skin);
 if(fox){ellipse(5,-9,11,9,'#f6e6ce');c.fillStyle='#cf744c';c.beginPath();c.moveTo(-14,-15);c.lineTo(-24,-8);c.lineTo(-11,-4);c.fill();}
 if(!fox&&!fish){ellipse(11,-7,7,5,'#df9a85');ellipse(10,-7,1,1.5,'#aa7263');ellipse(14,-7,1,1.5,'#aa7263');}
 if(fish){c.strokeStyle='#c4a343';c.lineWidth=1;c.beginPath();c.moveTo(-9,-11);c.quadraticCurveTo(-15,-4,-8,3);c.stroke();ellipse(7,-14,6,7,'#f9efcf');}
 c.strokeStyle=ink;c.lineWidth=1.8;c.fillStyle=ink;
 if(state==='win'){c.beginPath();c.moveTo(2,-15);c.quadraticCurveTo(5,-21,9,-15);c.stroke();}
 else if(state==='hurt'&&t.reaction?.kind==='fall'){c.beginPath();c.moveTo(1,-19);c.lineTo(8,-11);c.moveTo(8,-19);c.lineTo(1,-11);c.stroke();}
 else if(state==='hurt'&&t.reaction?.kind==='graze'){c.beginPath();c.moveTo(1,-15);c.quadraticCurveTo(5,-19,9,-15);c.stroke();}
 else if(state==='hurt'){c.beginPath();c.moveTo(2,-19);c.lineTo(7,-15);c.lineTo(2,-11);c.stroke();}
 else {ellipse(5,-15,1.8,2,ink);}
 if(fox)ellipse(16,-10,2.5,2,ink);
 c.beginPath();c.arc(fish?17:7,-4,3,state==='win'?0:Math.PI,state==='win'?Math.PI:Math.PI*2);c.stroke();
 if(state==='hurt'&&t.reaction?.kind==='fall'){c.fillStyle='#f6cf80';c.font='13px sans-serif';for(let i=0;i<3;i++)c.fillText('✦',Math.cos(time*5+i*2.1)*20,-35+Math.sin(time*5+i*2.1)*5);}
 if(state==='hurt'&&t.reaction?.kind==='direct'){for(let i=0;i<3;i++)ellipse(4+i*3,-10+(time*22+i*5)%19,2,3,'#8dc9de');}
 if(breath){ellipse(7,-3,3,3+Math.abs(pulse)*2,ink);c.globalAlpha=.65*(1-(time%1));for(let i=0;i<3;i++)ellipse(20+(time%1)*25+i*5,-5-i*3,3+i,3,'#faf0da');c.globalAlpha=1;}
 {c.fillStyle=CREW[t.crew].color;c.beginPath();c.roundRect(-13,-25,24,5,2);c.fill();}
 c.restore();
}
