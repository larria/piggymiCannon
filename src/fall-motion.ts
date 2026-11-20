export function fastFallMotion(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=4);
}
export const SUPPLY_START_SPEED=80;
export const SUPPLY_WIND_ACCEL=2.5, SUPPLY_WIND_DRAG=.35;
export const supplyGravity=(fast:boolean)=>fast?320:220;
export const supplySpeedLimit=(fast:boolean,originalScale:boolean)=>fast?400:originalScale?300:250;
export const bodyFallSpeed=(v:number,dt:number,gravity:number,fast:boolean)=>fast?Math.min(880,v+gravity*1.45*dt):v+gravity*dt;
export const parachuteFallSpeed=(v:number,dt:number,fast:boolean)=>Math.min(fast?200:150,v+(fast?170:120)*dt);
export const supplyFallSpeed=(v:number,dt:number,accel:number,limit:number)=>Math.min(limit,v+accel*dt);
export function supplyFlightTime(distance:number,accel:number,limit:number){
 const start=SUPPLY_START_SPEED,tCap=(limit-start)/accel,dCap=start*tCap+accel*.5*tCap*tCap;
 return distance>dCap?tCap+(distance-dCap)/limit:(Math.sqrt(start*start+2*accel*distance)-start)/accel;
}
