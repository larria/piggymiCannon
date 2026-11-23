export const THEMES=['oat','peach','moss','tide','iris','rose','sand'] as const;
const DAY=86400000, THEME_SEED='piggy-color-seed-v1';
// Convert the local calendar date to a serial day without DST-length days.
export const localThemeDay=(date:Date)=>Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/DAY);
function weeklyOrder(week:number,seed:number){
 const order=[...THEMES];let state=(seed^Math.imul(week,0x9e3779b1))>>>0;
 for(let i=order.length-1;i>0;i--){
  state=(state+0x6d2b79f5)>>>0;let t=Math.imul(state^state>>>15,state|1);t^=t+Math.imul(t^t>>>7,t|61);
  const j=Math.floor((((t^t>>>14)>>>0)/4294967296)*(i+1));[order[i],order[j]]=[order[j],order[i]];
 }
 return order;
}
export function themeForDay(day:number,seed:number){
 const week=Math.floor(day/THEMES.length),index=day-week*THEMES.length,order=weeklyOrder(week,seed);
 // Swap only the first two slots; the last day stays stable for the next week.
 if(order[0]===weeklyOrder(week-1,seed).at(-1))[order[0],order[1]]=[order[1],order[0]];
 return order[index];
}
export function installDailyTheme(){
 let seed=0x53fcfe;
 try{
  const stored=localStorage.getItem(THEME_SEED);
  if(stored!==null&&/^\d{1,10}$/.test(stored))seed=Number(stored)>>>0;
  else {const generated=crypto.getRandomValues(new Uint32Array(1))[0];localStorage.setItem(THEME_SEED,String(generated));seed=generated;}
 }catch{/* Deterministic fallback when storage is unavailable. */}
 let timer:number;
 const refresh=()=>{
  const now=new Date(),next=new Date(now);document.documentElement.dataset.dailyTheme=themeForDay(localThemeDay(now),seed);
  next.setHours(24,0,0,30);window.clearTimeout(timer);timer=window.setTimeout(refresh,Math.max(250,+next-+now));
 };
 refresh();window.addEventListener('pageshow',refresh);window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
