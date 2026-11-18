import type {VehicleId} from './vehicles';
import type {WeaponId} from './catalog';
import {referenceCalibration} from './reference-calibration';
/** Source grid -> logic/world is x3. The 60x51 collider and weapon units stay fixed; world
 * dimensions are recorded per match; battlefield artwork is calibrated separately by version. */
export const SOURCE_CELL=3,SOURCE_BODY_WIDTH=60,SOURCE_BODY_HEIGHT=51;
const versions=new Map<string,boolean>();
export function originalBallistics(version:string){const cached=versions.get(version);if(cached!==undefined)return cached;const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);const result=!v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=5);if(versions.size>=128)versions.clear();versions.set(version,result);return result;}
export const ORIGINAL_TANKS:Record<VehicleId,{index:number;defence:number;normal:[number,number];special:[number,number]}>= {
 bowl:{index:1,defence:100,normal:[300,45],special:[150,40]},crossbow:{index:2,defence:99,normal:[330,31],special:[100,28]},cannon:{index:3,defence:89,normal:[140,78],special:[420,35]},beetle:{index:4,defence:118,normal:[230,57],special:[150,38]},duke:{index:5,defence:123,normal:[240,55],special:[153,43]},missile:{index:6,defence:117,normal:[120,45],special:[90,32]},multi:{index:7,defence:115,normal:[175,40],special:[60,28]},laser:{index:8,defence:95,normal:[220,70],special:[49,40]},mine:{index:9,defence:115,normal:[220,52],special:[320,30]},ion:{index:10,defence:91,normal:[200,48],special:[270,66]},water:{index:11,defence:105,normal:[230,54],special:[190,43]},sea:{index:12,defence:92,normal:[220,65],special:[166,42]},dragon:{index:13,defence:125,normal:[225,60],special:[80,27]},
};
const weapons=new Map<string,ReturnType<typeof buildWeapon>>();
export function originalWeapon(id:WeaponId,section=0){section=Number.isFinite(section)?Math.max(0,Math.min(3,Math.floor(section))):0;const key=id+'/'+section;if(weapons.has(key))return weapons.get(key)!;const value=buildWeapon(id,section);weapons.set(key,value);return value;}
function buildWeapon(id:WeaponId,section=0){
 const [vehicle,slot]=id.split('-') as [VehicleId,'normal'|'special'];const tank=ORIGINAL_TANKS[vehicle];if(!tank||!['normal','special'].includes(slot))return null;
 const [power,round]=tank[slot],count=vehicle==='missile'&&slot==='normal'?Math.max(1,4-section):vehicle==='dragon'&&slot==='normal'?Math.max(1,3-section):4;
 return {index:tank.index,round:Math.floor(round*count/4),power:Math.floor(power*count/4)*(id==='mine-special'?2:1),sourcePower:power,section:section+1};
}
export const sourceRadius=(round:number)=>Math.sqrt(round*round+Math.floor(round*round/4));
export const sourceMaximum=(power:number,round:number)=>Math.floor(Math.floor(sourceRadius(round))*power/round);
export type CraterRow={y:number;left:number;width:number};
const shapes=new Map<number,CraterRow[]>();
/** CMap.Bombing's integer scanlines, including BOTH increments of loc4.
 * Merge repeated writes on a row once; the resulting occupied cells are exact. */
export function originalCrater(round:number):readonly CraterRow[]{
 const cached=shapes.get(round);if(cached)return cached;
 const rows=new Map<number,[number,number]>(),num=Math.floor(round/2);
 const add=(left:number,y:number,width:number)=>{if(width<=0)return;const r=rows.get(y);rows.set(y,r?[Math.min(r[0],left),Math.max(r[1],left+width)]:[left,left+width]);};
 add(-Math.floor(num/2)-num,0,num*3);
 let i=0,w=num,error=1-num,a=3,b=-2*num+5;
 while(w>=i){i++;if(error>=0){error+=b;b+=2;w--;}else error+=a;a+=2;b+=2;add(-i-Math.floor(i/2),w,i*3);add(-i-Math.floor(i/2),-w,i*3);add(-w-Math.floor(w/2),i,w*3);add(-w-Math.floor(w/2),-i,w*3);}
 const result=[...rows].sort((a,b)=>a[0]-b[0]).map(([y,[left,right]])=>({y,left,width:right-left}));shapes.set(round,result);return result;
}
const axes=new Map<number,{radius:number;depth:number}>();
export function originalCraterAxes(round:number){const old=axes.get(round);if(old)return old;const rows=originalCrater(round);const value= {radius:Math.max(...rows.flatMap(r=>[-r.left,r.left+r.width]))*SOURCE_CELL,depth:Math.max(...rows.map(r=>Math.abs(r.y)))*SOURCE_CELL};axes.set(round,value);return value;}
for(const id of Object.keys(ORIGINAL_TANKS) as VehicleId[])for(const slot of ['normal','special'] as const)for(let i=0;i<(id==='missile'&&slot==='normal'?4:1);i++)originalCraterAxes(originalWeapon(`${id}-${slot}`,i)!.round);
export function sourceDamagePoint(t:{x:number;y:number},slope:number,weapon?:WeaponId,version='4.0.5'){const foot=weapon==='mine-special'||weapon==='ion-special',y=foot?18:18-SOURCE_BODY_HEIGHT;if(referenceCalibration(version))return {x:t.x,y:t.y+y};return {x:t.x-Math.sin(slope)*y,y:t.y+Math.cos(slope)*y};}
export function sourceDistance(t:{x:number;y:number},x:number,y:number,slope:number,weapon?:WeaponId,version='4.0.5'){const p=sourceDamagePoint(t,slope,weapon,version);const d=Math.hypot(Math.floor(x/SOURCE_CELL)-Math.floor(p.x/SOURCE_CELL),Math.floor(y/SOURCE_CELL)-Math.floor(p.y/SOURCE_CELL));return weapon==='sea-special'?(Math.hypot(x-p.x,y-p.y)<=1?0:Math.max(1,d)):d;}
export function sourceFalloff(distance:number,round:number){const radius=sourceRadius(round);return distance>=radius?0:Math.max(0,Math.floor(radius-distance)/Math.floor(radius));}

export function sourceDamage(power:number,round:number,distance:number,defence=100,boost=1){const gap=Math.max(0,Math.floor(sourceRadius(round)-distance));return Math.trunc(Math.trunc(gap*Math.floor(power*boost)/round)*100/defence);}
