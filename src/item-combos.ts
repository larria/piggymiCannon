import {weaponById,weaponBlastRadius} from './catalog';
export const RESTORE_FRACTION=.40;
/** Recordings retain their original recovery ceiling. */
export function restoreFraction(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return v&&(+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=3)) ? .6 : RESTORE_FRACTION;}
export const restoreRadius=(version='4.0.4')=>weaponBlastRadius('cannon-normal',version);
export const FIRST_SUPPLY_CHANCE=.60,FIRST_SUPPLY_ROUND=3,SUPPLY_ACTION_GAP=8;
