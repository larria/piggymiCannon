import { clamp } from './engine';

export const chargePower=(seconds:number)=>clamp(10+Math.max(0,seconds)*36,10,100);
export function dragAim(angle:number,direction:number,dx:number,dy:number) {
  return {angle:clamp(angle-dy*0.38,5,85),direction:Math.abs(dx)>30?(dx>0?1:-1):direction};
}
