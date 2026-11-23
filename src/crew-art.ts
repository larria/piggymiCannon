import {reactionSeconds} from './crew-animation';
import type {breathingPose} from './feedback';
import type {Tank} from './engine';
import {dadPose,mimiPose,paintDad,paintMimi,type CrewAction,type Expression} from './pig-art';
import {profileEyes,goggles,ink,oval,pantMouth,shockMouth,smile,steadyMouth,stroke} from './crew-ink';
import type {CrewId} from './crew';

function foxFace(c:CanvasRenderingContext2D,e:Expression){
 // Keep the same ear shapes; draw them closer to the crown with a calmer tilt.
 for(const side of [-1,1]){c.save();c.translate(side*(side===1?9:10),-8);c.scale(side*(side===1?.94:1.03),side===1?.76:.86);c.rotate(-.22+e.ear*.75);
  ink(c,'M-13 3C-11-10 1-25 20-29Q26-31 28-27C32-17 27-4 19 4Q13 11 4 10Z','#e83524','#862f28',1.65);
  ink(c,'M-6 0C-2-11 8-20 20-23Q23-24 23-20C24-11 19-2 13 3Q3 7-6 0Z','#ffcf99');
  ink(c,'M11-25Q20-29 25-28Q28-26 28-22Q26-26 22-26Z','#ff6747');
  ink(c,'M-4 0Q3-10 13-14Q7-8 4 5Z','#efa383');c.restore();}
 ink(c,'M-22-4Q-18-19 1-18Q18-21 24-6L27 1 22 5 25 8Q19 19 4 20Q-13 21-23 12L-20 9-26 5Z','#e93c28','#862f28',1.65);
 ink(c,'M-22 7Q-13 10-11 14Q4 22 23 8Q18 19 3 20Q-16 20-22 7Z','#c92d23');
 ink(c,'M-22 5Q-20-1-16-4Q-13-11-5-8Q1-7 4 0Q8-12 15-11Q23-9 23 0L26 6Q20 18 3 18Q-16 19-22 5Z','#ffdfb5');
 ink(c,'M-22-7Q-6-21 16-17L22-12Q5-16-21-4Z','#6e5343','#593d36',1);
 goggles(c,1,-17,-.12,.86);
 profileEyes(c,-6,1.3,5.7*(e.startled?1.16:1),'#445c9e',e.look,e.closed,e.serious,false,false,e.stunned);profileEyes(c,16,-.4,5.2*(e.startled?1.16:1),'#445c9e',e.look,e.closed,e.serious,true,false,e.stunned);
 if(e.rage)ink(c,'M-11-6L-1-3M13-4L19-8','none','#6b3a32',1.7);
 oval(c,-15,9,4.5,2.1,'#f7b19f');oval(c,19,7,4.1,2.1,'#f7b19f');
 oval(c,10,6,4.15,2.5,'#482f33');oval(c,9,5,1.65,.75,'#9e8184');if(e.startled)shockMouth(c,10,12);else if(e.pant!==null)pantMouth(c,10,12,e.pant);else if(e.serious)steadyMouth(c,10,11.5);else smile(c,10,11,e.open,e.upset);
}
function fishFace(c:CanvasRenderingContext2D,e:Expression){
 c.save();c.translate(0,-13);c.rotate(e.ear*.8);
 ink(c,'M-13 5Q-17-5-11-14Q-6-16-2-9Q1-17 5-16Q10-12 10-6Q17-11 20-6L17 6Z','#f8bf55','#a66d30');
 ink(c,'M-10-10l4 8M4-13l1 9M16-6l-3 5','none','#ffe093',1.45);c.restore();
 c.save();c.translate(-17,1);c.rotate(e.ear);
 ink(c,'M1-5Q-17-15-20-6Q-21 0-16 3Q-21 8-14 12Q-8 14 1 7Z','#efaf50','#a66d30');
 ink(c,'M-15-6l11 5m-13 5 13-1m-9 6 9-4','none','#ffe093',1.1);c.restore();
 ink(c,'M-20-3Q-18-18 3-17Q20-18 25-4Q31 8 19 16Q7 23-9 17Q-24 12-20-3Z','#ffce64','#9e6d32',1.65);
 ink(c,'M-20 4Q-17-5-7-2Q1 0 7-2Q19-6 25 2Q29 13 16 17Q5 23-9 16Q-21 14-20 4Z','#ffe5ad');
 ink(c,'M-17 11Q-6 17 9 17Q17 17 23 11Q15 22 1 20Q-13 18-17 11Z','#f4c47d');
 ink(c,'M-15-7Q-8-14 1-13M-13-11l2-1','none','#ffe495',1.5);
 profileEyes(c,-4,-2,5.8*(e.startled?1.16:1),'#89532d',e.look,e.closed,e.serious,false,true,e.stunned);profileEyes(c,17,-2.5,4.8*(e.startled?1.16:1),'#89532d',e.look,e.closed,e.serious,true,true,e.stunned);
 if(e.rage)ink(c,'M-9-10L1-7M14-7L20-11','none','#795238',1.55);
 oval(c,-13,7,5,3.1,'#f3a08b');oval(c,20,6,4.4,2.9,'#f3a08b');
 if(e.startled)shockMouth(c,12,11);else if(e.pant!==null)pantMouth(c,12,11,e.pant);else if(e.serious)steadyMouth(c,12,10);else smile(c,12,10,e.open,e.upset);
 ink(c,'M4 5Q11 1 18 5Q14 9 8 8Z','#fff0c0');
}
const faces={mimi:paintMimi,dad:paintDad,fox:foxFace,fish:fishFace};
const limits:Record<CrewId,number>={mimi:.77,dad:.80,fox:.76,fish:.77};
const rhythms:Record<CrewId,number>={mimi:1,dad:.68,fox:1.32,fish:1.15};
interface CrewMotion {breath?:ReturnType<typeof breathingPose>;stunned?:boolean;rage?:boolean;cryAge?:number|null;healAge?:number|null;cheerAge?:number|null;shockAge?:number|null;recoil?:number;idleAge?:number|null;reduced?:boolean;poisoned?:boolean;frozen?:boolean;deck?:number}
function reactionMarks(c:CanvasRenderingContext2D,t:number,action:CrewAction,m:CrewMotion,healAge:number|null,cheerAge:number|null,shockAge:number|null){
 const crying=action==='hurt'||action==='lose'||m.cryAge!=null;
 if(crying){
  // The first bead is already at the eye. The streams begin on the hit frame.
  for(const [x,y,scale] of [[0,2,1],[17,0,.72]]){c.save();c.translate(x,y);c.scale(scale,scale);
   oval(c,0,0,2.25,1.4,'#c6eff6','#57889c',.55);
   for(let i=0;i<2;i++){const p=m.reduced?i*.45+.25:((m.cryAge??t)*2.3+i*.5)%1;
    c.save();c.translate(p*3,3+p*20);c.globalAlpha=1-p*.72;ink(c,'M0-4Q4 0 2 3Q0 5-2 2Q-4 0 0-4Z','#9ed9eb','#5189a2',.68);c.restore();}
   c.restore();}
 }
 if(m.stunned){for(let i=0;i<3;i++){const angle=(m.reduced?0:t*4)+i*2.094;c.save();c.translate(Math.cos(angle)*23,-31+Math.sin(angle)*4);ink(c,'M0-4L1-1 4 0 1 1 0 4-1 1-4 0-1-1Z','#ffd676','#aa7947',.7);c.restore();}}
 if(healAge!==null&&!m.reduced)for(const [x,y,delay] of [[-26,-8,0],[27,-16,.15],[22,5,.32]]){
  const p=(healAge-delay)/.85;if(p<=0||p>=1)continue;
  c.save();c.translate(x,y-p*15);c.globalAlpha=Math.sin(p*Math.PI);
  ink(c,'M0-4Q.7-.7 4 0Q.7.7 0 4Q-.7.7-4 0Q-.7-.7 0-4Z','#e8f2ca','#648854',.7);c.restore();
 }
 if(cheerAge!==null&&!m.reduced&&cheerAge<.78){
  const p=cheerAge/.78;c.save();c.translate(26+p*7,-19-p*7);c.globalAlpha=Math.sin(p*Math.PI);
  stroke(c,'#a7764e',2.5,d=>{d.moveTo(0,-4);d.lineTo(4,-9);d.moveTo(4,1);d.lineTo(11,-1);d.moveTo(4,6);d.lineTo(9,8);});
  stroke(c,'#ffe4a3',1.4,d=>{d.moveTo(0,-4);d.lineTo(4,-9);d.moveTo(4,1);d.lineTo(11,-1);d.moveTo(4,6);d.lineTo(9,8);});c.restore();
 }
 if(shockAge!==null&&!m.reduced&&shockAge<.58){
  const p=shockAge/.58;c.save();c.translate(-24,-19-p*7);c.globalAlpha=Math.sin(p*Math.PI);
  stroke(c,'#786450',1.55,d=>{d.moveTo(-2,-4);d.quadraticCurveTo(-6,-5,-9,-9);d.moveTo(-5,1);d.lineTo(-13,-1);});c.restore();
 }
 if(m.breath?.active&&action==='idle'&&m.cryAge==null&&healAge===null&&cheerAge===null&&shockAge===null){
  const pulse=m.reduced?.3:m.breath.puff;
  if(pulse<.64){const p=pulse/.64;
   c.save();c.translate(17+p*18,14-p*5);c.scale(.62+p*.66,.62+p*.66);c.globalAlpha=.87*(1-p);
   ink(c,'M-5 2Q-8-1-4-3Q-2-7 2-5Q8-6 8-1Q11 3 4 4Q0 6-5 2Z','#fff5da','#978265',1.1);
   oval(c,-7-p*2,2,1.15,1.1,'#fff6df','#978265',.64);c.restore();
  }
 }
 if(m.frozen){
  const glint=m.reduced?.72:.62+Math.sin(t*7)*.25;
  c.save();c.globalAlpha=glint;ink(c,'M-28 22l3-11 7 9M19 20l7-12 4 8M-23 13l4-2M25 12l-5-2','none','#a8d2e0',1.6);c.restore();
 }

}
/** Head, limbs and clothing share a root so the pilot stays attached to its seat. */
// Above the hatch, only the celebratory gesture is visible.
function cheerGesture(c:CanvasRenderingContext2D,id:CrewId,side:number,raise:number){
 c.save();c.translate(side*(id==='dad'?32:28),20-9*raise);c.scale(side,1);c.rotate(-.16-.26*raise);
 if(id==='fish'){
  ink(c,'M-4 4Q-4-1 2-5Q7-7 9-4L8-1Q11 0 8 3Q3 7-4 4Z','#f3bd52','#9b6630',1.2);
  ink(c,'M-1 3L6-2M1 4L7 1','none','#ffe29c',.9);
 }else{
  const fox=id==='fox';
  ink(c,'M-4 4Q-6 2-4-1Q-3-5 1-5Q6-5 6-1Q7 4 3 6H-1Z',fox?'#e86b46':'#f7bda6',fox?'#933629':'#884f42',1.15);
  ink(c,'M-2-2Q1-3 3-1M0 0Q3-1 4 1','none',fox?'#ac4b34':'#bd7866',.8);
  oval(c,-1,-2,1.8,.75,fox?'#ffa478':'#ffe0c7');
 }
 c.restore();
}

