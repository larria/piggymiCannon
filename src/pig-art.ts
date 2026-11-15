import type {Tank} from './engine';
export type CrewAction='idle'|'move'|'fire'|'hurt'|'win'|'lose';
const ellipse=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();};
const path=(c:CanvasRenderingContext2D,d:string,color:string,stroke?:string)=>{const p=new Path2D(d);c.fillStyle=color;c.fill(p);if(stroke){c.strokeStyle=stroke;c.stroke(p);}};
const e=(c:CanvasRenderingContext2D)=>((x:number,y:number,rx:number,ry:number,color:string)=>ellipse(c,x,y,rx,ry,color));
export function mimiPose(time:number,state:CrewAction,breath:boolean){const p=Math.sin(time*(state==='win'?8:state==='move'?17:state==='hurt'?24:6));return {bob:state==='win'?-Math.abs(p)*13:state==='hurt'?p*2:breath?p*3:state==='move'?p*2:p*.9,lean:state==='win'?p*.16:state==='fire'?-.18:state==='hurt'?p*.13:breath?p*.06:0,stretch:breath?1+p*.1:1,p};}
export function dadPose(time:number,state:CrewAction,breath:boolean){const p=Math.sin(time*(state==='win'?4.2:state==='move'?10:state==='hurt'?13:3.4));return {bob:state==='win'?-Math.max(0,p)*7:state==='hurt'?p:breath?p*2.2:state==='move'?Math.abs(p)*1.3:p*.55,lean:state==='win'?p*.06:state==='fire'?.1:state==='hurt'?-p*.07:breath?-.035+p*.025:0,stretch:breath?1+p*.065:1,p};}
function stateMarks(c:CanvasRenderingContext2D,t:Tank,time:number,small:boolean){
 if(t.poisoned){c.fillStyle='#74a249';for(let i=0;i<3;i++)ellipse(c,-24+Math.sin(i*4)*4,-5-((time*(small?18:11)+i*13)%34),2.5,3.5,'#80aa55');}
 if(t.immobile||t.frozen){c.strokeStyle='#83b7d1';c.lineWidth=2;c.beginPath();c.moveTo(-25,8);c.lineTo(-20,-17);c.lineTo(-12,-8);c.moveTo(18,7);c.lineTo(24,-15);c.lineTo(14,-8);c.stroke();}
 if(t.vehicleId==='sea'&&t.hp<t.maxHP*.5){c.strokeStyle='#b45038';c.lineWidth=2;c.beginPath();c.moveTo(-19,-30);c.lineTo(-13,-26);c.lineTo(-17,-21);c.moveTo(-15,-32);c.lineTo(-13,-26);c.lineTo(-7,-25);c.stroke();}
}
export function paintMimi(c:CanvasRenderingContext2D,t:Tank,time:number,state:CrewAction,breath:boolean){
 const skin='#efb09b',light='#f6c6b1',ink='#795347',p=mimiPose(time,state,breath),el=e(c),raging=t.vehicleId==='sea'&&t.hp<t.maxHP*.5;
 c.save();c.translate(-10,-13);c.lineJoin='round';c.lineCap='round';
 if(state==='lose'){
  c.translate(4,23+Math.sin(time*10)*.8);el(-9,-3,19,8,skin);el(14,-5,14,11,light);path(c,'M6-13 4-26 17-14M18-12l9-12 1 17',skin);el(27,-2,7,4,'#df937e');path(c,'M-15-9-1-10 4-4-13 0z','#eac266');path(c,'M-24-2q-14-7-11 0q1 7 10 1','none',ink);c.strokeStyle=ink;c.lineWidth=1.8;c.beginPath();c.moveTo(13,-10);c.lineTo(18,-7);c.lineTo(13,-4);c.stroke();for(let i=0;i<3;i++)el(20+i*4,((time*20+i*3)%9)-2,2,3,'#91c9da');c.restore();return;
 }
 // Mimi hops and leans as a single slender figure; the scarf follows the same neck.
 c.translate(t.poisoned?Math.sin(time*9)*1.5:0,p.bob);c.rotate(p.lean);c.scale(1,p.stretch);
 el(0,3,10,10,skin);el(-2,4,6,8,light);
 c.strokeStyle=skin;c.lineWidth=5;c.beginPath();c.moveTo(-7,1);c.lineTo(-17,state==='win'?-26-p.p*5:breath?8:state==='fire'?-8:7);c.moveTo(7,1);c.lineTo(18,state==='win'?-25+p.p*5:breath?-5:3);c.stroke();
 path(c,'M-11-18-16-33-3-25M5-25l14-8 0 16',skin);el(0,-14,14,14,light);el(11,-9,7,5,'#df937e');el(9,-9,1.1,1.7,ink);el(13,-9,1.1,1.7,ink);
 path(c,'M-13-25q12-13 27 0l-2 4h-25z','#c87a67');path(c,'M-14-23h29v4h-29z','#aa6452');path(c,'M-6-30l-6-6 1 9 6-3 7-6 1 9z','#e49c7c');
 path(c,'M-9-2q10 3 18-2v5q-13 5-22-1z','#eac266');path(c,`M-8 0l-17 ${5+p.p*3} 2 5 19-7z`,'#eac266');
 c.strokeStyle=ink;c.lineWidth=1.8;
 if(state==='win'){c.beginPath();c.moveTo(1,-17);c.quadraticCurveTo(5,-23,9,-17);c.stroke();}
 else if(state==='hurt'&&t.reaction?.kind==='fall'){c.beginPath();c.moveTo(1,-21);c.lineTo(8,-14);c.moveTo(8,-21);c.lineTo(1,-14);c.stroke();}
 else if(state==='hurt'){c.beginPath();c.moveTo(2,-21);c.lineTo(8,-17);c.lineTo(2,-14);c.stroke();}
 else if(raging){path(c,'M1-22 10-19 9-17 1-19z',ink);el(6,-16,1.8,2,ink);}
 else {el(5,-18,2,2.5,ink);el(5.5,-19, .6,.7,'#fff2dd');}
 el(-4,-9,3,2,'#e18d7b');el(8,-3,3.5,breath?3+Math.abs(p.p)*2:t.poisoned?3+Math.abs(Math.sin(time*9))*2:state==='win'?4:2,ink);
 if(state==='hurt'&&t.reaction?.kind==='direct')for(let i=0;i<4;i++)el(3+i*3,-12+(time*26+i*4)%21,2,3,'#91c9da');
 if(state==='hurt'&&t.reaction?.kind==='fall'){c.font='13px sans-serif';c.fillStyle='#e9bc58';for(let i=0;i<3;i++)c.fillText('✦',Math.cos(time*6+i*2.1)*22,-40+Math.sin(time*6+i*2.1)*4);}
 if(breath){c.globalAlpha=.6*(1-time%1);for(let i=0;i<3;i++)el(20+time%1*28+i*6,-3-i*4,3+i,3,'#fff5df');c.globalAlpha=1;el(-15,-17,2,3.5,'#9cc7d1');}
 stateMarks(c,t,time,true);c.restore();
}
export function paintDad(c:CanvasRenderingContext2D,t:Tank,time:number,state:CrewAction,breath:boolean){
 const skin='#dda78f',light='#edbfa5',ink='#654a3c',p=dadPose(time,state,breath),el=e(c),raging=t.vehicleId==='sea'&&t.hp<t.maxHP*.5;
 c.save();c.translate(-11,-12);c.lineJoin='round';c.lineCap='round';
 if(state==='lose'){
  c.translate(1,22+Math.sin(time*5.5)*.7);el(-8,-4,24,10,skin);el(17,-6,18,12,light);path(c,'M-29-9h25v15h-25z','#6689a0');el(32,-3,8,5,skin);path(c,'M20 0q-7-7-13-1q8 7 13 1q5 6 13 0q-5-8-13 0',ink);el(10,-17,5,7,skin);path(c,'M5-20q12-11 27 0v3H5z','#64889f');c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(18,-12);c.quadraticCurveTo(22,-15,27,-12);c.stroke();for(let i=0;i<2;i++)el(24+i*5,-5+(time*12+i*4)%11,2.5,3.5,'#91c9da');c.restore();return;
 }
 // Dad has a slower weight shift and one-arm salute, with a broad connected torso.
 c.translate(t.poisoned?Math.sin(time*5)*1.2:0,p.bob+(t.poisoned?Math.max(0,Math.sin(time*5))*1.5:0));c.rotate(p.lean);c.scale(1+p.p*(breath?.025:0),p.stretch);
 el(-1,3,16,12,skin);path(c,'M-16-4h12v15h-13zM5-5h12v17H5z','#6b8da0');el(0,5,8,8,light);
 c.strokeStyle=skin;c.lineWidth=7;c.beginPath();c.moveTo(-10,1);c.lineTo(-20,state==='win'?-9:breath?5:8);c.moveTo(10,1);c.lineTo(24,state==='win'?-29-p.p*3:state==='fire'?-11:breath?-6:6);c.stroke();
 el(-17,-18,5,8,skin);el(15,-19,6,8,skin);el(0,-16,19,16,light);el(14,-9,8,6,skin);el(12,-9,1.3,2,ink);el(17,-9,1.3,2,ink);
 path(c,'M-20-28q12-16 37-1v5h-37z','#64889f');path(c,'M-23-26h43v5h-43z','#466c83');path(c,'M-14-33h25v2h-25z','#aec4ce');
 c.strokeStyle=ink;c.lineWidth=2.5;c.beginPath();c.moveTo(-4,-23);c.lineTo(4,-24);c.moveTo(8,-24);c.lineTo(16,-22);c.stroke();
 if(state==='hurt'&&t.reaction?.kind==='fall'){c.beginPath();c.moveTo(2,-21);c.lineTo(9,-14);c.moveTo(9,-21);c.lineTo(2,-14);c.stroke();}
 else if(state==='win'||state==='hurt'){c.beginPath();c.moveTo(1,-16);c.quadraticCurveTo(5,-20,9,-16);c.stroke();}
 else {el(5,-18,1.8,2,ink);if(raging)path(c,'M0-24l10 3-1 3-9-4z',ink);}
 path(c,'M12-3q-10-8-19-1q11 8 19 1q7 7 16 1q-8-9-16-1',ink);
 el(12,3,4,breath?3+Math.abs(p.p)*2:t.poisoned?3+Math.abs(Math.sin(time*5))*1.5:state==='win'?3:1.4,ink);
 if(state==='win')el(-10,4,3.5,4,'#d8b563');
 if(state==='hurt'&&t.reaction?.kind==='direct')for(let i=0;i<3;i++)el(5+i*4,-13+(time*16+i*4)%23,2.5,3.7,'#91c9da');
 if(state==='hurt'&&t.reaction?.kind==='fall'){c.font='14px sans-serif';c.fillStyle='#e9bc58';for(let i=0;i<2;i++)c.fillText('✦',Math.cos(time*3.5+i*3)*24,-43+Math.sin(time*3.5+i*3)*6);}
 if(breath){c.globalAlpha=.65*(1-(time*.65)%1);for(let i=0;i<2;i++)el(25+(time*.65)%1*30+i*8,1-i*4,5+i,4,'#fff5df');c.globalAlpha=1;el(-19,-14,2.5,4,'#9cc7d1');}
 stateMarks(c,t,time,false);c.restore();
}
