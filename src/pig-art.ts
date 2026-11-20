import {profileEyes,goggles,ink,oval,pantMouth,smile,steadyMouth,stroke} from './crew-ink';
export type CrewAction='idle'|'move'|'fire'|'hurt'|'win'|'lose'|'parachute'|'cry';
export function mimiPose(time:number,state:CrewAction){const p=Math.sin(time*(state==='win'?9:state==='move'?15:state==='hurt'?21:5));return {bob:state==='win'?-Math.abs(p)*9:state==='hurt'?p*1.4:state==='move'?p*1.7:p*.65,lean:state==='win'?p*.11:state==='hurt'?p*.095:state==='move'?.07:0,p};}
export function dadPose(time:number,state:CrewAction){const p=Math.sin(time*(state==='win'?5:state==='move'?10:state==='hurt'?14:3.3));return {bob:state==='win'?-Math.max(0,p)*5:state==='hurt'?p*.8:state==='move'?Math.abs(p)*1.15:p*.42,lean:state==='win'?p*.05:state==='hurt'?-p*.075:state==='move'?.04:0,p};}
export interface Expression {look:number;closed:boolean;upset:boolean;open:number;ear:number;serious:boolean;cry:boolean;pant:number|null;stunned:boolean;rage:boolean}
const outline='#794f40';
function cap(c:CanvasRenderingContext2D,dad:boolean){
 ink(c,'M-22 3Q-25-12-17-21Q-11-31 3-29Q21-29 24-12Q27 0 21 9L17 7 19-8Q7-18-16-7L-17 7Z',dad?'#62634a':'#6f744a','#534535');
 ink(c,'M-21-6Q-20-22-7-26Q9-31 19-19Q8-24-5-19Q-13-16-21-6Z',dad?'#858467':'#a09b66');
 ink(c,'M-22 0Q-20-15 0-17Q18-19 24-8L23-4Q14-13 0-12Q-15-10-22 3Z','#8c8053','#514a36');
 ink(c,'M-19-3Q-9-14 6-14Q16-14 22-7','none','#c2a87c',1.15);
 ink(c,'M-21-1l4 1-1 12-4 2-2-2ZM21-2l3 1-1 10-3 3-2-1Z','#786049','#503f34',1);
 ink(c,'M-23 4l5-1-1 4-4 1Z','#cfaa6c','#836044',.65);
 goggles(c,1,-21,dad?.04:.15,dad?.98:.93);
}
function pigFace(c:CanvasRenderingContext2D,e:Expression,dad:boolean){
 const peach=dad?'#bd7e66':'#f5b2a1',pale=dad?'#d99c7f':'#ffd0b6';
 // The far features tuck behind the head; the nose and gaze lead the turn.
 c.save();if(dad)c.scale(1.15,1.06);
 c.save();c.translate(-15,-12);c.rotate(e.ear);
 ink(c,dad?'M4-4Q-4-12-15-3Q-22 2-14 7Q-4 11 4 4Z':'M4 2Q3-13-9-16Q-19-14-14-7Q-13-2-5 4Z',peach,outline);
 ink(c,dad?'M1-3Q-6-7-14 1Q-10 7-2 4Z':'M0 1Q-4-11-10-12Q-14-11-11-6Q-7-2 0 1Z',dad?'#a95f58':'#e88783');c.restore();
 if(dad){c.save();c.translate(17,-12);c.scale(.79,.87);c.rotate(-e.ear*.65);ink(c,'M-3-2Q5-7 14 1Q21 9 13 10Q4 10-3 4Z',peach,outline);ink(c,'M1 0Q11 0 15 6Q8 9 1 0Z','#a95f58');c.restore();}
 ink(c,dad?'M-22-2Q-22-17-7-17Q12-22 22-9Q28-3 25 10Q22 21 3 22Q-21 22-24 9Q-25 3-22-2Z':'M-19-3Q-19-17-2-17Q14-20 21-7Q27-1 23 10Q20 20 3 20Q-17 20-21 9Q-24 2-19-3Z',pale,outline,1.65);
 ink(c,dad?'M-24 4Q-19 15 0 17Q16 18 25 10Q22 22 1 22Q-22 22-24 4Z':'M-20 4Q-17 16 0 16Q17 16 23 8Q20 20 2 20Q-17 20-20 4Z',dad?'#be7b65':'#efac9a');
 cap(c,dad);
 const iris=dad?'#4f392c':'#785138';
 profileEyes(c,-5,-2,dad?3.95:5.5,iris,e.look,e.closed,e.serious,false,false,e.stunned);
 profileEyes(c,16,-3,dad?3.55:4.75,iris,e.look,e.closed,e.serious,true,false,e.stunned);
 if(!e.closed)stroke(c,dad?'#614534':'#714b3b',dad?1.55:1.2,p=>{p.moveTo(-9,e.rage?-10:-8);p.quadraticCurveTo(-6,-9.6,-2,e.rage?-6.5:-8.1);p.moveTo(13,e.rage?-6.6:-8.7);p.quadraticCurveTo(16,-9.8,19,e.rage?-10:-8.5);});
 oval(c,-14,7,dad?6:5,3.1,dad?'#c7816f':'#ee958a');
 if(e.pant!==null)pantMouth(c,10,13,e.pant);else if(e.serious)steadyMouth(c,9,13);else smile(c,9,12,e.open,e.upset);
 oval(c,10,4,dad?9.3:8.6,5.7,dad?'#d08d75':'#ef9a8c','#ab6656',1.1);oval(c,8,2.5,5.45,2.05,dad?'#e0a78c':'#f9b5a5');
 oval(c,7,4.9,1.4,1.9,'#944d43');oval(c,13.4,4.1,1.1,1.6,'#944d43');
 if(e.cry){oval(c,-3,.7,2.55,1.45,'#bde7ef');oval(c,15.6,-.6,1.65,1.2,'#bde7ef');}
 c.restore();
}
export const paintMimi=(c:CanvasRenderingContext2D,e:Expression)=>pigFace(c,e,false);
export const paintDad=(c:CanvasRenderingContext2D,e:Expression)=>pigFace(c,e,true);
