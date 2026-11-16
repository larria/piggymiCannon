import {CREW_ORDER,type CrewId} from './crew';import {paintPortraitFallback,portraitFallback} from './portrait-fallbacks';
import {readPortrait,readPortraitThumbnail,repairPortraitCache,savePortraitThumbnail,PORTRAIT_ATTEMPTS} from './portrait-cache';
import {PORTRAIT_ASSETS} from './portrait-assets';
type PortraitState={canvas:HTMLCanvasElement;url:string;ready:boolean;source:'fallback'|'thumbnail'|'cache'|'network';attempts:number;error:string;job:Promise<boolean>|null;lastTry:number;domRetried:boolean};
const portraits=new Map<CrewId,PortraitState>();let revision=0,installed=false;let active=0;const queue:(()=>void)[]=[];
export const crewPortraitRevision=()=>revision;
function state(id:CrewId){let s=portraits.get(id);if(!s){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;paintPortraitFallback(canvas.getContext('2d')!,id);canvas.dataset.crew=id;canvas.dataset.portraitSource='fallback';s={canvas,url:portraitFallback(id),ready:false,source:'fallback',attempts:0,error:'',job:null,lastTry:0,domRetried:false};portraits.set(id,s);revision++;}return s;}
async function limited<T>(fn:()=>Promise<T>){if(active>=2)await new Promise<void>(resolve=>queue.push(resolve));active++;try{return await fn();}finally{active--;queue.shift()?.();}}
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function decode(bytes:Uint8Array,width:number,height:number,reuse?:string){
 const url=reuse??URL.createObjectURL(new Blob([bytes as BlobPart],{type:'image/png'})),image=new Image();image.decoding='async';
 try{await new Promise<void>((resolve,reject)=>{const finish=(error?:Error)=>{clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve();};const timer=setTimeout(()=>finish(Error('图片解码超时')),5000);image.onload=()=>{if(typeof image.decode!=='function'){finish();return;}void image.decode().then(()=>finish(),()=>finish(Error('图片无法解码')));};image.onerror=()=>finish(Error('图片无法解码'));image.src=url;});
  if(image.naturalWidth!==width||image.naturalHeight!==height)throw Error('解码尺寸不符');return {image,url};
 }catch(error){if(!reuse)URL.revokeObjectURL(url);throw error;}
}
function updateImages(id:CrewId){const s=state(id);for(const image of document.querySelectorAll<HTMLImageElement>(`img[data-crew-portrait="${id}"]`))bind(image,s);}
function bind(image:HTMLImageElement,s=state(image.dataset.crewPortrait as CrewId)){
 if(image.src!==s.url)image.src=s.url;image.dataset.portraitSource=s.source;
 image.onerror=()=>{const fallback=portraitFallback(image.dataset.crewPortrait as CrewId);if(image.src!==fallback)image.src=fallback;image.dataset.portraitSource='fallback';if(!s.domRetried){s.domRetried=true;void load(image.dataset.crewPortrait as CrewId,true);}};
}
function present(id:CrewId,image:HTMLImageElement,url:string,source:PortraitState['source']){
 const s=state(id),previous=s.url,ctx=s.canvas.getContext('2d')!;ctx.save();try{ctx.globalCompositeOperation='copy';ctx.drawImage(image,0,0,64,64);}finally{ctx.restore();}s.url=url;s.source=source;s.canvas.dataset.portraitSource=source;revision++;updateImages(id);if(previous!==url&&previous.startsWith('blob:'))URL.revokeObjectURL(previous);
}
function load(id:CrewId,force=false):Promise<boolean>{
 const s=state(id);if(s.job)return s.job;if(s.ready&&!force)return Promise.resolve(true);s.lastTry=Date.now();
 return s.job=limited(async()=>{
  if(!s.ready&&s.source==='fallback'){const thumb=await readPortraitThumbnail(id);if(thumb){try{const decoded=await decode(thumb,64,64);try{present(id,decoded.image,decoded.url,'thumbnail');}catch(error){URL.revokeObjectURL(decoded.url);throw error;}}catch{/* Embedded identity remains visible. */}}}
  for(let n=0;n<PORTRAIT_ATTEMPTS;n++){
   s.attempts++;try{const {bytes,source,response}=await readPortrait(id,n>0),spec=PORTRAIT_ASSETS[id];
    const broken=[...document.querySelectorAll<HTMLImageElement>(`img[data-crew-portrait="${id}"]`)].some(img=>img.src!==s.url||img.complete&&!img.naturalWidth);
    const decoded=await decode(bytes,spec.width,spec.height,s.ready&&!broken?s.url:undefined);
    try{present(id,decoded.image,decoded.url,source);}catch(error){if(decoded.url!==s.url)URL.revokeObjectURL(decoded.url);throw error;}s.ready=true;s.error='';if(response)await repairPortraitCache(id,response);await savePortraitThumbnail(id,s.canvas);return true;
   }catch(error){s.error=error instanceof Error?error.message:'头像加载失败';if(n+1<PORTRAIT_ATTEMPTS)await wait(600);}
  }return s.ready;
 }).finally(()=>{s.job=null;});
}
export function crewPortrait(id:CrewId){const s=state(id);if(!s.job&&!s.ready&&!s.attempts)void load(id);return s.canvas;}
export function portraitDiagnostics(){return {formatVersion:1,revision,integrity:globalThis.crypto?.subtle?'sha256':'png+decode',originals:CREW_ORDER.filter(id=>state(id).ready).length,usable:CREW_ORDER.length,assets:CREW_ORDER.map(id=>{const s=state(id);return {id,source:s.source,original:s.ready,expectedSha256:PORTRAIT_ASSETS[id].sha256,attempts:s.attempts,pending:!!s.job,error:s.error};})};}
async function refresh(id:CrewId,force:boolean){const s=state(id);if(s.job)await s.job;if(force||!s.ready)await load(id,true);}
export async function repairCrewPortraits(){await Promise.all(CREW_ORDER.map(id=>refresh(id,true)));return portraitDiagnostics();}
/** A completed install may have populated cache after an earlier timed-out request. */
export async function retryUnavailableCrewPortraits(){await Promise.all(CREW_ORDER.map(id=>state(id).ready?Promise.resolve():refresh(id,false)));}
export function installCrewPortraits(){
 if(installed)return;installed=true;CREW_ORDER.forEach(id=>{state(id);void load(id);});
 const scan=(node:Node)=>{if(node instanceof HTMLImageElement&&node.dataset.crewPortrait)bind(node);if(node instanceof Element)node.querySelectorAll<HTMLImageElement>('img[data-crew-portrait]').forEach(image=>bind(image));};
 scan(document.documentElement);new MutationObserver(records=>{for(const record of records)record.addedNodes.forEach(scan);}).observe(document.documentElement,{childList:true,subtree:true});
 const retry=()=>{if(!navigator.onLine||document.hidden)return;CREW_ORDER.forEach(id=>{const s=state(id);if(!s.ready&&!s.job&&Date.now()-s.lastTry>1000)void load(id,true);});};
 window.addEventListener('online',retry);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CREW_ORDER.some(id=>Date.now()-state(id).lastTry>30000))retry();});
}
