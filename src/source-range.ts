/** Character.txt Range (confirmed character-to-vehicle mapping).
 * Source launch is linear in CurrentRange; every carrier has gravity100.
 * Keep Cannon's published full speed730 as the common world-unit anchor. */
export const SOURCE_RANGES={bowl:45,crossbow:47,cannon:43,beetle:47,duke:49,missile:60,multi:53,laser:50,mine:48,ion:60,water:47,sea:55,dragon:70} as const;
export const RANGE_FULL_SPEED=730, RANGE_REFERENCE=43;
export function sourceRangeModel(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=4);}
export function sourceRange(weapon:string){const [id,slot]=weapon.split('-');return slot==='normal'||slot==='special'?SOURCE_RANGES[id as keyof typeof SOURCE_RANGES]:undefined;}
/** The HUD and replay commands still use 1–100%. Expand only the upper end of
 * the physical charge, keeping a quick tap at exactly the old minimum. */
export function sourceChargePower(power:number,version:string){
 const value=Math.max(1,Math.min(100,power)),v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 const expanded=!v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=3);
 return expanded?value+(value-1)*20/99:value;
}
export function sourceLaunchSpeed(weapon:string,power:number,version:string,gravity=230){const range=sourceRange(weapon);return sourceRangeModel(version)&&range!==undefined?RANGE_FULL_SPEED*range/RANGE_REFERENCE*sourceChargePower(power,version)/100*Math.sqrt(gravity/230):null;}
export function launchGravityMultiplier(weapon:string,legacy:number,version:string){return sourceRangeModel(version)&&sourceRange(weapon)!==undefined?1:legacy;}
