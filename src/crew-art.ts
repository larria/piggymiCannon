import {reactionSeconds} from './crew-animation';
import type {breathingPose} from './feedback';
import type {Tank} from './engine';
import {dadPose,mimiPose,paintDad,paintMimi,type CrewAction,type Expression} from './pig-art';
import {profileEyes,goggles,ink,oval,pantMouth,smile,steadyMouth,stroke} from './crew-ink';
import type {CrewId} from './crew';

const wardrobe={mimi:{fabric:'#777b50',shade:'#555d42',light:'#a7a475',skin:'#f9bfaa',edge:'#805443'},dad:{fabric:'#6c7055',shade:'#505745',light:'#959370',skin:'#d2997e',edge:'#805443'},fox:{fabric:'#6f795e',shade:'#4e5849',light:'#a4a882',skin:'#e67850',edge:'#9a4c37'},fish:{fabric:'#8b8356',shade:'#635e44',light:'#bdb17f',skin:'#ffd06a',edge:'#ab702d'}} as const;
function foxFace(c:CanvasRenderingContext2D,e:Expression){
 for(const side of [-1,1]){c.save();c.translate(side*13,-8);c.scale(side*(side===1?.91:1.06),side===1?.72:.79);c.rotate(e.ear);
  ink(c,'M-12 2C-14-9-6-21 7-27Q12-30 16-25C25-19 25-8 20 3L12 8Z','#dc6243','#854431',1.65);
  ink(c,'M-7-1C-8-8 0-19 10-22Q13-24 16-19C20-14 20-8 17-3L10 2Z','#fbb79f');
  ink(c,'M16-25Q24-20 24-11Q22-15 19-17Z','#a54c39');c.restore();}
 ink(c,'M-22-4Q-18-19 1-18Q18-21 24-6L27 1 22 5 25 8Q19 19 4 20Q-13 21-23 12L-20 9-26 5Z','#e36b48','#854431',1.65);
 ink(c,'M-22 7Q-13 10-11 14Q4 22 23 8Q18 19 3 20Q-16 20-22 7Z','#c8543c');
 ink(c,'M-22 5Q-20-1-16-4Q-13-11-5-8Q1-7 4 0Q8-12 15-11Q23-9 23 0L26 6Q20 18 3 18Q-16 19-22 5Z','#ffe4ca');
 ink(c,'M-22-7Q-6-21 16-17L22-12Q5-16-21-4Z','#6e5343','#593d36',1);
 goggles(c,1,-17,-.12,.86);
 profileEyes(c,-6,1.3,5.7,'#445c9e',e.look,e.closed,e.serious,false,false,e.stunned);profileEyes(c,16,-.4,5.2,'#445c9e',e.look,e.closed,e.serious,true,false,e.stunned);
 if(e.rage)ink(c,'M-11-6L-1-3M13-4L19-8','none','#6b3a32',1.7);
 oval(c,-15,9,4.5,2.1,'#f7b19f');oval(c,19,7,4.1,2.1,'#f7b19f');
 oval(c,10,6,4.15,2.5,'#482f33');oval(c,9,5,1.65,.75,'#9e8184');if(e.pant!==null)pantMouth(c,10,12,e.pant);else if(e.serious)steadyMouth(c,10,11.5);else smile(c,10,11,e.open,e.upset);
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
 profileEyes(c,-4,-2,5.8,'#89532d',e.look,e.closed,e.serious,false,true,e.stunned);profileEyes(c,17,-2.5,4.8,'#89532d',e.look,e.closed,e.serious,true,true,e.stunned);
 if(e.rage)ink(c,'M-9-10L1-7M14-7L20-11','none','#795238',1.55);
 oval(c,-13,7,5,3.1,'#f3a08b');oval(c,20,6,4.4,2.9,'#f3a08b');
 if(e.pant!==null)pantMouth(c,12,11,e.pant);else if(e.serious)steadyMouth(c,12,10);else smile(c,12,10,e.open,e.upset);
 ink(c,'M4 5Q11 1 18 5Q14 9 8 8Z','#fff0c0');
}
function tail(c:CanvasRenderingContext2D,id:CrewId,phase:number){
 if(id!=='fox'&&id!=='fish')return;
 c.save();c.translate(-16,22);c.rotate(phase*(id==='fox'?.16:.26));
 if(id==='fox'){
  ink(c,'M7 6Q-10 9-20 0Q-30-9-22-23Q-19-14-8-11Q5-7 7 6Z','#e7764a','#854431',1.6);
  ink(c,'M-22-23Q-20-16-14-14L-17-10-15-6-21-8-22-4Q-29-12-22-23Z','#ffedcf');
  ink(c,'M-20 0Q-10 4 4 2','none','#f7ab79',1.4);
 }else{
  ink(c,'M6 4Q-20 2-21-15Q-16-20-9-11Q-8-17-3-15Q1-9 1-3Z','#efb44a','#99703d',1.5);
  ink(c,'M-17-13Q-11-4 2 2M-10-12Q-6-7 0-2M-4-12Q-3-8-1-5','none','#ffe192',1.2);
 }c.restore();
}
const faces={mimi:paintMimi,dad:paintDad,fox:foxFace,fish:fishFace};
const limits:Record<CrewId,number>={mimi:.93,dad:.96,fox:.92,fish:.93};
const rhythms:Record<CrewId,number>={mimi:1,dad:.68,fox:1.32,fish:1.15};
interface CrewMotion {breath?:ReturnType<typeof breathingPose>;stunned?:boolean;rage?:boolean;cryAge?:number|null;recoil?:number;idleAge?:number|null;reduced?:boolean;poisoned?:boolean;frozen?:boolean}
function arm(c:CanvasRenderingContext2D,id:CrewId,side:number,height:number,reach:number){
 const {shade,light,skin,edge}=wardrobe[id],x=side===1?11:-15,y=side===1?20:23,px=side*reach;
 stroke(c,'#524939',8.9,p=>{p.moveTo(x,y);p.quadraticCurveTo(side*(reach+3),y-1,px,height);});
 stroke(c,shade,7,p=>{p.moveTo(x,y);p.quadraticCurveTo(side*(reach+3),y-1,px,height);});
 stroke(c,light,1.1,p=>{p.moveTo(x+side*2,y-1);p.quadraticCurveTo(side*(reach+2),y-3,px+side*2,height);});
 if(id==='fish'){c.save();c.translate(px,height);c.rotate(side*.48);oval(c,0,-.65,4.5,6.7,skin,edge);ink(c,'M-2-3l2 5m1-5 1 4','none','#e09c41',.8);c.restore();}
 else {oval(c,px,height,5.4,4.75,skin,edge);stroke(c,edge,.78,p=>{p.moveTo(px-1.8,height-1.6);p.quadraticCurveTo(px+1,height+1,px+2.5,height-.2);});oval(c,px-1.5,height-1.6,1.9,.75,id==='fox'?'#f29161':'#ffe0c8');}
}
function jacket(c:CanvasRenderingContext2D,id:CrewId){
 const {fabric,light,shade}=wardrobe[id],wide=id==='dad'?1.25:1;c.save();c.scale(wide,1);
 ink(c,'M-20 32Q-18 18-10 16L11 16Q20 19 21 31Q16 37 2 37Q-15 37-20 32Z',fabric,'#514936',1.6);
 ink(c,'M-19 31Q-7 30 5 31Q12 31 21 28L20 33Q7 40-17 34Z',shade);
 ink(c,'M-12 17l-2 5 10 12 4-3-8-12ZM12 17l3 4-5 13-4-1 5-14Z','#8d674a','#55463a',.8);
 ink(c,'M-17 19l6-5 11 7-6 6ZM5 21l9-6 5 5-8 8Z',light,'#5a533e',1.05);
 ink(c,'M-11 27l6-2 2 5-6 2ZM10 25l5 2-2 5-5-2Z','#d0a469','#624b36',.8);
 if(id==='fox')ink(c,'M-12 14Q0 20 14 13L13 18 5 22-3 20-14 21Z','#d68c60','#a65c46',1.1);
 if(id==='fish')goggles(c,2,26,-.12,.47);
 else oval(c,3,31,1.7,1.8,'#e6bd7a','#725739',.6);
 c.restore();
}
function reactionMarks(c:CanvasRenderingContext2D,t:number,action:CrewAction,m:CrewMotion){
 const crying=action==='cry'||action==='hurt'||action==='lose'||m.cryAge!=null;
 if(crying){
  // The first bead is already at the eye. The streams begin on the hit frame.
  for(const [x,y,scale] of [[0,2,1],[17,0,.72]]){c.save();c.translate(x,y);c.scale(scale,scale);
   oval(c,0,0,2.25,1.4,'#c6eff6','#57889c',.55);
   for(let i=0;i<2;i++){const p=m.reduced?i*.45+.25:((m.cryAge??t)*2.3+i*.5)%1;
    c.save();c.translate(p*3,3+p*20);c.globalAlpha=1-p*.72;ink(c,'M0-4Q4 0 2 3Q0 5-2 2Q-4 0 0-4Z','#9ed9eb','#5189a2',.68);c.restore();}
   c.restore();}
 }
 if(m.stunned){for(let i=0;i<3;i++){const angle=(m.reduced?0:t*4)+i*2.094;c.save();c.translate(Math.cos(angle)*23,-31+Math.sin(angle)*4);ink(c,'M0-4L1-1 4 0 1 1 0 4-1 1-4 0-1-1Z','#ffd676','#aa7947',.7);c.restore();}}
 if(m.breath?.active&&action==='idle'&&m.cryAge==null){
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
export function paintCrewFigure(c:CanvasRenderingContext2D,id:CrewId,time:number,action:CrewAction,m:CrewMotion={}){
 const t=m.reduced?.35:time,phase=t+(['mimi','dad','fox','fish'] as const).indexOf(id)*.35;
 const p=Math.sin(phase*(action==='move'?12:action==='win'?7:action==='hurt'?19:4)*rhythms[id]);
 const pose=id==='mimi'?mimiPose(phase,action):id==='dad'?dadPose(phase,action):{bob:action==='win'?-Math.abs(p)*(id==='fox'?8:6):action==='move'?p*1.5:p*.65,lean:action==='move'?.06:action==='hurt'?p*.085:action==='win'?p*.08:0,p};
 const parachute=action==='parachute';
 const recoil=action==='fire'?m.recoil??.7:0,lose=action==='lose',cry=action==='cry',fall=cry,hurt=action==='hurt',win=action==='win';
 const u=action==='idle'&&!m.reduced?m.idleAge??-1:-1;
 const swell=(from:number,to:number)=>u>from&&u<to?Math.sin((u-from)/(to-from)*Math.PI):0;
 // Mimi checks her goggles twice, Dad settles his collar, Fox listens, and Fish fans her fins.
 const tap=id==='mimi'?swell(.10,.95)+swell(1.06,1.9):0;
 const collar=id==='dad'?swell(.12,2.4)**.8:0;
 const listen=id==='fox'?swell(.2,2.5):0;
 const fin=id==='fish'?swell(.05,2.55)*(.62+.38*Math.sin(u*11)):0;
 const ambient=action==='idle',crying=cry||hurt||m.cryAge!=null;
 const pant=ambient&&!crying&&m.breath?.active?m.breath:null;
 const air=pant?(m.reduced?.59:(pant.mouth-3)/4.4):(ambient&&!crying&&m.poisoned?.34+.17*p:null);
 const blink=phase%4.8>4.62,serious=!lose&&!fall&&!hurt&&!win&&!(ambient&&crying);
 const expr={look:listen?.7-listen*2.1:action==='fire'||action==='move'?.95:.72+.14*p,closed:lose||cry||hurt||win&&id==='dad'||!m.reduced&&action==='idle'&&blink,upset:lose||crying,open:fall?.82:win?1:.2,ear:p*(fall?.2:action==='move'?.14:.045)+(listen?Math.sin(u*12)*listen*.25:fin*.19)-recoil*.1,serious,cry:crying,pant:air,stunned:!!m.stunned,rage:!!m.rage&&!crying};
 c.save();c.lineJoin='round';c.lineCap='round';
 if(lose){c.translate(5,-3);c.rotate(Math.PI/2-.10);c.scale(.72,.72);}
 else {
  const tremble=m.frozen&&!m.reduced&&ambient?Math.sin(phase*42)*.75:0;
  const breathBob=pant&&!m.reduced?pant.bob*.72:0,breathStretch=pant&&!m.reduced?pant.scale:1;
  c.translate(-9-recoil*3+(m.poisoned?p:0)+tremble,-24+(fall?-1:pose.bob)+recoil*2-collar*2-fin*2-breathBob);
  c.rotate(pose.lean-recoil*.17+(fall?p*.1:0)-collar*.04+(pant&&!m.reduced?pant.lean*.65:0));
  const s=limits[id];c.scale(s,s*breathStretch);
 }
 tail(c,id,p+listen*1.35+fin*2.4);
 const rearHeight=parachute?5+p:fall?1:win?id==='dad'?7:-13-p*3:hurt?7:lose?22:action==='move'?15+p*3:22-collar*14-fin*25;
 const leadHeight=parachute?6-p:fall?-1:win?id==='dad'?-7:-12+p*3:hurt?11:lose?25:action==='fire'?12+recoil*3:action==='move'?17-p*3:20-tap*36-collar*10-fin*15-(pant?5:0);
 const raised=win||fall||hurt||parachute||collar>.12||fin>.45;
 const rearReach=(id==='fox'?25:24)+(id==='dad'?2:0)+fin*5+(parachute?4:0);
 if(!raised)arm(c,id,-1,rearHeight,rearReach);jacket(c,id);
 c.save();c.translate(-listen*1.8,id==='dad'?1:0);c.rotate(-listen*.19-tap*.085+(id==='fish'?.06-fin*.13:0));faces[id](c,expr);if(!lose)reactionMarks(c,phase,action,m);c.restore();
 if(raised)arm(c,id,-1,rearHeight,rearReach);
 arm(c,id,1,leadHeight,parachute?26:win||fall?23:20-tap*5+collar*2+fin*5);
 if(lose)reactionMarks(c,phase,action,m);c.restore();
}

export function paintCrew(c:CanvasRenderingContext2D,t:Tank,time:number,state:CrewAction,breath?:ReturnType<typeof breathingPose>,recoil=0,reduced=false,idleAge:number|null=null,cryAge:number|null=null,rage=false){
 const reactionAge=t.reaction?reactionSeconds(t.reaction.kind)-t.reaction.remaining:time;
 paintCrewFigure(c,t.crew,state==='hurt'?Math.max(0,reactionAge):time,state,{breath,cryAge,recoil,reduced,idleAge,rage,stunned:state==='hurt'&&t.reaction?.kind==='fall',poisoned:!!t.poisoned,frozen:!!(t.immobile||t.frozen)});
}
