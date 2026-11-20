import {sourceRangeModel} from './source-range';
import {REFERENCE_BRIDGE_THICKNESS} from './reference-calibration';
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
export function buildIceValley(land:Terrain,version='5.0.0'){
 if(sourceRangeModel(version)){for(let x=0;x<=land.width;x++)for(const band of iceValleyBands(x,land.width,land.height,version))land.column(x,band.top,band.top+band.depth);}
 else for(let x=0;x<=land.width;x++){const top=iceValleySurface(x,land.width,land.height);land.column(x,top,top+SKY_UPPER_THICKNESS);}
 for(let x=Math.ceil(land.width*ICE_BRANCH_FROM);x<=Math.floor(land.width*ICE_BRANCH_TO);x++){const top=iceValleyBranch(x,land.width,land.height);land.column(x,top,top+SKY_BRANCH_THICKNESS);}
 land.rebuild();
}

/** Reference screenshot: left ice descends toward a tapered middle-right tip;
 * the higher right ice begins near the centre and rises to the right edge.
 * Only their horizontal spans overlap. The latest ice thickens toward the
 * outer edges, preserving the upper contours, tips and separate lower S. */
export const ICE_LEFT_END=.67,ICE_RIGHT_START=.41;
const ICE_OUTER_THICKNESS=Math.round(REFERENCE_BRIDGE_THICKNESS*.95);
const ICE_LEFT_POINTS=[[0,.30],[.10,.31],[.25,.385],[.38,.43],[.52,.44],[.67,.485]] as const;
const ICE_RIGHT_POINTS=[[.41,.315],[.49,.27],[.58,.28],[.73,.25],[.88,.19],[1,.15]] as const;
export function thickIceEdges(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=3);
}
export function iceValleyBands(x:number,width:number,height:number,version='5.0.4'){
 const u=x/width,bands:{top:number;depth:number;side:'left'|'right'}[]=[],thickened=thickIceEdges(version);
 const depth=(fromTip:number,span:number)=>{
  const taper=Math.min(1,Math.max(0,fromTip/.04));
  const extra=thickened?(ICE_OUTER_THICKNESS-SKY_UPPER_THICKNESS)*(fromTip/span)**2.4:0;
  return Math.max(1,SKY_UPPER_THICKNESS*Math.sin(taper*Math.PI/2)+extra);
 };
 if(u<=ICE_LEFT_END)bands.push({top:smoothContour(x,width,height,ICE_LEFT_POINTS),depth:depth(ICE_LEFT_END-u,ICE_LEFT_END),side:'left'});
 if(u>=ICE_RIGHT_START)bands.push({top:smoothContour(x,width,height,ICE_RIGHT_POINTS),depth:depth(u-ICE_RIGHT_START,1-ICE_RIGHT_START),side:'right'});
 return bands;
}
