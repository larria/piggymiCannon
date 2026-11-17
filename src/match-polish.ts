/** Version-gated gameplay changes keep already saved recordings exact. */
export function matchPolish(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=1);}
export function startingAngle(min:number,max:number,modern=true){return modern?(min+max)/2:Math.max(min,Math.min(max,48));}
export function powerDisplay(power:number,lastPower:number|null,minimum:number,charging:boolean,modern=true){return modern&&!charging&&lastPower===null&&power===minimum?0:power;}
export function markerPercent(x:number,left:number,width:number){return Math.max(1,Math.min(100,Math.round((x-left)/Math.max(1,width)*100)));}

/** 4.0.2 impact/terrain tuning; historical recordings keep their own model. */
export function impactPolish(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=2);}

/** 4.0.3 precise contact, mine and abandonment rules. */
export function precisionPolish(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=3);}

/** 4.0.4 geometric excavation; earlier tapes retain their terrain model. */
export function ellipseExcavation(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>4||+v[1]===4&&(+v[2]>0||+v[2]===0&&+v[3]>=4);}
