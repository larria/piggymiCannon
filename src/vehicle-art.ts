import type {Vehicle} from './vehicles';
// Shared vector geometry: selection/HUD/minimap and battlefield use the same silhouettes.
// Original paths, inspired by the traced references in research/VEHICLE_DESIGN.md.
type Part={d:string;fill:string;stroke?:string;width?:number};
const paintGeometry=new Map<string,{body:HTMLCanvasElement;mechanism:HTMLCanvasElement}>();
const wood='#a8885c',iron='#485b57',cream='#ead9ae';
const part=(d:string,fill:string,stroke=iron,width=1.8):Part=>({d,fill,stroke,width});
const wheel=(x:number,r=9)=>part(`M${x-r} 10a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 -${r*2} 0M${x-r+3} 10h${r*2-6}M${x} ${13-r}v${r*2-6}`,wood);
const tracks=(color:string)=>[part('M-29 3h55q9 0 9 9t-9 9h-55q-8 0-8-9t8-9',iron),part('M-25 9h47M-24 15h2m8 0h2m8 0h2m8 0h2m8 0h2',color)];
export function vehicleParts(v:Vehicle):Part[]{
 const c=v.color;
 switch(v.id){
 case 'bowl':return [wheel(-22,10),wheel(23,8),part('M-29 0h58v7h-58z',c),part('M-22 0-12-28 3-25 16 1z',c),part('M-28-8v-25h15v16z','#8aa3b0'),part('M-8-2-8-33 0-33 0-2z',wood),part('M-23-27-23-37-19-38-18-26z','#c5d3d7')];
 case 'crossbow':return [wheel(-23,8),wheel(24,8),part('M-30-2h59v9h-59z',c),part('M-23-6q-9-32 0-35l6 3-1 31z',wood),part('M-16 0-5-22 8 0z',c),part('M-24-6h42v4h-42z','#8b724c'),part('M-29-16h9v8h-9z','#869348')];
 case 'cannon':return [part('M-27 0h50l4 8h-55z',wood),part('M-19-4 1-17 15-4z',wood),wheel(-22,11),wheel(23,9),part('M-12-1h24v5h-24z',c)];
 case 'beetle':return [...tracks('#c6a96c'),part('M-32 4v-14q-6-19 15-22h29q22 9 22 35z',c),part('M-29-10h20v15h-20z','#e8cd87'),part('M-21-10h4v16h-4zM-13-11h4v16h-4z','#f6edd2'),part('M-9-29q9-10 20 0v5H-9z','#bd7150'),part('M20-5h9V4h-9z','#d9ad60')];
 case 'duke':return [wheel(-24,9),wheel(3,8),wheel(25,8),part('M-27-7q-13-14-10-27q3-13 24-9l14 8-10 7-15-5q-2 12 8 19z','#73934d'),part('M-13-36l8 4-6 3z','#e9eed3'),part('M-34 4v-15l13-11h39l13 14v12z',c),part('M-25-20q5-12 13-6l1 9M6-19q5-12 13-5l1 9','#f2ecce'),part('M-26-7q-11 10-4 25l7-1q-6-12 4-18M22-6q13 8 10 23l-7 0q1-13-9-16','#f2ecce'),part('M-12-7h24v3h-24z','#303f2d')];
 case 'mine':return [...tracks('#899da2'),part('M-30 5v-10h60v10z','#556b72'),part('M-26-5q-14-20-1-31q19-7 41-1q18 16 12 32z',c),part('M-3-30v-13h17v13z','#a7aa42'),part('M-15-29h9M13-28h8','none','#d5dbc9'),part('M-12-18q12-7 23 0v7h-23z','#b9c4bc')];
 case 'missile':return [...tracks('#84964b'),part('M-31 4q-2-28 15-30h29q21 10 19 30z',c),part('M-24-17q3-15 13-14q12 4 9 18z','#ecedd2'),part('M0-20q4-16 15-12q11 5 8 18z','#ecedd2'),part('M-17-23h5M8-25h5','none',iron,3),part('M-25-5h38v4h-38z','#a7b467')];
 case 'multi':return [wheel(-24,9),wheel(3,8),wheel(26,9),part('M-32 1h63v7h-63z',c),part('M-20 0-12-22h21L18 0z','#787e54'),part('M-30-12h19v10h-19z','#c7ad61'),part('M-30-24h4v20h-4z','#c7ad61')];
 case 'laser':return [part('M-34 3 19-1l19 11-3 11h-62z','#4c7c92'),part('M-28 0 22-4l7 8-53 7z',c),part('M-10 0V-25H3V0z','#aa8a55'),part('M-18-17-34-28-35-18-19-8M-17-24-36-35-35-27-20-16','#75a5b9'),part('M-17-27q7-10 19 0v13h-19z',c)];
 case 'water':return [part('M-30 7q30-10 60 0v10h-60z','#456f81'),part('M-31 10q-4-22 16-30q12-14 27-1q19 5 20 26q-21 17-63 5z',c),part('M-28-23q5-17 16-12q10 4 10 15zM-2-26q7-13 18-7q7 7 5 17z','#ecedd2'),part('M-18-29h3M10-28h3','none',iron,3),part('M-22 0q15 10 40 0','none','#b9c784',3)];
 case 'ion':return [part('M-20 9q-10-27 7-29q17-9 38 5q8 25-15 34z',c),part('M-14-9q-1-22 16-20q19 0 17 22z','#548daa'),part('M-30-2 0-10-9 0-29 7M9 2l23-10 5 5-23 15','#edf1d9'),part('M-20 11q19-5 37 0v5h-37z','#ca8e35'),part('M-10 11h9','none','#f6d773',3)];
 case 'sea':return [part('M-22 2-30 14h14l5-12M-5 3l-5 13H3L6 3M13 2l4 12h14L24 0','#ad82a0'),part('M-30 14h14v6h-14zM-10 16H3v5h-13zM17 14h14v6H17z','#648ba1'),part('M-24 7q12-14 41 0v5h-41z','#d3b45e'),part('M-6 6l3-24 7-5 7 5-8 24z','#648ba1'),part('M-15-25q-8-15 2-18q17-6 28 7l-6 16z',c),part('M-6-34q4-8 8 0v6h-8z','#f2ecce'),part('M3-27l9-6 8 5-5 6z','#a4ae49'),part('M-3 3-10-7-24-14-34-19-31-23-19-14-5-10 5 1z','#648ba1'),part('M-35-22-38-28-30-30-26-26-27-18-34-17z','#b85f40')];
 case 'dragon':return [...tracks('#aeb7c0'),part('M-35 2h65l8 10h-74z',c),part('M-27-16v-24q18-10 35 0l4 28z','#5487a4'),part('M-22-37h26v17h-26z','#ba8cad'),part('M-22-31H4m-26 6H4','none','#825f82',2),part('M-25-2q-6-24 11-25h24q20 10 19 28z','#5d9e87'),part('M-16-6h40v5h-40z','#8ab5a3'),part('M-7-27h10v9H-7z','#e5ead9'),part('M-10-29h17v4h-17z','#537e9c'),part('M9-8h20l-4 6H8z','#a4655b'),part('M9-22q7-7 13 0v6H9z','#f2ecce'),part('M16-20h2v4h-2z','#485b57')];
 }
}
export function mechanismParts(v:Vehicle):Part[]{
 const c=v.color;
 switch(v.id){
 case 'bowl':return [part('M-24-2h56v5h-56z',wood),part('M-21-2v16h-10V-2z',cream),part('M27-2q14 1 7 12q-4 4-12-1l5-11',cream),part('M24 2q9 10 10 4','none',wood)];
 case 'crossbow':return [part('M-17-3h49v6h-49z',wood),part('M22-23q25 23 0 46','#738349',iron,3.5),part('M22-23 12 0 22 23','none','#eee3c5',1.2),part('M0 0h36m-5-4 7 4-7 4','none',iron)];
 case 'cannon':return [part('M-13-7q16-4 31 0l14-4v22L18 7q-20 4-31 0z',iron),part('M26-10h6v20h-6z','#748076'),part('M32-7v14','none','#2c3c35',3),part('M-7-5h14','none','#abb5a3')];
 case 'multi':return [part('M-15-14h43v28h-43z','#c2a044'),...[-9,0,9].map(y=>part(`M-10 ${y-3}h42v6h-42z`,iron)),part('M-12-15h8v30h-8z','#c2a044'),...[-9,0,9].map(y=>part(`M27 ${y-3}h5v6h-5z`,'#c75535'))];
 case 'missile':return [part('M-13-8h33l11 8-11 8h-33z','#d8c35d'),part('M5-8h16l14 8-14 8H5z','#cb5134'),part('M-9-9h10v18H-9z','#ecedd2'),part('M-11-8-19-15-18-3M-11 8-19 15-18 3','#ca7744')];
 case 'duke':return [part('M-7-5h35v10h-35z','#99a783'),part('M26-8h7V8h-7z',cream),part('M-4 6q-4 12-14 6','none',iron,3)];
 case 'mine':return [part('M-8-8h38v16H-8z',c),part('M26-9h7V9h-7z',iron),part('M-2-5h19v10H-2z',cream)];
 case 'water':return [part('M-5-4q15-7 35 0v8Q7 13-5 4z','#9fc3ba'),part('M23-5h10V6H23z','#d5ece2')];
 case 'ion':return [part('M-5-4h23v8H-5z','#d4a445'),part('M17-14q22 14 0 28M27-18v36','none','#f0d77c',4),part('M27-5h8V5h-8z',cream)];
 case 'sea':return [part('M-3-3h22v6H-3z','#6a8544'),part('M25-11q13 11 0 22q-11-11 0-22', '#c6bfdc'),part('M25-7v14','none',cream,2)];
 case 'dragon':return [part('M-7-8h32q9 0 9 8t-9 8H-7z','#b8bdc6'),part('M27-6h7V6h-7z','#515869'),part('M32-2h4v4h-4z','#c26c57')];
 case 'laser':return [part('M-5-5h24l7 5-7 5H-5z','#c85437'),part('M24-7h7V7h-7z','#a7e4db'),part('M-2-3h18v6H-2z',c)];
 default:return [part('M-6-6h37v12H-6z',c),part('M27-7h7V7h-7z',iron)];
 }
}
const svgParts=(parts:Part[])=>parts.map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.width}"/>`).join('');
export function vehicleIcon(v:Vehicle){return `<svg viewBox="-48 -48 98 75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgParts(vehicleParts(v))}<g transform="translate(0,-13) rotate(-25)">${svgParts(mechanismParts(v))}</g></svg>`;}
export function paintVehicle(c:CanvasRenderingContext2D,v:Vehicle,angle:number,time:number,firing:number,moving:boolean){
 const key=v.id+'|'+v.color;let geometry=paintGeometry.get(key);
 if(!geometry){
  if(paintGeometry.size>=16)paintGeometry.delete(paintGeometry.keys().next().value!);
  // 4x baking retains fine lines at the existing DPR2 even after rotation.
  // Body and firing mechanism remain separate so all continuous transforms
  // (slope, aim, recoil and motion) run at the original frame frequency.
  const bake=(parts:Part[])=>{const tile=document.createElement('canvas');tile.width=tile.height=384;const ctx=tile.getContext('2d')!;ctx.scale(4,4);ctx.translate(48,48);ctx.lineJoin='round';ctx.lineCap='round';for(const p of parts){const path=new Path2D(p.d);ctx.fillStyle=p.fill;ctx.strokeStyle=p.stroke??iron;ctx.lineWidth=p.width??1.8;if(p.fill!=='none')ctx.fill(path);ctx.stroke(path);}return tile;};
  geometry={body:bake(vehicleParts(v)),mechanism:bake(mechanismParts(v))};paintGeometry.set(key,geometry);
 }
 const draw=(tile:HTMLCanvasElement)=>c.drawImage(tile,-48,-48,96,96);
 c.save();c.lineJoin='round';c.lineCap='round';
 if(moving)c.translate(0,Math.sin(time*22)*1.2);
 draw(geometry.body);
 c.save();c.translate(0,-13);
 // Release axis is body-relative, identical to Game.aim after parent body rotation.
 c.rotate(-angle*Math.PI/180);
 if(v.id==='bowl')c.rotate(-Math.sin(firing*Math.PI)*.9);
 else if(v.id==='crossbow')c.scale(1-firing*.09,1);
 else if(v.id==='multi'||v.id==='missile')c.translate(-Math.sin(firing*Math.PI)*3,Math.sin(time*30)*firing);
 else c.translate(-Math.sin(firing*Math.PI)*4,0);
 draw(geometry.mechanism);
 if(firing>0&&(v.id==='multi'||v.id==='missile')){c.fillStyle='#f4c474';c.beginPath();c.ellipse(36,(Math.floor(time*18)%3-1)*8,7*firing,3,0,0,7);c.fill();}
 c.restore();c.restore();
}
export {projectileArt,paintProjectilePreviews} from './projectile-art';
