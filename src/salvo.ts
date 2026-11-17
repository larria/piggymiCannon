import {precisionPolish} from './match-polish';
import {weaponById,type WeaponId} from './catalog';
import type {VehicleId} from './vehicles';
export const DOUBLE_SHOT_INTERVAL=.75;
/** Deterministic launch dispersion, shared by live fire and read-only AI.
 * Multi's differing vertical impulse changes hang time: headwind can naturally
 * offset horizontal separation on a high arc, without steering at a target.
 */
export function salvoProfile(vehicle:VehicleId|null,weapon:WeaponId,index:number,count:number,version='development'){
 const spec=weaponById(weapon),center=index-(count-1)/2,rank=center/Math.max(1,(count-1)/2);
 if(((vehicle==='dragon'&&weapon==='dragon-normal')||(vehicle==='multi'&&weapon==='multi-normal'))&&precisionPolish(version)){return {angle:0,vx:1+rank*.108,vy:1+rank*.27,aimX:0,aimY:0};}
 if(vehicle==='multi'&&(weapon==='multi-normal'||weapon==='multi-special')){
  const vertical=weapon==='multi-normal'?.12:.18;
  return {angle:0,vx:1+rank*vertical*.4,vy:1+rank*vertical,aimX:0,aimY:0};
 }
 const scattered=vehicle==='dragon'||vehicle==='multi',speed=scattered?1+rank*.025:1;
 return {angle:center*(spec.spread??(weapon==='triple'?5:3)),vx:speed,vy:speed,aimX:scattered&&spec.effect==='homing'?rank*20:0,aimY:scattered&&spec.effect==='homing'?Math.sin(index*2.4)*12:0};
}
