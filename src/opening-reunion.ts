/** Load-gated portrait entrances. Only compositor transforms animate while
 * resources arrive; greeting timers/listeners are removed on entry. */
export function installOpeningReunion(root:HTMLElement){
 const cleanups:(()=>void)[]=[],timers=new Set<ReturnType<typeof setTimeout>>();let disposed=false;
 const greetings=['准备好，一起开炮！','今天也要稳稳地瞄。','好风已经在路上啦。','等我集合，马上出发！'];
 root.querySelectorAll<HTMLButtonElement>('.opening-seat').forEach((seat,index)=>{
  const img=seat.querySelector<HTMLImageElement>('img')!,bubble=seat.querySelector<HTMLElement>('.opening-greeting')!;let ready=false,previous:ReturnType<typeof setTimeout>|undefined;
  const show=async()=>{if(ready||disposed||!img.naturalWidth)return;try{await img.decode();}catch{return;}if(disposed||ready)return;ready=true;seat.disabled=false;seat.classList.add('ready');};
  const failed=()=>{seat.classList.add('unavailable');};
  const greet=()=>{if(!ready||disposed)return;if(previous){clearTimeout(previous);timers.delete(previous);}seat.classList.remove('greeting');void seat.offsetWidth;seat.classList.add('greeting');bubble.textContent=greetings[index];const timer=previous=setTimeout(()=>{timers.delete(timer);seat.classList.remove('greeting');bubble.textContent='';},1600);timers.add(timer);};
  img.addEventListener('load',show);img.addEventListener('error',failed);seat.addEventListener('click',greet);if(img.complete)void show();
  cleanups.push(()=>{img.removeEventListener('load',show);img.removeEventListener('error',failed);seat.removeEventListener('click',greet);});
 });
 return {dispose(){disposed=true;cleanups.forEach(fn=>fn());timers.forEach(clearTimeout);timers.clear();}};
}
