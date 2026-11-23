import {CREW_ORDER,type CrewId} from './crew';
import {MAPS,type Difficulty,type MapId} from './catalog';
import {VEHICLES} from './vehicles';
import {compareVersions} from './version';

export const PROGRESSION_KEY='piggy-progression-v1';
export const RANKS=[
 {id:'bronze',name:'青铜',minimum:0,difficulty:'easy'},
 {id:'silver',name:'白银',minimum:2000,difficulty:'normal'},
 {id:'gold',name:'黄金',minimum:6000,difficulty:'hard'},
 {id:'king',name:'王者',minimum:12000,difficulty:'expert'},
] as const;
export type RankIndex=0|1|2|3;
const newRankScale=(version:string)=>!/^v?\d+\.\d+\.\d+$/.test(version)||compareVersions(version,'5.1.6')>=0;
export function rankIndex(points:number,version='5.1.6'):RankIndex{
 const comparable=newRankScale(version)?points:points*10;
 return comparable>=RANKS[3].minimum?3:comparable>=RANKS[2].minimum?2:comparable>=RANKS[1].minimum?1:0;
}
export function aiRank(difficulty:Difficulty):RankIndex{return Math.max(0,RANKS.findIndex(r=>r.difficulty===difficulty)) as RankIndex;}
export function playerSupplyTiming(version:string){const v=version.match(/^v?(\d+)\./);return !v||Number(v[1])>=4;}
export interface CombatMetrics {shots:number;damage:number;kills:number;items:number;pickups:number;healed:number;comboShots:number}
export const emptyCombat=():CombatMetrics=>({shots:0,damage:0,kills:0,items:0,pickups:0,healed:0,comboShots:0});
export interface Profile extends CombatMetrics {points:number;games:number;wins:number;losses:number;draws:number;streak:number;bestStreak:number;highWins:number;bestTier:number;vehicles:string[];maps:string[];mapGames:Partial<Record<MapId,number>>;vehicleWins:Record<string,number>;achievements:Record<string,string>;equippedAchievement:string|null}
export interface Progression {formatVersion:1;rankScale?:10;profiles:Record<CrewId,Profile>;settled:string[]}
export const freshProfile=():Profile=>({...emptyCombat(),points:0,games:0,wins:0,losses:0,draws:0,streak:0,bestStreak:0,highWins:0,bestTier:0,vehicles:[],maps:[],mapGames:{},vehicleWins:{},achievements:{},equippedAchievement:null});
export const freshProgression=():Progression=>({formatVersion:1,rankScale:10,profiles:Object.fromEntries(CREW_ORDER.map(id=>[id,freshProfile()])) as Progression['profiles'],settled:[]});
export interface Competition {titles?:Partial<Record<CrewId,string|null>>;id:string;points:Partial<Record<CrewId,number>>}
export interface Competitor {id:number;crew:CrewId;team:number;controller:'human'|'ai';difficulty:Difficulty;points:number;tier:RankIndex;vehicle:string|null;metrics:CombatMetrics}
export interface MatchProgress {id:string;map:MapId;competitors:Competitor[]}
export const ACHIEVEMENTS=[
 {id:'debut',name:'初上战场',description:'完成人类操控对局 1 场',metric:'games',target:1,icon:'flag'},
 {id:'first-win',name:'第一面胜旗',description:'赢得 1 场对局',metric:'wins',target:1,icon:'trophy'},
 {id:'ten-wins',name:'战旗成林',description:'累计赢得 25 场',metric:'wins',target:25,icon:'trophy'},
 {id:'fifty-wins',name:'百战成章',description:'累计赢得 100 场',metric:'wins',target:100,icon:'crown'},
 {id:'streak',name:'连战连捷',description:'连续赢得 8 场',metric:'bestStreak',target:8,icon:'star'},
 {id:'giant',name:'越阶挑战',description:'击败更高勋章对手 20 场',metric:'highWins',target:20,icon:'star'},
 {id:'damage',name:'炮火留名',description:'累计造成 100,000 敌方伤害',metric:'damage',target:100000,icon:'target'},
 {id:'kills',name:'精准终结',description:'累计击倒 100 个敌方角色',metric:'kills',target:100,icon:'target'},
 {id:'healer',name:'战地援手',description:'累计恢复自己或队友 20,000 生命',metric:'healed',target:20000,icon:'heart'},
 {id:'supply',name:'补给能手',description:'拾取 100 件补给',metric:'pickups',target:100,icon:'box'},
 {id:'combo',name:'双星齐发',description:'使用双发与威力加强组合发射 50 次',metric:'comboShots',target:50,icon:'star'},
 {id:'maps',name:'踏遍战场',description:'每张地图完成人类对局 10 场',metric:'mapMastered',target:6,icon:'flag'},
 {id:'vehicles',name:'十三般炮术',description:'使用每台载具赢得 3 场',metric:'vehicleMastered',target:13,icon:'target'},
 {id:'king',name:'王者之证',description:'人类积分首次达到王者',metric:'bestTier',target:3,icon:'crown'},
] as const;
export function achievementProgress(p:Profile){const measures={...p,mapMastered:MAPS.filter(m=>(p.mapGames?.[m.id]??0)>=10).length,vehicleMastered:VEHICLES.filter(v=>(p.vehicleWins?.[v.id]??0)>=3).length};return ACHIEVEMENTS.map(a=>({...a,value:Number(measures[a.metric]),unlocked:p.achievements[a.id]??null}));}
const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1e9,Math.floor(n))):0;
export function decodeProgression(value:unknown):Progression{
 const clean=freshProgression(),raw=value as any;if(raw?.formatVersion!==1)return clean;
 for(const id of CREW_ORDER){const p=raw.profiles?.[id];if(!p||typeof p!=='object')continue;
  const target=clean.profiles[id];for(const key of Object.keys(target) as (keyof Profile)[])if(typeof target[key]==='number')(target as any)[key]=count(p[key]);
  target.bestTier=Math.max(raw.rankScale===10?Math.min(3,target.bestTier):0,rankIndex(target.points));
  target.maps=Array.isArray(p.maps)?[...new Set<string>(p.maps.filter((s:unknown)=>typeof s==='string'))].slice(0,6):[];
  target.vehicles=Array.isArray(p.vehicles)?[...new Set<string>(p.vehicles.filter((s:unknown)=>typeof s==='string'))].slice(0,13):[];
  for(const m of MAPS){const n=p.mapGames?count(p.mapGames[m.id]):target.maps.includes(m.id)?1:0;if(n)target.mapGames[m.id]=n;}
  for(const v of VEHICLES){const n=count(p.vehicleWins?.[v.id]);if(n)target.vehicleWins[v.id]=n;}
  for(const a of ACHIEVEMENTS)if(typeof p.achievements?.[a.id]==='string')target.achievements[a.id]=p.achievements[a.id].slice(0,32);
  if(typeof p.equippedAchievement==='string'&&target.achievements[p.equippedAchievement])target.equippedAchievement=p.equippedAchievement;
 }
 clean.settled=Array.isArray(raw.settled)?raw.settled.filter((s:unknown)=>typeof s==='string').slice(-128):[];return clean;
}
export function readProgression(storage:Pick<Storage,'getItem'>):Progression{try{return decodeProgression(JSON.parse(storage.getItem(PROGRESSION_KEY)||'null'));}catch{return freshProgression();}}
/** One settlement per real match; replay/spectator callers are explicitly excluded.
 * Rank odds use the START-of-match medals, so teammates never affect each other's odds. */
