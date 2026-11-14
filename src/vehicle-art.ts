import type {Vehicle} from './vehicles';
export function vehicleIcon(v:Vehicle) {
  const extras:Record<string,string>={catapult:'<path d="M24 31 18 9M17 9l16-4 5 7-16 5" stroke="#a49168" stroke-width="5"/>',crossbow:'<path d="M25 10v24M12 13q25 14 0 27M12 13v27"/>',cannon:'<path d="m29 26 22-16" stroke-width="7"/>',beetle:'<path d="M17 34Q32 4 49 34M32 16v18"/>',duke:'<path d="M19 30v-9h9v9m9 0V14h8v16"/>',mine:'<path d="M17 32V20h15v12m4-6h12m-7-5v10"/>',missile:'<path d="m19 27 27-17-7 21-20-4Z"/>',multi:'<path d="m18 22 23-15m-18 23 23-15m-18 23 23-15" stroke-width="5"/>',laser:'<ellipse cx="32" cy="29" rx="21" ry="9"/><path d="m30 23 14-13"/>',water:'<path d="M17 30q-7-17 8-11m24 11q7-17-8-11M23 17q10-16 16 0"/>',ion:'<path d="M31 29V14m-12-7q12 24 24 0M16 8h32"/>',sea:'<path d="M17 30q-8 12-3 15m13-15q-6 14-1 16m12-16q8 12 6 16m6-16q12 8 9 13"/>',dragon:'<path d="M18 30 4 14l3 19m18-8 3-13 6 7 6-11 5 19m4 8 9-8-3 15"/>'};
  return `<svg viewBox="0 0 64 52" fill="none" stroke="${v.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="33" width="42" height="13" rx="6" fill="${v.color}" opacity=".3"/><path d="M17 38h32m-29 5h2m8 0h2m8 0h2"/>${extras[v.body]||extras.cannon}<path d="M17 33h31" stroke-width="7"/></svg>`;
}
export function projectileArt(ctx:CanvasRenderingContext2D,shape:string,color:string,time:number) {
  ctx.fillStyle=color;ctx.strokeStyle='#f4e8c7';ctx.lineWidth=1.2;
  const oval=(rx:number,ry:number)=>{ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const path=(points:number[][])=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();};
  const ring=(r:number)=>{ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();};
  switch(shape) {
    case 'bowl-normal':ctx.fillStyle='#8f897c';path([[-8,-4],[-4,-9],[5,-7],[10,1],[3,8],[-6,6]]);ctx.strokeStyle='#c6b998';ctx.beginPath();ctx.moveTo(-4,-3);ctx.lineTo(2,-5);ctx.stroke();break;
    case 'bowl-special':ctx.fillStyle='#efb45e';path([[-20,-3],[-5,-8],[6,-4],[8,5],[-7,7]]);ctx.fillStyle='#ac6a42';oval(7,6);break;
    case 'cannon-normal':ctx.fillStyle='#5d6055';oval(10,10);ctx.fillStyle='#92998b';ctx.beginPath();ctx.arc(-3,-4,3,0,7);ctx.fill();ctx.strokeStyle='#384338';ring(10);break;
    case 'cannon-special':ctx.fillStyle='#fa6560';oval(3,2);ctx.strokeStyle='#ffcb87';ring(5+Math.sin(time*22));break;
    case 'crossbow-normal':ctx.strokeStyle='#655547';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle='#abb5ad';path([[14,0],[5,-4],[5,4]]);break;
    case 'crossbow-special':ctx.strokeStyle='#81af5f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(8,0);ctx.moveTo(-12,0);ctx.lineTo(-16,4);ctx.stroke();ctx.fillStyle='#b6d476';path([[13,0],[4,-5],[5,5]]);break;
    case 'beetle-normal':ctx.fillStyle='#e5dac1';oval(7,7);ctx.fillStyle='#54534c';ctx.fillRect(-4,-3,3,3);ctx.fillRect(1,-3,3,3);ctx.fillRect(-3,3,6,2);break;
    case 'beetle-special':ctx.fillStyle='#b56953';oval(6,4);ctx.strokeStyle='#f0b78b';ctx.beginPath();ctx.moveTo(-2,-4);ctx.lineTo(-2,4);ctx.moveTo(-6,-1);ctx.lineTo(-10,-5);ctx.stroke();break;
    case 'duke-normal':ctx.strokeStyle='#d0b28b';ctx.lineWidth=2.5;ctx.beginPath();for(let x=-10;x<=10;x++) ctx.lineTo(x,Math.sin(x*1.6)*3);ctx.stroke();break;
    case 'duke-special':ctx.fillStyle='#a3bf69';ctx.fillRect(-7,-4,12,8);ctx.fillStyle='#e9ddb1';ctx.fillRect(5,-2,4,4);ctx.strokeRect(-7,-4,12,8);break;
    case 'mine-normal':ctx.fillStyle='#798463';oval(6,8);ctx.strokeStyle='#b3bc97';ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(5,-2);ctx.moveTo(-5,3);ctx.lineTo(5,3);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();break;
    case 'mine-special':ctx.fillStyle='#515c53';oval(9,4);ctx.fillStyle='#e9815f';ctx.fillRect(-2,-6,4,3);break;
    case 'missile-normal':ctx.fillStyle='#aa85be';path([[12,0],[3,-5],[-10,-4],[-7,0],[-10,4],[3,5]]);ctx.fillStyle='#f4c976';ctx.fillRect(-14,-2,5,4);break;
    case 'missile-special':ctx.fillStyle='#a1d3cb';path([[10,0],[3,-7],[-7,-5],[-5,0],[-10,6],[3,6]]);ctx.fillStyle='#4b6d6d';ctx.fillRect(2,-3,2,2);break;
    case 'multi-normal':ctx.strokeStyle='#a8b9c5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(10,0);ctx.moveTo(4,-4);ctx.lineTo(11,-4);ctx.moveTo(4,4);ctx.lineTo(11,4);ctx.stroke();break;
    case 'multi-special':ctx.fillStyle='#f2d180';path([[7,0],[2,-2],[0,-7],[-2,-2],[-7,0],[-2,2],[0,7],[2,2]]);ctx.strokeStyle='#e4a263';ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-6,0);ctx.stroke();break;
    case 'laser-normal':ctx.fillStyle='#9ddbd5';path([[11,0],[0,-5],[-10,0],[0,5]]);ctx.strokeStyle='#d9f5dd';ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(8,0);ctx.stroke();break;
    case 'laser-special':ctx.fillStyle='#98add8';path([[9,0],[0,-6],[-9,0],[0,6]]);ctx.strokeStyle='#d8b8e7';ring(10);break;
    case 'water-normal':ctx.fillStyle='#97cde0';oval(8,8);ctx.fillStyle='#d5eafa';ctx.beginPath();ctx.arc(-2,-3,2.2,0,7);ctx.fill();break;
    case 'water-special':ctx.fillStyle='#b5a4e0';path([[11,0],[2,-7],[-6,-5],[-9,1],[-2,7],[6,5]]);ctx.strokeStyle='#eee4fa';ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(6,4);ctx.stroke();break;
    case 'ion-normal':ctx.fillStyle='#d0b5e6';oval(7,4);ctx.strokeStyle='#e9e3f8';ctx.beginPath();ctx.moveTo(-11,-6);ctx.lineTo(-7,-6);ctx.lineTo(-7,6);ctx.moveTo(11,-6);ctx.lineTo(7,-6);ctx.lineTo(7,6);ctx.stroke();break;
    case 'ion-special':ctx.fillStyle='#a5c8e0';ctx.fillRect(-4,-4,8,8);ctx.strokeStyle='#ead8a1';ctx.strokeRect(-8,-7,16,14);ring(11);break;
    case 'sea-normal':ctx.strokeStyle='#db9fc7';ctx.lineWidth=3;ring(9);ctx.strokeStyle='#ade0df';ring(4);break;
    case 'sea-special':ctx.strokeStyle='#b3d3ec';ctx.lineWidth=2;ring(6);ctx.save();ctx.translate(-8,Math.sin(time*14)*4);ctx.strokeStyle='#e4aed3';ring(5);ctx.restore();break;
    case 'dragon-normal':ctx.fillStyle='#ebc26b';path([[14,0],[4,-6],[-10,-4],[-7,0],[-10,4],[4,6]]);ctx.fillStyle='#d57a45';path([[-15,0],[-6,-3],[-6,3]]);break;
    case 'dragon-special':ctx.fillStyle='#ffd980';path([[13,0],[3,-7],[-7,-4],[-7,4],[3,7]]);ctx.strokeStyle='#eaa868';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-2);ctx.lineTo(-8,-2);ctx.moveTo(-18,2);ctx.lineTo(-8,2);ctx.stroke();break;
    default:oval(7,5);ctx.fillStyle='#f4ce82';ctx.fillRect(-8,-2,4,4);
  }
}
