import {ink} from './crew-ink';

const flame='M-9 2C-14-11-3-14-5-25C2-21 3-16 2-13C8-20 6-26 9-33C16-20 10-13 12-8C15-10 16-13 18-15C22-4 14 5 5 6C-1 7-6 5-9 2Z';
const core='M-4 3C-7-4 0-8 1-15C7-9 5-5 7-3L10-8C14 1 9 5 4 5Z';
const tongues=[[-59,11,.83,-1],[-36,2,1.15,-1],[-23,-15,.64,1],[32,12,.76,-1],[55,4,1.13,1],[63,12,.66,1]] as const;

/** Sea Monster's existing rage state, rendered behind the chassis and along its tracks. */
export function paintRage(c:CanvasRenderingContext2D,time:number,reduced:boolean,foreground:boolean){
 c.save();
 for(const [i,[x,y,size,side]] of tongues.entries()){
  if(foreground!==(i===0||i===5))continue;
  const wave=reduced?.5:Math.sin(time*8+i*2.4)*.5+.5;
  c.save();c.translate(x,y);c.scale(side*size,size*(.82+wave*.42));c.rotate((wave-.5)*.2);
  c.globalAlpha=foreground?.9:.85;
  ink(c,flame,foreground?'#ea7844':'#d25836','#a94532',1.25);ink(c,core,'#ffd07a');c.restore();
 }
 if(foreground&&!reduced)for(let i=0;i<8;i++){
  const p=(time*(.8+(i%3)*.16)+i*.37)%1,x=(i%2?-1:1)*(37+i%4*8+Math.sin(i+time*4)*p*8),y=-7-p*(38+i%3*7);
  c.save();c.translate(x,y);c.rotate(p*3);c.globalAlpha=(1-p)*.92;
  ink(c,'M0-3L2 0 0 2-2 0Z',i%2?'#ec8b43':'#ffd283','#b75236',.65);c.restore();
 }
 c.restore();
}
