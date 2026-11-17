import { clamp } from './engine';
import {MIN_POWER} from './ballistics';

export const chargePower=(seconds:number)=>clamp(10+Math.max(0,seconds)*36,10,100);
export const CHARGE_DELAY_SECONDS=.1;
export const chargeDelayProgress=(seconds:number)=>clamp(seconds/CHARGE_DELAY_SECONDS,0,1);
/** All current input devices have the same deliberate tap/hold boundary. */
export const heldChargePower=(seconds:number)=>chargePower(Math.max(0,seconds-CHARGE_DELAY_SECONDS));
export const TOUCH_TAP_SECONDS=.16,TOUCH_JOIN_SECONDS=.35;
/** Tap fires immediately on release at the minimum. A smooth transition meets
 * the original charge curve at .35s; longer touch holds and SPACE are unchanged. */
export function touchChargePower(seconds:number){
 if(seconds<=TOUCH_TAP_SECONDS)return MIN_POWER;
 if(seconds>=TOUCH_JOIN_SECONDS)return chargePower(seconds);
 const u=(seconds-TOUCH_TAP_SECONDS)/(TOUCH_JOIN_SECONDS-TOUCH_TAP_SECONDS),end=chargePower(TOUCH_JOIN_SECONDS)-MIN_POWER,m=36*(TOUCH_JOIN_SECONDS-TOUCH_TAP_SECONDS);
 return MIN_POWER+(-2*u**3+3*u*u)*end+(u**3-u*u)*m;
}
export function dragAim(angle:number,direction:number,dx:number,dy:number,min=5,max=85) {
  return {angle:clamp(angle-dy*0.38,min,max),direction:Math.abs(dx)>30?(dx>0?1:-1):direction};
}
