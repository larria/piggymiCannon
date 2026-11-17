import {RANKS,type RankIndex} from './progression';
const COLORS=[['#986349','#cd9970','#efd3aa','#876953'],['#657d87','#a8bbc0','#edf2ed','#758e91'],['#a17929','#e5bd61','#fff0b4','#8a9361'],['#655377','#b8a7c7','#f7e3b0','#826898']];
const star='M20 12l2.2 4.7 5.1.6-3.8 3.5 1 5.1-4.5-2.5-4.5 2.5 1-5.1-3.8-3.5 5.1-.6z';
let sequence=0;
export function medalSvg(tier:RankIndex,className='rank-medal'){
 const [ink,metal,light,ribbon]=COLORS[tier],id=`medal-metal-${tier}-${++sequence}`;
 const rim=tier===0?'M20 7a12 12 0 1 0 0 24 12 12 0 1 0 0-24':tier===1?'M20 5l13 8-3 13-10 7-10-7-3-13z':'M8 8q12-5 24 0v13q-2 10-12 13Q10 31 8 21z';
 return `<svg class="${className}" viewBox="0 0 40 44" role="img" aria-label="${RANKS[tier].name}勋章"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${ink}"/></linearGradient></defs><path d="M10 26l-2 15 7-3 5 4 1-15m9-1 2 15-7-3-5 4-1-15" fill="${ribbon}" stroke="${ink}" stroke-width=".8"/>${tier>=2?`<path d="M8 30C0 26 1 15 5 10M32 30c8-4 7-15 3-20" fill="none" stroke="${ink}" stroke-width="1.2"/><path d="M4 25 1 20 5 21M3 19 1 14 5 16M4 13 3 8 7 11M36 25l3-5-4 1m2-2 2-5-4 2m1-3 1-5-4 3" fill="${metal}"/>`:''}<path d="${rim}" fill="url(#${id})" stroke="${ink}" stroke-width="1.3"/><path d="${star}" fill="${light}" stroke="${ink}" stroke-width=".9"/>${tier===1?`<path d="m13 9 7-3 7 3M12 27l8 5 8-5" fill="none" stroke="${light}" stroke-width="1"/>`:''}${tier===3?`<path d="M11 8 9 2l7 3 4-5 4 5 7-3-2 6z" fill="${light}" stroke="${ink}" stroke-width="1.1"/><circle cx="20" cy="7" r="1.2" fill="${ink}"/>`:''}</svg>`;
}
const cache=new Map<RankIndex,HTMLCanvasElement>();
/** Tiny cached vector medals share silhouettes/colours with HTML, no frame allocations. */
export function paintMedal(ctx:CanvasRenderingContext2D,tier:RankIndex,x:number,y:number,size=22){
 let art=cache.get(tier);if(!art){art=document.createElement('canvas');art.width=80;art.height=88;const c=art.getContext('2d')!;c.scale(2,2);const [ink,metal,light,ribbon]=COLORS[tier];
  c.fillStyle=ribbon;c.strokeStyle=ink;c.lineWidth=.8;for(const path of ['M10 26l-2 15 7-3 5 4 1-15z','M30 26l2 15-7-3-5 4-1-15z']){const p=new Path2D(path);c.fill(p);c.stroke(p);}
  if(tier>=2){c.strokeStyle=ink;c.lineWidth=1.2;c.stroke(new Path2D('M8 30C0 26 1 15 5 10M32 30c8-4 7-15 3-20'));c.fillStyle=metal;c.fill(new Path2D('M4 25 1 20 5 21M3 19 1 14 5 16M4 13 3 8 7 11M36 25l3-5-4 1m2-2 2-5-4 2m1-3 1-5-4 3'));}
  const gradient=c.createLinearGradient(8,6,30,32);gradient.addColorStop(0,light);gradient.addColorStop(.5,metal);gradient.addColorStop(1,ink);c.fillStyle=gradient;c.strokeStyle=ink;c.lineWidth=1.3;
  const rim=new Path2D(tier===0?'M20 7a12 12 0 1 0 0 24 12 12 0 1 0 0-24':tier===1?'M20 5l13 8-3 13-10 7-10-7-3-13z':'M8 8q12-5 24 0v13q-2 10-12 13Q10 31 8 21z');c.fill(rim);c.stroke(rim);c.fillStyle=light;c.lineWidth=.9;c.fill(new Path2D(star));c.stroke(new Path2D(star));
  if(tier===1){c.strokeStyle=light;c.lineWidth=1;c.stroke(new Path2D('m13 9 7-3 7 3M12 27l8 5 8-5'));}
  if(tier===3){c.strokeStyle=ink;c.fill(new Path2D('M11 8 9 2l7 3 4-5 4 5 7-3-2 6z'));c.stroke(new Path2D('M11 8 9 2l7 3 4-5 4 5 7-3-2 6z'));c.fillStyle=ink;c.beginPath();c.arc(20,7,1.2,0,7);c.fill();}
  cache.set(tier,art);
 }ctx.drawImage(art,x,y,size,size*1.1);
}
