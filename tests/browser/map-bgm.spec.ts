import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {MAPS} from '../../src/catalog';import {BGM_TRACKS} from '../../src/audio-catalog';import {readFileSync,writeFileSync} from 'node:fs';
const selection=JSON.parse(readFileSync('research/FT2_MAP_BGM_SELECTION.json','utf8')),manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8'));
for(const width of [1194,1210])test(`${width} iPad each actual map plays the verified selected bytes and random rematches preserve routing`,async({page,browserName})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);const rows=[];
 for(const map of MAPS){
  await page.evaluate(map=>{const q=(window as any).__qa;q.newMatch({...q.game.config,map,mapChoice:map,timer:0,slots:q.game.config.slots.map((s:any)=>({...s,controller:'human'}))},true);const a=(window as any).__qa.audio;a.setMusicEnabled(true);},map.id);
  await expect(page.locator('#map-label')).toContainText(map.name);await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio.music;return !a.paused&&a.currentTime>.05;})).toBe(true);
  const result=await page.evaluate(async()=>{const q=(window as any).__qa,g=q.game,a=q.audio.music,bytes=await (await fetch(a.src)).arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');return {map:g.config.map,choice:g.config.mapChoice,snapshot:g.battleSnapshot().initial.mapName,src:a.src,hash,duration:a.duration,error:a.error?.code??null};});
  const record=manifest.files.find((r:any)=>r.runtime===BGM_TRACKS[map.id]);expect(result.hash).toBe(record.runtimeSHA256);expect(result.duration).toBeGreaterThan(47);expect(result.duration).toBeLessThan(49);expect(result.snapshot).toBe(map.name);expect(result.src).toContain(BGM_TRACKS[map.id]);expect(result.error).toBeNull();rows.push({...result,selection:selection.maps[map.id]});
 }
 const draws=[];
 for(let n=0;n<12;n++){
  await page.evaluate(n=>{const q=(window as any).__qa;q.newMatch({...q.game.config,mapChoice:'random',timer:0},true);},n);
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio.music;return !a.paused&&a.currentTime>0;})).toBe(true);
  const draw=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,s=g.battleSnapshot();return {seed:g.config.seed,map:g.config.map,choice:g.config.mapChoice,name:s.initial.mapName,draw:s.events.find((e:any)=>e.type==='map-selection')?.data,src:q.audio.music.src};});expect(draw.choice).toBe('random');expect(draw.src).toContain(BGM_TRACKS[draw.map as keyof typeof BGM_TRACKS]);expect(draw.draw.actual).toBe(draw.map);draws.push(draw);
 }
 expect(new Set(draws.map(d=>d.seed)).size).toBe(12);
 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.locator('#volume').evaluate((e:HTMLInputElement)=>{e.value='25';e.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.locator('#volume-percent')).toHaveText('25%');await page.locator('#effects-toggle').click();await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','true');await page.locator('#music-toggle').click();await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','false');await page.locator('#music-toggle').click();await page.locator('#effects-toggle').click();await page.screenshot({path:`QA/v2.3.6-music-settings-${width}-${browserName}.png`});await page.locator('#close-dialog').click();await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(false);
 expect(errors).toEqual([]);writeFileSync(`QA/v2.3.6-map-music-${width}-${browserName}.json`,JSON.stringify({rows,draws,errors},null,2));
});
