/** Locally reviewed 4.0.6 rules; versioned so recordings keep their old geometry. */
const cache=new Map<string,boolean>();
export function referenceCalibration(version:string){
 const old=cache.get(version);if(old!==undefined)return old;
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 const result=!v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=6);
 if(cache.size>=128)cache.clear();cache.set(version,result);return result;
}
export const REFERENCE_ART_SCALE=1.4,REFERENCE_BRIDGE_THICKNESS=280;
export const tankArtScale=(version:string)=>referenceCalibration(version)?REFERENCE_ART_SCALE:1;
export const tankBadgeLift=(version:string)=>referenceCalibration(version)?32:0;
