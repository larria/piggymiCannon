import type {Terrain} from './terrain';
/** Thick connected snowy cloud bank from the supplied sky-city overview.
 * Gameplay depth is self-drawn; the cropped thumbnail is not a collision map. */
export function skyCitySurface(x:number,width:number,height:number){
 const u=x/width;
 return height*(.84-.12*Math.exp(-(((u-.55)/.30)**2)))+14*Math.sin(x/49)+6*Math.sin(x/23);
}
export function buildSkyCity(land:Terrain){
 for(let x=0;x<=land.width;x++){const top=skyCitySurface(x,land.width,land.height);land.column(x,top,Math.min(land.height,top+320));}
 land.rebuild();
}
