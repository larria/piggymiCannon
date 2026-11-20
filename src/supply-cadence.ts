import {compareVersions} from './version';

export const isScaledSupplyCadence=(version:string)=>!/^v?\d+\.\d+\.\d+$/.test(version)||compareVersions(version,'5.1.4')>=0;

// Count all actions (human and AI), starting at the last successful delivery.
// Drawing a recipient after this interval may add a wait until their next turn.
export const supplyGapForHumans=(humans:number)=>[Infinity,12,10,8,6][Math.min(humans,4)];
