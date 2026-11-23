import type {Vehicle} from './vehicles';
import {TANK_ART,vehicleBodyFit,type BodyFit,type Part} from './vehicle-paint';

const SCALE=4,bounds={body:{x:-48,y:-53,w:96,h:76},aim:{x:-35,y:-26,w:81,h:52}};
type Tile={canvas:HTMLCanvasElement;x:number;y:number;w:number;h:number};
const paintGeometry=new Map<Vehicle['id'],{body:Tile;aim:Tile;rage?:Tile}>();
let iconId=0;
export function vehicleIcon(v:Vehicle){
 const layer=TANK_ART[v.id],id=`tank-${v.id}-${++iconId}`,defs:string[]=[];
 const stops=new Map<Part['fill'],string>();
 const fill=(p:Part['fill'])=>{
  if(typeof p==='string')return p;
  let key=stops.get(p);if(!key){
   key=`${id}-${stops.size}`;stops.set(p,key);
   defs.push(`<linearGradient id="${key}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${p.top}" y2="${p.bottom}">${p.colors.map((c,i)=>`<stop offset="${i/(p.colors.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient>`);
  }
  return `url(#${key})`;
 };
 const paths=(parts:Part[])=>parts.map(p=>`<path d="${p.d}" fill="${fill(p.fill)}" stroke="${p.stroke}" stroke-width="${p.width}"/>`).join('');
 const fit=vehicleBodyFit(v.id);
 const body=`<g transform="translate(0,${fit.lift}) scale(${fit.scaleX},${fit.scaleY})">${paths(layer.body)}</g>`,aim=paths(layer.aim);
 return `<svg viewBox="-48 -53 96 76" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-tank-art="${v.id}"><defs>${defs.join('')}</defs>${body}<g transform="translate(0,-13) rotate(-${(v.minAngle+v.maxAngle)/2})">${aim}</g></svg>`;
}
function bake(parts:Part[],{x,y,w,h}:Omit<Tile,'canvas'>,fit?:BodyFit){
 const canvas=document.createElement('canvas');canvas.width=w*SCALE;canvas.height=h*SCALE;
 const c=canvas.getContext('2d')!;c.scale(SCALE,SCALE);c.translate(-x,-y);c.lineJoin='round';c.lineCap='round';
 if(fit){c.translate(0,fit.lift);c.scale(fit.scaleX,fit.scaleY);}
 for(const p of parts){
  const path=new Path2D(p.d);
  if(p.fill!=='none'){
   if(typeof p.fill==='string')c.fillStyle=p.fill;
   else{const {top,bottom,colors}=p.fill,gradient=c.createLinearGradient(0,top,0,bottom);colors.forEach((color,i)=>gradient.addColorStop(i/(colors.length-1),color));c.fillStyle=gradient;}
   c.fill(path);
  }
  if(p.stroke!=='none'){c.strokeStyle=p.stroke;c.lineWidth=p.width;c.stroke(path);}
 }
 return {canvas,x,y,w,h};
}
export function paintVehicle(c:CanvasRenderingContext2D,v:Vehicle,angle:number,time:number,firing:number,moving:boolean,rage=false,reduced=false){
 let geometry=paintGeometry.get(v.id);
 if(!geometry){const art=TANK_ART[v.id],fit=vehicleBodyFit(v.id);geometry={body:bake(art.body,bounds.body,fit),aim:bake(art.aim,bounds.aim),rage:art.rage?bake(art.rage,bounds.body,fit):undefined};paintGeometry.set(v.id,geometry);}
 const draw=({canvas,x,y,w,h}:Tile)=>c.drawImage(canvas,x,y,w,h);
 const recoil=Math.sin(firing*Math.PI);
 c.save();
 if(moving&&!reduced)c.translate(0,Math.sin(time*22)*(v.id==='laser'||v.id==='water'||v.id==='ion'?.55:1.1));
 draw(geometry.body);
 if(rage&&geometry.rage){c.save();c.globalAlpha=reduced?.82:.81+Math.sin(time*8)*.17;draw(geometry.rage);c.restore();}
 c.translate(0,-13);c.rotate(-angle*Math.PI/180);
 if(v.id==='bowl')c.rotate(-recoil*.82);
 else if(v.id==='crossbow')c.scale(1-recoil*.09,1);
 else c.translate(-recoil*(v.id==='multi'||v.id==='missile'?3:4),0);
 draw(geometry.aim);
 // The glow sits on the same aim axis as the projectile muzzle.
 if(recoil>.05&&!reduced&&['multi','missile','laser','ion','dragon','sea'].includes(v.id)){
  c.globalAlpha=recoil*.7;c.fillStyle=v.id==='laser'||v.id==='ion'?'#d9fded':'#ffe2a0';
  for(const y of v.id==='multi'?[-8,0,8]:[0]){c.beginPath();c.ellipse(31,y,4.5*recoil,2,0,0,Math.PI*2);c.fill();}
 }
 c.restore();
}
export {projectileArt,paintProjectilePreviews} from './projectile-art';
