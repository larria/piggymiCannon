import { clamp } from './engine';
import {MIN_POWER,LEGACY_MIN_POWER} from './ballistics';

export const chargePower=(seconds:number)=>clamp(10+Math.max(0,seconds)*36,10,100);
export const CHARGE_DELAY_SECONDS=.2;
/** Saved 3.2.8 clips retain their original 100ms preparation timing. */
export function chargePreparationSeconds(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 if(!v||Number(v[1])>3||Number(v[1])===3&&(Number(v[2])>2||Number(v[2])===2&&Number(v[3])>=9))return CHARGE_DELAY_SECONDS;
 return Number(v[1])===3&&Number(v[2])===2&&Number(v[3])===8 ? .1 : 0;
}
export const chargeDelayProgress=(seconds:number,duration=CHARGE_DELAY_SECONDS)=>duration>0?clamp(seconds/duration,0,1):1;
/** All current input devices have the same deliberate tap/hold boundary. */
export const heldChargePower=(seconds:number)=>clamp(MIN_POWER+Math.max(0,seconds-CHARGE_DELAY_SECONDS)*36,MIN_POWER,100);
export const TOUCH_TAP_SECONDS=.16,TOUCH_JOIN_SECONDS=.35;
/** Legacy touch ramp retained for old mechanism calibration. The current UI uses heldChargePower. */
export function touchChargePower(seconds:number){
 if(seconds<=TOUCH_TAP_SECONDS)return LEGACY_MIN_POWER;
 if(seconds>=TOUCH_JOIN_SECONDS)return chargePower(seconds);
 const u=(seconds-TOUCH_TAP_SECONDS)/(TOUCH_JOIN_SECONDS-TOUCH_TAP_SECONDS),end=chargePower(TOUCH_JOIN_SECONDS)-LEGACY_MIN_POWER,m=36*(TOUCH_JOIN_SECONDS-TOUCH_TAP_SECONDS);
 return LEGACY_MIN_POWER+(-2*u**3+3*u*u)*end+(u**3-u*u)*m;
}
export function dragAim(angle:number,direction:number,dx:number,dy:number,min=5,max=85) {
  return {angle:clamp(angle-dy*0.38,min,max),direction:Math.abs(dx)>30?(dx>0?1:-1):direction};
}
