import type {AssetManifest} from './asset-repair';
/** Weight completed work by real bytes. Cache keys include the build revision. */
export function cachedLoadingProgress(manifest:AssetManifest,scope:string,keys:readonly string[]){
 const found=new Set(keys);let completedBytes=0,completed=0,totalBytes=0;
 for(const f of manifest.files){const url=new URL(f.url,scope);if(f.revision)url.searchParams.set('__WB_REVISION__',f.revision);totalBytes+=f.bytes;if(found.has(url.href)){completedBytes+=f.bytes;completed++;}}
 return {completed,total:manifest.files.length,completedBytes,totalBytes,fraction:totalBytes?completedBytes/totalBytes:0};
}
export interface DownloadCount {url:string;received:number}
/** Updates measure only changed/missing work, not megabytes already cached by
 * the previous release. Streaming bytes account for large files BEFORE commit. */
export function installationWorkProgress(manifest:AssetManifest,scope:string,initialKeys:readonly string[],keys:readonly string[],downloads:readonly DownloadCount[]){
 const key=(f:AssetManifest['files'][number])=>{const u=new URL(f.url,scope);if(f.revision)u.searchParams.set('__WB_REVISION__',f.revision);return u.href;};
 const initial=new Set(initialKeys),stored=new Set(keys),received=new Map(downloads.map(d=>[d.url,d.received]));
 let bytes=0,downloaded=0,committed=0,total=0,completed=0;
 for(const f of manifest.files){const k=key(f);if(initial.has(k))continue;bytes+=f.bytes;total++;if(stored.has(k)){committed+=f.bytes;downloaded+=f.bytes;completed++;}else downloaded+=Math.max(0,Math.min(f.bytes,received.get(k)??received.get(new URL(f.url,scope).href)??0));}
 return {total,completed,totalBytes:bytes,downloadedBytes:downloaded,completedBytes:committed,fraction:bytes?(.9*downloaded+.1*committed)/bytes:1};
}
export class InstallerDownloads {
 files:DownloadCount[]=[];
 private listener=(event:MessageEvent)=>{const d=event.data;if(d?.type!=='PIGGY_PRECACHE_PROGRESS'||!Array.isArray(d.files)||d.files.length>512)return;this.files=d.files.filter((f:any)=>typeof f?.url==='string'&&f.url.startsWith(this.scope)&&Number.isFinite(f.received)&&f.received>=0).map((f:any)=>({url:f.url,received:f.received}));};
 constructor(private scope:string){navigator.serviceWorker?.addEventListener('message',this.listener);}
 query(reg?:ServiceWorkerRegistration){(reg?.installing??reg?.waiting)?.postMessage({type:'PIGGY_PRECACHE_PROGRESS_QUERY'});}
 dispose(){navigator.serviceWorker?.removeEventListener('message',this.listener);this.files=[];}
}
export async function projectCacheKeys(scope:string){const keys:string[]=[];for(const name of await caches.keys())if(name.startsWith('workbox-precache')&&name.endsWith(scope))keys.push(...(await(await caches.open(name)).keys()).map(k=>k.url));return keys;}
export interface RepairProgress {checked:number;total:number;completedBytes:number;totalBytes:number;failed:number}
export function progressMarkup(id:string,label:string){return `<section id="${id}" class="material-progress" hidden aria-label="${label}"><div class="material-progress-heading"><span class="material-progress-label">${label}</span><span class="material-progress-value">0%</span></div><div class="material-progress-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="material-progress-fill"></span></div><p class="material-progress-status" role="status"></p></section>`;}
export function showProgress(root:HTMLElement,fraction:number|null,label:string,status=''){
 root.hidden=false;const track=root.querySelector<HTMLElement>('[role="progressbar"]')!,fill=root.querySelector<HTMLElement>('.material-progress-fill')!,value=root.querySelector<HTMLElement>('.material-progress-value')!;
 root.querySelector('.material-progress-label')!.textContent=label;root.querySelector('.material-progress-status')!.textContent=status;
 track.classList.toggle('indeterminate',fraction===null);
 if(fraction===null){track.removeAttribute('aria-valuenow');value.textContent='';fill.style.width='';}
 else{const exact=Math.max(0,Math.min(1,fraction))*100,percent=Math.floor(exact);track.setAttribute('aria-valuenow',String(percent));fill.style.width=`${exact}%`;value.textContent=`${percent}%`;}
}
