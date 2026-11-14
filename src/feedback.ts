import {isRedHealth} from './health';
export function breathingPose(hp:number,time:number,maxHP=150,vehicleId?:string|null) {
  if(vehicleId==='sea'||!isRedHealth({hp,maxHP})) return {active:false,bob:0,scale:1,mouth:0,puff:0,lean:0};
  const cycle=time*5.2;
  return {active:true,bob:Math.sin(cycle)*5.5,scale:1+Math.sin(cycle)*.12,mouth:3+(Math.sin(cycle)+1)*2.2,puff:(time*1.3)%1,lean:Math.sin(cycle)*.09};
}
