/** Confirm the requested worker's activation; Workbox's first-page isUpdate flag can stay false. */
export async function applyWaitingUpdate(registration:ServiceWorkerRegistration|null|undefined,requestActivation:()=>Promise<void>,reload:()=>void=()=>location.reload()){
 const worker=registration?.waiting;if(!worker)return false;
 await new Promise<void>((resolve,reject)=>{
  const clean=()=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);};
  const changed=()=>{if(worker.state==='activated'){clean();resolve();}else if(worker.state==='redundant'){clean();reject(new Error('Update worker failed'));}};
  const timer=setTimeout(()=>{clean();reject(new Error('Update activation timed out'));},15000);
  worker.addEventListener('statechange',changed);
  void requestActivation().catch(error=>{clean();reject(error);});changed();
 });
 reload();return true;
}