export function scoreChange(won:boolean,own:number,opponents:number[]):number{
 if(!opponents.length)return 0;const average=opponents.reduce((n,v)=>n+v,0)/opponents.length;
 return won?Math.round(Math.max(10,Math.min(60,30+10*(average-own)))):-Math.round(Math.max(5,Math.min(35,20+5*(own-average))));
}
// Calibrated against the previous climb in QA's seeded match comparison.
const WIN_PACE=.9;
/** Only effective HP changes and credited enemy kills count for a score. */
export function individualScore(base:number,metrics:CombatMetrics){
 const contribution=count(metrics.damage)+count(metrics.healed),kills=count(metrics.kills);
 if(base>0){
  if(!contribution&&!kills)return 0;
  return Math.max(1,Math.round(base*WIN_PACE*(kills?1:Math.min(1,contribution/900))));
 }
 if(base<0){
  if(kills&&contribution>=1000)return 0;
  return -Math.max(1,Math.ceil(-base*Math.max(0,1-contribution/1000)-1e-9));
 }
 return 0;
}
export interface Settlement {crew:CrewId;before:number;after:number;delta:number;requested:number;oldTier:RankIndex;newTier:RankIndex;outcome:'win'|'loss'|'draw';unlocked:string[];opponentTiers:number[]}
export function settleProgression(state:Progression,match:MatchProgress,winner:number|null,options:{replay?:boolean;ended:boolean;date?:string}):{state:Progression;results:Settlement[]}{
 if(options.replay||!options.ended||state.settled.includes(match.id))return {state,results:[]};
 const eligible=match.competitors.filter(c=>c.controller==='human');if(!eligible.length)return {state,results:[]};
 const next:Progression=structuredClone(state),results:Settlement[]=[],date=options.date??new Date().toISOString();
 // A crew is an identity, not a vehicle: changing tanks keeps its record.
 const seen=new Set<CrewId>();for(const c of eligible){if(seen.has(c.crew))continue;seen.add(c.crew);
  const p=next.profiles[c.crew],before=p.points,outcome=winner===null?'draw':c.team===winner?'win':'loss';
  const opponents=match.competitors.filter(t=>t.team!==c.team&&(outcome!=='loss'||t.team===winner)).map(t=>t.tier);
  const requested=outcome==='draw'?0:individualScore(scoreChange(outcome==='win',c.tier,opponents),c.metrics);
  p.points=Math.max(0,p.points+requested);p.games++;p[outcome==='win'?'wins':outcome==='loss'?'losses':'draws']++;
  p.streak=outcome==='win'?p.streak+1:0;p.bestStreak=Math.max(p.bestStreak,p.streak);
  if(outcome==='win'&&opponents.some(t=>t>c.tier))p.highWins++;
  for(const key of Object.keys(emptyCombat()) as (keyof CombatMetrics)[])p[key]+=count(c.metrics[key]);
  if(!p.maps.includes(match.map))p.maps.push(match.map);if(c.vehicle&&!p.vehicles.includes(c.vehicle))p.vehicles.push(c.vehicle);
  p.mapGames??={};p.vehicleWins??={};p.mapGames[match.map]=(p.mapGames[match.map]??0)+1;if(c.vehicle&&outcome==='win')p.vehicleWins[c.vehicle]=(p.vehicleWins[c.vehicle]??0)+1;
  p.bestTier=Math.max(p.bestTier,rankIndex(p.points));const unlocked:string[]=[];
  for(const a of achievementProgress(p))if(!a.unlocked&&a.value>=a.target){p.achievements[a.id]=date;unlocked.push(a.id);}
  results.push({crew:c.crew,before,after:p.points,delta:p.points-before,requested,oldTier:rankIndex(before),newTier:rankIndex(p.points),outcome,unlocked,opponentTiers:opponents});
 }
 next.settled=[...next.settled,match.id].slice(-128);return {state:next,results};
}
