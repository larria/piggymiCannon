import type {Tank} from './engine';
export function defeatedPig(c:CanvasRenderingContext2D,t:Tank,time:number,slope:number){
  if(t.outOfBounds)return;
  c.save();c.translate(t.x,t.y+18);c.rotate(slope);c.scale(t.direction,1);
  const sob=Math.sin(time*9);
  c.fillStyle='#34413022';c.beginPath();c.ellipse(0,0,33,5,0,0,7);c.fill();
  c.save();c.translate(0,sob*1.8);c.scale(1+sob*.04,1-sob*.08);
  c.fillStyle='#ecad99';c.beginPath();c.ellipse(-8,-10,21,10,-.07,0,7);c.fill();
  c.fillStyle='#e8a38c';c.beginPath();c.ellipse(-27,-9,5,7,-.9,0,7);c.fill();
  c.strokeStyle='#c37f6d';c.lineWidth=3;c.beginPath();c.arc(-27,-12,5,0,5);c.stroke();
  c.fillStyle='#f2b9a4';c.beginPath();c.ellipse(13,-12,17,12,.15,0,7);c.fill();
  c.beginPath();c.moveTo(2,-20);c.lineTo(-2,-31);c.quadraticCurveTo(10,-33,10,-22);c.fill();
  c.beginPath();c.moveTo(16,-23);c.lineTo(24,-31);c.lineTo(26,-19);c.fill();
  c.fillStyle='#e59c85';c.beginPath();c.ellipse(27,-9,9,5,0,0,7);c.fill();
  c.fillStyle='#b97465';for(const x of [25,29]){c.beginPath();c.ellipse(x,-9,1.3,1.7,0,0,7);c.fill();}
  c.strokeStyle='#865c51';c.lineWidth=2;c.beginPath();c.moveTo(12,-18);c.lineTo(17,-16);c.lineTo(12,-14);c.stroke();
  c.fillStyle='#a76057';c.beginPath();c.ellipse(23,-3,4,2.8+sob*.8,0,0,7);c.fill();
  c.fillStyle='#ebae97';c.beginPath();c.ellipse(5,-2,9,4,.2,0,7);c.ellipse(19,-1,8,3,0,0,7);c.fill();
  c.restore();c.strokeStyle='#92cadd';c.lineWidth=3;c.beginPath();c.moveTo(16,-14);c.quadraticCurveTo(15,-6,23,-1);c.stroke();
  c.fillStyle='#98d2e4';for(let i=0;i<4;i++){const p=(time*2+i*.23)%1;c.beginPath();c.ellipse(22+p*14,-8+p*10,2.5,3.3,0,0,7);c.fill();}
  c.fillStyle='#92cadd55';c.beginPath();c.ellipse(31,2,13+sob*2,2.7,0,0,7);c.fill();c.restore();
}
export function victoryConfetti(c:CanvasRenderingContext2D,t:Tank,time:number){
  c.save();c.translate(t.x,t.y);const colors=['#e89978','#bacb82','#e1bd69','#93c3d0'];
  for(let i=0;i<18;i++){const p=(time*.6+i/18)%1,x=Math.sin(i*7.3)*55*(.3+p),y=-110+p*100;
    c.save();c.translate(x,y);c.rotate(time*3+i);c.globalAlpha=Math.sin(p*Math.PI);c.fillStyle=colors[i%4];c.fillRect(-2,-4,4,8);c.restore();}
  c.restore();
}
