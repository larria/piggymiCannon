import {chromium} from '@playwright/test';import {mkdirSync,writeFileSync} from 'node:fs';import {boot} from '../tests/browser/qa-app';
const seconds=Number(process.env.PIGGY_SOAK_SECONDS??1800);
if(seconds<60||!Number.isFinite(seconds))throw new Error('Soak duration must be >=60s');
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({baseURL:'http://localhost:4177/piggymiCannon/',viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage(),errors:string[]=[],samples:any[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await boot(page);await page.waitForFunction(()=>(window as any).__qa.renderer.backend==='pixi');
 await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch({...q.game.config,map:'valley',mapChoice:undefined,timer:0,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,team:i%2,controller:'ai',difficulty:'expert',vehicle:['multi','cannon','sea','water'][i]}))},true);});
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const started=Date.now();let matches=1;
 while((Date.now()-started)/1000<seconds){
  await page.waitForTimeout(Math.min(10000,seconds*1000-(Date.now()-started)));
  const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,g=q.game;return {phase:g.phase,turn:g.turn,backend:r.backend,frames:r.frames,gpuFrames:r.stage.frames,uploads:r.stage.uploads,textures:r.stage.textures.length,canvases:document.querySelectorAll('.pixi-battle-layer').length,buffers:q.audio.buffers.size,traceEvents:g.battleSnapshot().events.length};});
  const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m:any)=>[m.name,m.value]));samples.push({elapsedSeconds:(Date.now()-started)/1000,matches,...data,heapBytes:metrics.JSHeapUsedSize});
  if(data.phase==='ended'){
   await page.evaluate(map=>{const q=(window as any).__qa;q.newMatch({...q.game.config,map,mapChoice:undefined},true);},['valley','coast','moon','factory','temple','egypt'][matches%6]);matches++;
  }
  if(samples.length%6===0)console.log(`soak ${(Date.now()-started)/60000} min, ${matches} matches, ${data.backend}, ${data.textures} textures`);
 }
 mkdirSync('QA',{recursive:true});writeFileSync(process.env.PIGGY_SOAK_REPORT??'QA/v3.0.0-chromium-soak.json',JSON.stringify({formatVersion:1,seconds,actualSeconds:(Date.now()-started)/1000,matches,samples,errors,scope:'Actual wall-clock Chromium 1194x834 DPR2 four-seat expert matches; desktop emulation, no claim about physical iPad battery/temperature.'},null,2));
 if(errors.length||samples.some(s=>s.backend!=='pixi'||s.textures!==2||s.canvases!==1))throw new Error('Soak invariant failed');
}finally{await browser.close();}
