import type {RepairProgress} from './loading-progress';
export interface AssetSpec {url:string;bytes:number;sha256:string;revision:string|null}
export interface AssetManifest {formatVersion:1;gameVersion:string;files:AssetSpec[]}
export interface AssetRepairReport {formatVersion:1;gameVersion:string;total:number;checked:number;healthy:number;repaired:number;restored:string[];failed:{url:string;error:string}[]}
let lastReport:AssetRepairReport|null=null,pending:Promise<AssetRepairReport>|null=null;
export const assetRepairDiagnostics=()=>lastReport;
export function validateAssetManifest(value:any,version:string):asserts value is AssetManifest {
 if(value?.formatVersion!==1||value.gameVersion!==version||!Array.isArray(value.files)||!value.files.length||value.files.length>512)throw Error('素材清单版本不符，请检查游戏更新。');
 let bytes=0;const seen=new Set<string>();
 for(const f of value.files){if(typeof f.url!=='string'||!f.url||f.url.startsWith('.')||f.url.includes('%')||f.url.startsWith('/')||f.url.includes('..')||/[\\?#:]/.test(f.url)||!Number.isInteger(f.bytes)||f.bytes<=0||!(/^[a-f0-9]{64}$/).test(f.sha256)||f.revision!==null&&!(/^[a-f0-9]{32}$/).test(f.revision)||seen.has(f.url))throw Error('素材清单损坏。');bytes+=f.bytes;seen.add(f.url);}
 if(bytes>90_000_000)throw Error('素材清单超出大小上限。');
}
async function checked(response:Response|undefined,spec:AssetSpec){
 if(!response||response.status!==200)throw Error('素材未下载');const bytes=await response.arrayBuffer();if(bytes.byteLength!==spec.bytes)throw Error('素材长度不符');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==spec.sha256)throw Error('素材校验不符');
}
export function assetCacheKey(spec:AssetSpec,scope:string){const url=new URL(spec.url,scope);if(spec.revision)url.searchParams.set('__WB_REVISION__',spec.revision);return url.href;}
/** Explicit repair only. Two concurrent bounded downloads; healthy keys, settings,
 * recordings and other projects are untouched. Preserve native Response metadata. */
export async function repairAssetCache(manifest:AssetManifest,scope:string,storage:CacheStorage,fetcher:typeof fetch,onProgress?:(checked:number,total:number,progress?:RepairProgress)=>void){
 const names=(await storage.keys()).filter(n=>n.startsWith('workbox-precache')&&n.endsWith(scope));if(!names.length)throw Error('离线缓存尚未准备好，请联网打开游戏后再试。');
 const caches=await Promise.all(names.map(n=>storage.open(n))),cache=caches[0];
 const report:AssetRepairReport={formatVersion:1,gameVersion:manifest.gameVersion,total:manifest.files.length,checked:0,healthy:0,repaired:0,restored:[],failed:[]};let at=0,completedBytes=0;const totalBytes=manifest.files.reduce((n,f)=>n+f.bytes,0);
 const worker=async()=>{while(at<manifest.files.length){const spec=manifest.files[at++],key=assetCacheKey(spec,scope);try{
   let healthy=false;for(const c of caches){try{await checked(await c.match(key),spec);healthy=true;break;}catch{/* Try the next same-project cache. */}}
   if(healthy)report.healthy++;
   else{const url=new URL(spec.url,scope);url.searchParams.set('asset-repair',`${manifest.gameVersion}-${Date.now()}`);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(10000,Math.min(60000,spec.bytes/128000*1000)));
    try{const response=await fetcher(url.href,{cache:'no-store',signal:controller.signal}),copy=response.clone();await checked(response,spec);await cache.put(key,copy);report.repaired++;report.restored.push(spec.url);}finally{clearTimeout(timer);}
   }
  }catch(error){report.failed.push({url:spec.url,error:error instanceof Error?error.message:'素材不可用'});}
  report.checked++;completedBytes+=spec.bytes;onProgress?.(report.checked,report.total,{checked:report.checked,total:report.total,completedBytes,totalBytes,failed:report.failed.length});await new Promise<void>(r=>setTimeout(r,0));
 }};await Promise.all([worker(),worker()]);report.restored.sort();report.failed.sort((a,b)=>a.url.localeCompare(b.url));return report;
}
export function repairGameAssets(version:string,onProgress?:(checked:number,total:number,progress?:RepairProgress)=>void){
 if(pending)return pending;
 return pending=(async()=>{
  if(!globalThis.caches||!globalThis.crypto?.subtle)throw Error('此浏览器无法修复离线素材，请使用 HTTPS 打开游戏。');
  const scope=new URL(import.meta.env.BASE_URL,location.href).href,url=new URL('asset-integrity.json',scope);let manifest:AssetManifest|undefined;
  for(let n=0;n<2;n++){const target=new URL(url);if(n)target.searchParams.set('asset-repair',`${version}-${Date.now()}`);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(target,{cache:'no-store',signal:controller.signal}),copy=response.clone();if(!response.ok)throw Error('素材清单暂不可用，请联网后重试。');const value=await response.json();validateAssetManifest(value,version);manifest=value;
    if(n)for(const name of await caches.keys())if(name.startsWith('workbox-precache')&&name.endsWith(scope)){const c=await caches.open(name);for(const key of await c.keys())if(new URL(key.url).pathname===url.pathname)await c.put(key,copy.clone());}
    break;
   }catch(error){if(n)throw error;}finally{clearTimeout(timer);}
  }
  return lastReport=await repairAssetCache(manifest!,scope,caches,fetch,onProgress);
 })().finally(()=>{pending=null;});
}

