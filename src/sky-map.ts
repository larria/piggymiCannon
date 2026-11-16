import {Terrain,WORLD_W,TERRAIN_H} from './terrain';
export const SKY_UPPER_THICKNESS=58,SKY_BRANCH_THICKNESS=4;
export const SKY_BRANCH_FROM=WORLD_W*.15,SKY_BRANCH_TO=WORLD_W*.85;
/** Hand-drawn thin lower S branch, calibrated in the existing 3.1 game units. */
export const skyBranch=(x:number)=>TERRAIN_H*.82+48*Math.sin((x-WORLD_W/2)/(WORLD_W*.35)*Math.PI);
export function addSkyBranch(land:Terrain){
 for(let x=Math.ceil(SKY_BRANCH_FROM);x<=Math.floor(SKY_BRANCH_TO);x++)land.column(x,skyBranch(x),skyBranch(x)+SKY_BRANCH_THICKNESS);
 for(const fraction of [.25,.38,.62,.75]){const root=WORLD_W*fraction;for(let d=0;d<54;d++){const x=root+(fraction<.5?-1:1)*d,top=skyBranch(root)-d*.55-5*Math.sin(d/54*Math.PI);land.column(x,top,top+Math.max(1,3-2*d/54));}}
}
