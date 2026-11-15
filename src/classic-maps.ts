import {Terrain,WORLD_W,TERRAIN_H} from './terrain';
import type {MapId} from './catalog';

export const templeRail=(x:number)=>520+18*Math.sqrt(Math.max(0,1-((x-640)/600)**2));
export const TEMPLE_NODES=[95,350,640,930,1185];
export const FACTORY_FLOOR_PERIOD=224;
/** Rounded triangular/Z floor: straight ramps and C1 corners, all above water. */
export function factoryFloor(x:number){
  const period=FACTORY_FLOOR_PERIOD,half=period/2,round=20,slope=48/half;
  const u=((x%period)+period)%period,d=Math.min(u,period-u);
  if(d<round)return 512+slope*(round/2+d*d/(2*round));
  if(d>half-round)return 560-slope*(round/2+(half-d)**2/(2*round));
  return 512+slope*d;
}
export const TEMPLE_NODE_SCALE=1/3;
export const templeNode=(node:number)=>{
 const scale=TEMPLE_NODE_SCALE,rail=templeRail(node),stem=node===640?16:12;
 return {radius:(node===640?104:node===95||node===1185?96:72)*scale,rise:(node===640?32:28)*scale,stem:stem*scale,rim:7*scale,stemStart:6*scale,baseWidth:(stem+3)*scale,baseTop:rail+(566-rail)*scale,bottom:rail+(574-rail)*scale};
};
/** Smooth cap meets the existing thin rail without a vertical step. */
export function templeCap(x:number,node:number){const {radius,rise}=templeNode(node),u=(x-node)/radius;return templeRail(x)-rise*Math.max(0,1-u*u)**2;}
/** Key material/topology facts are sourced; coordinates and scale are original Web layouts. */
export function buildClassicMap(land:Terrain,map:MapId){
  if(!['factory','temple','egypt'].includes(map))return false;
  const beam=(from:number,to:number,y:number|((x:number)=>number),thickness:number,permanent=false)=>{
    for(let x=from;x<=to;x++){const top=typeof y==='number'?y:y(x);land.column(x,top,top+thickness,permanent);}
  };
  if(map==='factory'){
    for(let x=0;x<=WORLD_W;x++)land.column(x,factoryFloor(x),TERRAIN_H,true);
    beam(60,450,310,24);beam(830,1220,310,24);
    beam(310,640,x=>310+(x-310)*.3,20);beam(590,1030,410,24);
    beam(820,1040,x=>410+(x-820)*.5,20);
    beam(410,870,202,22);beam(410,630,x=>202+(x-410)*.49,20);
    beam(420,440,334,76);beam(1010,1030,434,118);
  }else if(map==='temple'){
    beam(50,445,335,9);beam(835,1230,335,9);
    beam(400,535,420,8);beam(745,880,420,8);beam(550,730,365,44);
    beam(40,1240,templeRail,4);
    for(const node of TEMPLE_NODES){
      const {radius,stem,rim,stemStart,baseWidth,baseTop,bottom}=templeNode(node);
      for(let x=Math.max(0,Math.ceil(node-radius));x<=Math.min(WORLD_W,Math.floor(node+radius));x++){
        land.column(x,templeCap(x,node),templeRail(x)+rim,true);
      }
      for(let x=Math.ceil(node-stem);x<=Math.floor(node+stem);x++)land.column(x,templeRail(node)+stemStart,bottom,true);
      for(let x=Math.ceil(node-baseWidth);x<=Math.floor(node+baseWidth);x++)land.column(x,baseTop,bottom,true);
    }
  }else{
    for(let x=0;x<=WORLD_W;x++)if(x<580||x>700){
      const center=x<580?300:980;const top=Math.min(515,365+.62*Math.max(0,Math.abs(x-center)-18));
      land.column(x,top,TERRAIN_H);
    }
    beam(560,720,492,12);beam(625,655,328,210);
  }
  land.rebuild();return true;
}
