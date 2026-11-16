import type {MapId} from './catalog';
import {referenceGrid} from './map-specification';
import {Terrain} from './terrain';
import {factoryFloor,templeNode} from './classic-maps';
export const nativeFactoryFloor=(x:number,height:number)=>factoryFloor(x)+height-960;
export function nativeTempleNodes(){
 const src=referenceGrid('temple'),out:{x:number;rail:number;bottom:number;radius:number;rise:number;stem:number}[]=[];
 let from=-1;
 for(let x=0;x<=src.gridWidth;x++){
  let exists=false;for(let y=0;x<src.gridWidth&&y<src.gridHeight;y++)if(src.values[y*src.gridWidth+x]===3){exists=true;break;}
  if(exists&&from<0)from=x;
  if(!exists&&from>=0){const gx=Math.round((from+x-1)/2),ys=[];for(let y=0;y<src.gridHeight;y++)if(src.values[y*src.gridWidth+gx])ys.push(y);
   const lower=ys.filter(y=>y>src.gridHeight*.8),rail=(lower[0]??ys[0])*3,shape=templeNode(out.length===2?960:143);
   out.push({x:gx*3,rail,bottom:Math.min(src.gridHeight*3,(lower.at(-1)!+1)*3),radius:shape.radius,rise:shape.rise,stem:shape.stem});from=-1;
  }
 }
 return out;
}
export function nativeTempleCap(x:number,node:ReturnType<typeof nativeTempleNodes>[number]){const u=(x-node.x)/node.radius;return node.rail-node.rise*Math.max(0,1-u*u)**2;}
/** Original placement, with previously approved thin support sizes kept in game units. */
export function buildNativeClassicMap(land:Terrain,map:MapId){
 if(!['factory','temple','egypt'].includes(map))return false;
 const src=referenceGrid(map as 'factory'|'temple'|'egypt');
 for(let gx=0;gx<src.gridWidth;gx++){
  let y=0;
  while(y<src.gridHeight){const value=src.values[y*src.gridWidth+gx];if(!value){y++;continue;}const start=y;while(y<src.gridHeight&&src.values[y*src.gridWidth+gx]===value)y++;
   if(map==='factory'&&value===3||map==='temple'&&start*3>land.height*.8)continue;
   // Original upper beam tops/joins, calibrated to two actual small-red-bean hits.
   const thickness=(y-start)*3,thin=map==='factory'&&value===1&&start*3<980&&thickness>30&&thickness<150;
   for(let x=gx*3;x<Math.min(land.width,(gx+1)*3);x++)land.column(x,start*3,thin?start*3+30:y*3,value===3);
  }
 }
 if(map==='factory')for(let x=0;x<=land.width;x++)land.column(x,nativeFactoryFloor(x,land.height),land.height,true);
 if(map==='temple'){
  for(let gx=0;gx<src.gridWidth;gx++){let gy=Math.ceil(src.gridHeight*.8);while(gy<src.gridHeight&&!src.values[gy*src.gridWidth+gx])gy++;if(gy===src.gridHeight)continue;
   const top=gy*3;for(let x=gx*3;x<(gx+1)*3;x++)land.column(x,top,top+4);
  }
  for(const node of nativeTempleNodes()){
   for(let x=Math.ceil(node.x-node.radius);x<=Math.floor(node.x+node.radius);x++)land.column(x,nativeTempleCap(x,node),node.rail+3,true);
   for(let x=Math.ceil(node.x-node.stem);x<=Math.floor(node.x+node.stem);x++)land.column(x,node.rail+2,node.bottom,true);
  }
 }
 land.rebuild();return true;
}
