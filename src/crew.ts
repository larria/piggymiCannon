import type {Difficulty} from './catalog';
import type {VehicleChoice} from './vehicles';
export type CrewId='mimi'|'dad'|'fox'|'fish';
export type Formation='1v1'|'1v2'|'2v1'|'2v2';
export interface Seat {crew:CrewId;team:0|1;controller:'human'|'ai';difficulty:Difficulty;vehicle:VehicleChoice}
export const CREW={mimi:{name:'咪猪头',color:'#dd8e77',paper:'#f4e5db',symbol:'猪'},dad:{name:'大猪头爸爸',color:'#83976b',paper:'#e9eedf',symbol:'爸'},fox:{name:'阿狸',color:'#c56c48',paper:'#f4e4d5',symbol:'狸'},fish:{name:'小黄鱼',color:'#c5a44d',paper:'#f5efd8',symbol:'鱼'}} as const;
export function defaultSeats(formation:Formation='1v1',mode:'ai'|'hotseat'='ai',difficulty:Difficulty='easy'):Seat[]{
 const [a,b]=formation.split('v').map(Number);
 const seats:Seat[]=[{crew:'mimi',team:0,controller:'human',difficulty,vehicle:'random'},{crew:'dad',team:1,controller:mode==='hotseat'?'human':'ai',difficulty,vehicle:'random'}];
 if(a===2)seats.push({crew:'fox',team:0,controller:mode==='hotseat'?'human':'ai',difficulty,vehicle:'random'});
 if(b===2)seats.push({crew:a===2?'fish':'fox',team:1,controller:mode==='hotseat'?'human':'ai',difficulty,vehicle:'random'});
 return seats;
}
export function crewAvatar(id:CrewId,base=''){
 if(id==='mimi'||id==='dad')return `<img src="${base}icons/${id==='mimi'?'icon-192.png':'dad-avatar.png'}" alt="${CREW[id].name}"/>`;
 return `<img src="${base}icons/${id}-avatar.svg" alt="${CREW[id].name}"/>`;
}
