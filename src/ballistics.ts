export const MIN_POWER=1,LEGACY_MIN_POWER=10,LOW_POWER_END=22;
export function minimumPower(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||Number(v[1])>3||Number(v[1])===3&&(Number(v[2])>2||Number(v[2])===2&&Number(v[3])>=9)?MIN_POWER:LEGACY_MIN_POWER;
}
/** Short-range branch joins the existing speed curve with the same derivative.
 * At 10: 95 at standard gravity, scaled for actual gravity so low-gravity
 * beams and moon shots also reach contact range. Range bonuses fade in smoothly.
 * At/above 22: exactly the published mapping, including weapon speed bonuses. */
export function projectileSpeed(power:number,multiplier=1,gravity=230){
 if(power<LEGACY_MIN_POWER){
  // Extend below 10 without altering a single existing 10–100 trajectory.
  // A linear near-contact range joins a monotone Hermite segment at 9–10.
  // The endpoint matches the old derivative, including low-gravity guns.
  const end=95*Math.sqrt(gravity/230);if(end<=0)return 0;
  const slope=6.1+(181-end)/6,delta=Math.min(end*.65,Math.max(end*.15,slope*.55));
  const start=end*.3,join=end-delta,nearSlope=(join-start)/8,p=Math.max(MIN_POWER,power);
  if(p<=9)return start+(p-MIN_POWER)*nearSlope;
  const u=p-9;
  return (2*u**3-3*u*u+1)*join+(u**3-2*u*u+u)*nearSlope+(-2*u**3+3*u*u)*end+(u**3-u*u)*slope;
 }
 if(power>=LOW_POWER_END)return (120+power*6.1)*multiplier;
 const p=Math.max(LEGACY_MIN_POWER,power),short=Math.max(0,LOW_POWER_END-p);
 const u=Math.min(1,(p-LEGACY_MIN_POWER)/(LOW_POWER_END-LEGACY_MIN_POWER)),blend=u*u*(3-2*u);
 const minimum=95*Math.sqrt(gravity/230),reduction=(181-minimum)/144;
 return (120+p*6.1-reduction*short*short)*(1+(multiplier-1)*blend);
}
