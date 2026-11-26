import {weaponById,weaponBlastRadius} from './catalog';
import {compareVersions} from './version';
export const RESTORE_FRACTION=.40;
/** Recordings retain their original recovery ceiling. */
export function restoreFraction(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return v&&(+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=3)) ? .6 : RESTORE_FRACTION;}
export const restoreRadius=(version='4.0.4')=>weaponBlastRadius('cannon-normal',version);
export const FIRST_SUPPLY_CHANCE=.60,FIRST_SUPPLY_ROUND=3,SUPPLY_ACTION_GAP=8;

/** Older recordings keep the original turn-bound item rules. */
export function persistentShotItems(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=2);
}
/** The older rules consumed double / boost at selection time. */
export const reserveShotItems=(version:string)=>/^v?\d+\.\d+\.\d+$/.test(version)&&compareVersions(version,'6.0.2')>=0;
export interface QueuedShotItems {
 boost?:number;double?:number;
 boostTurn?:number;doubleTurn?:number;
 ammo?:{item:'teleport'|'repair';slot:number};
}
