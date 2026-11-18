import type {Terrain} from './terrain';
import {REFERENCE_BRIDGE_THICKNESS} from './reference-calibration';
/** Raised small heads and outward sloping rock shoulders, based on the
 * supplied bridge screenshot. Centre thickness retains the tested280 units. */
export function coastBridgeSurface(x:number,width:number){
 const scale=width/1920,base=597*scale+Math.sin((x/(1.5*scale))/115)*6;
 const cap=(center:number)=>{const u=(x-center)/90;return 32*Math.max(0,1-u*u)**2;};
 return base-cap(width*.11)-cap(width*.89);
}
export function coastBridgeBottom(x:number,width:number){const scale=width/1920;return 597*scale+Math.sin((x/(1.5*scale))/115)*6+REFERENCE_BRIDGE_THICKNESS;}
export function coastShoulderBottom(x:number,width:number,height:number){
 const bottom=coastBridgeBottom(x,width),edge=Math.min(x,width-x),inner=width*.18,outer=width*.04;
 const fill=Math.max(0,Math.min(1,(inner-edge)/(inner-outer)));
 return bottom+(height-bottom)*fill;
}
export function buildCoastMap(land:Terrain){
 for(let x=0;x<=land.width;x++)land.column(x,coastBridgeSurface(x,land.width),coastShoulderBottom(x,land.width,land.height));
 land.rebuild();
}
