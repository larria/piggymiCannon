import type {MapId,WeaponId} from './catalog';
import {VEHICLES,type VehicleId} from './vehicles';
export type AudioScene=MapId|'lobby'|'setup'|'result';
/** Stable scene filenames; their compressed content follows verified original MapUtil entries (research/FT2_MAP_BGM_SELECTION.json). */
export const BGM_TRACKS:Record<AudioScene,string>={lobby:'bgm-lobby.mp3',setup:'bgm-setup.mp3',result:'bgm-result.mp3',valley:'bgm-valley.mp3',coast:'bgm-coast.mp3',moon:'bgm-moon.mp3',factory:'bgm-factory.mp3',temple:'bgm-temple.mp3',egypt:'bgm-egypt.mp3'};
export const COMMON_CLIPS=['click','select','win','turn','wind','firewall','lock','crate-land','supply','warning','transfer','quake','death'].map(n=>`sfx-${n}.mp3`);
const LEGACY:Record<string,string>={shell:'cannon-normal',heavy:'cannon-special',triple:'multi-normal',cluster:'multi-special',drill:'missile-normal',bounce:'duke-normal',napalm:'bowl-special',ice:'water-special',emp:'ion-normal',sniper:'crossbow-normal',homing:'missile-special'};
export function weaponSoundClip(kind:'shot'|'explosion',weapon?:WeaponId){
 if(weapon==='quake')return 'sfx-quake.mp3';
 if(weapon==='airstrike'&&kind==='shot')return 'sfx-supply.mp3';
 const id=weapon&&VEHICLES.some(v=>weapon===v.normal||weapon===v.special)?weapon:LEGACY[weapon??'shell']??'cannon-normal';
 return `sfx-${kind==='shot'?'fire':'bomb'}-${id}.mp3`;
}
export function vehicleClips(id:VehicleId){return [`sfx-move-${id}.mp3`,`sfx-stop-${id}.mp3`,...(['normal','special'] as const).flatMap(slot=>[weaponSoundClip('shot',`${id}-${slot}`),weaponSoundClip('explosion',`${id}-${slot}`)])];}
