export function sourceHoming(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !!v&&(+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=3));}
export const SOURCE_HOMING_RADIUS=450;
/** Source gravity advances one grid cell per tick squared; a cell is 3 world units.
 * Convert ten original ticks into the current world's simulation time. */
export const sourceTickSeconds=(gravity:number)=>Math.sqrt(3/gravity);
export function homingProbe(p:{x:number;y:number;vx:number;vy:number},gravity:number){
 const tick=sourceTickSeconds(gravity);
 const predicted=(position:number,velocity:number)=>Math.trunc((Math.trunc(position*100/3)+Math.trunc(velocity*tick*100/3)*10)/100)*3;
 return {x:predicted(p.x,p.vx),y:predicted(p.y,p.vy)};
}
export function sourceHomingVelocity(p:{x:number;y:number},target:{x:number;y:number},gravity:number){
 const tick=sourceTickSeconds(gravity),dx=Math.trunc(target.x/3)-Math.trunc(p.x/3),dy=Math.trunc(target.y/3)-Math.trunc(p.y/3);
 const gain=(Math.abs(dx)+Math.abs(dy))*10<700?20:10;
 return {vx:dx*gain/100*3/tick,vy:dy*gain/100*3/tick};
}
