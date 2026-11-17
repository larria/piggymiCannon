import {weaponById,weaponBlastRadius} from './catalog';
export const RESTORE_FRACTION=.40;
export const restoreRadius=(version='4.0.4')=>weaponBlastRadius('cannon-normal',version);
export const FIRST_SUPPLY_CHANCE=.60,FIRST_SUPPLY_ROUND=3,SUPPLY_ACTION_GAP=8;
