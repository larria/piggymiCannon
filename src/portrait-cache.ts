import {PORTRAIT_ASSETS} from './portrait-assets';import type {CrewId} from './crew';
export const PORTRAIT_ATTEMPTS=2;
export async function imageHash(bytes:Uint8Array){
 if(!globalThis.crypto?.subtle)return null; // Insecure development pages still get PNG and decode checks.
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function checkedPNG(response:Response,spec:{width:number;height:number;bytes?:number;sha256?:string}){
 if(response.status!==200)throw Error('HTTP响应不可用');const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length<24||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n))throw Error('图片格式损坏');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(16)!==spec.width||view.getUint32(20)!==spec.height||spec.bytes!==undefined&&bytes.length!==spec.bytes)throw Error('图片尺寸或长度不符');
 if(spec.sha256){const hash=await imageHash(bytes);if(hash&&hash!==spec.sha256)throw Error('图片校验不符');}return bytes;
}
const urlFor=(id:CrewId)=>new URL(import.meta.env.BASE_URL+PORTRAIT_ASSETS[id].file,location.href);
export const portraitCacheKey=(id:CrewId)=>{const url=urlFor(id);url.searchParams.set('__WB_REVISION__',PORTRAIT_ASSETS[id].revision);return url.href;};
const thumbnailKey=(id:CrewId)=>{const url=urlFor(id);url.searchParams.set('portrait-thumbnail',PORTRAIT_ASSETS[id].sha256);return url.href;};
const thumbnailCache=()=>`piggy-portrait-thumbs-v1-${new URL(import.meta.env.BASE_URL,location.href).href}`;
const pngResponse=(bytes:Uint8Array,headers:Record<string,string>={})=>new Response(bytes as BodyInit,{headers:{'Content-Type':'image/png',...headers}});
export async function readPortrait(id:CrewId,retry=false){
 const spec=PORTRAIT_ASSETS[id],key=portraitCacheKey(id);let damaged=retry;
 try{const cached=await caches.match(key);if(cached){try{return {bytes:await checkedPNG(cached,spec),source:'cache' as const,response:null};}catch{damaged=true;}}}catch{/* Cache API may be disabled. */}
 const url=urlFor(id);if(damaged)url.searchParams.set('portrait-repair',`${spec.sha256.slice(0,12)}-${Date.now()}`);
 // A distinct query bypasses Workbox's corrupt precache response AND HTTP cache.
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(url.href,{cache:'no-store',signal:controller.signal}),copy=response.clone(),bytes=await checkedPNG(response,spec);return {bytes,source:'network' as const,response:copy};}finally{clearTimeout(timer);}
}
export async function repairPortraitCache(id:CrewId,response:Response){
 try{const scope=new URL(import.meta.env.BASE_URL,location.href).href;
  // Keep native response URL/type/headers for Safari's Worker access checks.
  for(const name of await caches.keys())if(name.startsWith('workbox-precache')&&name.endsWith(scope))await(await caches.open(name)).put(portraitCacheKey(id),response.clone());
 }catch{/* Valid decoded portraits still work without persistent storage. */}
}
export async function readPortraitThumbnail(id:CrewId){
 try{const response=await(await caches.open(thumbnailCache())).match(thumbnailKey(id));if(!response||response.headers.get('X-Portrait-Source')!==PORTRAIT_ASSETS[id].sha256)return null;
  const hash=response.headers.get('X-Portrait-Hash');if(!hash)return null;return await checkedPNG(response,{width:64,height:64,sha256:hash});
 }catch{return null;}
}
export async function savePortraitThumbnail(id:CrewId,canvas:HTMLCanvasElement){
 try{const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob||blob.size>40000)return;
  const bytes=new Uint8Array(await blob.arrayBuffer()),hash=await imageHash(bytes);if(!hash)return;
  const cache=await caches.open(thumbnailCache()),existing=await cache.match(thumbnailKey(id));
  if(existing?.headers.get('X-Portrait-Hash')===hash){try{await checkedPNG(existing,{width:64,height:64,sha256:hash});return;}catch{/* The backup body, not just its header, must be intact. */}}
  await cache.put(thumbnailKey(id),pngResponse(bytes,{'X-Portrait-Source':PORTRAIT_ASSETS[id].sha256,'X-Portrait-Hash':hash}));
  // Keep at most two verified small versions per character, never full-photo duplicates.
  const path=urlFor(id).pathname,keys=(await cache.keys()).filter(k=>new URL(k.url).pathname===path);for(const key of keys.slice(0,-2))await cache.delete(key);
 }catch{/* A backup is optional; never erase settings, replays, or good precache entries. */}
}
