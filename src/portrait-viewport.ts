import {REFERENCE_ART_SCALE,tankArtScale} from './reference-calibration';

/** Max measured13-tank+crew silhouette; separate avatars/effects are excluded. */
export const PORTRAIT_TANK_ENVELOPE_WIDTH=134;
/** x≈7.9 reproduces the portrait screenshot approved on2026-11-19 exactly.
 * This is a presentation ratio, independent of weapons, wind and gravity. */
export const PORTRAIT_VIEW_DIVISOR=7.8873903658521165;
export function portraitViewWidth(version:string){
 return PORTRAIT_TANK_ENVELOPE_WIDTH*PORTRAIT_VIEW_DIVISOR*(tankArtScale(version)/REFERENCE_ART_SCALE);
}
