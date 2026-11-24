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
type LandCrew=Exclude<CrewId,'fish'>;
function tail(c:CanvasRenderingContext2D,id:LandCrew,angle:number){
 c.save();c.translate(-15,-13);
 if(id==='fox'){
  c.scale(.80,.9);c.rotate(angle);
  ink(c,'M-1 3Q-9 3-16-2Q-23-7-24-15Q-23-20-17-18Q-12-17-9-12Q-6-7 3-3Z','#e25b3e','#8d3c31',1.4);
  ink(c,'M-24-15Q-23-20-17-18q4 1 6 4l-4-1 1 4-5-1 1 4q-5-2-6-7Z','#fee0b0');
  ink(c,'M-22-11q4 8 13 10','none','#bc4b39',1.15);
 }else ink(c,'M1 1q-9 0-9-5 0-3 3-3 3 .5 2 3','none','#a96352',1.5);
 c.restore();
}
function boot(c:CanvasRenderingContext2D,id:LandCrew,far:boolean){
 const o=fieldCloth[id];
 // Both soles point away, with the farther boot smaller and higher in frame.
 c.save();c.translate(far?-20:-25,far?-19:-13);c.rotate(.52);c.scale(far?.77:1,far?.77:1);
 ink(c,'M-4 0Q-4-4 0-5Q5-5 5 0L4 7H-4Z',far?'#665449':'#806953','#4b3c32',1.2);
 ink(c,'M-4-1l8 .5M-3 1l7 .5','none','#ae9173',.77);
 ink(c,'M-4 4Q0 2 4 3L4 8-3 8Z',far?o.shade:o.main,o.seam,.8);c.restore();
}
function coat(c:CanvasRenderingContext2D,id:LandCrew,bob:number){
 const o=fieldCloth[id];
 c.save();c.translate(id==='dad'?-1:0,bob*.58);
 // Wider at the shoulders, narrowing toward the receding waistband.
 ink(c,'M-25-14Q-22-18-16-18L-6-16Q-1-16 3-11L4-6Q2-1-4-1L-15-2Q-23-4-26-10Z',o.main,o.seam,1.35);
 ink(c,'M-25-11Q-17-6-7-7L4-7Q3-1-4-1L-15-2Q-22-4-25-11Z',o.shade);
 ink(c,'M-23-12Q-18-8-12-9','none',o.seam,.85);
 ink(c,'M-19-13l6 1 1 4-6-.5ZM-9-13l4-.7 3 3-5 2Z',o.trim,o.seam,.78);
 ink(c,'M-5-15l4 1-2 3-4-1Z',o.badge,o.seam,.62);
 oval(c,-9,-6,.85,.8,'#d7b47b',o.seam,.48);c.restore();
}
function sleeve(c:CanvasRenderingContext2D,id:LandCrew,far:boolean,lift:number,bob:number){
 const o=fieldCloth[id],x=far?23:13+lift*2,y=far?-6-lift*5:-3-lift*10;
 c.save();
 const arm=(p:CanvasRenderingContext2D)=>{p.moveTo(far?13:4,far?-11+bob:-5+bob);p.quadraticCurveTo(x-5,far?y+1:-2,x,y);};
 stroke(c,o.seam,6.2,arm);stroke(c,far?o.shade:o.main,4.1,arm);
 stroke(c,o.trim,1.1,p=>{p.moveTo(x-4,y-1.5);p.lineTo(x-4,y+1.5);});
 c.translate(x,y);c.scale(far?.75:.89,far?.75:.89);
 paw(c,id,0,0,far?.23:-.24-lift*.28);c.restore();
}
function floorTears(c:CanvasRenderingContext2D,id:CrewId,x:number,y:number,angle:number,scale:number,time:number,reduced:boolean,falling:boolean){
 const eyes=id==='fish'?[[-3,-.15],[16,-.65]]:[[-4,.2],[15,-.5]];
 const sin=Math.sin(angle)*scale,cos=Math.cos(angle)*scale;
 if(!falling)oval(c,x+4,-.2,9,1.25,'#a9d4dba8');
 for(let i=0;i<eyes.length;i++){
  const [ex,ey]=eyes[i],eyeX=x+ex*cos-ey*sin,eyeY=y+ex*sin+ey*cos;
  const drop=reduced?.5:(time*2.5+i*.4)%1;
  oval(c,eyeX,eyeY,1.7,1.05,'#ccf0f4','#688e9d',.55);
  c.save();c.translate(eyeX+drop*1.8,eyeY+2+drop*(falling?10:-eyeY-4));c.globalAlpha=.9-drop*.45;
  ink(c,'M0-3.5Q3 0 2.2 2Q0 4-2 2Q-3 0 0-3.5Z','#addce9','#668c9e',.6);c.restore();
 }
}
function tapMarks(c:CanvasRenderingContext2D,x:number,age:number){
 if(age<.32||age>.48)return;
 c.save();c.translate(x,-2);c.globalAlpha=.65*(1-(age-.32)/.16);
 ink(c,'M-3-1l-4-2m2 4-5 1m16-2 5-3m-3 5 5 1','none','#dbbe92',1.4);
 c.restore();
}
const poseLayout={
 mimi:{x:7,y:-16.5,angle:.27,head:.74},
 dad:{x:6,y:-17.2,angle:.24,head:.70},
 fox:{x:6,y:-15.7,angle:.23,head:.69},
 fish:{x:5,y:-15.95,angle:.20,head:.80},
} satisfies Record<CrewId,{x:number;y:number;angle:number;head:number}>;
export function paintDefeatedCrew(c:CanvasRenderingContext2D,id:CrewId,time:number,reduced:boolean,falling:boolean){
 const punches=id==='mimi'||id==='fox',cycle=id==='mimi'?.86:.73,t=(time/cycle)%1;
 const lift=(delay:number)=>punches&&!reduced&&!falling?pulse(t,delay):0;
 const sob=reduced?0:Math.sin(time*(punches?11:id==='dad'?5:8));
 const bob=sob*.62-lift(0)*.55-lift(.46)*.4;
 const p=poseLayout[id],headY=p.y+bob,headAngle=p.angle+sob*.029;
 c.save();c.translate(0,18);c.lineJoin='round';c.lineCap='round';
 if(id==='dad')c.scale(.94,1);
 if(!falling)oval(c,0,.4,26,2.5,'#3d4a3541');
 const flick=reduced?0:Math.sin(time*(id==='fox'?10:13));
 if(id!=='fish'){
  tail(c,id,.13+flick*.35);
  boot(c,id,true);boot(c,id,false);coat(c,id,bob);sleeve(c,id,true,lift(.46),bob);
 }
 c.save();c.translate(p.x,headY);c.rotate(headAngle);c.scale(p.head,p.head);
 paintCrewFace(c,id,{look:.5,closed:true,upset:true,open:.42,ear:sob*.065,serious:false,cry:true,pant:null,stunned:false,rage:false,startled:false},id==='fish'?{tailAngle:-.1+flick*.41}:undefined);
 c.restore();
 floorTears(c,id,p.x,headY,headAngle,p.head,time,reduced,falling);
 if(id!=='fish')sleeve(c,id,false,lift(0),bob);
 if(punches&&!reduced&&!falling){tapMarks(c,13,t);tapMarks(c,23,(t+.54)%1);}
 c.restore();
}
