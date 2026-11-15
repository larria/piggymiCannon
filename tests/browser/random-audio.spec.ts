import {test,expect} from '@playwright/test';import {boot} from './qa-app';
import {makeRng} from '../../src/engine';import {MAPS} from '../../src/catalog';import {VEHICLES} from '../../src/vehicles';import {BGM_TRACKS} from '../../src/audio-catalog';
import {readFileSync} from 'node:fs';

for(const width of [1194,1210])test(`${width} iPad random-map setup resolves seeded map, soundtrack, snapshot and rematch`,async({page})=>{
 await page.setViewportSize({width,height:834});await page.addInitScript(()=>{Date.now=()=>52;});await boot(page,false);
 await page.getByRole('button',{name:'进入战场',exact:true}).click();
 await expect(page.locator('input[name="map"]')).toHaveCount(7);
 await page.locator('input[name="map"][value="random"]').locator('..').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');
 await expect(page.locator('input[name="map"][value="random"]')).toBeChecked();
 await page.locator('.map-notes summary').click();await expect(page.locator('#map-choice-note')).toContainText('再来一局');
 expect(await page.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await expect.poll(async()=>{const button=await page.locator('#deploy-slots').boundingBox();return button!.y+button!.height;}).toBeLessThan(834);
 await page.screenshot({path:`QA/v2.3.0-random-setup-${width}.png`});await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const map=MAPS[Math.floor(makeRng(52)()*MAPS.length)];await expect(page.locator('#map-label')).toContainText(map.name);
 const state=await page.evaluate(()=>{const g=(window as any).__qa.game,a=(window as any).__qa.audio,s=g.battleSnapshot();return {map:g.config.map,choice:g.config.mapChoice,music:a.music.src,seed:s.initial.config.seed,initial:s.initial.config.map,current:s.current.config.map,name:s.initial.mapName,spawnSafe:g.tanks.every((t:any)=>t.y+18<567&&t.fallVelocity===0)};});
 expect(state).toMatchObject({map:map.id,choice:'random',seed:52,initial:map.id,current:map.id,name:map.name,spawnSafe:true});expect(state.music).toContain(BGM_TRACKS[map.id]);
 await page.screenshot({path:`QA/v2.3.0-random-combat-${width}.png`});
 // The actual rematch handler must keep random preference and use the fresh seed.
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.fog=false;g.tanks[1].hp=0;g.nextTurn();Date.now=()=>53;});
 await expect(page.locator('[data-action="rematch"]')).toBeVisible({timeout:6000});await page.locator('[data-action="rematch"]').click();
 const next=MAPS[Math.floor(makeRng(53)()*MAPS.length)].id;
 expect(await page.evaluate(()=>{const g=(window as any).__qa.game,s=g.battleSnapshot();return {map:g.config.map,choice:g.config.mapChoice,seed:s.initial.config.seed,oldDeaths:s.critical.length};})).toEqual({map:next,choice:'random',seed:53,oldDeaths:0});
 await page.locator('#pause-button').click();await page.getByRole('button',{name:'重新部署',exact:true}).click();await expect(page.locator('input[name="map"][value="random"]')).toBeChecked();
});

