import type {ItemId} from './catalog';
export interface ItemCue {tank:number;item:ItemId;age:number}
/** Silent, short paper badge; visual-only and independent of damage particles. */
export function paintItemCue(c:CanvasRenderingContext2D,cue:ItemCue,x:number,y:number,color:string){
 const u=cue.age/1.1,alpha=Math.min(1,cue.age/.1)*Math.min(1,(1.1-cue.age)/.25);
 c.save();c.translate(x,y-32-u*22);c.scale(.8+.2*Math.min(1,cue.age/.15),.8+.2*Math.min(1,cue.age/.15));c.globalAlpha=alpha;
 c.fillStyle='#fff9e9';c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.fill();c.stroke();
 c.beginPath();
 if(cue.item==='boost'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?3.5:8;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fillStyle='#e8b356';c.fill();}
 else if(cue.item==='double'){for(const dx of [-4,4]){c.moveTo(dx-2,6);c.lineTo(dx-2,-4);c.quadraticCurveTo(dx,-10,dx+2,-4);c.lineTo(dx+2,6);c.closePath();}c.stroke();}
 else if(cue.item==='shield'){c.moveTo(0,-8);c.lineTo(7,-5);c.lineTo(5,3);c.quadraticCurveTo(3,7,0,9);c.quadraticCurveTo(-3,7,-5,3);c.lineTo(-7,-5);c.closePath();c.stroke();}
 else if(cue.item==='teleport'){c.ellipse(0,-3,8,3,0,0,Math.PI*2);c.moveTo(8,4);c.ellipse(0,4,8,3,0,0,Math.PI*2);c.stroke();}
 else if(cue.item==='wind'){for(const dy of [-4,3]){c.moveTo(-8,dy);c.lineTo(4,dy);c.quadraticCurveTo(10,dy,6,dy-4);}c.stroke();}
 else if(cue.item==='fuel'){c.moveTo(0,-9);c.bezierCurveTo(3,-3,8,1,5,6);c.bezierCurveTo(1,11,-7,6,-5,1);c.closePath();c.stroke();}
 else {c.moveTo(-7,0);c.lineTo(7,0);c.moveTo(0,-7);c.lineTo(0,7);c.stroke();}
 c.strokeStyle='#d5bf82';c.lineWidth=1;c.beginPath();c.arc(0,0,16+u*10,-Math.PI*.65,Math.PI*.25);c.stroke();c.restore();
}
