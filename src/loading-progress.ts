import type {AssetManifest} from './asset-repair';
/** Weight completed work by real bytes. Cache keys include the build revision. */
export function cachedLoadingProgress(manifest:AssetManifest,scope:string,keys:readonly string[]){
 const found=new Set(keys);let completedBytes=0,completed=0,totalBytes=0;
 for(const f of manifest.files){const url=new URL(f.url,scope);if(f.revision)url.searchParams.set('__WB_REVISION__',f.revision);totalBytes+=f.bytes;if(found.has(url.href)){completedBytes+=f.bytes;completed++;}}
 return {completed,total:manifest.files.length,completedBytes,totalBytes,fraction:totalBytes?completedBytes/totalBytes:0};
}
export interface RepairProgress {checked:number;total:number;completedBytes:number;totalBytes:number;failed:number}
export function progressMarkup(id:string,label:string){return `<section id="${id}" class="material-progress" hidden aria-label="${label}"><div class="material-progress-heading"><span class="material-progress-label">${label}</span><span class="material-progress-value">0%</span></div><div class="material-progress-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="material-progress-fill"></span></div><p class="material-progress-status" role="status"></p></section>`;}
export function showProgress(root:HTMLElement,fraction:number|null,label:string,status=''){
 root.hidden=false;const track=root.querySelector<HTMLElement>('[role="progressbar"]')!,fill=root.querySelector<HTMLElement>('.material-progress-fill')!,value=root.querySelector<HTMLElement>('.material-progress-value')!;
 root.querySelector('.material-progress-label')!.textContent=label;root.querySelector('.material-progress-status')!.textContent=status;
 track.classList.toggle('indeterminate',fraction===null);
 if(fraction===null){track.removeAttribute('aria-valuenow');value.textContent='';fill.style.width='';}
 else{const percent=Math.floor(Math.max(0,Math.min(1,fraction))*100);track.setAttribute('aria-valuenow',String(percent));fill.style.width=`${percent}%`;value.textContent=`${percent}%`;}
}
