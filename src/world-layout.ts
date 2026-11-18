import {referenceCalibration,REFERENCE_ART_SCALE} from './reference-calibration';
export const LEGACY_WORLD={width:1920,height:960} as const;
export const EXPANDED_WORLD={width:2688,height:1344} as const;
export interface WorldSize {width:number;height:number}
/** Only numbered app releases opt in; unversioned physics tools retain their baseline. */
export function worldSize(version:string):WorldSize{return /^v?\d+\.\d+\.\d+/.test(version)&&referenceCalibration(version)?EXPANDED_WORLD:LEGACY_WORLD;}
/** A recording owns its dimensions, including local drafts made before expansion. */
export function recordedWorld(value:unknown,version:string):WorldSize{
 if(value===undefined)return worldSize(version);
 const p=value as WorldSize;
 if(p&&[LEGACY_WORLD,...(referenceCalibration(version)?[EXPANDED_WORLD]:[])].some(s=>s.width===p.width&&s.height===p.height))return {width:p.width,height:p.height};
 throw Error('录像地形尺寸不匹配。');
}
export const layoutScale=(width:number)=>width/LEGACY_WORLD.width;
/** Enlarge the view along with the calibrated art, without reducing screen pixel density. */
export const battleViewWidth=(width:number)=>1280*(width>LEGACY_WORLD.width?REFERENCE_ART_SCALE:1);
