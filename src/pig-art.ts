import {eyes,goggles,ink,oval,smile,stroke} from './crew-ink';
export type CrewAction='idle'|'move'|'fire'|'hurt'|'win'|'lose'|'fall';
export function mimiPose(time:number,state:CrewAction,breath:boolean){const p=Math.sin(time*(state==='win'?9:state==='move'?15:state==='hurt'?21:5));return {bob:state==='win'?-Math.abs(p)*9:state==='hurt'?p*1.4:breath?p*1.7:state==='move'?p*1.7:p*.65,lean:state==='win'?p*.11:state==='hurt'?p*.095:state==='move'?.07:0,p};}
export function dadPose(time:number,state:CrewAction,breath:boolean){const p=Math.sin(time*(state==='win'?5:state==='move'?10:state==='hurt'?14:3.3));return {bob:state==='win'?-Math.max(0,p)*5:state==='hurt'?p*.8:breath?p*1.2:state==='move'?Math.abs(p)*1.15:p*.42,lean:state==='win'?p*.05:state==='hurt'?-p*.075:state==='move'?.04:0,p};}
export interface Expression {look:number;closed:boolean;upset:boolean;open:number;ear:number}
const peach='#f5b2a1',pale='#ffd0b6',outline='#794f40';
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
 // The ears sit behind the cap and have their own small follow-through.
 c.save();c.translate(-15,-12);c.rotate(e.ear);
 ink(c,dad?'M4-4Q-4-12-15-3Q-22 2-14 7Q-4 11 4 4Z':'M4 2Q3-13-9-16Q-19-14-14-7Q-13-2-5 4Z',peach,outline);
 ink(c,dad?'M1-3Q-6-7-14 1Q-10 7-2 4Z':'M0 1Q-4-11-10-12Q-14-11-11-6Q-7-2 0 1Z','#e88783');c.restore();
 if(dad){c.save();c.translate(17,-11);c.rotate(-e.ear*.65);ink(c,'M-3-2Q5-7 14 1Q21 9 13 10Q4 10-3 4Z',peach,outline);ink(c,'M1 0Q11 0 15 6Q8 9 1 0Z','#e88d84');c.restore();}
 ink(c,dad?'M-22-2Q-22-17-7-17Q12-22 22-9Q28-3 25 10Q22 21 3 22Q-21 22-24 9Q-25 3-22-2Z':'M-19-3Q-19-17-2-17Q14-20 21-7Q27-1 23 10Q20 20 3 20Q-17 20-21 9Q-24 2-19-3Z',pale,outline,1.65);
 ink(c,'M-21 4Q-17 16 0 16Q19 16 24 8Q22 21 1 21Q-20 21-21 4Z','#efac9a');
 cap(c,dad);
 const iris=dad?'#67462e':'#785138';eyes(c,-7,-2,dad?5.2:5.75,iris,e.look,e.closed);eyes(c,12,-3,dad?4.75:5.45,iris,e.look,e.closed);
 if(!e.closed)stroke(c,'#714b3b',1.2,p=>{p.moveTo(-11,-9);p.quadraticCurveTo(-8,-11+(e.upset?3:0),-4,-9);p.moveTo(10,-10);p.quadraticCurveTo(13,-12-(e.upset?1:0),16,-10);});
 oval(c,-13,6,5,3.1,dad?'#ec9c8d':'#ee958a');oval(c,18,5,4.5,2.8,'#ec9c8d');
 smile(c,3,11,e.open,e.upset);
 oval(c,4,3,dad?9.7:8.8,5.8,'#ef9a8c','#ab6656',1.1);oval(c,2,1.5,5.7,2.3,'#f9b5a5');
 oval(c,1,3.9,1.35,1.9,'#a25348');oval(c,7,3.5,1.35,1.8,'#a25348');
}
export const paintMimi=(c:CanvasRenderingContext2D,e:Expression)=>pigFace(c,e,false);
export const paintDad=(c:CanvasRenderingContext2D,e:Expression)=>pigFace(c,e,true);
