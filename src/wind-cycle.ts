export const NATURAL_WIND_LIMIT=11;
// 60% of the entire west-to-east span: +11 may become -2.2 at most.
export const MAX_WIND_CHANGE=NATURAL_WIND_LIMIT*2*.6;
export function nextWindRound(round:number,rng:()=>number){return round+(rng()<.5?1:2);}
export function nextNaturalWind(wind:number,rng:()=>number){
 const from=Math.max(-NATURAL_WIND_LIMIT,Math.min(NATURAL_WIND_LIMIT,wind));
 const low=Math.max(-NATURAL_WIND_LIMIT,from-MAX_WIND_CHANGE),high=Math.min(NATURAL_WIND_LIMIT,from+MAX_WIND_CHANGE);
 return low+(high-low)*rng();
}
