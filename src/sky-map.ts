import {referenceGrid} from './map-specification';
import {Terrain,WORLD_W} from './terrain';
export const SKY_UPPER_THICKNESS=58,SKY_BRANCH_THICKNESS=4;
export const SKY_BRANCH_FROM=WORLD_W*.15,SKY_BRANCH_TO=WORLD_W*.85;
/** S-shaped, destructible branch covers the central 70%, independently of the islands. */
export const skyBranch=(x:number,width=WORLD_W,height=960)=>height*.82+Math.min(48,height*.055)*Math.sin((x-width/2)/(width*.35)*Math.PI);
export function buildSkyMap(land:Terrain,phase:number){
 const source=referenceGrid('moon');
 for(let x=0;x<=land.width;x++){
  const gx=Math.min(source.gridWidth-1,Math.floor(x/3));let y=0;while(y<source.gridHeight&&!source.values[y*source.gridWidth+gx])y++;
  if(y<source.gridHeight){const top=y*3;land.column(x,top,Math.min(land.height,top+SKY_UPPER_THICKNESS));}
  if(x>=land.width*.15&&x<=land.width*.85)land.column(x,skyBranch(x,land.width,land.height),skyBranch(x,land.width,land.height)+4);
 }
 for(const fraction of [.25,.38,.62,.75]){const root=land.width*fraction;for(let d=0;d<54;d++){const x=root+(fraction<.5?-1:1)*d,top=skyBranch(root,land.width,land.height)-d*.55-5*Math.sin(d/54*Math.PI);land.column(x,top,top+Math.max(1,3-2*d/54));}}
 land.rebuild();
}
