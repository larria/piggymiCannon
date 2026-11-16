// Fixed small-coordinate geometry for old mechanism regressions. Production uses original map dimensions.
import type {Game} from '../src/engine';
import {WORLD_W,TERRAIN_H} from '../src/terrain';
import {buildClassicMap} from '../src/classic-maps';
const BRIDGE_THICKNESS=180,clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export function legacyTerrain(g:Game){
    const phase=.5;
    if(buildClassicMap(g.land,g.config.map))return;
    for(let x=0;x<=WORLD_W;x++) {
      const u=x/1.5;
      if(g.config.map==='coast') {
        if(u<90||u>1190) g.land.column(x,591,TERRAIN_H);
        else {
          const top=597+Math.sin(u/115)*6;
              g.land.column(x,top,top+BRIDGE_THICKNESS);
        }
      } else if(g.config.map==='moon') {
        if(u>=70&&u<=410) {const top=532.5+Math.sin(u/92+phase)*18;g.land.column(x,top,top+210);}
        if(u>=870&&u<=1210) {const top=499.5+Math.sin(u/96+phase)*18;g.land.column(x,top,top+210);}
        if(u>=520&&u<=750) g.land.column(x,658.5+Math.sin(u/45)*9,825);
        if(u>=550&&u<=730) g.land.column(x,322.5+Math.sin(u/50)*7.5,532.5);
      } else if(u<585||u>705) {
        const top=452+31*Math.sin(u/130+0.25)+14*Math.sin(u/55)
          -70*Math.exp(-(((u-370)/110)**2))-65*Math.exp(-(((u-940)/120)**2));
        g.land.column(x,clamp(top,350,535)*1.5,TERRAIN_H);
      }
    }
    g.land.rebuild();
    // Level just the deployment tread footprint; do not fill the void underneath.
    for(const center of [262,1658]) {
      const base=Math.round(g.ground(center));
      const original=Array.from({length:121},(_,i)=>({top:g.ground(center-60+i),bottom:g.land.bottom(center-60+i)}));
      for(let x=center-60;x<=center+60;x++) {
        const column=original[x-center+60],blend=clamp((60-Math.abs(x-center))/40,0,1);
        const top=Math.round(column.top*(1-blend)+base*blend);
        for(let y=0;y<TERRAIN_H;y++) g.land.mask[y*g.land.stride+x]=0;
        g.land.column(x,top,column.bottom);
      }
    }
    g.land.rebuild();
}