export async function retryBrokenMaterialImages(skipFiles:string[]=[]){
 const scope=new URL(import.meta.env.BASE_URL,location.href).href;
 for(const img of document.querySelectorAll<HTMLImageElement>('img:not([data-crew-portrait])')){
  if(!img.complete||img.naturalWidth||!img.src.startsWith(scope)||skipFiles.includes(img.src.slice(scope.length)))continue;
  let url:string|null=null;try{const response=await fetch(img.src,{cache:'no-store'});if(!response.ok)continue;url=URL.createObjectURL(await response.blob());img.src=url;await Promise.race([img.decode(),new Promise<void>((_,reject)=>setTimeout(()=>reject(Error('decode timeout')),5000))]);}catch{/* The next repair may retry; do not remove visible fallback art. */}finally{if(url)URL.revokeObjectURL(url);}
 }
}

export async function retryMaterialFonts(restored:string[],skipFiles:string[]=[]){
 const scope=new URL(import.meta.env.BASE_URL,location.href).href;
 for(const sheet of document.styleSheets){let rules:CSSRuleList;try{rules=sheet.cssRules;}catch{continue;}
  for(const rule of rules){if(rule.type!==CSSRule.FONT_FACE_RULE)continue;const style=(rule as CSSFontFaceRule).style,src=style.getPropertyValue('src'),file=src.match(/([a-zA-Z0-9_-]+\.ttf)/)?.[1];if(!file||skipFiles.includes('fonts/'+file))continue;
   const family=style.getPropertyValue('font-family').replace(/["']/g,'');if(!restored.includes('fonts/'+file)&&![...document.fonts].some(f=>f.family.replace(/["']/g,'')===family&&f.status==='error'))continue;
   let url:string|null=null,timer:ReturnType<typeof setTimeout>|undefined;try{const response=await fetch(new URL('fonts/'+file,scope),{cache:'no-store'});if(!response.ok)continue;url=URL.createObjectURL(await response.blob());style.setProperty('src',`url("${url}") format("truetype")`);await Promise.race([document.fonts.load(`${style.getPropertyValue('font-weight')||'400'} 16px "${family}"`),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('font timeout')),5000);})]);}catch{style.setProperty('src',src);}finally{clearTimeout(timer);if(url)URL.revokeObjectURL(url);}
  }
 }
}
