import type {Vehicle} from './vehicles';
// Shared vector geometry: selection/HUD/minimap and battlefield use the same silhouettes.
// Original paths, inspired by the traced references in research/VEHICLE_DESIGN.md.
type Part={d:string;fill:string;stroke?:string;width?:number};
const wood='#a8885c',iron='#485b57',cream='#ead9ae';
const part=(d:string,fill:string,stroke=iron,width=1.8):Part=>({d,fill,stroke,width});
const wheel=(x:number,r=9)=>part(`M${x-r} 10a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 -${r*2} 0M${x-r+3} 10h${r*2-6}M${x} ${13-r}v${r*2-6}`,wood);
const tracks=(color:string)=>[part('M-29 3h55q9 0 9 9t-9 9h-55q-8 0-8-9t8-9',iron),part('M-25 9h47M-24 15h2m8 0h2m8 0h2m8 0h2m8 0h2',color)];
export function vehicleParts(v:Vehicle):Part[]{
 const c=v.color;
 switch(v.id){
 case 'bowl':return [wheel(-22,10),wheel(23,8),part('M-29 1h59v7h-59z',wood),part('M-19 1-7-27 8 1z','#b49a69'),part('M-25-5h14v-17h-14z',cream),part('M-7-27h6v29h-6z',wood)];
 case 'crossbow':return [wheel(-23,7),wheel(24,7),part('M-31-1h63v7h-63z',wood),part('M-18 0-5-20 9 0z','#8fa376'),part('M-22-5h43v4h-43z',c)];
 case 'cannon':return [part('M-30 0h53l4 8h-55z',wood),part('M-18-4 1-18 15-4z',wood),wheel(-21,12),wheel(24,9),part('M-21 10h1M24 10h1',cream)];
 case 'beetle':return [...tracks('#c49473'),part('M-32 3q-8-38 20-39q29-1 42 25l-9 17z',c),part('M-16-31q10 17 3 29M-25-8h44', '#d68f71'),part('M-29-15h8v5h-8z',cream)];
 case 'duke':return [wheel(-25,8),wheel(0,7),wheel(25,8),part('M-34 4v-21h41l6-17h19v38z',c),part('M16-26h11v12H16z','#bed9c1'),part('M-29-23h25v5h-25z',cream),part('M-29-8h21m-21 5h21',iron),part('M12-33h12v4H12z','#d78361')];
 case 'mine':return [...tracks('#9eafba'),part('M-31 5v-17h58v17z',c),part('M-30-14v-18h14v18m4 0v-12h13v12',c),part('M16-16l8-13 9 13z',cream),part('M-26-28v10m6-10v10',iron)];
 case 'missile':return [...tracks('#b39bc5'),part('M-30 3-20-19 19-13 32 4z',c),part('M-22-19v-13h13v13M10-16v-11h12v14',cream),part('M-21-29h10m-10 4h10M11-23h10',iron)];
 case 'multi':return [wheel(-24,8),wheel(4,7),wheel(27,8),part('M-32 0h63v7h-63z',c),part('M-18 0-9-22h14L16 0z',iron),part('M-30 0v-8h12v8z',cream)];
 case 'laser':return [part('M-35 7q35-17 70 0q-2 12-35 12T-35 7',iron),part('M-31 7q30-10 62 0l-5 8h-52z','#aad8cb'),part('M-17-3q-5-20 15-25q24 1 25 27z',c),part('M-6-23 3-9 15-22',cream),part('M-28 19h12m6 0h12m6 0h12','#a8d6db')];
 case 'water':return [part('M-25 12q-19-29 3-36q16-8 34 0q24 7 16 36z',c),part('M-25-21q-1-19 11-19t12 18M7-23q-1-17 12-17t10 20','#afc8a0'),part('M-22-31h5M18-31h5',iron),part('M-24 5q20 15 49 0','#d1e4d2'),part('M-31 18q31-10 62 0', '#abd6db')];
 case 'ion':return [part('M-10 3-37-10l-4 10 29 12M10 3l27-13 4 10-29 12',cream),part('M-16 7q-7-34 12-34q29 1 24 34z',c),part('M-6-32h8v13h-8z',iron),part('M-25 15q25-7 50 0','#cfcdea')];
 case 'sea':return [part('M-20 0q-20 17-10 20q14 1 12-13M-6 2q-9 26 1 18q9-6 4-19M12 1q4 25 14 18q8-7-6-13M23-1q20 7 15 20q-8 5-8-6',c,iron,3),part('M-26 1q-10-34 3-40q15-7 34 1q20 15 14 39z',c),part('M-19-9q16-8 33 0',cream),part('M-17-26h8m15 0h8',iron)];
 case 'dragon':return [part('M-25 5-45-14l4 25 23 2',c),part('M-26 15q3-23 20-28l8-22 17-7 11 15-9 13 13 23-9 8z',c),part('M-4-17 4-30 11-13M-16-8l7-14 9 17',cream),part('M14-34h5m-9 4h23M-18 15h10l-2 7h-15m40-8h8v7H16',iron),part('M-9-7-29-31-32-8z', '#d0b16b')];
 }
}
export function mechanismParts(v:Vehicle):Part[]{
 const c=v.color;
 switch(v.id){
 case 'bowl':return [part('M-24-2h56v5h-56z',wood),part('M-21-2v16h-10V-2z',cream),part('M27-2q14 1 7 12q-4 4-12-1l5-11',cream),part('M24 2q9 10 10 4','none',wood)];
 case 'crossbow':return [part('M-17-3h49v6h-49z',wood),part('M22-23q25 23 0 46',c,iron,3.5),part('M22-23 12 0 22 23','none','#eee3c5',1.2),part('M0 0h36m-5-4 7 4-7 4','none',iron)];
 case 'cannon':return [part('M-13-7q16-4 31 0l14-4v22L18 7q-20 4-31 0z',iron),part('M26-10h6v20h-6z','#748076'),part('M32-7v14','none','#2c3c35',3),part('M-7-5h14','none','#abb5a3')];
 case 'multi':return [part('M-15-14h43v28h-43z',c),...[-9,0,9].map(y=>part(`M-10 ${y-3}h42v6h-42z`,iron)),part('M-12-15h8v30h-8z',cream)];
 case 'missile':return [part('M-10-10h40v20h-40z',c),...[-6,6].map(y=>part(`M-8 ${y-3}h40v6h-40z`,iron)),part('M27-9v18','none',cream,2)];
 case 'duke':return [part('M-7-5h35v10h-35z','#99a783'),part('M26-8h7V8h-7z',cream),part('M-4 6q-4 12-14 6','none',iron,3)];
 case 'mine':return [part('M-8-8h38v16H-8z',c),part('M26-9h7V9h-7z',iron),part('M-2-5h19v10H-2z',cream)];
 case 'water':return [part('M-5-4q15-7 35 0v8Q7 13-5 4z','#9fc3ba'),part('M23-5h10V6H23z','#d5ece2')];
 case 'ion':return [part('M-5-4h23v8H-5z',iron),part('M17-14q22 14 0 28M27-18v36','none','#b7b3d9',4),part('M27-5h8V5h-8z',cream)];
 case 'sea':return [part('M-3-3h22v6H-3z',c),part('M25-11q13 11 0 22q-11-11 0-22', '#c6bfdc'),part('M25-7v14','none',cream,2)];
 case 'dragon':return [part('M-9-8h36l9 8-9 8H-9z','#e3c269'),part('M1-5h23v10H1z',iron),part('M27-6h6V6h-6z',cream)];
 case 'laser':return [part('M-5-5h24l7 5-7 5H-5z',iron),part('M24-7h7V7h-7z','#a7e4db'),part('M-2-3h18v6H-2z',c)];
 default:return [part('M-6-6h37v12H-6z',c),part('M27-7h7V7h-7z',iron)];
 }
}
const svgParts=(parts:Part[])=>parts.map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.width}"/>`).join('');
export function vehicleIcon(v:Vehicle){return `<svg viewBox="-48 -48 98 75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgParts(vehicleParts(v))}<g transform="translate(0,-13) rotate(-25)">${svgParts(mechanismParts(v))}</g></svg>`;}
export function paintVehicle(c:CanvasRenderingContext2D,v:Vehicle,angle:number,time:number,firing:number,moving:boolean){
 const draw=(parts:Part[])=>{for(const p of parts){const path=new Path2D(p.d);c.fillStyle=p.fill;c.strokeStyle=p.stroke??iron;c.lineWidth=p.width??1.8;c.fill(path);c.stroke(path);}};
 c.save();c.lineJoin='round';c.lineCap='round';
 if(moving)c.translate(0,Math.sin(time*22)*1.2);
 draw(vehicleParts(v));
 c.save();c.translate(0,-13);
 // Release axis is body-relative, identical to Game.aim after parent body rotation.
 c.rotate(-angle*Math.PI/180);
 if(v.id==='bowl')c.rotate(-Math.sin(firing*Math.PI)*.9);
 else if(v.id==='crossbow')c.scale(1-firing*.09,1);
 else if(v.id==='multi'||v.id==='missile')c.translate(-Math.sin(firing*Math.PI)*3,Math.sin(time*30)*firing);
 else c.translate(-Math.sin(firing*Math.PI)*4,0);
 draw(mechanismParts(v));
 if(firing>0&&(v.id==='multi'||v.id==='missile')){c.fillStyle='#f4c474';c.beginPath();c.ellipse(36,(Math.floor(time*18)%3-1)*8,7*firing,3,0,0,7);c.fill();}
 c.restore();c.restore();
}
export {projectileArt,paintProjectilePreviews} from './projectile-art';
