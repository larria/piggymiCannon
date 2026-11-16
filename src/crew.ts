import {DIFFICULTIES,type Difficulty} from './catalog';
import {validChoice,type VehicleChoice} from './vehicles';
export type CrewId='mimi'|'dad'|'fox'|'fish';
export interface Slot {enabled:boolean;crew:CrewId;team:number;controller:'human'|'ai';difficulty:Difficulty;vehicle:VehicleChoice|null}
export type Seat=Slot;
export const CREW={mimi:{name:'咪猪头',color:'#dd8e77',paper:'#f4e5db',symbol:'猪'},dad:{name:'大猪头',color:'#64859d',paper:'#e4edf2',symbol:'大'},fox:{name:'阿狸',color:'#c56c48',paper:'#f4e4d5',symbol:'狸'},fish:{name:'小黄鱼',color:'#c5a44d',paper:'#f5efd8',symbol:'鱼'}} as const;
export const CREW_ORDER:CrewId[]=['mimi','dad','fox','fish'];
export const FLAGS=[{name:'暖桃',letter:'A',color:'#a34c3c',paper:'#f5e5df',shape:'square'},{name:'青苔',letter:'B',color:'#466c44',paper:'#e8eedf',shape:'fork'},{name:'晴空',letter:'C',color:'#386a8c',paper:'#e3edf2',shape:'wave'},{name:'麦穗',letter:'D',color:'#826023',paper:'#f5ecd6',shape:'diamond'}] as const;
export function teamFlag(team:number){const color=FLAGS[((team%4)+4)%4];return {...color,letter:team<4&&team>=0?color.letter:String(team+1),name:team<4&&team>=0?color.name:`队伍 ${team+1}`};}
export function flagIcon(team:number){const f=teamFlag(team),paths={square:'M7 3h17v14H7z',fork:'M7 3h20l-5 7 5 7H7z',wave:'M7 4q7-4 17 0v13q-10-4-17 0z',diamond:'M7 10 17 2l11 8-11 8z'};return `<svg class="flag-icon" viewBox="0 0 32 26" aria-hidden="true"><path d="M6 2v22" stroke="${f.color}" stroke-width="2" stroke-linecap="round"/><path d="${paths[f.shape]}" fill="${f.color}"/><text x="16" y="13" fill="#fff8ec" font-size="9" text-anchor="middle" font-family="sans-serif" font-weight="600">${f.letter}</text></svg>`;}
export function defaultSlots():Slot[]{return CREW_ORDER.map((crew,i)=>({enabled:i<2,crew,team:i,controller:i===0?'human':'ai',difficulty:'easy',vehicle:'random'}));}
export function normalizeSlots(input:unknown,allowDragon=false):Slot[]{
 const defaults=defaultSlots();if(!Array.isArray(input)||input.length!==4)return defaults;
 return defaults.map((d,i)=>{const s=input[i]??{};return {...d,enabled:s.enabled===true,team:Number.isInteger(s.team)&&s.team>=0?s.team:d.team,controller:s.controller==='human'?'human':'ai',difficulty:DIFFICULTIES.some(x=>x.id===s.difficulty)?s.difficulty:d.difficulty,vehicle:validChoice(s.vehicle,allowDragon)?s.vehicle:'random'};});
}
export function slotProblem(slots:Slot[]){const active=slots.filter(s=>s.enabled);return active.length<2?'至少开启两个槽位':active.length>4?'最多四个槽位':new Set(active.map(s=>s.team)).size<2?'至少使用两面不同的队旗':null;}
export function crewAvatarPath(id:CrewId,base=''){return base+`portraits/${id}.png`;}
export function crewAvatar(id:CrewId,base=''){return `<img src="${crewAvatarPath(id,base)}" alt="${CREW[id].name}"/>`;}
export function nameMarkup(name:string,team:number){return `<span class="crew-name" style="color:${teamFlag(team).color}">${name}</span>`;}
