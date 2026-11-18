import {originalBallistics} from './original-ballistics';
import {layoutScale} from './world-layout';
import {Terrain,TERRAIN_H} from './terrain';
import type {MapId} from './catalog';

export const templeRail=(x:number,scale=1)=>(scale>1?960*scale*.86:780)+27*Math.sqrt(Math.max(0,1-((x-960*scale)/(900*scale))**2));
export const TEMPLE_NODES=[143,525,960,1395,1778];
export const templeNodes=(scale=1)=>TEMPLE_NODES.map(x=>Math.round(x*scale));
export const FACTORY_FLOOR_PERIOD=224;
/** Same ramp pitch and rounded folds, relocated into the expanded world. */
export function factoryFloor(x:number,scale=1){
  const lift=TERRAIN_H*(scale-1);
  const period=FACTORY_FLOOR_PERIOD,half=period/2,round=20,slope=48/half;
  const u=((x%period)+period)%period,d=Math.min(u,period-u);
  if(d<round)return lift+768+slope*(round/2+d*d/(2*round));
  if(d>half-round)return lift+816-slope*(round/2+(half-d)**2/(2*round));
  return lift+768+slope*d;
}
export const TEMPLE_NODE_SCALE=1/3;
export const templeNode=(node:number,layout=1)=>{
 const scale=TEMPLE_NODE_SCALE,rail=templeRail(node,layout),nodes=templeNodes(layout),center=node===nodes[2],edge=node===nodes[0]||node===nodes[4],stem=center?16:12;
 // Preserve all cap/stem dimensions and their original relative offsets.
 const oldRail=templeRail(node/layout)/1.5;
 return {radius:(center?104:edge?96:72)*scale,rise:(center?32:28)*scale,stem:stem*scale,rim:7*scale,stemStart:6*scale,baseWidth:(stem+3)*scale,baseTop:rail+(566-oldRail)*scale,bottom:rail+(574-oldRail)*scale};
};
export function templeCap(x:number,node:number,scale=1){const {radius,rise}=templeNode(node,scale),u=(x-node)/radius;return templeRail(x,scale)-rise*Math.max(0,1-u*u)**2;}
/** Self-drawn 3.1 layouts; protected ramps/caps and thin rails keep their game-unit sizes. */
export function buildClassicMap(land:Terrain,map:MapId,version='4.0.4'){
  const scale=layoutScale(land.width),width=land.width,height=land.height;
  if(!['factory','temple','egypt'].includes(map))return false;
  const beam=(from:number,to:number,y:number|((x:number)=>number),thickness:number,permanent=false)=>{
    for(let x=Math.ceil(from*1.5*scale);x<=Math.floor(to*1.5*scale);x++){const top=(typeof y==='number'?y:y(x/(1.5*scale)))*1.5*scale;land.column(x,top,top+thickness,permanent);}
  };
  if(scale>1){
    const platform=(a:number,b:number,y:number,thickness:number)=>{for(let x=Math.ceil(a*width);x<=Math.floor(b*width);x++)land.column(x,y*height,y*height+thickness);};
    if(map==='factory'){
      for(let x=0;x<=width;x++)land.column(x,factoryFloor(x,scale),height,true);
      for(const [a,b,y] of [[.28,.72,.29],[0,.11,.46],[.89,1,.46],[.08,.33,.60],[.67,.92,.60],[.43,.57,.69]])platform(a,b,y,90);
    }else if(map==='temple'){
      for(const [a,b,y,d] of [[.24,.76,.28,13.5],[.01,.08,.52,13.5],[.92,.99,.52,13.5],[.47,.53,.46,66],[.32,.68,.64,12],[.22,.33,.75,12],[.69,.80,.75,12]])platform(a,b,y,d);
      for(let x=Math.ceil(60*scale);x<=Math.floor(1860*scale);x++)land.column(x,templeRail(x,scale),templeRail(x,scale)+4);
      for(const node of templeNodes(scale)){
        const {radius,stem,rim,stemStart,baseWidth,baseTop,bottom}=templeNode(node,scale);
        for(let x=Math.ceil(node-radius);x<=Math.floor(node+radius);x++)land.column(x,templeCap(x,node,scale),templeRail(x,scale)+rim,true);
        for(let x=Math.ceil(node-stem);x<=Math.floor(node+stem);x++)land.column(x,templeRail(node,scale)+stemStart,bottom,true);
        for(let x=Math.ceil(node-baseWidth);x<=Math.floor(node+baseWidth);x++)land.column(x,baseTop,bottom,true);
      }
    }else return buildEgypt();
    land.rebuild();return true;
  }
  return buildLegacy();
  function buildEgypt(){
    for(let x=0;x<=width;x++){const u=x/(1.5*scale);if(u<580||u>700){const center=u<580?300:980,top=Math.min(515,365+.62*Math.max(0,Math.abs(u-center)-18));land.column(x,top*1.5*scale,height);}}
    beam(560,720,492,18);beam(625,655,328,315);land.rebuild();return true;
  }
  function buildLegacy(){
  if(map==='factory'){
    for(let x=0;x<=width;x++)land.column(x,factoryFloor(x,scale),height,true);
    const steel=originalBallistics(version)?90:30;beam(60,450,310,steel);beam(830,1220,310,steel);
    beam(450,780,x=>310+(x-450)*.3,30);beam(590,1030,410,36);
    beam(820,1040,x=>410+(x-820)*.5,30);
    beam(410,870,202,originalBallistics(version)?90:30);beam(410,630,x=>202+(x-410)*.49,30);
    beam(420,440,330,120);beam(1010,1030,434,177);
  }else if(map==='temple'){
    beam(50,445,335,13.5);beam(835,1230,335,13.5);
    beam(400,535,420,12);beam(745,880,420,12);beam(550,730,365,66);
    for(let x=Math.ceil(60*scale);x<=Math.floor(1860*scale);x++)land.column(x,templeRail(x,scale),templeRail(x,scale)+4);
    for(const node of templeNodes(scale)){
      const {radius,stem,rim,stemStart,baseWidth,baseTop,bottom}=templeNode(node,scale);
      for(let x=Math.max(0,Math.ceil(node-radius));x<=Math.min(width,Math.floor(node+radius));x++)land.column(x,templeCap(x,node,scale),templeRail(x,scale)+rim,true);
      for(let x=Math.ceil(node-stem);x<=Math.floor(node+stem);x++)land.column(x,templeRail(node,scale)+stemStart,bottom,true);
      for(let x=Math.ceil(node-baseWidth);x<=Math.floor(node+baseWidth);x++)land.column(x,baseTop,bottom,true);
    }
  }else{
    for(let x=0;x<=width;x++){const u=x/(1.5*scale);if(u<580||u>700){
      const center=u<580?300:980,top=Math.min(515,365+.62*Math.max(0,Math.abs(u-center)-18));land.column(x,top*1.5*scale,height);
    }}
    beam(560,720,492,18);beam(625,655,328,315);
  }
  land.rebuild();return true;
  }
}
