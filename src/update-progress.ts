import {validateAssetManifest,type AssetManifest} from './asset-repair';
import {cachedLoadingProgress,showProgress} from './loading-progress';
/** Observe the real installer cache. Never fetch/duplicate the payload ourselves. */
export class UpdateProgress {
 private timer:ReturnType<typeof setTimeout>|undefined;private abort:AbortController|null=null;private serial=0;private live=false;private last=0;
 constructor(private root:HTMLElement,private meter:HTMLElement,private registration:()=>ServiceWorkerRegistration|undefined,private scope:string){}
 checking(){this.cancel();this.root.hidden=false;showProgress(this.meter,null,'正在检查更新');}
 cancel(){this.serial++;clearTimeout(this.timer);this.abort?.abort();this.abort=null;this.live=false;}
 hide(){this.cancel();this.root.hidden=true;}
 dismiss(){this.root.hidden=true;}
 fail(){this.cancel();this.root.hidden=false;showProgress(this.meter,null,'更新暂未准备好','请联网后再次检查更新。');this.meter.querySelector('.material-progress-track')!.classList.remove('indeterminate');}
 complete(){if(!this.live&&this.root.hidden)return;this.cancel();showProgress(this.meter,1,'更新已准备好','点击「更新游戏」即可安装。');this.timer=setTimeout(()=>{this.root.hidden=true;},3000);}
 async start(version:string){
  this.cancel();const serial=this.serial;this.live=true;this.last=0;this.root.hidden=false;showProgress(this.meter,null,'正在准备更新');const abort=this.abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),10000);
  let manifest:AssetManifest;try{const url=new URL('asset-integrity.json',this.scope);url.searchParams.set('update-progress',`${version}-${Date.now()}`);const response=await fetch(url,{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('manifest');const value=await response.json();validateAssetManifest(value,version);manifest=value;}catch{if(serial===this.serial)this.fail();return;}finally{clearTimeout(timeout);}
  if(serial!==this.serial)return;
  const poll=async()=>{if(serial!==this.serial)return;try{
    const reg=this.registration();if(reg?.waiting){this.complete();return;}if(reg?.installing?.state==='redundant'){this.fail();return;}
    const keys:string[]=[];for(const name of await caches.keys())if(name.startsWith('workbox-precache')&&name.endsWith(this.scope))keys.push(...(await(await caches.open(name)).keys()).map(k=>k.url));
    if(serial!==this.serial)return;const p=cachedLoadingProgress(manifest,this.scope,keys);this.last=Math.max(this.last,Math.min(.99,p.fraction));showProgress(this.meter,this.last,p.completed===p.total?'正在完成更新':'正在下载更新');
   }catch{if(serial===this.serial){this.fail();return;}}
   if(serial===this.serial)this.timer=setTimeout(()=>void poll(),400);
  };void poll();
 }
}
