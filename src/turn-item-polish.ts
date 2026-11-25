/** Preserve old replay timing and item legality. */
export function turnItemPolish(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=10);
}