export function paintCrewFigure(c:CanvasRenderingContext2D,id:CrewId,time:number,action:CrewAction,m:CrewMotion={}){
 const t=m.reduced?.35:time,phase=t+(['mimi','dad','fox','fish'] as const).indexOf(id)*.35;
 const p=Math.sin(phase*(action==='move'?12:action==='win'?7:action==='hurt'?19:4)*rhythms[id]);
 const pose=id==='mimi'?mimiPose(phase,action):id==='dad'?dadPose(phase,action):{bob:action==='win'?-Math.abs(p)*(id==='fox'?8:6):action==='move'?p*1.5:p*.65,lean:action==='move'?.06:action==='hurt'?p*.085:action==='win'?p*.08:0,p};
 const recoil=action==='fire'?m.recoil??.7:0,lose=action==='lose',fall=action==='fall',hurt=action==='hurt',win=action==='win';
 const crying=hurt||m.cryAge!=null,shockAge=!crying&&!lose&&!win?m.shockAge??null:null;
 const startled=shockAge!==null,startle=startled&&!m.reduced?Math.sin(Math.PI*Math.min(1,shockAge/.55))**.65:0;
 const healAge=!crying&&!lose&&!win&&!startled?m.healAge??null:null;
 const cheerAge=!crying&&!lose&&!win&&!startled&&healAge===null?m.cheerAge??null:null;
 const happy=healAge!==null||cheerAge!==null,relief=healAge!==null&&!m.reduced&&action==='idle'?Math.sin(Math.PI*Math.min(1,healAge/.65)):0;
 const salute=cheerAge!==null&&!m.reduced&&action==='idle'?Math.sin(Math.PI*Math.min(1,cheerAge/.88))**.75:0;
 const u=action==='idle'&&!m.reduced&&!happy&&!startled?m.idleAge??-1:-1;
 const swell=(from:number,to:number)=>u>from&&u<to?Math.sin((u-from)/(to-from)*Math.PI):0;
 // Mimi checks her goggles twice, Dad nods, Fox listens, and Fish fans her head fins.
 const tap=id==='mimi'?swell(.10,.95)+swell(1.06,1.9):0;
 const nod=id==='dad'?swell(.12,2.4)**.8:0;
 const listen=id==='fox'?swell(.2,2.5):0;
 const fin=id==='fish'?swell(.05,2.55)*(.62+.38*Math.sin(u*11)):0;
 const ambient=action==='idle';
 const pant=ambient&&!crying&&!happy&&!startled&&m.breath?.active?m.breath:null;
 const air=pant?(m.reduced?.59:(pant.mouth-3)/4.4):(ambient&&!crying&&!happy&&!startled&&m.poisoned?.34+.17*p:null);
 const blink=phase%4.8>4.62,serious=!lose&&!crying&&!win&&!happy&&!startled;
 const expr={look:listen?.7-listen*2.1:action==='fire'||action==='move'?.95:.72+.14*p,closed:lose||hurt||fall&&crying||win&&id==='dad'||relief>.7||!m.reduced&&action==='idle'&&!startled&&blink,upset:lose||crying,open:fall&&crying?.82:win?1:happy?.48+relief*.17+(cheerAge===null?0:.24):.2,ear:p*(fall?.2:action==='move'?.14:.045)+(listen?Math.sin(u*12)*listen*.25:fin*.19)-recoil*.1,serious,cry:crying,pant:air,stunned:!!m.stunned,startled,rage:!!m.rage&&!crying&&!happy&&!startled};
 c.save();c.lineJoin='round';c.lineCap='round';
 if(lose){c.translate(0,2);c.rotate(Math.PI/2-.10);c.scale(.7,.7);}
 else {
  const tremble=m.frozen&&!m.reduced&&ambient?Math.sin(phase*42)*.75:0;
  const breathBob=pant&&!m.reduced?pant.bob*.72:0,breathStretch=pant&&!m.reduced?pant.scale:1;
  c.translate(-16-recoil*2-startle*2+(m.poisoned?p:0)+tremble,(m.deck??-32)+(fall?-1:pose.bob)+recoil*2-nod*2-fin*2-breathBob-relief*4-salute*5+startle*2);
  c.rotate(pose.lean-recoil*.17-salute*.095-startle*.15+(fall?p*.1:0)-nod*.04+(pant&&!m.reduced?pant.lean*.65:0));
  const s=limits[id];c.scale(s,s*breathStretch);
 }
 if(win||cheerAge!==null){
  const lift=win?(m.reduced?.7:.63+.3*p):m.reduced?.72:salute;
  if(win||lift>.16){cheerGesture(c,id,-1,lift*.78);cheerGesture(c,id,1,lift);}
 }
 c.save();c.translate(-listen*1.8,id==='dad'?1:0);
 c.rotate(-listen*.19-tap*.085+nod*.105+(id==='fish'?.06-fin*.13:0));
 faces[id](c,expr);if(!lose)reactionMarks(c,phase,action,m,healAge,cheerAge,shockAge);c.restore();
 if(lose)reactionMarks(c,phase,action,m,healAge,cheerAge,shockAge);c.restore();
}

export function paintCrew(c:CanvasRenderingContext2D,t:Tank,time:number,state:CrewAction,breath?:ReturnType<typeof breathingPose>,recoil=0,reduced=false,idleAge:number|null=null,cryAge:number|null=null,rage=false,healAge:number|null=null,cheerAge:number|null=null,shockAge:number|null=null){
 const reactionAge=t.reaction?reactionSeconds(t.reaction.kind)-t.reaction.remaining:time;
 paintCrewFigure(c,t.crew,state==='hurt'?Math.max(0,reactionAge):time,state,{breath,cryAge,healAge,cheerAge,shockAge,recoil,reduced,idleAge,rage,stunned:state==='hurt'&&t.reaction?.kind==='fall',poisoned:!!t.poisoned,deck:t.vehicleId==='sea'?-40:t.vehicleId==='water'?-28:-32,frozen:!!(t.immobile||t.frozen)});
}