test('real FT2 decoding/playback covers all 13 weapon pairs, movement, common cues and eight BGM scenes',async({page})=>{
 test.setTimeout(70000);
 await page.addInitScript(()=>{const frame=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>frame(t=>{if(!(window as any).qaFreezeFrames)cb(t);});(window as any).sampleStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args:any[]){if(this.buffer){const data=this.buffer.getChannelData(0);(window as any).sampleStarts.push({duration:this.buffer.duration,signal:data.some(v=>Math.abs(v)>.0001),loop:this.loop});}return (start as any).apply(this,args);};});
 await boot(page);await page.evaluate(async()=>{(window as any).qaFreezeFrames=true;const a=(window as any).__qa.audio;a.unlock();a.pause(false);a.setSoundEnabled(true);a.setMusicEnabled(true);await a.preloadForMatch(['bowl','crossbow','cannon','beetle','duke','mine','missile','multi','laser','water','ion','sea','dragon']);});
 for(const scene of Object.keys(BGM_TRACKS)){
  // Freeze simulation only; actual HTML media / Web Audio clocks and playback keep running.
  await page.evaluate(scene=>(window as any).__qa.audio.setScene(scene),scene);
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio;return !a.music.paused&&a.music.currentTime>0;})).toBe(true);
  const media=await page.evaluate(()=>{const a=(window as any).__qa.audio;return {src:a.music.src,duration:a.music.duration,error:a.music.error?.code??null};});expect(media.src).toContain(BGM_TRACKS[scene as keyof typeof BGM_TRACKS]);expect(media.error).toBeNull();expect(media.duration).toBeGreaterThan(10);
 }
 for(const v of VEHICLES){for(const weapon of [v.normal,v.special])for(const type of ['shot','explosion']){await page.evaluate(({type,weapon})=>(window as any).__qa.audio.play(type,400,600,weapon),{type,weapon});await page.waitForTimeout(90);}
  await page.evaluate(id=>(window as any).__qa.audio.updateMovement(true,400,600,id),v.id);await page.waitForTimeout(90);await page.evaluate(()=>(window as any).__qa.audio.updateMovement(false));
 }
 await page.evaluate(()=>{const a=(window as any).__qa.audio;for(const type of ['click','win','aim','item','turn','wind','firewall','lock','crate-land','supply','warning','transfer'])a.play(type);a.play('shot',300,500,'quake');});
 const decoded=await page.evaluate(()=>{const a=(window as any).__qa.audio;return {count:a.buffers.size,starts:(window as any).sampleStarts,context:a.context.state};});expect(decoded.count).toBe(91);expect(decoded.context).toBe('running');expect(decoded.starts.length).toBeGreaterThanOrEqual(80);expect(decoded.starts.every((s:any)=>s.signal&&s.duration>0)).toBe(true);expect(decoded.starts.filter((s:any)=>s.loop).length).toBeGreaterThanOrEqual(13);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.pause(true);a.play('click');a.play('aim');});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.context.state)).toBe('suspended');const before=await page.evaluate(()=>(window as any).__qa.audio.context.currentTime);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).__qa.audio.context.currentTime)).toBeCloseTo(before,2);expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setVolume(.25);a.pause(false);});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.context.state)).toBe('running');expect(await page.evaluate(()=>(window as any).__qa.audio.music.volume)).toBeCloseTo(.1375,4);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setSoundEnabled(false);a.play('shot',0,0,'cannon-normal');});const muted=await page.evaluate(()=>(window as any).sampleStarts.length);await page.evaluate(()=>(window as any).__qa.audio.play('item'));expect(await page.evaluate(()=>(window as any).sampleStarts.length)).toBe(muted);expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(false);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setSoundEnabled(true);a.setMusicEnabled(false);a.play('shot',300,500,'cannon-special');});expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);expect(await page.evaluate(()=>(window as any).sampleStarts.length)).toBeGreaterThan(muted);
});

test('all 99 runtime clips cache once and actual random-map music plays offline in production',async({page,context})=>{
 await page.addInitScript(()=>{Date.now=()=>52;(window as any).mediaPlayed=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){(window as any).mediaPlayed.push(this);return play.call(this);};});
 await page.goto('./');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await context.setOffline(true);await page.reload();
 const manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8'));
 const assets=await page.evaluate(async files=>Promise.all(files.map(async(name:string)=>{const r=await fetch('audio/'+name);return {name,ok:r.ok,bytes:(await r.arrayBuffer()).byteLength,type:r.headers.get('content-type')};})),manifest.files.map((e:any)=>e.runtime));
 expect(assets).toHaveLength(99);for(const a of assets){expect(a.ok,a.name).toBe(true);expect(a.type).toContain('audio');expect(a.bytes).toBe(manifest.files.find((e:any)=>e.runtime===a.name).bytes);}
 const cached=await page.evaluate(async()=>{const names=await caches.keys(),urls=[];for(const name of names)if(name.includes('precache'))for(const key of await (await caches.open(name)).keys())if(key.url.includes('/audio/'))urls.push(key.url);return urls;});expect(cached).toHaveLength(99);
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('input[name="map"][value="random"]').locator('..').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const map=MAPS[Math.floor(makeRng(52)()*MAPS.length)];await expect(page.locator('#map-label')).toContainText(map.name);
 await expect.poll(()=>page.evaluate(track=>(window as any).mediaPlayed.some((m:HTMLMediaElement)=>m.src.endsWith(track)&&!m.paused&&m.currentTime>0),BGM_TRACKS[map.id])).toBe(true);expect(await page.evaluate(()=>'__qa' in window)).toBe(false);
 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.screenshot({path:'QA/v2.3.0-offline-audio-settings-1194.png'});
});
