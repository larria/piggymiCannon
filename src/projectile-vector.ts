/** Hand-drawn vectors reviewed against 本机 ft2 目录/原版分析 horizontal frames.
 * One definition drives the battlefield, guide and animated SVG review page.
 * No bitmap references, hitboxes, damage scale or simulation timers live here. */
type Part={d?:string;oval?:[number,number,number,number];fill:string;stroke?:string;width?:number;opacity?:number;motion?:'flame'|'pulse';orbit?:[number,number]};
const edge='#343e42',paper='#fff9e8';
const p=(d:string,fill:string,stroke=edge,width=.8,motion?:Part['motion']):Part=>({d,fill,stroke,width,motion});
const e=(x:number,y:number,rx:number,ry:number,fill:string,stroke=edge,width=.8,motion?:Part['motion']):Part=>({oval:[x,y,rx,ry],fill,stroke,width,motion});
const light=(d:string,fill=paper)=>p(d,fill,'none');
const flame=(rear:number,y=0):Part[]=>[
 p(`M${rear},${y-3} L${rear-6},${y-4} ${rear-4},${y-2} ${rear-17},${y-2} ${rear-12},${y} ${rear-22},${y+1} ${rear-9},${y+2} ${rear-12},${y+4} ${rear},${y+3}Z`,'#d57a35','none',0,'flame'),
 p(`M${rear},${y-2} Q${rear-8},${y-2} ${rear-16},${y} Q${rear-7},${y+2} ${rear},${y+2}Z`,'#f4c66b','none',0,'flame'),
 p(`M${rear},${y-1} L${rear-9},${y} ${rear},${y+1}Z`,paper,'none',0,'flame')];
const fins=(rear:number,ink='#79b8bb'):Part[]=>[p(`M${rear},-4 l0,-4 6,2 2,3Z`,ink),p(`M${rear},4 l0,4 6,-2 2,-3Z`,ink),p(`M${rear},-2 h7 v4 h-7Z`,ink)];
const rock=(hot=false):Part[]=>[
 p('M-12,-6 -8,-11 0,-10 6,-9 11,-4 12,5 7,10 -2,11 -10,8 -13,1Z',hot?'#51565a':'#65675b'),
 p('M-8,-7 0,-8 7,-5 8,1 3,5 -5,5 -9,0Z',hot?'#858174':'#959080','none'),
 p('M-10,1 -5,4 -3,9 5,7 8,3 4,9 -2,10 -9,7Z','#454b46','none'),
 p('M-6,-3 -2,-1 -3,3 M2,-5 5,-2 3,1 M-1,6 2,4','none','#494d45',1.1),
 ...(hot?[p('M-13,-5 Q-10,-13 0,-12 Q13,-10 14,1 Q13,13 0,13 Q-13,10 -14,2','none','#d97c39',2,'pulse'),light('M-9,-9 -5,-11 -1,-10 0,-8Z','#f5c76d')]:[light('M-6,-6 -2,-7 1,-6 -2,-5Z','#b7b19a')])];
const arrow=(poison=false):Part[]=>[
 p('M-20,-1.4 8,-1.4 8,1.4 -20,1.4Z',poison?'#c5a358':'#9e673e'),
 p('M9,-4 13,-7 12,-2 19,0 12,2 13,7 9,4 6,2 6,-2Z','#b4c7cb'),
 light('M9,-2 15,0 9,1 7,0Z'),p('M1,-2 h4 v4 h-4Z','#617c87'),
 p('M-20,-2 -14,-2 -13,0 -14,2 -20,2Z',poison?'#8f72b3':'#d9c2a0'),
 ...(poison?[p('M11,-2 18,0 11,2','none','#81cee0',1.1,'pulse')]:[])];
