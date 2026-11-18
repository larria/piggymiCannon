import {test,expect} from '@playwright/test';
import {boot} from './qa-app';

for(const fault of ['unavailable','slow'] as const)test(`first AI launches remain audible with ${fault} samples, then use decoded samples on retry`,async({page,browserName})=>{
 test.setTimeout(90000);
 const missing=new Set<string>();
 await page.route('**/audio/sfx-fire-{multi,ion}-*.mp3',async route=>{const url=route.request().url();if(!missing.has(url)){missing.add(url);if(fault==='unavailable')await route.fulfill({status:503,body:'temporary unavailable'});else{await new Promise(r=>setTimeout(r,1600));await route.continue();}}else await route.continue();});
 await boot(page,true,'factory','multi','ion');
 await page.evaluate(async fault=>{const q=(window as any).__qa,a=q.audio;q.recorder.detach();q.game.update=()=>{};a.unlock();a.pause(false);a.setMusicEnabled(false);a.setSoundEnabled(true);if(fault==='unavailable')await Promise.all(a.loading.values());a.resetEffects();const analyser=a.context.createAnalyser();analyser.fftSize=1024;a.master.connect(analyser);(window as any).audioProbe=analyser;(window as any).shotEvents=[];const play=a.play.bind(a);a.play=(...args:any[])=>{if(args[0]==='shot')(window as any).shotEvents.push(args[3]);return play(...args);};},fault);
 const report=[];
 const weapons=['multi-normal','multi-special','ion-normal','ion-special'];
 for(const weapon of weapons){
  const result=await page.evaluate(async weapon=>{const q=(window as any).__qa,g=q.game,a=q.audio;g.phase='aiming';g.paused=false;g.projectiles=[];g.active.controller='ai';g.active.vehicleId=weapon.startsWith('multi')?'multi':'ion';g.active.selectedWeapon=weapon;g.selected=weapon;g.active.ammo[weapon]=Infinity;g.active.doubleShot=false;g.active.power=35;const fired=g.fire(true),probe=(window as any).audioProbe,values=new Float32Array(probe.fftSize);let peak=0;for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,20));probe.getFloatTimeDomainData(values);peak=Math.max(peak,Math.sqrt(values.reduce((s:number,v:number)=>s+v*v,0)/values.length));}return {fired,peak,state:a.context.state,events:(window as any).shotEvents};},weapon);
  expect(result.fired,weapon).toBe(true);expect(result.events).toContain(weapon);expect(result.state).toBe('running');expect(result.peak,weapon).toBeGreaterThan(.001);
  await page.evaluate(async weapon=>{const a=(window as any).__qa.audio;a.resetEffects();await a.preloadForMatch([weapon.startsWith('multi')?'multi':'ion']);},weapon);
  const replay=await page.evaluate(async weapon=>{const a=(window as any).__qa.audio,name=`sfx-fire-${weapon}.mp3`;a.play('shot',0,0,weapon);const values=new Float32Array((window as any).audioProbe.fftSize);let peak=0;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,20));(window as any).audioProbe.getFloatTimeDomainData(values);peak=Math.max(peak,Math.sqrt(values.reduce((s:number,v:number)=>s+v*v,0)/values.length));}return {decoded:a.buffers.has(name),peak};},weapon);
  expect(replay.decoded,weapon).toBe(true);expect(replay.peak,weapon).toBeGreaterThan(.001);
  report.push({weapon,first:result,retry:replay});
 }
 expect(missing.size).toBe(4);
 const {writeFileSync}=await import('node:fs');writeFileSync(`QA/first-match-audio-${fault}-${browserName}.json`,JSON.stringify({fault,browserName,report},null,2));
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.pause(true);a.pause(false);a.setSoundEnabled(false);});const muted=await page.evaluate(async()=>{const a=(window as any).__qa.audio;a.play('shot',0,0,'ion-normal');await new Promise(r=>setTimeout(r,100));const values=new Float32Array((window as any).audioProbe.fftSize);(window as any).audioProbe.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((s:number,v:number)=>s+v*v,0)/values.length);});expect(muted).toBeLessThan(.001);
});
