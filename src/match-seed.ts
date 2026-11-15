/** Session-local collision guard. Choose a fresh RNG state, never reject a map draw. */
export function freshMatchSeed(now:number,played:ReadonlySet<number>){
 let seed=now>>>0;
 while(played.has(seed))seed=(seed+1)>>>0;
 return seed;
}
