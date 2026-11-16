import type {Tank} from './engine';import type {VehicleId} from './vehicles';
/** Stand frame envelope 0..4 from the original ModeImage/ModeCount tables.
 * Identity cross-check uses weapon Round pairs, angles, movement and attribute class. */
export const BODY_REFERENCE:Record<VehicleId,{character:number;width:number;height:number;baseWidth:number}>={
 bowl:{character:1,width:114,height:117,baseWidth:65},crossbow:{character:2,width:108,height:102,baseWidth:65},cannon:{character:3,width:117,height:120,baseWidth:67},beetle:{character:4,width:105,height:102,baseWidth:74},duke:{character:5,width:111,height:96,baseWidth:72.5},missile:{character:6,width:111,height:114,baseWidth:74},multi:{character:7,width:123,height:123,baseWidth:70},laser:{character:8,width:117,height:108,baseWidth:76},mine:{character:9,width:105,height:105,baseWidth:74},ion:{character:10,width:105,height:99,baseWidth:69},water:{character:11,width:120,height:111,baseWidth:65.75},sea:{character:12,width:126,height:129,baseWidth:71},dragon:{character:13,width:114,height:108,baseWidth:77},
};
export const bodyScale=(t:Pick<Tank,'bodyScale'>)=>t.bodyScale??1;
export const bodyClearance=(a:Pick<Tank,'bodyScale'>,b:Pick<Tank,'bodyScale'>)=>28*(bodyScale(a)+bodyScale(b));
export const bodyBroadPhase=(t:Pick<Tank,'bodyScale'>)=>({x:50*bodyScale(t),y:80*bodyScale(t)});
export function referenceBodyScale(id:VehicleId|null){return id?BODY_REFERENCE[id].width/BODY_REFERENCE[id].baseWidth:1;}
