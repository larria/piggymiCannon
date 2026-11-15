export const MIN_POWER=10,LOW_POWER_END=22;
/** Short-range branch joins the existing speed curve with the same derivative.
 * At 10: 95 at standard gravity, scaled for actual gravity so low-gravity
 * beams and moon shots also reach contact range. Range bonuses fade in smoothly.
 * At/above 22: exactly the published mapping, including weapon speed bonuses. */
export function projectileSpeed(power:number,multiplier=1,gravity=230){
 if(power>=LOW_POWER_END)return (120+power*6.1)*multiplier;
 const p=Math.max(MIN_POWER,power),short=Math.max(0,LOW_POWER_END-p);
 const u=Math.min(1,(p-MIN_POWER)/(LOW_POWER_END-MIN_POWER)),blend=u*u*(3-2*u);
 const minimum=95*Math.sqrt(gravity/230),reduction=(181-minimum)/144;
 return (120+p*6.1-reduction*short*short)*(1+(multiplier-1)*blend);
}
