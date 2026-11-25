import './style.css';
import {installationWorkProgress,InstallerDownloads,projectCacheKeys,showProgress} from './loading-progress';
import {installOpeningReunion} from './opening-reunion';
import {validateAssetManifest,type AssetManifest} from './asset-repair';
(window as Window&{__openingStarted?:boolean}).__openingStarted=true;
const opening=document.getElementById('opening-loading')!,meter=document.getElementById('opening-progress')!,enter=document.getElementById('opening-enter') as HTMLButtonElement,retry=document.getElementById('opening-retry') as HTMLButtonElement;
const scope=new URL(import.meta.env.BASE_URL,location.href).href;
const downloads=new InstallerDownloads(scope),reunion=installOpeningReunion(opening);
const started=performance.now();
let appReady=false,dismissed=false,failed=false,manifest:AssetManifest|null=null,initialKeys:string[]|null=null,lastFraction=0,timer:ReturnType<typeof setTimeout>|undefined;
const manifestAbort=new AbortController();
function finish(){if(dismissed||!appReady)return;dismissed=true;clearTimeout(timer);downloads.dispose();reunion.dispose();manifestAbort.abort();clearTimeout(bypass);opening.setAttribute('aria-busy','false');document.getElementById('app')!.inert=false;delete (window as Window&{__openingStarted?:boolean}).__openingStarted;opening.classList.add('opening-finished');setTimeout(()=>opening.remove(),220);}
enter.addEventListener('click',finish);retry.addEventListener('click',()=>location.reload());
const bypass=setTimeout(()=>{if(!dismissed&&appReady){enter.hidden=false;showProgress(meter,lastFraction,'正在准备离线战场','可以先进入游戏，下载会在后台继续。');}},8000);
window.addEventListener('piggy:cache-unavailable',()=>{failed=true;if(appReady){enter.hidden=false;showProgress(meter,lastFraction,'演习场已准备好','离线素材暂未就绪，联网后可在设置中修复。');}});
showProgress(meter,null,'正在准备演习场');
async function poll(){
 if(dismissed)return;
 try{
  if(!initialKeys)initialKeys=await projectCacheKeys(scope);
  if(!manifest){const response=await fetch(new URL('asset-integrity.json',scope),{signal:manifestAbort.signal});if(!response.ok)throw Error('manifest');const value=await response.json();validateAssetManifest(value,__APP_VERSION__);manifest=value;}
  downloads.query(await navigator.serviceWorker?.getRegistration(scope));const keys=await projectCacheKeys(scope);
  if(dismissed)return;const progress=installationWorkProgress(manifest,scope,initialKeys,keys,downloads.files);lastFraction=Math.max(lastFraction,progress.fraction*(appReady?1:.9));
  showProgress(meter,lastFraction,appReady?'正在准备离线战场':'正在准备演习场');
  if(progress.completed===progress.total&&appReady){showProgress(meter,1,'准备好了，开战吧');clearTimeout(bypass);finish();return;}
 }catch(error){if(dismissed)return;if(appReady){failed=true;enter.hidden=false;showProgress(meter,lastFraction,'演习场已准备好',navigator.onLine?'离线素材暂未就绪，可以先进入游戏。':'当前离线，已有素材仍可使用。');}}
 if(!failed)timer=setTimeout(()=>void poll(),400);
}
void import('./main').then(async app=>{
 await app.homeReady;appReady=true;
 if(document.documentElement.hasAttribute('data-lan-server')||import.meta.env.DEV||!('serviceWorker' in navigator)||!globalThis.caches){clearTimeout(bypass);finish();return;}
 if(performance.now()-started>=8000)enter.hidden=false;
 if(failed){enter.hidden=false;showProgress(meter,lastFraction,'演习场已准备好','离线素材暂未就绪，可以先进入游戏。');}
}).catch(()=>{failed=true;clearTimeout(timer);clearTimeout(bypass);manifestAbort.abort();retry.hidden=false;showProgress(meter,null,'演习场暂未准备好','请联网重试，已保存的对局不会丢失。');});
if(!document.documentElement.hasAttribute('data-lan-server'))void poll();
// Without module support / after a failed entry request, the HTML retains a retry button.
