import {CREW_ORDER,crewAvatarPath,type CrewId} from './crew';
// Decode once and rasterise small portraits once, shared by battlefield/minimap.
const portraits=new Map<CrewId,HTMLCanvasElement>();
export const crewPortraitRevision=()=>portraits.size;
let started=false;
export function crewPortrait(id:CrewId){
 if(!started){started=true;for(const crew of CREW_ORDER){const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=64;canvas.getContext('2d')!.drawImage(img,0,0,64,64);portraits.set(crew,canvas);};img.src=crewAvatarPath(crew,import.meta.env.BASE_URL);}}
 return portraits.get(id)??null;
}
