import {precisionPolish} from './match-polish';
import {weaponById,type WeaponId} from './catalog';
import type {VehicleId} from './vehicles';
import {compareVersions} from './version';
import {RANGE_FULL_SPEED,RANGE_REFERENCE} from './source-range';
export const DOUBLE_SHOT_INTERVAL=.75;
export const sourceBeetleSalvo=(weapon:WeaponId,version:string)=>weapon==='beetle-special'&&/^v?\d+\.\d+\.\d+$/.test(version)&&compareVersions(version,'6.0.1')>=0;
/** CTankS fires from one muzzle. Its fixed-point additions are -200 horizontally
 * along the facing axis and +150 downward per pellet relative to the middle. */
export function salvoImpulse(weapon:WeaponId,index:number,version:string,direction:number,gravity:number,power:number){
 if(index===1||!sourceBeetleSalvo(weapon,version))return {vx:0,vy:0};
 // Use the same normalization as the base launch. Fade only in the web
 // game's tiny tap range so a minimum-power short shot won't fire backwards.
 const step=(index-1)*RANGE_FULL_SPEED/RANGE_REFERENCE*Math.sqrt(gravity/230)*Math.min(1,power/10)/100;
 return {vx:-Math.sign(direction)*200*step,vy:150*step};
}
export const staggeredMultiSpecial=(weapon:WeaponId,version:string)=>weapon==='multi-special'&&/^v?\d+\.\d+\.\d+$/.test(version)&&compareVersions(version,'5.1.6')>=0;
/** Three banks feed the same launch axis, with a slightly longer gap between banks. */
export const salvoLaunchSeconds=(weapon:WeaponId,index:number,version:string)=>staggeredMultiSpecial(weapon,version)?index*.032+Math.floor(index/3)*.018:0;
/** Deterministic launch dispersion, shared by live fire and read-only AI.
 * Multi's differing vertical impulse changes hang time: headwind can naturally
 * offset horizontal separation on a high arc, without steering at a target.
 */
export function salvoProfile(vehicle:VehicleId|null,weapon:WeaponId,index:number,count:number,version='development'){
 const spec=weaponById(weapon),center=index-(count-1)/2,rank=center/Math.max(1,(count-1)/2);
 if(sourceBeetleSalvo(weapon,version))return {angle:0,vx:1,vy:1,aimX:0,aimY:0};
 if(((vehicle==='dragon'&&weapon==='dragon-normal')||(vehicle==='multi'&&weapon==='multi-normal'))&&precisionPolish(version)){return {angle:0,vx:1+rank*.108,vy:1+rank*.27,aimX:0,aimY:0};}
 if(vehicle==='multi'&&staggeredMultiSpecial(weapon,version)){
  // The primary client uses a 3 × 3 lattice (independent X and Y offsets).
  // Blend the lattice with the game's wider progression to keep its calibrated
  // max/min arcs, including on the mirrored left-facing shot.
  const row=Math.floor(index/3)-1,col=index%3-1;
  return {angle:0,vx:1+(.65*rank+.35*row)*.072,vy:1+(.55*rank+.45*col)*.18,aimX:0,aimY:0};
 }
 if(vehicle==='multi'&&(weapon==='multi-normal'||weapon==='multi-special')){
  const vertical=weapon==='multi-normal'?.12:.18;
  return {angle:0,vx:1+rank*vertical*.4,vy:1+rank*vertical,aimX:0,aimY:0};
 }
 const scattered=vehicle==='dragon'||vehicle==='multi',speed=scattered?1+rank*.025:1;
 return {angle:center*(spec.spread??(weapon==='triple'?5:3)),vx:speed,vy:speed,aimX:scattered&&spec.effect==='homing'?rank*20:0,aimY:scattered&&spec.effect==='homing'?Math.sin(index*2.4)*12:0};
}
