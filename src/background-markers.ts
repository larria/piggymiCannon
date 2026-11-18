/** Preserve the older human-turn-only marker rules in saved recordings. */
export function backgroundMarkers(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !!v&&(+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=1));}
