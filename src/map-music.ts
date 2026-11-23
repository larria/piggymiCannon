import selection from '../research/FT2_MAP_BGM_SELECTION.json';
import type {MapId} from './catalog';
import {referenceCalibration} from './reference-calibration';
export interface MusicAsset {number:number;runtime:string;source:string;seconds:number;durationMode:string;name:string}
type MusicScene={mapNumber:number|null;musicRuleMapNumber?:number;bgmNumber:number;candidates:number[]};
const maps=selection.maps as Record<MapId,MusicScene>,tracks=selection.tracks as Record<string,MusicAsset>;
export const BGM_SELECTION_VERSION='seeded-distinct-map-bgm-v1';
export const MAP_BGM_FILES=Object.values(tracks).map(t=>t.runtime);
export const mapBgmCandidates=(map:MapId)=>maps[map].candidates;
export const mapBgmAsset=(number:number)=>tracks[String(number)];
export const defaultMapBgmFile=(map:MapId)=>mapBgmAsset(maps[map].bgmNumber).runtime;
export interface PreviousMapBgm {map:MapId;number:number}
export interface MatchBgm {version:string;map:MapId;mapNumber:number|null;musicRuleMapNumber:number|null;number:number;name:string;file:string;candidates:number[];rng:{algorithm:string;seed:number;index:number;value:number}}
/** Separate Mulberry32 stream: never consumes physics/AI/spawn/weather RNG. */
export function chooseMapBgm(map:MapId,seed:number,previous?:PreviousMapBgm|null):MatchBgm{
 let key=2166136261;for(let i=0;i<map.length;i++)key=Math.imul(key^map.charCodeAt(i),16777619);
 const musicSeed=(seed^key^0x42474d31)>>>0;let t=musicSeed+0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);const value=((t^t>>>14)>>>0)/4294967296;
 const candidates=[...mapBgmCandidates(map)];
 const eligible=previous?.map===map&&candidates.length>1?candidates.filter(n=>n!==previous.number):candidates;
 const number=eligible[Math.floor(value*eligible.length)],asset=mapBgmAsset(number);
 return {version:BGM_SELECTION_VERSION,map,mapNumber:maps[map].mapNumber,musicRuleMapNumber:maps[map].musicRuleMapNumber??maps[map].mapNumber,number,name:asset.name,file:asset.runtime,candidates,rng:{algorithm:'mulberry32-independent-bgm',seed:musicSeed,index:1,value}};
}
export const randomMapMusic=(version:string)=>referenceCalibration(version);
export function restoreMapBgm(value:MatchBgm|undefined,map:MapId):MatchBgm|null{
 if(value==null)return null;
 const oldValley=map==='valley'&&value.number===0&&value.candidates?.length===1&&value.candidates[0]===0&&value.musicRuleMapNumber==null;
 if(value.version!==BGM_SELECTION_VERSION||value.map!==map||(!mapBgmCandidates(map).includes(value.number)&&!oldValley)||mapBgmAsset(value.number)?.runtime!==value.file)throw Error('Invalid recorded map BGM');
 return value;
}
/** The old moon identifier represented sky-city music before the name correction. */
export const legacyMapBgmFile=(map:MapId,version:string)=>!referenceCalibration(version)&&map==='moon'?mapBgmAsset(9).runtime:!referenceCalibration(version)&&map==='valley'?mapBgmAsset(0).runtime:defaultMapBgmFile(map);
