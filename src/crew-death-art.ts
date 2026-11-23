import type {CrewId} from './crew';
import {paintCrewFace} from './crew-art';
import {crewOutfit} from './crew-clothes';
import {ink,oval,stroke} from './crew-ink';

// All four poses are drawn against the same ground line, y=0. The complete
// illustration follows the engine's defeat pose when the support caves in.
const pulse=(time:number,delay:number)=>{
 const t=(time+1-delay)%1;
 return t<.32?Math.sin(Math.PI*t/.32)**1.4:0;
};
function paw(c:CanvasRenderingContext2D,id:CrewId,x:number,y:number,tilt:number){
 const fox=id==='fox';
 c.save();c.translate(x,y);c.rotate(tilt);
 ink(c,'M-5 1q-1-5 3-6 5-1 7 2l1 3q-1 4-5 4h-3q-3 0-3-3Z',fox?'#e76d47':'#f5b39e',fox?'#89382d':'#884f42',1.2);
 ink(c,'M-2-2q1-1 3 0m0 0 2 1','none',fox?'#a64834':'#bf7567',.85);
 oval(c,-2,-2,1.7,.67,fox?'#ffa275':'#ffdcc2');c.restore();
}
function pelt(c:CanvasRenderingContext2D,id:CrewId){
 if(id==='fox'){
  ink(c,'M-20-11Q-29-16-36-17Q-46-19-51-10Q-48-3-37-2Q-26-1-16-5Z','#e25b3e','#8d3c31',1.4);
  ink(c,'M-50-11q6-8 15-5l-4 4 4 1-5 4 4 3q-9 1-14-7Z','#fee0b0');
  ink(c,'M-49-9q7 5 19 5','none','#bc4b39',1.15);
 }else{
  const x=id==='dad'?-36:-34;
  c.save();c.translate(x,-9);ink(c,'M0 1q-9-2-7-6 2-4 5-1 1 2-2 3','none','#a96352',2);c.restore();
 }
}
function legs(c:CanvasRenderingContext2D,id:CrewId){
 const o=crewOutfit[id],dad=id==='dad';
 c.save();if(dad)c.translate(-2,0);
 ink(c,'M-20-15q-6-2-11 2l-6 7 5 3 11-6 9-1Z',o.shade,o.hem);
 ink(c,'M-35-10q-4-2-7 2-3 5 3 7l7-3-1-6Z','#675143','#4b3933');
 ink(c,'M-17-12l-12 2-7 7 8 3 13-5 7-5Z',o.main,o.hem,1.3);
 ink(c,'M-28-5q-3-1-6 0-5 1-5 4l2 2h9l4-3-1-3Z','#886353','#54413a',1.25);
 ink(c,'M-36 0h7m-3-3 3-.5','none','#c29c78',.9);
 c.restore();
}
function coat(c:CanvasRenderingContext2D,id:Exclude<CrewId,'fish'>,bob:number){
 const o=crewOutfit[id],dad=id==='dad';
 c.save();c.translate(-4,bob);
 ink(c,dad?'M-26-11Q-28-3-16-1L5 0q11 0 15-7 2-8-6-13-12-7-28-2Z':'M-24-10Q-24-2-16-1L5 0q10-1 13-7 2-7-5-11-11-4-25-1Z',o.main,o.hem,1.45);
 ink(c,'M-24-8q9 4 20 3l18-4q0 7-11 9l-19-1q-8-1-8-7Z',o.shade);
 ink(c,'M-21-13q7-6 18-5m-15 9 11-2','none',o.light,1.9);
 ink(c,'M9-20l8 4-1 4-5 3-6-3 2-4-3-1Z',o.collar,o.hem,1.1);
 ink(c,'M9-12l4 1 3 4-4 2-5-4Z',o.accent,o.hem,.9);
 oval(c,-1,-11,1.32,1.1,o.collar,o.hem,.65);oval(c,-7,-10,1,1,o.collar,o.hem,.5);
 c.restore();
}
function sleeve(c:CanvasRenderingContext2D,id:Exclude<CrewId,'fish'>,far:boolean,lift:number,bob:number){
 const o=crewOutfit[id],x=far?26+lift*4:18+lift*10,y=-4-lift*15,root=far?10:0;
 c.save();c.lineJoin='round';
 stroke(c,o.hem,7.4,p=>{p.moveTo(root,-8+bob);p.quadraticCurveTo(x-9,y+1,x,y);});
 stroke(c,far?o.shade:o.main,5.2,p=>{p.moveTo(root,-8+bob);p.quadraticCurveTo(x-9,y+1,x,y);});
 stroke(c,o.collar,1.8,p=>{p.moveTo(x-4,y-2);p.lineTo(x-4,y+2);});
 paw(c,id,x,y,far?.08:-.12-lift*.43);c.restore();
}
function fishBody(c:CanvasRenderingContext2D,bob:number){
 c.save();c.translate(0,bob);
 ink(c,'M-23-9q-4-8-13-11-5 2-4 7l-6 2q-1 4 5 5l-2 3q4 7 9 4l12-5Z','#edaa47','#976733',1.45);
 ink(c,'M-38-15l9 5m-12-1 11 3m-9 3 10-2','none','#ffe099',1.08);
 ink(c,'M-31-10q4-9 16-11 13-2 28 3 6 7 1 13-11 6-24 5-13 0-21-10Z','#f2bd5a','#976733',1.45);
 ink(c,'M-29-8q7 2 18 3 11 1 25-2-6 8-25 7-12 0-18-8Z','#f9d88d');
 ink(c,'M-18-16q3 5 6 0m-7 4q3 5 6 1m3-4q3 5 6 .4','none','#dba24b',1.2);
 ink(c,'M-4-19l9-2 7 5 4 9-6 4-8-1-1-4-5 1-4-3 7-3Z','#74a99b','#426a62',1.25);
 ink(c,'M-4-19l7 2 4 5-3 2-3-1-6 4-3-3 7-3Z','#cce3bd','#426a62',.9);
 c.restore();
}
function floorTears(c:CanvasRenderingContext2D,id:CrewId,headX:number,headY:number,time:number,reduced:boolean){
 const eyes=id==='fish'?[-2,10]:[0,13];
 oval(c,headX+10,-.2,11,1.45,'#a9d4dba8');
 for(let i=0;i<eyes.length;i++){
  const x=headX+eyes[i],y=headY+2-i*.25,drop=reduced?.5:(time*2.5+i*.4)%1;
  oval(c,x,y,2.2,1.25,'#ccf0f4','#688e9d',.65);
  c.save();c.translate(x+drop*1.8,y+2+drop*(-y-4));c.globalAlpha=.9-drop*.45;
  ink(c,'M0-3.5Q3 0 2.2 2Q0 4-2 2Q-3 0 0-3.5Z','#addce9','#668c9e',.6);c.restore();
 }
}
function tapMarks(c:CanvasRenderingContext2D,x:number,age:number){
 if(age<.32||age>.48)return;
 c.save();c.translate(x,-2);c.globalAlpha=.65*(1-(age-.32)/.16);
 ink(c,'M-3-1l-4-2m2 4-5 1m16-2 5-3m-3 5 5 1','none','#dbbe92',1.4);
 c.restore();
}
export function paintDefeatedCrew(c:CanvasRenderingContext2D,id:CrewId,time:number,reduced:boolean,falling:boolean){
 const punches=id==='mimi'||id==='fox',cycle=id==='mimi'?.86:.73,t=(time/cycle)%1;
 const lift=(delay:number)=>punches&&!reduced&&!falling?pulse(t,delay):0;
 const sob=reduced?0:Math.sin(time*(punches?11:id==='dad'?5:8));
 const bob=sob*.62-lift(0)*.55-lift(.46)*.4;
 const headX=id==='fish'?12:9,headY=(id==='dad'?-17:-16)+bob;
 c.save();c.translate(0,18);c.lineJoin='round';c.lineCap='round';
 if(!falling)oval(c,-5,.7,38,3.5,'#3d4a3541');
 if(id==='fish')fishBody(c,bob);
 else{pelt(c,id);legs(c,id);coat(c,id,bob);sleeve(c,id,true,lift(.46),bob);}
 c.save();c.translate(headX,headY);c.rotate((id==='fox'?.22:id==='dad'?.30:.35)+sob*.026);
 const s=id==='dad'?.73:.74;c.scale(s,s);
 paintCrewFace(c,id,{look:.5,closed:true,upset:true,open:.42,ear:sob*.065,serious:false,cry:true,pant:null,stunned:false,rage:false,startled:false});
 c.restore();floorTears(c,id,headX,headY,time,reduced);
 if(id==='fish'){
  c.save();c.translate(2,-4);c.rotate(sob*.085);
  ink(c,'M-5-4q8-5 14-2l4 4-4 1 2 2-6 1-8-1Z','#eeb353','#a36e33',1.2);
  ink(c,'M0-3l7 1m-7 2 7 1','none','#ffe498',1);c.restore();
 }else sleeve(c,id,false,lift(0),bob);
 if(punches&&!reduced&&!falling){tapMarks(c,18,t);tapMarks(c,26,(t+.54)%1);}
 c.restore();
}
