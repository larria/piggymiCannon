import {excavation,type WeaponId} from './catalog';
import {originalBallistics,originalCraterAxes,originalWeapon} from './original-ballistics';
import {ink,oval,vectorPath} from './crew-ink';

export function isWaterShell(weapon?:WeaponId):weapon is 'water-normal'|'water-special'{return weapon==='water-normal'||weapon==='water-special';}
/** Flat ground exposes the lower half of the carve: full width, one vertical radius deep. */
export function waterFootprint(weapon:'water-normal'|'water-special',version:string,digBoost=1){
 const native=originalBallistics(version)?originalWeapon(weapon):null;
 const {radius,depth}=native?originalCraterAxes(native.round):excavation(weapon,false,version,digBoost);
 return {halfWidth:radius,height:depth};
}
/** The flying body is now half the footprint on each axis; the impact splash
 * still illustrates the crater. Old recordings keep their original artwork. */
export function waterFlightSize(weapon:'water-normal'|'water-special',version:string,digBoost=1){
 const {halfWidth,height}=waterFootprint(weapon,version,digBoost),v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 const scale=!v||+v[1]>5||+v[1]===5&&(+v[2]>1||+v[2]===1&&+v[3]>=3)?.5:1;
 return {halfWidth:halfWidth*scale,height:height*scale};
}
const blue={edge:'#5b9897',body:'#a1d8d5',shadow:'#559a9d',light:'#d8f0df'};
const violet={edge:'#846aa5',body:'#d7b5eb',shadow:'#926bb4',light:'#f4e0f7'};
/** An upright suspended splash. The tip touches the simulated contact point; it never rolls with velocity. */
export function paintWaterFlight(c:CanvasRenderingContext2D,weapon:'water-normal'|'water-special',halfWidth:number,height:number,time:number,boosted:boolean,direction:number){
 const purple=weapon==='water-special',palette=purple?violet:blue;
 c.save();c.translate(0,-height/2);c.scale(halfWidth,height/2);c.lineCap='round';c.lineJoin='round';
 const body=purple?'M-1 .1C-1-.25-.82-.52-.53-.58C-.46-.85-.23-.98.02-.87C.19-1.04.43-.95.51-.76C.54-.57.85-.66.93-.4C1-.24 1-.11 1 .1C1 .42.76.51.52.56C.39.77.22.74.11.82Q.04.98 0 1Q-.13.91-.31.81C-.54.85-.79.69-.78.5C-.92.44-1 .28-1 .1Z':'M-1 .06C-1-.19-.86-.38-.67-.4C-.74-.69-.5-.91-.24-.85C-.08-1.09.17-1.007.33-.81C.72-.9.88-.61.81-.42C.95-.4 1-.18 1 .05C1 .38.83.55.58.55C.45.76.22.78.11.73Q.12.92 0 1Q-.12.96-.18.79C-.43.88-.65.73-.68.51C-.9.47-1 .3-1 .06Z';
 c.save();c.globalAlpha=.94;ink(c,body,palette.body,palette.edge,.024);
 c.clip(vectorPath(body));
 ink(c,'M-1 .3C-.73.47-.57.36-.38.41Q-.09.61.11.42C.4.2.75.45 1 .1L1 1.05H-1Z',palette.shadow);
 ink(c,'M-.86 .15C-.56.34-.43.11-.27.19Q-.03.34.16.14Q.43-.05.69.09T1-.05','none',palette.light,.048);
 c.restore();
 c.save();c.globalAlpha=.74+.17*Math.sin(time*7);c.translate(Math.sin(time*4)*.035,0);
 ink(c,'M-.63-.19Q-.54-.52-.23-.53Q-.08-.8.21-.66M.44-.55Q.68-.51.7-.32','none',palette.light,.059);
 oval(c,-.40,-.32,.09,.085,palette.light);oval(c,.50,-.26,.055,.087,palette.light);
 oval(c,-.19,.53,.07,.07,palette.body);oval(c,.39,.33,.06,.085,palette.body);
 c.restore();c.restore();
 if(boosted){c.save();c.translate((direction<0?1:-1)*halfWidth*.85,-height*.42);for(let i=0;i<3;i++){
  c.save();c.translate((direction<0?1:-1)*i*7,Math.sin(time*8+i*2.094)*height*.19);
  ink(c,'M0-4 1-1 4 0 1 1 0 4-1 1-4 0-1-1Z','#f7d788','#a67d42',.7);c.restore();
 }c.restore();}
}

/** Used if the optional water frames are still decoding or require asset repair. */
export function paintWaterSplash(c:CanvasRenderingContext2D,weapon:'water-normal'|'water-special',x:number,y:number,halfWidth:number,height:number,progress:number){
 const palette=weapon==='water-special'?violet:blue;
 c.save();c.translate(x,y);c.scale(halfWidth*(.35+.65*progress),height*(.42+.58*Math.sin(progress*Math.PI)));
 c.lineCap='round';c.lineJoin='round';c.globalAlpha=.86*(1-progress);
 ink(c,'M-1 .02Q-.77-.16-.7-.52Q-.55-.55-.59-.21Q-.47-.27-.44-.77Q-.28-.74-.28-.32Q-.14-.35 0-.68Q.12-.37.29-.32Q.45-.41.51-.76Q.63-.6.62-.25Q.71-.22.77-.44Q.83-.29 1 .02Q.51 .18 0 .15Q-.56 .22-1 .02Z',palette.body,palette.edge,.026);
 ink(c,'M-.72-.03Q-.4-.02-.28-.15M-.13-.03Q.28.05.71-.03','none',palette.light,.054);
 c.restore();
}
