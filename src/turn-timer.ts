export const DEFAULT_TURN_TIMER=0;
export const TIMER_PREFERENCE_VERSION=1;
/** Migrate the old automatic 45s default once; explicit choices saved by this
 * version remain independent from the default, including 45s. */
export function storedTurnTimer(value:unknown,version:unknown){
  if(![0,30,45,60].includes(value as number))return DEFAULT_TURN_TIMER;
  return value===45&&version!==TIMER_PREFERENCE_VERSION?DEFAULT_TURN_TIMER:value as number;
}
