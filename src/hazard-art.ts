// Small reusable silhouettes; world ranges and damage stay with the engine.
const flamePaths=()=>[
 new Path2D('M-11 0C-14-8-4-9-7-22C-2-19 1-15 1-10C5-13 8-22 7-29C15-21 13-13 11-9L16-13C21-4 14 2 5 3C-1 4-6 3-11 0Z'),
 new Path2D('M-6 0C-9-4-2-7-1-14C4-11 3-7 4-5C8-7 8-11 10-14C15-7 11 0 6 1Z'),
 new Path2D('M-5 1C-6-3-2-5 0-8Q5-5 4 0Z')
];
let flames:Path2D[]|null=null;
let gasCloud:HTMLCanvasElement|null=null;
const tau=Math.PI*2;
function cloud(){
 if(gasCloud)return gasCloud;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d')!,paint=c.createRadialGradient(59,60,7,64,64,64);
 paint.addColorStop(0,'#d6ca68a0');paint.addColorStop(.34,'#aeb86991');paint.addColorStop(.69,'#8a9b5e64');paint.addColorStop(1,'#809a5400');
 c.fillStyle=paint;c.fillRect(0,0,128,128);return gasCloud=canvas;
}
export function paintGroundFlame(c:CanvasRenderingContext2D,x:number,y:number,time:number,seed:number,reduced:boolean){
 flames??=flamePaths();
 const phase=reduced?seed:time*6+seed,lift=Math.sin(phase)*.12+1.04;
 c.save();c.translate(x,y);c.scale(.65+Math.sin(seed*2.1)*.13,lift*(.8+Math.cos(seed)*.19));c.rotate(Math.sin(phase)*.09);
 c.fillStyle='#be593999';c.fill(flames[0]);c.fillStyle='#eb8849d9';c.fill(flames[1]);c.fillStyle='#ffdb8fc9';c.fill(flames[2]);
 if(!reduced){const p=(time*.9+seed*.38)%1;c.globalAlpha=.7*(1-p);c.fillStyle='#ffd27b';c.beginPath();c.ellipse(3+Math.sin(phase)*p*7,-12-p*23,1.1,1.45,phase,0,tau);c.fill();}
 c.restore();
}
export function paintGasCloud(c:CanvasRenderingContext2D,x:number,y:number,radius:number,time:number,reduced:boolean){
 const tile=cloud();c.save();
 // A connected low cloud, with the clear edge left at the actual hazard radius.
 c.drawImage(tile,x-radius,y-36,radius*2,62);
 for(let i=0;i<5;i++){
  const phase=reduced?i:time*.83+i,horizontal=(i-2)/2*.57+Math.sin(phase)*.06;
  c.globalAlpha=.63+Math.cos(phase+1)*.13;
  c.drawImage(tile,x+radius*(horizontal-.34),y-33+(i%2)*8+Math.cos(phase)*4,radius*.68,45+(i%3)*5);
 }
 c.restore();
}
export function paintPoisonStatus(c:CanvasRenderingContext2D,time:number,reduced:boolean){
 c.save();c.fillStyle='#a5b45c23';c.beginPath();c.ellipse(0,-10,36,32,0,0,tau);c.fill();
 for(let i=0;i<6;i++){
  const p=(i/6+(reduced?0:time*.72))%1,x=(i%2?1:-1)*(27+Math.sin(i*2.1+p*3)*5),y=7-p*47,r=1.6+p*1.65;
  c.globalAlpha=.74-p*.51;c.fillStyle='#c4d187';c.strokeStyle='#648456';c.lineWidth=.85;
  c.beginPath();c.arc(x,y,r,0,tau);c.fill();c.stroke();
  c.fillStyle='#f5efba';c.beginPath();c.arc(x-r*.33,y-r*.36,.67,0,tau);c.fill();
 }
 c.restore();
}
