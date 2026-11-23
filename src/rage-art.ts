import {ink} from './crew-ink';

const tongue='M-4 1Q-6-1-3-5Q-1-7-2-10Q2-8 2-4L5-7Q7-3 4 0Q1 2-4 1Z';

/** Draw the back and front of the same ring; it fades out before restarting. */
export function paintRage(c:CanvasRenderingContext2D,time:number,reduced:boolean,foreground:boolean){
 const phase=reduced?.44:(time*1.13)%1;
 const life=Math.sin(phase*Math.PI),y=7-34*phase,r=36-4*phase,ry=6.3-1.2*phase;
 const start=foreground?0:Math.PI;
 c.save();c.globalAlpha=life*(foreground?.87:.7);
 c.beginPath();c.ellipse(0,y,r,ry,0,start,start+Math.PI);c.strokeStyle='#bd412b';c.lineWidth=3.2;c.stroke();
 c.strokeStyle=foreground?'#ffb45f':'#ed7344';c.lineWidth=1.65;c.stroke();
 for(let j=0;j<7;j++){
  const a=start+(j+.55)*Math.PI/7,bob=reduced?.66:.72+Math.sin(time*12+j*2.2)*.23;
  c.save();c.translate(r*Math.cos(a),y+ry*Math.sin(a));
  c.scale(Math.cos(a)>0?1:-1,bob*(1-.24*phase));
  ink(c,tongue,j%2?'#ef753e':'#ffc46b','#ab3c2d',.7);c.restore();
 }
 c.restore();
}
