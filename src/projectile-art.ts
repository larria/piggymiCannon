import {tankArtScale} from './reference-calibration';
import {weaponById,type WeaponId} from './catalog';
import {enlargedBattleProjectiles} from './weapon-presentation';
import {paintVectorProjectile} from './projectile-vector';

/** Render-only visibility adjustment. Never use projectile.scale (a damage factor). */
export const projectileDrawScale=(shape:string)=>shape==='cannon-special'?1.35:shape==='shell'?1.2:['crossbow-normal','crossbow-special','sniper','ion-normal'].includes(shape)?1.12:1;
/** Battlefield-only compensation; inventory/guide icons keep their existing sizes. */
export const projectileBattleScale=(shape:string,version:string)=>projectileDrawScale(shape)*tankArtScale(version)*(enlargedBattleProjectiles(version)&&shape!=='cannon-special'?1.24:1);
const rearExtents=new Map<string,number>();
/** Sample our actual vector silhouette once, so a short exhaust starts at its rear. */
export function projectileRearExtent(shape:string,sections=4){
 const key=shape+':'+sections,cached=rearExtents.get(key);if(cached!==undefined)return cached;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const c=canvas.getContext('2d',{willReadFrequently:true})!;
 c.translate(50,50);const size=projectileDrawScale(shape);c.scale(size,size);projectileArt(c,shape,'#ffffff',0,sections);
 const data=c.getImageData(0,0,100,100).data;let minX=50;for(let y=0;y<100;y++)for(let x=0;x<50;x++)if(data[(y*100+x)*4+3]>20)minX=Math.min(minX,x);
 const extent=Math.max(0,50-minX-1);rearExtents.set(key,extent);return extent;
}

