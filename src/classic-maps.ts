import {originalBallistics} from './original-ballistics';
import {Terrain,WORLD_W,TERRAIN_H} from './terrain';
import type {MapId} from './catalog';

export const templeRail=(x:number)=>780+27*Math.sqrt(Math.max(0,1-((x-960)/900)**2));
export const TEMPLE_NODES=[143,525,960,1395,1778];
export const FACTORY_FLOOR_PERIOD=224;
/** Same ramp pitch and rounded folds, relocated into the expanded world. */
export function factoryFloor(x:number){
  const period=FACTORY_FLOOR_PERIOD,half=period/2,round=20,slope=48/half;
  const u=((x%period)+period)%period,d=Math.min(u,period-u);
  if(d<round)return 768+slope*(round/2+d*d/(2*round));
  if(d>half-round)return 816-slope*(round/2+(half-d)**2/(2*round));
  return 768+slope*d;
}
export const TEMPLE_NODE_SCALE=1/3;
export const templeNode=(node:number)=>{
 const scale=TEMPLE_NODE_SCALE,rail=templeRail(node),center=node===TEMPLE_NODES[2],edge=node===TEMPLE_NODES[0]||node===TEMPLE_NODES[4],stem=center?16:12;
 // Preserve all cap/stem dimensions and their original relative offsets.
 const oldRail=rail/1.5;
 return {radius:(center?104:edge?96:72)*scale,rise:(center?32:28)*scale,stem:stem*scale,rim:7*scale,stemStart:6*scale,baseWidth:(stem+3)*scale,baseTop:rail+(566-oldRail)*scale,bottom:rail+(574-oldRail)*scale};
};
export function templeCap(x:number,node:number){const {radius,rise}=templeNode(node),u=(x-node)/radius;return templeRail(x)-rise*Math.max(0,1-u*u)**2;}
/** Self-drawn 3.1 layouts; protected ramps/caps and thin rails keep their game-unit sizes. */
export function buildClassicMap(land:Terrain,map:MapId,version='4.0.4'){
  if(!['factory','temple','egypt'].includes(map))return false;
  const beam=(from:number,to:number,y:number|((x:number)=>number),thickness:number,permanent=false)=>{
    for(let x=Math.ceil(from*1.5);x<=Math.floor(to*1.5);x++){const top=(typeof y==='number'?y:y(x/1.5))*1.5;land.column(x,top,top+thickness,permanent);}
  };
  if(map==='factory'){
    for(let x=0;x<=WORLD_W;x++)land.column(x,factoryFloor(x),TERRAIN_H,true);
    const steel=originalBallistics(version)?90:30;beam(60,450,310,steel);beam(830,1220,310,steel);
    beam(450,780,x=>310+(x-450)*.3,30);beam(590,1030,410,36);
    beam(820,1040,x=>410+(x-820)*.5,30);
    beam(410,870,202,originalBallistics(version)?90:30);beam(410,630,x=>202+(x-410)*.49,30);
    beam(420,440,330,120);beam(1010,1030,434,177);
  }else if(map==='temple'){
    beam(50,445,335,13.5);beam(835,1230,335,13.5);
    beam(400,535,420,12);beam(745,880,420,12);beam(550,730,365,66);
    for(let x=60;x<=1860;x++)land.column(x,templeRail(x),templeRail(x)+4);
    for(const node of TEMPLE_NODES){
      const {radius,stem,rim,stemStart,baseWidth,baseTop,bottom}=templeNode(node);
      for(let x=Math.max(0,Math.ceil(node-radius));x<=Math.min(WORLD_W,Math.floor(node+radius));x++)land.column(x,templeCap(x,node),templeRail(x)+rim,true);
      for(let x=Math.ceil(node-stem);x<=Math.floor(node+stem);x++)land.column(x,templeRail(node)+stemStart,bottom,true);
      for(let x=Math.ceil(node-baseWidth);x<=Math.floor(node+baseWidth);x++)land.column(x,baseTop,bottom,true);
    }
  }else{
    for(let x=0;x<=WORLD_W;x++){const u=x/1.5;if(u<580||u>700){
      const center=u<580?300:980,top=Math.min(515,365+.62*Math.max(0,Math.abs(u-center)-18));land.column(x,top*1.5,TERRAIN_H);
    }}
    beam(560,720,492,18);beam(625,655,328,315);
  }
  land.rebuild();return true;
}
