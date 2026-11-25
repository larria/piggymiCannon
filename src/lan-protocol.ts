import {packTerrain,unpackTerrain,type BattleSnapshot} from './battle-trace';
import type {Config,Game,GameEvent} from './engine';
import type {Terrain} from './terrain';

export const LAN_PROTOCOL=1;
export const LAN_PREFIX='lan/';
export const LAN_HOST_KEY='piggy-lan-host';
export const LAN_RECONNECT_MS=60_000;
export type LanSeat={slot:number;online:boolean};
export type LanRoom={state:'waiting'|'battle';code:string;seats:LanSeat[];hold:boolean;notice:string};
export type LanCommand=
 | ['aim',number,number,number] | ['move',number,number] | ['weapon',string]
 | ['item',string,number?] | ['fire'] | ['skip'] | ['marker',number] | ['target',number];
export type LanRequest=
 | {type:'hello';protocol:number;version:string;host?:string;code?:string;resume?:string}
 | {type:'create'} | {type:'close-room'} | {type:'leave'} | {type:'return'} | {type:'sync'}
 | {type:'start';config:Config} | {type:'input';match:number;turn:number;seq:number;actions:LanCommand[]};
export type LanPatch={from:number;to:number;top:number;bottom:number;revision:number;data:ReturnType<typeof packTerrain>};
export type LanVisuals=Record<string,unknown>;
export type LanMessage=
 | {type:'welcome';slot:number;token:string;room:LanRoom|null;invite:string|null}
 | {type:'room';room:LanRoom|null;invite:string|null}
 | {type:'match';match:number;frame:number;snapshot:BattleSnapshot;visual:LanVisuals}
 | {type:'frame';match:number;frame:number;ack:number;visual:LanVisuals;land?:LanPatch;events:GameEvent[]}
 | {type:'error';message:string;fatal?:boolean};

// The host owns these fields. The client only animates and draws their latest values.
export const LAN_VISUAL_KEYS=['tanks','phase','current','turn','roundNumber','wind','clock','selected','projectiles','particles','blasts','itemCues','texts',
 'fires','gases','mines','crates','introLocked','observation','winner','shake','elapsed','supplyObservation','restoring','armedItemSlot','targetX',
 'teleporting','weatherObservation','weatherSnow','fog','fogTurnsRemaining','fireLine','fireLineTurnsRemaining','movingUntil','resultAge','log'] as const;
export const lanEncode=(value:unknown)=>JSON.stringify(value,(_key,n)=>n===Infinity?'Infinity':n===-Infinity?'-Infinity':n);
export const lanDecode=(value:string)=>JSON.parse(value,(_key,n)=>n==='Infinity'?Infinity:n==='-Infinity'?-Infinity:n);
export function lanVisual(g:Game):LanVisuals {
 const raw=g as unknown as Record<string,unknown>;
 const visual=Object.fromEntries(LAN_VISUAL_KEYS.map(key=>[key,raw[key]]));
 // Debug trajectories are not needed by the scene. Keep collision / visual fields and the trails.
 visual.projectiles=g.projectiles.map(({traceLaunch,traceFireLine,boostSources,...p})=>p);
 visual.moods=g.tanks.map(t=>[g.crewCheerAge(t.id),g.crewShockAge(t.id)]);
 return visual;
}
export function readLanTerrain(land:Terrain,revision:number):LanPatch|undefined{
 const region=land.changedSince(revision);if(!region)return;
 const {from,to,top,bottom}=region,w=to-from+1,bytes=new Uint8Array(w*(bottom-top+1));
 for(let y=top;y<=bottom;y++){const offset=y*land.stride+from;bytes.set(land.mask.subarray(offset,offset+w),(y-top)*w);}
 return {...region,revision:land.revision,data:packTerrain(bytes)};
}
export function applyLanTerrain(land:Terrain,patch:LanPatch){
 const {from,to,top,bottom,revision}=patch,w=to-from+1;
 if([from,to,top,bottom,revision].some(n=>!Number.isSafeInteger(n))||from<0||to>land.width||to<from||top<0||bottom>=land.height||bottom<top||revision<=land.revision)throw Error('战场地形不同步');
 const pixels=new Uint8Array(w*(bottom-top+1));unpackTerrain(patch.data,pixels);
 for(let y=top;y<=bottom;y++){const row=(y-top)*w;land.mask.set(pixels.subarray(row,row+w),y*land.stride+from);}
 // Preserve the authority's revision even when several craters merged into one patch.
 land.revision=revision-1;land.rebuild(from,to,top,bottom);
}
export function inviteCode(hash:string){return /^#lan=([A-Za-z0-9_-]{16})$/.exec(hash)?.[1]??null;}
export function parseLanInvite(value:string):URL|null{
 try{
  const url=new URL(value.trim());const ip=url.hostname.split('.').map(Number);
  const local=url.hostname==='localhost'||ip.length===4&&(ip[0]===10||ip[0]===127||ip[0]===192&&ip[1]===168||ip[0]===172&&ip[1]>=16&&ip[1]<=31||ip[0]===169&&ip[1]===254);
  return local&&['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&inviteCode(url.hash)?url:null;
 }catch{return null;}
}