/** Every available and legacy shell has its own silhouette. The catalog owns its body color. */
export function projectileArt(c:CanvasRenderingContext2D,shape:string,color:string,time:number,sections=4){
  if(paintVectorProjectile(c,shape,time,sections))return;
  const edge='#53624f';c.fillStyle=color;c.strokeStyle=edge;c.lineWidth=1.2;c.lineJoin='round';c.lineCap='round';
  const poly=(p:number[][])=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
  const oval=(x:number,y:number,rx:number,ry:number)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();};
  const line=(p:number[][],ink=color,width=2)=>{c.strokeStyle=ink;c.lineWidth=width;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.strokeStyle=edge;c.lineWidth=1.2;};
  const ring=(x:number,y:number,r:number,ink=color,width=3)=>{c.strokeStyle=edge;c.lineWidth=width+2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.strokeStyle=ink;c.lineWidth=width;c.stroke();c.strokeStyle=edge;c.lineWidth=1.2;};
  const shine=(x:number,y:number)=>{c.fillStyle='#fff4dd';c.beginPath();c.arc(x,y,1.6,0,7);c.fill();c.fillStyle=color;};
  switch(shape){
    case 'bowl-normal':poly([[-9,-3],[-4,-9],[5,-7],[10,2],[3,8],[-7,6]]);line([[-5,-2],[0,1],[4,-4]],'#413d36',1.5);break;
    case 'bowl-special':poly([[-21,-2],[-7,-10],[-10,-3],[3,-6],[10,0],[3,8],[-9,6],[-6,2]]);oval(2,0,5,5);shine(2,-1);break;
    case 'crossbow-normal':line([[-19,0],[9,0]],color,3);poly([[15,0],[6,-5],[7,0],[6,5]]);line([[-13,0],[-18,-5]],color);break;
    case 'crossbow-special':line([[-17,0],[8,0]],color,3);poly([[14,0],[3,-6],[5,0],[3,6]]);poly([[-11,0],[-19,-5],[-15,0],[-19,5]]);oval(-8,5,2,3);break;
    case 'cannon-normal':oval(0,0,10,10);shine(-4,-4);break;
    case 'medical':oval(0,0,10,10);shine(-4,-4);break;
    case 'cannon-special':oval(0,0,6,6);shine(-2,-2);break;
    case 'beetle-normal':poly([[-7,-5],[-3,-9],[5,-8],[8,-3],[6,4],[4,4],[4,8],[-4,8],[-4,4],[-7,3]]);c.fillStyle='#373a38';c.fillRect(-4,-2,3,3);c.fillRect(2,-2,3,3);c.fillRect(-2,4,4,2);break;
    case 'beetle-special':poly([[12,0],[4,-5],[-8,-5],[-4,-9],[-12,-6],[-9,0],[-12,6],[-4,9],[-8,5],[4,5]]);line([[-5,-3],[-5,3]],'#fff1d9');break;
    case 'duke-normal':line([[-17,0],[14,0]],color,2);c.strokeStyle=color;c.lineWidth=3;c.beginPath();for(let x=-13;x<11;x+=.5)c.lineTo(x,Math.sin(x*1.5)*4);c.stroke();oval(13,0,3,5);break;
    case 'duke-special':poly([[-10,-7],[4,-7],[4,-4],[10,-3],[10,3],[4,4],[4,7],[-10,7]]);line([[-4,-5],[-4,5]],'#fff1d9',3);shine(-7,-3);break;
    case 'mine-normal':oval(0,0,7,9);line([[-6,-3],[6,-3]],'#fff1d9',1);line([[-6,3],[6,3]],'#fff1d9',1);line([[0,-8],[0,8]],'#fff1d9',1);poly([[-3,-9],[3,-9],[3,-13],[-3,-13]]);break;
    case 'mine-special':oval(0,2,11,4);poly([[-7,1],[-5,-4],[5,-4],[7,1]]);line([[-10,-1],[-13,-4]],color);line([[10,-1],[13,-4]],color);shine(0,-3);break;
    case 'missile-normal':{
      const length=sections*5;poly([[12,0],[5,-5],[-length,-5],[-length+3,0],[-length,5],[5,5]]);
      for(let i=0;i<sections;i++)line([[2-i*5,-4],[2-i*5,4]],'#fff1d9',1);
      poly([[-length,0],[-length-6,-3],[-length-4,0],[-length-6,3]]);break;
    }
    case 'missile-special':poly([[15,0],[3,-5],[-4,-5],[-12,-10],[-8,-2],[-15,0],[-8,2],[-12,10],[-4,5],[3,5]]);shine(7,-1);break;
    case 'multi-normal':poly([[15,0],[6,-3],[6,-7],[0,-7],[0,-3],[-12,-3],[-12,3],[0,3],[0,7],[6,7],[6,3]]);line([[-10,0],[11,0]],'#fff1d9',1);break;
    case 'multi-special':poly([[9,0],[3,-3],[0,-9],[-3,-3],[-9,0],[-3,3],[0,9],[3,3]]);break;
    case 'laser-normal':poly([[14,0],[0,-6],[-14,0],[0,6]]);line([[-10,0],[10,0]],'#fff1d9',1.5);break;
    case 'laser-special':c.strokeStyle=color;c.lineWidth=4;c.beginPath();c.moveTo(-18,0);c.bezierCurveTo(-7,-13,6,13,17,0);c.moveTo(-18,0);c.bezierCurveTo(-7,13,6,-13,17,0);c.stroke();oval(17,0,3,3);break;
    case 'transfer':poly([[-13,-4],[1,-4],[1,-9],[13,0],[1,9],[1,4],[-13,4]]);break;
    case 'water-normal':
      c.beginPath();c.moveTo(-13,1);c.bezierCurveTo(-15,-7,-6,-9,-2,-6);c.bezierCurveTo(2,-14,13,-8,12,-1);c.bezierCurveTo(18,5,7,12,2,8);c.bezierCurveTo(-4,14,-14,8,-13,1);c.closePath();c.fill();c.stroke();
      shine(3,-4);shine(-6,0);oval(-17,5,2.2,2);oval(-13,-9,1.5,1.5);break;
    case 'water-special':poly([[10,0],[5,-9],[-5,-9],[-10,0],[-5,9],[5,9]]);for(let i=0;i<3;i++){const a=i*Math.PI/3;line([[-8*Math.cos(a),-8*Math.sin(a)],[8*Math.cos(a),8*Math.sin(a)]],'#fff1d9',1.5);}break;
    case 'ion-normal':oval(0,0,7,4);c.save();c.rotate(.6);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(0,0,13,6,0,0,7);c.stroke();c.rotate(-1.2);c.beginPath();c.ellipse(0,0,13,6,0,0,7);c.stroke();c.restore();shine(0,0);break;
    case 'ion-special':poly([[-4,-4],[4,-4],[4,4],[-4,4]]);poly([[-17,-6],[-8,-6],[-8,6],[-17,6]]);poly([[8,-6],[17,-6],[17,6],[8,6]]);line([[-8,0],[8,0]],'#fff1d9',1);break;
    case 'sea-normal':ring(0,0,11);ring(0,0,6,color,1.5);for(let i=0;i<4;i++){const a=i*Math.PI/2;line([[9*Math.cos(a),9*Math.sin(a)],[14*Math.cos(a),14*Math.sin(a)]],color);}break;
    case 'sea-special':ring(-6,0,6);ring(6,0,6);line([[-13,0],[13,0]],'#fff1d9',1);break;
    case 'dragon-normal':poly([[20,0],[5,-4],[-7,-4],[-14,-10],[-11,-2],[-20,0],[-11,2],[-14,10],[-7,4],[5,4]]);line([[-7,0],[12,0]],'#fff1d9',1.5);break;
    case 'dragon-special':poly([[14,0],[7,-7],[3,-3],[-2,-8],[-5,-4],[-14,-7],[-11,0],[-14,7],[-5,4],[-2,8],[3,3],[7,7]]);ring(-2,0,3,color,1.5);break;
    case 'shell':oval(0,0,8,5);line([[-3,-4],[-3,4]],'#fff1d9',1);break;
    case 'heavy':oval(0,1,10,10);line([[1,-8],[4,-13],[9,-11]],color,2);shine(9,-11);break;
    case 'triple':poly([[12,0],[4,-4],[-11,-4],[-11,4],[4,4]]);for(let x=-7;x<3;x+=4)line([[x,-3],[x,3]],'#fff1d9',1);break;
    case 'cluster':oval(-4,-4,5,5);oval(4,-4,5,5);oval(-4,4,5,5);oval(4,4,5,5);break;
    case 'drill':poly([[16,0],[-7,-8],[-7,8]]);for(let x=-5;x<10;x+=4)line([[x,-5],[x+3,4]],'#fff1d9',1);break;
    case 'bounce':oval(0,0,7,7);shine(-2,-3);break;
    case 'napalm':oval(-4,0,6,8);oval(4,0,6,8);oval(0,0,4,9);line([[0,-8],[3,-12]],color);break;
    case 'ice':poly([[13,0],[0,-11],[-9,0],[0,11]]);line([[-5,0],[8,0]],'#fff1d9',1);line([[0,-7],[0,7]],'#fff1d9',1);break;
    case 'emp':for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[6*Math.cos(a),6*Math.sin(a)],[13*Math.cos(a),13*Math.sin(a)]],color,2);}oval(0,0,5,5);break;
    case 'airstrike':poly([[-4,-3],[4,-3],[6,7],[0,10],[-6,7]]);line([[-4,-3],[-11,-10],[11,-10],[4,-3]],color,1.5);break;
    case 'quake':poly([[-9,-7],[7,-9],[11,7],[-5,10]]);line([[-7,-5],[0,1],[5,-4]],'#fff1d9',2);break;
    case 'sniper':poly([[23,0],[-15,-3],[-11,0],[-15,3]]);break;
    case 'homing':poly([[16,0],[4,-4],[-5,-10],[-4,-3],[-13,0],[-4,3],[-5,10],[4,4]]);ring(2,0,4,color,1.5);break;
  }
}

export function paintProjectilePreviews(root:ParentNode=document){
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-shell]').forEach(canvas=>{
    const w=weaponById(canvas.dataset.shell as WeaponId),large=canvas.classList.contains('shell-card-art');
    const width=large?84:40,height=large?44:28;canvas.width=width*2;canvas.height=height*2;
    const c=canvas.getContext('2d')!;c.scale(2,2);c.translate(width/2,height/2);const size=(large?1.2:.8)*projectileDrawScale(w.shape??w.id);c.scale(size,size);
    projectileArt(c,w.shape??w.id,w.color,0);canvas.dataset.color=w.color;
  });
}
