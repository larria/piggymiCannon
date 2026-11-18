import {adaptiveAI} from './ai-distance';
import {sourceRangeModel} from './source-range';
import {DIFFICULTIES,type Difficulty} from './catalog';
export interface AICalibration {
 stableShots:number;disturbed:boolean;
 terrainPending?:{x:number;y:number;slope:number;owner:number;event:number};
}
export const AI_STABLE_SHOTS=3;
export const AI_EFFECTIVE_CEILINGS=[.42,.55,.66,.77] as const;
/** Accuracy is an aim lapse/error model, never a hit roll or a damage override. */
export function calibrationProfile(difficulty:Difficulty,state:AICalibration,version='development',distance?:number){
 const level=DIFFICULTIES.findIndex(d=>d.id===difficulty),d=DIFFICULTIES[level];
 const warmup=(AI_STABLE_SHOTS-Math.min(AI_STABLE_SHOTS,state.stableShots))/AI_STABLE_SHOTS;
 const stableMiss=[.65,.50,.39,.30][level],penalty=level===3?(state.disturbed?.08:.04):(state.disturbed?.16:.12);
 const baseError=(difficulty==='normal'&&sourceRangeModel(version)?70:d.error)*(1+warmup*(state.disturbed?.7:.4));
 if(adaptiveAI(version)&&distance!==undefined&&Number.isFinite(distance)){
  const near=Math.max(0,Math.min(1,(.6-distance)/.4)),far=Math.max(0,Math.min(1,(distance-.6)/.65));
  return {missChance:Math.min(.9,stableMiss+(1-AI_EFFECTIVE_CEILINGS[level]-stableMiss)*near+.18*far+warmup*penalty),error:baseError*(1-.65*near)*(1+.7*far),ceiling:AI_EFFECTIVE_CEILINGS[level],warmup,distance,near,far};
 }
 return {missChance:Math.min(.9,stableMiss+warmup*penalty),error:baseError,ceiling:AI_EFFECTIVE_CEILINGS[level],warmup};
}
export function calibrationDisturbed(state:AICalibration,x:number,y:number,slope:number){
 const old=state.terrainPending;if(!old)return false;
 return Math.abs(slope-old.slope)>=3*Math.PI/180||Math.abs(y-old.y)>=12||Math.abs(x-old.x)>=16;
}
export function advanceCalibration(state:AICalibration,version='development'){state.stableShots=Math.min(AI_STABLE_SHOTS,state.stableShots+1);state.disturbed=false;delete state.terrainPending;}
