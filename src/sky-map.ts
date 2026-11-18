import {Terrain,WORLD_W,TERRAIN_H} from './terrain';
export const SKY_UPPER_THICKNESS=58,SKY_BRANCH_THICKNESS=4;
export const SKY_BRANCH_FROM=WORLD_W*.15,SKY_BRANCH_TO=WORLD_W*.85;
/** Hand-drawn thin lower S branch, calibrated in the existing 3.1 game units. */
export const skyBranch=(x:number,width=WORLD_W,height=TERRAIN_H)=>height*.82+48*Math.sin((x-width/2)/(width*.35)*Math.PI);
export function addSkyBranch(land:Terrain){
 const width=land.width,height=land.height,branch=(x:number)=>skyBranch(x,width,height);
 for(let x=Math.ceil(width*.15);x<=Math.floor(width*.85);x++)land.column(x,branch(x),branch(x)+SKY_BRANCH_THICKNESS);
 for(const fraction of [.25,.38,.62,.75]){const root=width*fraction;for(let d=0;d<54;d++){const x=root+(fraction<.5?-1:1)*d,top=branch(root)-d*.55-5*Math.sin(d/54*Math.PI);land.column(x,top,top+Math.max(1,3-2*d/54));}}
}

/** User-supplied overview: rolling connected ice ridge and a separate lower S.
 * These are self-drawn layout proportions, not an imported collision bitmap. */
const ICE_RIDGE_POINTS=[[0,.32],[.05,.29],[.14,.29],[.21,.255],[.30,.33],[.44,.375],[.49,.285],[.58,.255],[.72,.14],[.86,.195],[.96,.18],[1,.23]] as const;
const ICE_BRANCH_POINTS=[[.30,.705],[.36,.645],[.40,.68],[.48,.8],[.53,.81],[.58,.78]] as const;
function smoothContour(x:number,width:number,height:number,points:readonly (readonly [number,number])[]){
 const u=x/width;let i=1;while(i<points.length-1&&u>points[i][0])i++;
 const [left,a]=points[i-1],[right,b]=points[i],t=Math.max(0,Math.min(1,(u-left)/(right-left)));
 return height*(a+(b-a)*(1-Math.cos(Math.PI*t))/2);
}
export const iceValleySurface=(x:number,width:number,height:number)=>smoothContour(x,width,height,ICE_RIDGE_POINTS);
export const iceValleyBranch=(x:number,width:number,height:number)=>smoothContour(x,width,height,ICE_BRANCH_POINTS);
export const ICE_BRANCH_FROM=.30,ICE_BRANCH_TO=.58;
export function buildIceValley(land:Terrain){
 for(let x=0;x<=land.width;x++){const top=iceValleySurface(x,land.width,land.height);land.column(x,top,top+SKY_UPPER_THICKNESS);}
 for(let x=Math.ceil(land.width*ICE_BRANCH_FROM);x<=Math.floor(land.width*ICE_BRANCH_TO);x++){const top=iceValleyBranch(x,land.width,land.height);land.column(x,top,top+SKY_BRANCH_THICKNESS);}
 land.rebuild();
}
