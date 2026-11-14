import {Terrain,WORLD_W,TERRAIN_H} from './terrain';
import type {MapId} from './catalog';

export const templeRail=(x:number)=>520+18*Math.sqrt(Math.max(0,1-((x-640)/600)**2));
export const TEMPLE_NODES=[95,350,640,930,1185];
/** Key material/topology facts are sourced; coordinates and scale are original Web layouts. */
export function buildClassicMap(land:Terrain,map:MapId){
  if(!['factory','temple','egypt'].includes(map))return false;
  const beam=(from:number,to:number,y:number|((x:number)=>number),thickness:number,permanent=false)=>{
    for(let x=from;x<=to;x++){const top=typeof y==='number'?y:y(x);land.column(x,top,top+thickness,permanent);}
  };
  if(map==='factory'){
    beam(0,WORLD_W,552,TERRAIN_H-552,true);
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
      const radius=node===640?52:24;
      for(let x=node-radius;x<=node+radius;x++){
        const top=templeRail(x);const depth=4+Math.sqrt(Math.max(0,radius*radius-(x-node)**2))*.5;
        land.column(x,top,Math.min(573,top+depth),true);
      }
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
