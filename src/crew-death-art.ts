import type {CrewId} from './crew';
import {paintCrewFace} from './crew-art';
import {ink,oval,stroke} from './crew-ink';

// All four poses are drawn against the same ground line, y=0. The complete
// illustration follows the engine's defeat pose when the support caves in.
// Field uniforms use flat olive and khaki cloth with stitched flaps and rank tabs.
const fieldCloth={
 mimi:{main:'#7b8059',shade:'#535b42',seam:'#474b37',trim:'#aaa57a',badge:'#bf7854'},
 dad:{main:'#777a5e',shade:'#565b46',seam:'#484d3c',trim:'#a09b7a',badge:'#d2a368'},
 fox:{main:'#788468',shade:'#525f4d',seam:'#43513f',trim:'#a8ab83',badge:'#c99a62'},
 fish:{main:'#958962',shade:'#685f46',seam:'#61543b',trim:'#c3b38b',badge:'#be8d50'},
};
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
function pelt(c:CanvasRenderingContext2D,id:CrewId,tailAngle:number){
 if(id==='fox'){
  c.save();c.translate(-19,-7);c.rotate(tailAngle);c.translate(19,7);
  ink(c,'M-20-11Q-29-16-36-17Q-46-19-51-10Q-48-3-37-2Q-26-1-16-5Z','#e25b3e','#8d3c31',1.4);
  ink(c,'M-50-11q6-8 15-5l-4 4 4 1-5 4 4 3q-9 1-14-7Z','#fee0b0');
  ink(c,'M-49-9q7 5 19 5','none','#bc4b39',1.15);c.restore();
 }else{
  const x=id==='dad'?-36:-34;
  c.save();c.translate(x,-9);ink(c,'M0 1q-9-2-7-6 2-4 5-1 1 2-2 3','none','#a96352',2);c.restore();
 }
}
function legs(c:CanvasRenderingContext2D,id:CrewId){
 const o=fieldCloth[id],dad=id==='dad';
 c.save();if(dad)c.translate(-2,0);
 ink(c,'M-20-15q-6-2-11 2l-6 7 5 3 11-6 9-1Z',o.shade,o.seam);
 ink(c,'M-35-10q-4-2-7 2-3 5 3 7l7-3-1-6Z','#675143','#4b3933');
 ink(c,'M-17-12l-12 2-7 7 8 3 13-5 7-5Z',o.main,o.seam,1.3);
 ink(c,'M-28-5q-3-1-6 0-5 1-5 4l2 2h9l4-3-1-3Z','#886353','#54413a',1.25);
 ink(c,'M-36 0h7m-3-3 3-.5M-22-8l-6 3','none',o.trim,.8);
 c.restore();
}
function coat(c:CanvasRenderingContext2D,id:Exclude<CrewId,'fish'>,bob:number){
 const o=fieldCloth[id],dad=id==='dad';
 c.save();c.translate(-4,bob);
 ink(c,dad?'M-26-11Q-28-3-16-1L5 0q11 0 15-7 2-8-6-13-12-7-28-2Z':'M-24-10Q-24-2-16-1L5 0q10-1 13-7 2-7-5-11-11-4-25-1Z',o.main,o.seam,1.45);
 ink(c,'M-24-8q9 4 20 3l18-4q0 7-11 9l-19-1q-8-1-8-7Z',o.shade);
 // Buttoned placket, envelope pocket and two square shoulder tabs.
 ink(c,'M-24-8Q-10-9 8-7M-24-5l5 1','none',o.seam,.95);
 ink(c,'M-17-15l10 1 1 6-9 1Z',o.main,o.seam,.85);
 ink(c,'M-18-15l11 1 1 2-6 2-5-2Z',o.trim,o.seam,.75);
 ink(c,'M-2-16l7-2 2 3-6 3Z',o.trim,o.seam,.85);
 ink(c,'M0-15l4-1','none',o.badge,1.2);
 ink(c,'M9-20l8 4-1 4-5 3-6-3 2-4-3-1Z',o.trim,o.seam,1.05);
 ink(c,'M9-12l4 1 3 4-4 2-5-4Z',o.badge,o.seam,.9);
 oval(c,-2,-8.5,1.02,.89,'#d7b47b',o.seam,.52);oval(c,-12,-11.6,.81,.73,'#ddbb83',o.seam,.48);
 c.restore();
}
function sleeve(c:CanvasRenderingContext2D,id:Exclude<CrewId,'fish'>,far:boolean,lift:number,bob:number){
 const o=fieldCloth[id],x=far?26+lift*4:18+lift*10,y=-4-lift*15,root=far?10:0;
 c.save();c.lineJoin='round';
 stroke(c,o.seam,7.4,p=>{p.moveTo(root,-8+bob);p.quadraticCurveTo(x-9,y+1,x,y);});
 stroke(c,far?o.shade:o.main,5.2,p=>{p.moveTo(root,-8+bob);p.quadraticCurveTo(x-9,y+1,x,y);});
 stroke(c,o.trim,1.45,p=>{p.moveTo(x-4,y-2);p.lineTo(x-4,y+2);});
 paw(c,id,x,y,far?.08:-.12-lift*.43);c.restore();
}
function fishCollar(c:CanvasRenderingContext2D,bob:number){
 const o=fieldCloth.fish;
 c.save();c.translate(5,bob);
 ink(c,'M-8-6q11 3 24-2l1 4-5 3-7-1-4-1-7 1Z',o.main,o.seam,1);
 ink(c,'M-5-5l7 1 4 3-2 2-7-3Zm10 1 9-2-3 4-4 1Z',o.trim,o.seam,.7);
 oval(c,6,-1.3,.94,.88,o.badge,o.seam,.55);c.restore();
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
 const flick=reduced?0:Math.sin(time*(id==='fox'?10:13));
 if(!falling)oval(c,id==='fish'?6:-5,.7,id==='fish'?28:38,3.5,'#3d4a3541');
 if(id!=='fish'){pelt(c,id,.24+flick*.30);legs(c,id);coat(c,id,bob);sleeve(c,id,true,lift(.46),bob);}
 c.save();c.translate(headX,headY);c.rotate((id==='fox'?.22:id==='dad'?.30:.35)+sob*.026);
 const s=id==='dad'?.73:.74;c.scale(s,s);
 paintCrewFace(c,id,{look:.5,closed:true,upset:true,open:.42,ear:sob*.065,serious:false,cry:true,pant:null,stunned:false,rage:false,startled:false},.15+flick*.39);
 c.restore();
 if(id==='fish'){
  fishCollar(c,bob);
  c.save();c.translate(2,-4);c.rotate(sob*.085);
  ink(c,'M-5-4q8-5 14-2l4 4-4 1 2 2-6 1-8-1Z','#eeb353','#a36e33',1.2);
  ink(c,'M0-3l7 1m-7 2 7 1','none','#ffe498',1);c.restore();
 }else sleeve(c,id,false,lift(0),bob);
 floorTears(c,id,headX,headY,time,reduced);
 if(punches&&!reduced&&!falling){tapMarks(c,18,t);tapMarks(c,26,(t+.54)%1);}
 c.restore();
}
