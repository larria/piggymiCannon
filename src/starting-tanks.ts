import {compareVersions} from './version';

const MIN_TANK_GAP=90;
export const spreadStartingTanks=(version:string)=>/^v?\d+\.\d+\.\d+$/.test(version)&&compareVersions(version,'6.0.1')>=0;
export const minimumStartingSpan=(worldWidth:number)=>worldWidth*.28;

/** Keep a close group when drawn, but leave at least one tank across the field. */
export function spreadFourStarts(initial:number[],preferred:number[],safe:number[],width:number,rng:()=>number){
 const span=(xs:number[])=>Math.max(...xs)-Math.min(...xs);
 const minimum=minimumStartingSpan(width),valid=(xs:number[])=>xs.every((x,i)=>xs.slice(0,i).every(y=>Math.abs(x-y)>=MIN_TANK_GAP));
 const pick=<T>(pool:T[])=>pool[Math.floor(rng()*pool.length)];
 if(initial.every(x=>preferred.includes(x))&&valid(initial)&&span(initial)>=minimum)return initial;
 for(const pool of [preferred,safe]){
  const repairs=initial.flatMap((_,i)=>{
   const other=initial.filter((_,j)=>i!==j);
   if(!other.every(x=>pool.includes(x))||!valid(other))return [];
   const choices=pool.filter(x=>other.every(y=>Math.abs(x-y)>=MIN_TANK_GAP)&&span([...other,x])>=minimum);
   return choices.length?[{i,choices}]:[];
  });
  if(repairs.length){
   const {i,choices}=pick(repairs);
   return initial.map((x,j)=>i===j?pick(choices):x);
  }
 }
 // Narrow or fragmented platforms can leave three incompatible positions.
 // Reserve the extremes, then fill in between on walkable ground.
 const edges=[safe[0],safe[safe.length-1]];
 const middle=safe.filter(x=>edges.every(y=>Math.abs(x-y)>=MIN_TANK_GAP));
 const choices=middle.filter(x=>Math.max(x-middle[0],middle[middle.length-1]-x)>=MIN_TANK_GAP);
 if(choices.length){
  const third=pick(choices),fourth=pick(middle.filter(x=>Math.abs(x-third)>=MIN_TANK_GAP));
  const placed=[...edges,third,fourth];
  // Avoid making the same slot the outlier on every seed.
  for(let i=placed.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[placed[i],placed[j]]=[placed[j],placed[i]];}
  return placed;
 }
 return initial;
}
