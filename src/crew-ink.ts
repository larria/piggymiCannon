/** Small, cached vector shapes for the battlefield crew. Coordinates are in tank art units. */
const paths=new Map<string,Path2D>();
export function vectorPath(d:string){let shape=paths.get(d);if(!shape){shape=new Path2D(d);paths.set(d,shape);}return shape;}
export function ink(c:CanvasRenderingContext2D,d:string,fill:string,stroke?:string,width=1.3){
 const shape=vectorPath(d);
 if(fill!=='none'){c.fillStyle=fill;c.fill(shape);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(shape);}
}
export function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string,stroke?:string,width=1.2){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
export function stroke(c:CanvasRenderingContext2D,color:string,width:number,draw:(c:CanvasRenderingContext2D)=>void){
 c.beginPath();draw(c);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
export function eyes(c:CanvasRenderingContext2D,x:number,y:number,r:number,iris:string,look:number,closed:boolean){
 if(closed){stroke(c,'#593b34',1.6,p=>{p.moveTo(x-r,y+1);p.quadraticCurveTo(x,y-4,x+r,y+1);});return;}
 oval(c,x,y,r,r*1.2,'#fff4e3','#8b5a46',.95);
 oval(c,x+look*r*.34,y+.55,r*.68,r*.88,iris);oval(c,x+look*r*.34+.28,y+.85,r*.45,r*.59,'#332a2b');
 oval(c,x+look*r*.34-r*.18,y-r*.38,r*.25,r*.29,'#fff8ea');

}
/** A narrow far eye and a fuller near eye keep the gaze in three-quarter view. */
export function profileEyes(c:CanvasRenderingContext2D,x:number,y:number,r:number,iris:string,look:number,closed:boolean,serious:boolean,far=false,lashes=false,stunned=false){
 c.save();c.translate(x,y);c.scale(far?.66:1,serious?.83:1);
 if(stunned){stroke(c,'#6b4338',1.35,p=>{p.moveTo(-r*.63,-r*.6);p.lineTo(r*.63,r*.6);p.moveTo(r*.63,-r*.6);p.lineTo(-r*.63,r*.6);});}
 else eyes(c,0,0,r,iris,look,closed);
 if(lashes&&!closed)stroke(c,'#69452a',1,p=>{const side=far?1:-1;p.moveTo(side*r*.62,-r*.85);p.lineTo(side*r*1.04,-r*1.21);p.moveTo(side*r*.88,-r*.54);p.lineTo(side*r*1.27,-r*.77);});
 c.restore();
}
export function steadyMouth(c:CanvasRenderingContext2D,x:number,y:number){
 stroke(c,'#78443a',1.45,p=>{p.moveTo(x-4,y);p.quadraticCurveTo(x-.25,y+1.7,x+4.6,y+.2);});
}
export function shockMouth(c:CanvasRenderingContext2D,x:number,y:number){
 oval(c,x,y+1,3.8,4.2,'#633832','#914c43',.9);
 oval(c,x-.3,y+2.8,1.9,1.15,'#ce8170');
}
export function pantMouth(c:CanvasRenderingContext2D,x:number,y:number,air:number){
 const h=1.4+air*2.1;
 oval(c,x,y,3.7+air*.8,h,'#693a35','#844738',.85);
 if(air>.15)oval(c,x-.55,y+h*.41,2.1,h*.28,'#cc786a');
}
export function goggles(c:CanvasRenderingContext2D,x:number,y:number,tilt=0,scale=1){
 c.save();c.translate(x,y);c.rotate(tilt);c.scale(scale,scale);
 ink(c,'M-22 -2Q0-8 22-2L21 4Q0 0-21 4Z','#604938','#473b33');
 for(const [i,angle] of [[-10,-.16],[9,.16]]){c.save();c.translate(i,0);c.rotate(angle);
  oval(c,0,0,9.7,7.3,'#78513c','#48372e');oval(c,0,-.65,8.65,6.2,'#d8aa67','#f8d79b',.9);
  oval(c,0,-.75,6.8,4.7,'#385777','#6b604f',.9);
  ink(c,'M-6-1Q-5-5 2-5L5-3 1-3-3 0Z','#9dc1db');ink(c,'M0 3 4 0 6 0Q5 4 0 3Z','#577e9b');
  oval(c,-3.6,-2.7,1.3,.65,'#e6eff2');c.restore();}
 c.restore();
}
export function smile(c:CanvasRenderingContext2D,x:number,y:number,open:number,upset=false){
 if(upset){stroke(c,'#823c36',1.5,p=>{p.moveTo(x-4,y+1);p.quadraticCurveTo(x,y-5,x+5,y+1);});return;}
 if(open<.27){stroke(c,'#823c36',1.45,p=>{p.moveTo(x-6,y);p.quadraticCurveTo(x,y+5,x+7,y-1.5);});return;}
 c.save();c.translate(x,y);c.scale(1,open);
 ink(c,'M-7-1Q0 1 8-3Q7 9 0 9Q-5 9-7-1Z','#823c36','#743a33');
 ink(c,'M-4 5Q0 1 5 4Q3 8 0 8Q-2 8-4 5Z','#ef8b78');
 ink(c,'M-5 0Q0 1 6-2Q5 1 0 2Q-3 2-5 0Z','#fff0d9');c.restore();
}