const segmentedMissile=(sections=4):Part[]=>{const rear=2-Math.max(1,sections)*4;return [...flame(rear),...Array.from({length:Math.max(1,sections)},(_,i)=>p(`M${2-i*4},-5 h-4 v10 h4Z`,i%2?'#7d8b87':'#a6b3a7')),p(`M${rear},-5 v-4 l6,2 2,3 M${rear},5 v4 l6,-2 2,-3`,'#839f9f'),p('M2,-5 7,-7 13,-2 16,0 13,3 7,7 2,5Z','#bd4940'),p('M3,-4 7,-4 10,0 7,4 3,4Z','#e39b68'),p('M1,-1 H11 L13,0 11,2 H1Z','#5e859a'),light('M4,-5 7,-5 9,-3 7,-2Z','#f9cbab')];};
export const PROJECTILE_VECTORS:Record<string,Part[]>={
 'sea-special':[e(0,0,4.5,10,'none','#9ac953',2),p('M-2,-9 -7,-12 M2,-8 9,-12 M-4,-2 -13,-3 M4,1 13,2 M-2,8 -10,12 M2,8 9,13','none','#9270be',2,'pulse'),p('M-1,-8 -3,-11 M1,-7 5,-10 M-5,-1 -10,-2 M5,2 10,3 M-1,8 -5,11 M2,7 5,10','none','#c4a6d9',.8,'pulse')],
 'sea-normal':[e(0,0,9.5,9.5,'none','#81b64c',4),e(0,0,9.5,9.5,'none','#b2d66d',1.8),p('M-8,-6 Q-2,-10 -1,-7 M7,-7 Q11,-3 8,-1 M7,7 Q2,11 1,8 M-7,7 Q-11,3 -8,1','none','#db9a51',2.2,'pulse'),p('M-7,-5 -3,-8 M7,-5 9,-2 M6,7 2,9 M-7,5 -9,2','none','#fff0c4',1.3,'pulse')],
 'ion-special':[...flame(-8).map(a=>({...a,fill:a.fill==='#d57a35'?'#80c6cf':a.fill==='#f4c66b'?'#b8e2db':paper,opacity:.85})),e(1,0,10,9,'#e7cf82','none',0,'pulse'),e(1,0,8,8,'#f5edb4','#d1b365',.6),e(0,-1,5.8,5.8,'#fffce0','none'),p('M-6,-5 -8,-7 M0,-9 V-11 M8,-5 10,-7 M9,5 11,6 M0,9 V11 M-7,5 -9,6','none','#dfc477',1.1,'pulse')],
 'ion-normal':[...flame(-6).map(a=>({...a,opacity:.65})),e(0,0,9,8,'#f4b095','none',0,'pulse'),e(0,0,6.8,6.8,'#ee947b','#df806d',.8),e(-1,-1,4.8,4.8,'#f6c3a5','none'),p('M-7,-2 -9,-3 M-4,-6 -5,-8 M2,-7 3,-9 M7,-2 9,-3 M6,5 8,6 M-3,7 -4,9','none','#efa181',1.4,'pulse'),e(-2,-3,2,1.3,'#fff0c3','none')],
 'water-special':[p('M-11,0 Q-12,-6 -5,-7 Q-1,-10 4,-7 Q11,-7 12,-1 Q14,5 8,6 Q3,9 -2,7 Q-8,9 -11,3Z','#9270ba','#72558f'),p('M-7,-3 Q-2,-7 3,-3 Q8,-1 5,3 Q0,5 -1,2 Q-2,-1 2,0','none','#bd9bdd',1.4,'pulse'),e(-6,-3,1.8,1,'#ddd1ec','none'),p('M-8,1 Q-6,6 -2,5','none','#a48bc9',1)],
 'water-normal':[p('M-15,0 Q-15,-8 -7,-8 Q-3,-13 4,-9 Q13,-9 15,-2 Q19,4 11,8 Q7,12 1,9 Q-7,12 -12,6 Q-16,6 -15,0Z','#77b4b4','#538b8b'),p('M-9,-4 Q-3,-9 3,-5 Q8,-5 9,0 Q10,5 3,5 Q-3,5 -2,1 Q-2,-2 3,-1','none','#b4ded7',1.5,'pulse'),p('M-12,1 Q-10,7 -4,6 M8,-5 Q13,-1 11,3','none','#a0d4d1',1.1),e(-7,-3,2,1.1,'#d6eece','none')],
 'multi-special':[...flame(-9),...fins(-9,'#9a73b9'),p('M-9,-3 H8 L13,0 8,3 H-9Z','#9c8648'),p('M7,-3 13,0 7,3Z','#9acb55'),p('M-8,-1.8 H4 V1.8 H-8Z','#474f4b','none'),light('M-6,-2 H5 V-1 H-6Z','#d4ba79'),light('M8,-1 10,0 8,1Z','#e6edb4')],
 'multi-normal':[...flame(-12),...fins(-12,'#9872b4'),p('M-12,-3 H-7 V3 H-12Z','#4f6b7d'),p('M-7,-4 H0 L4,0 0,4 H-7Z','#a08c4d'),p('M3,-1.4 H10 V1.4 H3Z','#83a346'),p('M9,-3 H16 L20,0 16,3 H9Z','#b19c54'),p('M15,-3 20,0 15,3Z','#ca4c41'),light('M-6,-2 H0 V-1 H-6Z','#dcc887'),light('M10,-1.5 H14 V-.5 H10Z','#d0c78d')],
 'missile-special':[...flame(-12).map(a=>({...a,fill:a.fill==='#d57a35'?'#557fa4':a.fill==='#f4c66b'?'#8fbad6':paper})),p('M-12,-5 V-9 L-5,-7 -2,-4 H4 V4 H-2 L-5,7 -12,9 V5Z','#98aaa7'),p('M-12,-4 H4 V4 H-12Z','#7b9091'),p('M1,-5 7,-7 13,-3 15,0 13,3 7,7 1,5Z','#74a73d'),p('M12,-2 H19 V2 H12Z','#547990'),light('M4,-4 7,-4 10,-2 6,-1Z','#cfe3a0'),light('M-10,-3 H0 V-1 H-10Z','#d3dac5')],
 'missile-normal':segmentedMissile(),
 'mine-special':[p('M-6,2 -5,-1 H5 L6,2 7,4 H-7Z','#668ca3'),p('M-3,-1 V-7 H3 V-1Z','#c64b3d'),light('M-2,-6 H-1 V-2 H-2Z','#ffe4a9'),e(0,2,5.4,1.3,'#bfd8dc','none'),p('M-2,-7 V-9 H2 V-7Z','#415260')],
 'mine-normal':[p('M-6,-6 -3,-10 4,-10 8,-6 9,4 4,9 -5,8 -9,3 -9,-4Z','#496b84'),p('M-7,-4 4,-4 6,2 2,7 -5,6 -8,1Z','#7f7f66'),p('M-3,-10 V-13 H2 V-10Z','#344c5b'),light('M-6,-3 H3 V-2 H-6Z','#b5b095'),...[-2,1,4].map(y=>e(0,y,1.1,.65,'#b2ad86','none')),e(3,-6,.8,.8,paper,'none')],
 'beetle-special':[...flame(-8),p('M-8,-2 -8,-7 -4,-7 1,-2 1,2 -4,7 -8,7 -8,2Z','#7da943'),p('M-8,-3 H8 L12,0 8,3 H-8Z','#507e39'),light('M-6,-1 H7 L9,0 H-6Z','#b5d265'),p('M-7,1 H0','none','#365a35',1)],
 'beetle-normal':[...flame(-10),p('M-10,-3 -10,-10 -5,-10 2,-3 2,3 -5,10 -10,10 -10,3Z','#5f95b3'),p('M-10,-4 H13 L17,0 13,4 H-10Z','#4d8786'),p('M9,-4 H13 L17,0 13,4 H9Z','#6085a8'),light('M-8,-1.5 H7 V-.2 H-8Z','#a0d0c3'),p('M-10,1 H1','none','#2f5267',1.3)],
 'bowl-normal':rock(),
 'bowl-special':rock(true),
 'crossbow-normal':arrow(),
 'crossbow-special':arrow(true),
 'cannon-normal':[e(0,0,10,10,'#454b4d'),e(-2,-2,7,7,'#737d7d','none'),e(-3,-4,2.7,1.6,'#cdd5cc','none'),p('M-7,5 Q0,10 7,5','none','#303b3d',1.4)],
 'cannon-special':[e(0,0,6,6,'#b04b48'),e(-1,-1,4.3,4.3,'#d77965','none'),e(-2,-2.4,1.6,1,'#ffe0ad','none')],
 'duke-normal':[
  ...flame(-15),...fins(-15),p('M-14,-3 H3 L8,-7 14,-5 18,0 14,5 8,7 3,3 H-14Z','#42688a'),
  p('M3,-3 8,-3 12,-6 13,-2 13,2 12,6 8,3 3,3Z','#85c5c4'),
  p('M-12,-1.7 H2 V1.7 H-12Z','#91bfc0','none'),light('M5,-1 12,-1 15,0 12,1 5,1Z','#b9ddce')],
 'duke-special':[
  ...flame(-12),...fins(-12),p('M-5,-6 Q5,-8 12,-5 L15,0 12,5 Q5,8 -5,6Z','#566e7a'),
  p('M-5,-6 H-2 V6 H-5Z','#b49652'),p('M8,-6 H11 V6 H8Z','#d2b669'),light('M0,-3 Q4,-5 7,-3 L7,-1 0,-1Z','#859b9e'),e(5,3,2,.8,'#c7d3b8','none')],
 'laser-normal':[
  e(0,0,12,7,'#b4e4e2','none',0,'pulse'),p('M-11,0 Q-9,-7 -2,-5 Q3,-8 10,-3 L12,1 Q7,7 1,5 Q-7,7 -11,0Z','#4e7fa2','#79c5d0'),
  p('M-9,-3 -5,-2 -2,-5 0,0 3,-3 7,-1 9,-3','none','#dff9ef',1.7,'pulse'),light('M-7,3 Q0,5 7,3 L5,4 -3,5Z','#8ccbd9')],
 'laser-special':[
  p('M-12,1 -7,-5 1,-7 12,-1 7,5 -1,7Z','#815cb6','#b69acb'),
  p('M-9,1 -4,-3 3,-4 9,-1 4,3 -3,4Z','#dbcef1','none',0,'pulse'),
  p('M-10,4 -7,1 M8,-5 10,-2','none','#8acee0',1.4)],
 'dragon-normal':[
  ...flame(-13),...fins(-13,'#6a9bac'),p('M-7,-2 H-3 V2 H-7Z','#6aaaac'),
  p('M-3,-5 H14 Q19,0 14,5 H-3Z','#b39545'),p('M-3,-5 H1 V5 H-3Z','#8972a3'),
  light('M2,-3 H13 L15,-1 H2Z','#e4cf84'),light('M-1,-2 H0 V1 H-1Z','#d1b2d3')],
 'dragon-special':[
  ...flame(-10),p('M-9,-3 -12,-9 -7,-8 -3,-4 1,-3 1,3 -3,4 -7,8 -12,9 -9,3Z','#76b4b5'),
  p('M-11,-2 H5 V2 H-11Z','#386277'),p('M3,-4 8,-6 14,0 8,6 3,4Z','#63adb0'),light('M6,-3 11,0 6,2Z','#9cdbce'),p('M-10,-.8 H1','none','#a5dbce',1)]
};
const pathCache=new Map<string,Path2D>();
const atlases=new Map<string,HTMLCanvasElement[]>();
// Tight transparent bounds keep all 116 frames around 14 MiB, not full-screen textures.
const PERIOD=.28,WIDTH=88,HEIGHT=40,SCALE=3;
const phases=[0,.25,.5,.75];
for(const definition of Object.values(PROJECTILE_VECTORS))if(!definition.some(part=>part.motion)){const highlight=definition.find(part=>part.stroke==='none'&&part.fill!==edge);if(highlight)highlight.motion='pulse';}
function parts(shape:string,sections:number){
 const definition=PROJECTILE_VECTORS[shape];
 if(shape==='missile-normal'&&sections<4)return segmentedMissile(sections);
 return definition;
}
function opacity(part:Part,phase:number){return (part.opacity??1)*(part.motion==='pulse'?.72+.28*Math.sin(phase*Math.PI)**2:1);}
function drawParts(c:CanvasRenderingContext2D,shape:string,phase:number,sections:number){
 for(const part of parts(shape,sections)??[]){c.save();c.globalAlpha=opacity(part,phase);if(part.motion==='flame')c.transform(.82+phase*.18,0,0,.84+Math.sin(phase*Math.PI)*.16,0,0);c.fillStyle=part.fill;c.strokeStyle=part.stroke??edge;c.lineWidth=part.width??.8;c.lineJoin='round';c.lineCap='round';
  let path:Path2D;if(part.d){path=pathCache.get(part.d)??new Path2D(part.d);pathCache.set(part.d,path);}else{const [x,y,rx,ry]=part.oval!;path=new Path2D();path.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
  if(part.fill!=='none')c.fill(path);if(part.stroke!=='none'&&(part.width??.8)>0)c.stroke(path);c.restore();
 }
}
const rearCenters:Record<string,number>={'bowl-normal':-12,'bowl-special':-12,'crossbow-normal':-20,'crossbow-special':-20,'cannon-normal':-10,'cannon-special':-6,'beetle-normal':-10,'beetle-special':-8,'duke-normal':-15,'duke-special':-12,'mine-normal':-9,'mine-special':-7,'missile-normal':-14,'missile-special':-12,'multi-normal':-12,'multi-special':-9,'laser-normal':-11,'laser-special':-12,'water-normal':-15,'water-special':-11,'ion-normal':-6,'ion-special':-8,'sea-normal':-10,'sea-special':-5,'dragon-normal':-13,'dragon-special':-10};
function boostParts(shape:string,time:number,sections=4):Part[]{const rear=shape==='missile-normal'?2-Math.max(1,sections)*4:rearCenters[shape]??-10;return Array.from({length:3},(_,i)=>{const a=time*8+i*Math.PI*2/3,x=rear-3-i*3,y=Math.sin(a)*5;const points=Array.from({length:10},(_,j)=>{const b=-Math.PI/2+j*Math.PI/5,r=j%2?1.3:2.9;return `${Math.cos(b)*r},${Math.sin(b)*r}`;});return {...p('M'+points.join(' L')+'Z',i%2?'#edb663':'#f7d788','#a67d42',.45),orbit:[x,y] as [number,number]};});}
export function paintBoostStars(c:CanvasRenderingContext2D,shape:string,time:number,sections=4){for(const part of boostParts(shape,time,sections)){c.save();c.translate(...part.orbit!);c.fillStyle=part.fill;c.strokeStyle=part.stroke!;c.lineWidth=part.width!;const path=pathCache.get(part.d!)??new Path2D(part.d!);pathCache.set(part.d!,path);c.fill(path);c.stroke(path);c.restore();}}
function atlas(shape:string,sections=4){sections=shape==='missile-normal'?Math.max(1,Math.min(4,Math.floor(sections)||4)):4;const key=shape+':'+sections,old=atlases.get(key);if(old)return old;if(!PROJECTILE_VECTORS[shape])return;
 const frames=phases.map(phase=>{const canvas=document.createElement('canvas');canvas.width=WIDTH*SCALE;canvas.height=HEIGHT*SCALE;const c=canvas.getContext('2d')!;c.scale(SCALE,SCALE);c.translate(WIDTH/2,HEIGHT/2);drawParts(c,shape,phase,sections);return canvas;});atlases.set(key,frames);return frames;
}
/** Bake once during loading. Flight frames only drawImage; pause follows game time. */
export function warmProjectileVectors(){for(const shape of Object.keys(PROJECTILE_VECTORS))atlas(shape);for(let sections=1;sections<4;sections++)atlas('missile-normal',sections);}
export function projectileVectorCacheStats(){return {atlases:atlases.size,frames:[...atlases.values()].reduce((n,a)=>n+a.length,0),bytes:[...atlases.values()].reduce((n,a)=>n+a.reduce((b,c)=>b+c.width*c.height*4,0),0)};}
export function paintVectorProjectile(c:CanvasRenderingContext2D,shape:string,time:number,sections=4){if(typeof document==='undefined')return false;const frames=atlas(shape,sections);if(!frames)return false;const frame=Math.floor(((time%PERIOD+PERIOD)%PERIOD)/PERIOD*4)%4;c.drawImage(frames[frame],-WIDTH/2,-HEIGHT/2,WIDTH,HEIGHT);return true;}
export function projectileSvg(shape:string,animated=true,sections=4,phase=0,boosted=false){
 const markup=(parts(shape,sections)??[]).map(part=>{const body=part.d?`<path d="${part.d}"/>`:`<ellipse cx="${part.oval![0]}" cy="${part.oval![1]}" rx="${part.oval![2]}" ry="${part.oval![3]}"/>`;
 const animation=animated&&part.motion?(part.motion==='flame'?`<animateTransform attributeName="transform" type="scale" values=".82 .84;1 1;.88 .92;.82 .84" dur="${PERIOD}s" repeatCount="indefinite"/>`:`<animate attributeName="opacity" values=".72;1;.72" dur="${PERIOD}s" repeatCount="indefinite"/>`):'';
 return `<g fill="${part.fill}" stroke="${part.stroke??edge}" stroke-width="${part.width??.8}" opacity="${opacity(part,phase)}"${!animated&&part.motion==='flame'?` transform="scale(${.82+phase*.18} ${.84+Math.sin(phase*Math.PI)*.16})"`:''}>${body}${animation}</g>`;
 }).join('');const stars=boosted?boostParts(shape,phase,sections).map((part,i)=>`<g fill="${part.fill}" stroke="${part.stroke}" stroke-width="${part.width}" transform="translate(${part.orbit!.join(' ')})"><path d="${part.d}"/>${animated?`<animateTransform attributeName="transform" type="translate" values="${part.orbit![0]} -5;${part.orbit![0]} 5;${part.orbit![0]} -5" dur=".8s" begin="-${i*.26}s" repeatCount="indefinite"/>`:''}</g>`).join(''):'';return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-52 -32 104 64" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img">${markup}${stars}</svg>`;
}
