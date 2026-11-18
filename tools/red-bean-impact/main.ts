import data from './case.json';
import type {Tank} from '../../src/engine';
import {paintVehicle} from '../../src/vehicle-art';
import {paintCrew} from '../../src/crew-art';
import {vehicleById} from '../../src/vehicles';
import {originalCrater,sourceDamagePoint,sourceDistance,sourceDamage,sourceFalloff,SOURCE_CELL} from '../../src/original-ballistics';
import {pointHitsTank} from '../../src/tank-hitbox';
import {preciseContact} from '../../src/impact-damage';

const t=data.tank as unknown as Tank,slope=data.tank.slope,c=Math.cos(slope),s=Math.sin(slope),shot=data.shots[0],ref=sourceDamagePoint(t,slope,'cannon-special');
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('model'),ctx=canvas.getContext('2d')!,zoom=$<HTMLInputElement>('zoom');
let selected={x:shot.impact.x,y:shot.impact.y},actual=true,view={w:0,h:0,k:3.2,x:0,y:0};
const fmt=(n:number,d=2)=>n.toFixed(d),pair=(p:{x:number;y:number})=>`(${fmt(p.x)}, ${fmt(p.y)})`;
function world(x:number,y:number){return {x:t.x+x*c-y*s,y:t.y+x*s+y*c};}
function screen(p:{x:number;y:number}){return {x:(p.x-view.x)*view.k,y:(p.y-view.y)*view.k};}
function dot(p:{x:number;y:number},colour:string,r=4){const q=screen(p);ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fillStyle=colour;ctx.fill();ctx.strokeStyle='#fffdf6';ctx.lineWidth=1.5;ctx.stroke();}
function line(a:{x:number;y:number},b:{x:number;y:number},colour:string,dash:number[]=[],width=1.5){const p=screen(a),q=screen(b);ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([]);}
function label(p:{x:number;y:number},text:string,dx:number,dy:number,colour:string){const q=screen(p),x=q.x+dx,y=q.y+dy;ctx.font='12px -apple-system, "PingFang SC", sans-serif';const w=ctx.measureText(text).width;line(p,{x:view.x+(x+(dx<0?w:0))/view.k,y:view.y+(y-4)/view.k},colour,[3,3],1);ctx.fillStyle='#fffdf6ed';ctx.fillRect(x-5,y-15,w+10,23);ctx.fillStyle=colour;ctx.fillText(text,x,y);}
function stats(){const d=sourceDistance(t,selected.x,selected.y,slope,'cannon-special'),fall=sourceFalloff(d,data.roundValue),damage=Math.round(sourceDamage(data.power,data.roundValue,d,data.defence,data.boost)*data.era),inside=pointHitsTank(t,selected.x,selected.y,slope,data.version),full=preciseContact(t,selected.x,selected.y,slope,data.version,undefined,'cannon-special');
  $('distance').textContent=fmt(Math.hypot(selected.x-ref.x,selected.y-ref.y))+' 世界单位';$('grid-distance').textContent=fmt(d,4)+' 格';$('contact').textContent=`${inside?'是':'否'} / ${full?'是':'否'}`;$('falloff').textContent=(fall*100).toFixed(2)+'%';$('damage').textContent=damage+' HP';$('selection-title').textContent=actual?'实际爆点 · 第 16 弹':'假设爆点 · '+pair(selected);
  return {distance:d,falloff:fall,damage,inside,full};
}
function draw(){const box=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);view={w:box.width,h:box.height,k:Number(zoom.value),x:t.x-box.width/Number(zoom.value)/2,y:t.y-box.height/Number(zoom.value)/2-9};ctx.clearRect(0,0,view.w,view.h);ctx.fillStyle='#fbfaf1';ctx.fillRect(0,0,view.w,view.h);
  ctx.save();ctx.translate(-view.x*view.k,-view.y*view.k);ctx.scale(view.k,view.k);
  ctx.strokeStyle='#718d7b16';ctx.lineWidth=1/view.k;ctx.beginPath();for(let x=Math.floor(view.x/10)*10;x<view.x+view.w/view.k;x+=10){ctx.moveTo(x,view.y);ctx.lineTo(x,view.y+view.h/view.k);}for(let y=Math.floor(view.y/10)*10;y<view.y+view.h/view.k;y+=10){ctx.moveTo(view.x,y);ctx.lineTo(view.x+view.w/view.k,y);}ctx.stroke();
  ctx.fillStyle='#60727533';for(const [y,x,w] of data.permanentRows)ctx.fillRect(x,y,w,1);
  if($<HTMLInputElement>('heat').checked){for(let x=Math.floor(view.x/3)*3;x<view.x+view.w/view.k;x+=3)for(let y=Math.floor(view.y/3)*3;y<view.y+view.h/view.k;y+=3){const f=sourceFalloff(sourceDistance(t,x,y,slope,'cannon-special'),data.roundValue);if(f>0){ctx.fillStyle=`rgba(102,153,96,${f*.3})`;ctx.fillRect(x,y,3,3);}}}
  if($<HTMLInputElement>('crater').checked){ctx.fillStyle='#c9a35428';for(const row of originalCrater(data.roundValue))ctx.fillRect(shot.impact.x+row.left*3,shot.impact.y+row.y*3,row.width*3,3);}
  if($<HTMLInputElement>('art').checked){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(slope);ctx.scale(t.direction,1);ctx.globalAlpha=.75;paintVehicle(ctx,vehicleById('mine'),t.angle,0,0,false);paintCrew(ctx,t,0,'idle');ctx.restore();}
  ctx.save();ctx.translate(t.x,t.y);ctx.rotate(slope);ctx.fillStyle='#54869418';ctx.strokeStyle='#548694';ctx.lineWidth=2/view.k;ctx.fillRect(-30,-33,60,51);ctx.strokeRect(-30,-33,60,51);ctx.setLineDash([4/view.k,4/view.k]);ctx.strokeStyle='#54869470';ctx.beginPath();ctx.moveTo(-35,0);ctx.lineTo(38,0);ctx.moveTo(0,-38);ctx.lineTo(0,23);ctx.stroke();ctx.restore();
  const gx=Math.floor(ref.x/SOURCE_CELL)*3,gy=Math.floor(ref.y/SOURCE_CELL)*3;ctx.fillStyle='#5d956d';ctx.fillRect(gx,gy,3,3);ctx.restore();
  // Label positions are in screen pixels so zoom never makes their type tiny.
  const incoming=shot.incoming,len=Math.hypot(incoming.vx,incoming.vy),start={x:shot.impact.x-incoming.vx/len*87,y:shot.impact.y-incoming.vy/len*87},end={x:shot.impact.x+incoming.vx/len*29,y:shot.impact.y+incoming.vy/len*29};line(start,shot.impact,'#a86443',[],2);line(shot.impact,end,'#a8644377',[5,4]);const tip=screen(shot.impact),a=Math.atan2(incoming.vy,incoming.vx);ctx.fillStyle='#a86443';ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(tip.x-11*Math.cos(a-.45),tip.y-11*Math.sin(a-.45));ctx.lineTo(tip.x-11*Math.cos(a+.45),tip.y-11*Math.sin(a+.45));ctx.fill();
  line(ref,shot.impact,'#a76b49',[4,4]);dot(ref,'#5d956d');dot(shot.impact,'#c96e45',6);const second=screen(data.shots[1].impact);ctx.beginPath();ctx.arc(second.x,second.y,9,0,Math.PI*2);ctx.strokeStyle='#9271a4';ctx.lineWidth=2;ctx.stroke();dot({x:t.x,y:t.y},'#548694',3);dot(world(0,18),'#7b8980',3);
  label(ref,'伤害参照点 · 局部 (0, −33)',-196,-76,'#477c56');label(shot.impact,'两发爆点 · 首次碰到右边界',34,-69,'#a45d3c');label(world(-30,18),'60 × 51 碰撞矩形',-113,75,'#497681');label(world(0,18),'脚下支点 · 局部 (0, 18)',32,77,'#677c72');
  const mid=screen({x:(ref.x+shot.impact.x)/2,y:(ref.y+shot.impact.y)/2});ctx.font='12px -apple-system, sans-serif';ctx.fillStyle='#8e633f';ctx.fillText('36.32',mid.x+1,mid.y-10);
  ctx.font='11px -apple-system, "PingFang SC", sans-serif';ctx.fillStyle='#78877b';ctx.fillText('世界 Y 向下 · 网格细线每 10 单位 · 显示倍率 '+zoom.value+'×',16,view.h-15);ctx.fillText('永久底板（保留）',16,view.h-33);
  if(!actual){const q=screen(selected);ctx.strokeStyle='#467e72';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,7,0,7);ctx.moveTo(q.x-12,q.y);ctx.lineTo(q.x+12,q.y);ctx.moveTo(q.x,q.y-12);ctx.lineTo(q.x,q.y+12);ctx.stroke();}stats();
}
$('slope').textContent=fmt(slope*180/Math.PI)+'°';$('reference').textContent=pair(ref);$('separation').textContent=fmt(Math.hypot(data.shots[1].impact.x-shot.impact.x,data.shots[1].impact.y-shot.impact.y),6)+' 单位';$('shots').innerHTML=data.shots.map(p=>`<tr><td>#${p.projectile}</td><td>${fmt(p.impact.x,4)}</td><td>${fmt(p.impact.y,4)}</td><td>${p.damage.actual}</td></tr>`).join('');
for(const id of ['zoom','art','heat','crater'])$(id).addEventListener('input',draw);
$('reset').addEventListener('click',()=>{selected={x:shot.impact.x,y:shot.impact.y};actual=true;draw();});$('perfect').addEventListener('click',()=>{selected={...ref};actual=false;draw();});canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();selected={x:view.x+(e.clientX-r.left)/view.k,y:view.y+(e.clientY-r.top)/view.k};actual=false;draw();});new ResizeObserver(draw).observe(canvas);
// Bounded read-only diagnostics for the temporary page's acceptance checks.
Object.assign(window,{__impactLab:{case:data,reference:ref,get selection(){return {...selected,...stats()};}}});draw();
