/** Saved recordings retain the collision model they were recorded with. */
export function vectorProjectiles(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=2);}
export const groundOrbital=(weapon:string|undefined,sub:boolean|undefined,version:string)=>weapon==='ion-special'&&!!sub&&vectorProjectiles(version);
export function enlargedBattleProjectiles(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[3]>=11);}
