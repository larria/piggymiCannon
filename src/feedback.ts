export function breathingPose(hp:number,time:number) {
  if(hp<=0||hp>=50) return {active:false,bob:0,scale:1,mouth:0,puff:0};
  const cycle=time*3.6;
  return {active:true,bob:Math.sin(cycle)*2.1,scale:1+Math.sin(cycle)*0.045,mouth:1.2+(Math.sin(cycle)+1)*1.4,puff:(time*0.85)%1};
}
