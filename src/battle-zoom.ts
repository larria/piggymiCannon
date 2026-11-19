export const MIN_BATTLE_ZOOM=.7,MAX_BATTLE_ZOOM=1.8;
/** Relative to each device's approved view. Never expose horizontal void. */
export function boundedBattleZoom(value:number,baseWidth:number,worldWidth:number){
  return Math.max(Math.max(MIN_BATTLE_ZOOM,baseWidth/worldWidth),Math.min(MAX_BATTLE_ZOOM,Number.isFinite(value)?value:1));
}
/** Trackpad pinch arrives as ctrl+wheel in Chromium; Safari gesture events
 * are handled separately. Normalize mouse line/page deltas before scaling. */
export function wheelZoomFactor(delta:number,mode=0,pinch=false){
  const pixels=delta*(mode===1?16:mode===2?240:1);
  return Math.exp(-Math.max(-180,Math.min(180,pixels))*(pinch?.009:.0025));
}
