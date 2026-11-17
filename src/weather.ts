import type {MapId} from './catalog';
// Retain the old independent opening draw for pre-3.2.7 replay tapes.
export function rollWeather(rng:()=>number) {return {fog:Math.floor(rng()*30)===0,fireLine:Math.floor(rng()*30)===0};}
export function modernWeather(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||Number(v[1])>3||Number(v[1])===3&&(Number(v[2])>2||Number(v[2])===2&&Number(v[3])>=7);
}
export const WEATHER_EVENT_CHANCE=1/40,WEATHER_CLEAR_ROUNDS=5;
export type BattleWeather='fog'|'fireLine'|null;
export function rollBattleWeather(rng:()=>number,fog=true,fire=true):BattleWeather {
 if(!fog&&!fire)return null;
 const roll=rng();return roll<1/80&&fog?'fog':roll>=1/80&&roll<1/40&&fire?'fireLine':null;
}
export const weatherDuration=(rng:()=>number)=>rng()<.5?1:2;
export const nextWeatherRound=(round:number,rng:()=>number)=>round+weatherDuration(rng);
export function rollSnow(map:MapId,rng:()=>number){
 const chance:Record<MapId,number>={valley:.12,coast:.08,moon:.85,factory:.05,temple:.18,egypt:.02};
 return rng()<chance[map];
}
interface Player {id:number;team:number;hp:number;x:number;y:number;outOfBounds?:boolean}
/** Place strictly between a living opposing pair, away from both muzzles. */
export function fireLinePlacement(players:Player[],rng:()=>number){
 const pairs:{left:Player;right:Player}[]=[];
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
  const a=players[i],b=players[j];if(a.hp<=0||b.hp<=0||a.outOfBounds||b.outOfBounds||a.team===b.team||Math.abs(a.x-b.x)<64)continue;
  pairs.push(a.x<b.x?{left:a,right:b}:{left:b,right:a});
 }
 if(!pairs.length)return null;
 const pair=pairs[Math.min(pairs.length-1,Math.floor(rng()*pairs.length))],{left,right}=pair;
 return {x:left.x+28+(right.x-left.x-56)*(.25+rng()*.5),y:(left.y+right.y)/2-40,players:[left.id,right.id]};
}
export const WEATHER_APPROACH=.65,WEATHER_ANIMATION=.85,WEATHER_HOLD=.35,WEATHER_RETURN=.65,WEATHER_SETTLE=.35;
export const WEATHER_OBSERVATION_SECONDS=WEATHER_APPROACH+WEATHER_ANIMATION+WEATHER_HOLD+WEATHER_RETURN+WEATHER_SETTLE;
export interface WeatherObservation {kind:'appear'|'disappear';line:{x:number;top:number;bottom:number};point:{x:number;y:number};age:number}
const unit=(v:number)=>Math.max(0,Math.min(1,v));
export function fireLineVisual(observation:WeatherObservation|null){
 if(!observation)return {alpha:1,reveal:1};
 const p=unit((observation.age-WEATHER_APPROACH)/WEATHER_ANIMATION),e=p*p*(3-2*p);
 return observation.kind==='appear'?{alpha:e,reveal:e}:{alpha:1-e,reveal:1};
}
export function weatherCameraPoint(observation:WeatherObservation,actor:{x:number;y:number}){
 const start=WEATHER_APPROACH+WEATHER_ANIMATION+WEATHER_HOLD,p=unit((observation.age-start)/WEATHER_RETURN),e=p*p*(3-2*p);
 return {x:observation.point.x+(actor.x-observation.point.x)*e,y:observation.point.y+(actor.y-observation.point.y)*e};
}
