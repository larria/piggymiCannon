import {REFERENCE_MAP_DATA} from './reference-map-data';
import type {MapId} from './catalog';
export const MAP_SPECIFICATION_VERSION='original-logical-3-v1';
export function mapSpecification(map:MapId){
 const source=map==='valley'?null:REFERENCE_MAP_DATA[map];
 return {width:source?source.gridWidth*3:4608,height:source?source.gridHeight*3:1908,cellSize:map==='egypt'?3:1,sourceNumber:source?.number??null};
}
const decoded=new Map<string,Uint8Array>();
export function referenceGrid(map:Exclude<MapId,'valley'>){
 const d=REFERENCE_MAP_DATA[map];let values=decoded.get(map);
 if(!values){const bytes=atob(d.packed);values=new Uint8Array(d.gridWidth*d.gridHeight);for(let i=0;i<values.length;i++)values[i]=(bytes.charCodeAt(i>>2)>>((i&3)*2))&3;decoded.set(map,values);}
 return {...d,values};
}
