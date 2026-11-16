import {chromium,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {boot} from '../tests/browser/qa-app';

// Test-only instrumentation: production sources and their RNG are untouched.
const browserName=process.env.PIGGY_TEST_BROWSER==='webkit'?'webkit':'chromium';
const seconds=Number(process.env.PIGGY_BENCH_SECONDS??10);
if(!Number.isFinite(seconds)||seconds<3)throw new Error('PIGGY_BENCH_SECONDS must be >= 3');
const browser=await (browserName==='webkit'?webkit:chromium).launch(browserName==='chromium'?{channel:'chrome'}:{});
const context=await browser.newContext({baseURL:'http://localhost:4177/piggymiCannon/',viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage();
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const summarize=(values:number[])=>{const sorted=values.slice().sort((a,b)=>a-b);return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p50:sorted[Math.floor(sorted.length*.5)]??0,p95:sorted[Math.floor(sorted.length*.95)]??0,max:sorted.at(-1)??0};};
const results:any[]=[];
try{
 await boot(page);
 for(const scenario of ['two-idle','four-weather','multi-double','paused','settings','ace-match']){
  await page.evaluate(({scenario,seed})=>{
   const q=(window as any).__qa;
   const originalNow=Date.now;
   try{Date.now=()=>seed;
   q.newMatch({...q.game.config,map:scenario==='two-idle'?'valley':'factory',mapChoice:undefined,seed,timer:0,fog:scenario==='four-weather',snow:scenario==='four-weather',fireLine:scenario==='four-weather',slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:scenario!=='two-idle'||i<2,team:i%2,controller:scenario==='ace-match'?'ai':'human',difficulty:'expert',vehicle:i===0?'multi':['cannon','water','sea'][i-1]??'cannon'}))},true);
   }finally{Date.now=originalNow;}
   const g=(window as any).__qa.game;
   if(g.config.seed!==seed)throw new Error('Fixture seed was not honored');
   if(scenario==='multi-double'){g.selected='multi-special';g.active.ammo['multi-special']=Infinity;g.active.doubleShot=true;g.active.angle=75;g.active.power=75;g.fire();}
   if(scenario==='paused'||scenario==='settings'){g.paused=true;(window as any).__qa.audio.pause(true);(window as any).__qa.updateUI();}
  },{scenario,seed:310030+results.length});
  if(scenario==='settings')await page.locator('[data-dialog="settings"]:visible').first().click();
  await page.waitForTimeout(1200);
  const cdp=browserName==='chromium'?await context.newCDPSession(page):null;
  if(cdp)await cdp.send('Performance.enable');
  const before=cdp?await cdp.send('Performance.getMetrics'):null;
  const measured=await page.evaluate(async({seconds,scenario})=>{
   const q=(window as any).__qa,g=q.game,r=q.renderer,d=q.dashboard;
   const beforeFrames=r.frames??0,beforeGPU=r.stage?.frames??0;
   const samples:Record<string,number[]>={simulation:[],scene:[],dashboard:[],terrainRebuild:[],interval:[]};
   const restorers:(()=>void)[]=[];let previous=0,maxProjectiles=0,maxParticles=0,maxBlasts=0;
   for(const [object,key,label] of [[g,'update','simulation'],[r,'draw','scene'],[d,'draw','dashboard'],[r,'rebuildTerrain','terrainRebuild']] as any[]){
    const original=object[key];if(typeof original!=='function')continue;
    object[key]=function(...args:any[]){
     if(label==='scene'){const now=performance.now();if(previous)samples.interval.push(now-previous);previous=now;maxProjectiles=Math.max(maxProjectiles,g.projectiles.length);maxParticles=Math.max(maxParticles,g.particles.length);maxBlasts=Math.max(maxBlasts,g.blasts.length);}
     if(label==='simulation'&&scenario==='multi-double'&&g.humanTurn){g.selected='multi-special';g.active.ammo['multi-special']=Infinity;g.active.doubleShot=true;g.active.power=75;g.fire();}
     const start=performance.now();try{return original.apply(this,args);}finally{samples[label].push(performance.now()-start);}
    };restorers.push(()=>object[key]=original);
   }
   let longTasks=0;const observer=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask')?new PerformanceObserver(list=>longTasks+=list.getEntries().length):null;observer?.observe({type:'longtask'});
   const started=performance.now();await new Promise(r=>setTimeout(r,seconds*1000));const elapsed=performance.now()-started;
   restorers.forEach(r=>r());observer?.disconnect();
   return {samples,elapsedMs:elapsed,longTasks,maxProjectiles,maxParticles,maxBlasts,phase:g.phase,turn:g.turn,round:g.roundNumber,seed:g.config.seed,submittedFrames:r.frames===undefined?samples.scene.length:r.frames-beforeFrames,gpuFrames:r.stage? r.stage.frames-beforeGPU:null,backend:r.backend??'canvas',canvas:{width:r.canvas.width,height:r.canvas.height,ratio:r.ratio,worldHeight:r.viewHeight,gpuScreenHeight:r.stage?.app.screen.height??null},audioBuffers:(q.audio as any).buffers.size};
  },{seconds:scenario==='ace-match'?Math.max(seconds,30):seconds,scenario});
  const after=cdp?await cdp.send('Performance.getMetrics'):null;
  const metrics=(data:any)=>Object.fromEntries(data?.metrics.map((m:any)=>[m.name,m.value])??[]);
  const b=metrics(before),a=metrics(after),{samples,...rest}=measured;
  results.push({scenario,...rest,framesPerSecond:samples.scene.length/(measured.elapsedMs/1000),timingMs:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,summarize(v as number[])])),cpu:cdp?{taskSeconds:a.TaskDuration-b.TaskDuration,scriptSeconds:a.ScriptDuration-b.ScriptDuration,layoutSeconds:a.LayoutDuration-b.LayoutDuration,heapStart:b.JSHeapUsedSize,heapEnd:a.JSHeapUsedSize}:null,rawSamples:samples});
  console.log(`${scenario}: ${results.at(-1).framesPerSecond.toFixed(1)} fps, scene mean ${results.at(-1).timingMs.scene.mean.toFixed(3)} ms`);
  await cdp?.detach();
  if(scenario==='settings')await page.locator('[data-action="close"]:visible').first().click();
 }
 const output=resolve(process.env.PIGGY_RENDER_REPORT??`QA/pixi3-${browserName}-baseline.json`);mkdirSync(resolve(output,'..'),{recursive:true});
 const sourceHashes=Object.fromEntries(['main','renderer','engine','dashboard','audio','vehicle-art'].map(name=>[name,createHash('sha256').update(process.env.PIGGY_BASELINE_REF?execFileSync('git',['show',`${process.env.PIGGY_BASELINE_REF}:src/${name}.ts`]):readFileSync(`src/${name}.ts`)).digest('hex')]));
 if(!process.env.PIGGY_BASELINE_REF)sourceHashes['pixi-stage']=createHash('sha256').update(readFileSync('src/pixi-stage.ts')).digest('hex');
 writeFileSync(output,JSON.stringify({formatVersion:1,baselineRef:process.env.PIGGY_BASELINE_REF??null,version:JSON.parse(readFileSync('package.json','utf8')).version,sourceHashes,browser:browserName,browserVersion:browser.version(),recordedAt:new Date().toISOString(),viewport:{width:1194,height:834,dpr:2},method:'Instrumented real app; warmup 1.2s, real rAF and simulation, CPU submission timings (not GPU time or device power). Fixture seeds 310030..310035 via a temporary Date.now override only while creating each match (restored before measuring); multi-double repeats only on valid human aiming turns. No per-frame production changes.',results,errors},null,2)+'\n');
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
