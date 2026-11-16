import {test,expect} from '@playwright/test';import {boot} from './qa-app';
import {makeRng} from '../../src/engine';import {MAPS} from '../../src/catalog';import {VEHICLES} from '../../src/vehicles';import {BGM_TRACKS} from '../../src/audio-catalog';
import {readFileSync,writeFileSync} from 'node:fs';

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

test('real FT2 decoding/playback covers all 13 weapon pairs, movement, common cues and nine looping BGM scenes',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>{const frame=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>frame(t=>{if(!(window as any).qaFreezeFrames)cb(t);});(window as any).sampleStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args:any[]){if(this.buffer){const data=this.buffer.getChannelData(0);(window as any).sampleStarts.push({duration:this.buffer.duration,signal:data.some(v=>Math.abs(v)>.0001),loop:this.loop});}return (start as any).apply(this,args);};});
 await boot(page);await page.evaluate(async()=>{(window as any).qaFreezeFrames=true;const a=(window as any).__qa.audio;a.unlock();a.pause(false);a.setSoundEnabled(true);a.setMusicEnabled(true);await a.preloadForMatch(['bowl','crossbow','cannon','beetle','duke','mine','missile','multi','laser','water','ion','sea','dragon']);});
 for(const scene of Object.keys(BGM_TRACKS)){
  // Freeze simulation only; actual HTML media / Web Audio clocks and playback keep running.
  await page.evaluate(scene=>(window as any).__qa.audio.setScene(scene),scene);
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio;return !a.music.paused&&a.music.currentTime>0;})).toBe(true);
  const media=await page.evaluate(()=>{const a=(window as any).__qa.audio;return {src:a.music.src,duration:a.music.duration,error:a.music.error?.code??null};});expect(media.src).toContain(BGM_TRACKS[scene as keyof typeof BGM_TRACKS]);expect(media.error).toBeNull();const record=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8')).files.find((r:any)=>r.runtime===BGM_TRACKS[scene as keyof typeof BGM_TRACKS]);expect(Math.abs(media.duration-record.sourceSeconds)).toBeLessThan(.06);
  for(let wrap=0;wrap<2;wrap++)await page.evaluate(async()=>{
   const m=(window as any).__qa.audio.music as HTMLAudioElement;m.pause();
   await new Promise<void>((resolve,reject)=>{m.onseeked=()=>resolve();m.onerror=()=>reject(new Error('online seek '+m.src));m.currentTime=m.duration-.7;});
   const tail=m.currentTime;let advanced=false;await m.play();
   await new Promise<void>((resolve,reject)=>{const begin=performance.now(),check=()=>{if(m.currentTime>tail+.02)advanced=true;if(advanced&&!m.seeking&&!m.paused&&m.currentTime<1)resolve();else if(m.error||performance.now()-begin>8000)reject(new Error('online loop '+JSON.stringify({src:m.src,tail,time:m.currentTime,paused:m.paused,seeking:m.seeking,ended:m.ended,ready:m.readyState,network:m.networkState,advanced})));else setTimeout(check,30);};check();});m.onseeked=m.onerror=null;
  });
 }
 for(const v of VEHICLES){for(const weapon of [v.normal,v.special])for(const type of ['shot','explosion']){await page.evaluate(({type,weapon})=>(window as any).__qa.audio.play(type,400,600,weapon),{type,weapon});await page.waitForTimeout(90);}
  await page.evaluate(id=>(window as any).__qa.audio.updateMovement(true,400,600,id),v.id);await page.waitForTimeout(90);await page.evaluate(()=>(window as any).__qa.audio.updateMovement(false,400,600,null,true));
 }
 await page.evaluate(()=>{const a=(window as any).__qa.audio;for(const type of ['click','win','aim','turn','wind','firewall','lock','crate-land','supply','warning','transfer','death'])a.play(type);a.play('shot',300,500,'quake');});
 const decoded=await page.evaluate(()=>{const a=(window as any).__qa.audio;return {count:a.buffers.size,starts:(window as any).sampleStarts,context:a.context.state};});expect(decoded.count).toBe(91);expect(decoded.context).toBe('running');expect(decoded.starts.length).toBeGreaterThanOrEqual(80);expect(decoded.starts.every((s:any)=>s.signal&&s.duration>0)).toBe(true);expect(decoded.starts.filter((s:any)=>s.loop).length).toBeGreaterThanOrEqual(13);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.pause(true);a.play('click');a.play('aim');});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.context.state)).toBe('suspended');const before=await page.evaluate(()=>(window as any).__qa.audio.context.currentTime);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).__qa.audio.context.currentTime)).toBeCloseTo(before,2);expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setVolume(.25);a.pause(false);});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.context.state)).toBe('running');expect(await page.evaluate(()=>(window as any).__qa.audio.music.volume)).toBeCloseTo(.1375,4);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setSoundEnabled(false);a.play('shot',0,0,'cannon-normal');});const muted=await page.evaluate(()=>(window as any).sampleStarts.length);await page.evaluate(()=>(window as any).__qa.audio.play('item'));expect(await page.evaluate(()=>(window as any).sampleStarts.length)).toBe(muted);expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(false);
 await page.evaluate(()=>{const a=(window as any).__qa.audio;a.setSoundEnabled(true);a.setMusicEnabled(false);a.play('shot',300,500,'cannon-special');});expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);expect(await page.evaluate(()=>(window as any).sampleStarts.length)).toBeGreaterThan(muted);
});

test('all 100 runtime clips cache once and actual random-map music plays offline in production',async({page,context,browserName})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>{Date.now=()=>52;(window as any).mediaPlayed=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){(window as any).mediaPlayed.push(this);return play.call(this);};});
 await page.goto('./');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await context.setOffline(true);await page.reload();
 const manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8'));
 const assets=await page.evaluate(async files=>Promise.all(files.map(async(name:string)=>{const r=await fetch('audio/'+name),bytes=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');return {name,ok:r.ok,bytes:bytes.byteLength,hash,type:r.headers.get('content-type')};})),manifest.files.map((e:any)=>e.runtime));
 expect(assets).toHaveLength(100);for(const a of assets){const expected=manifest.files.find((e:any)=>e.runtime===a.name);expect(a.ok,a.name).toBe(true);expect(a.type).toContain('audio');expect(a.bytes).toBe(expected.bytes);expect(a.hash).toBe(expected.runtimeSHA256);}
 const cached=await page.evaluate(async()=>{const names=await caches.keys(),urls=[];for(const name of names)if(name.includes('precache'))for(const key of await (await caches.open(name)).keys())if(key.url.includes('/audio/'))urls.push(key.url);return urls;});expect(cached).toHaveLength(100);
 // Browser seeking requires a correct 206, not a cached whole-file 200 response.
 for(const r of manifest.files.filter((r:any)=>r.runtime.startsWith('bgm-'))){
  const range=await page.evaluate(async name=>{const r=await fetch('audio/'+name,{headers:{Range:'bytes=1000-1999'}});return {status:r.status,contentRange:r.headers.get('content-range'),bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};},r.runtime);
  expect(range.status).toBe(206);expect(range.contentRange).toBe(`bytes 1000-1999/${r.bytes}`);expect(range.bytes).toEqual(Array.from(readFileSync('public/audio/'+r.runtime).subarray(1000,2000)));
 }
 const ranges=await page.evaluate(async size=>{const rows=[];for(const value of ['bytes=-32',`bytes=${size-10}-`,'bytes=999999999-']){const r=await fetch('audio/bgm-lobby.mp3',{headers:{Range:value}});rows.push({status:r.status,bytes:(await r.arrayBuffer()).byteLength});}return rows;},manifest.files.find((r:any)=>r.runtime==='bgm-lobby.mp3').bytes);
 expect(ranges).toEqual([{status:206,bytes:32},{status:206,bytes:10},{status:416,bytes:0}]);

 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('input[name="map"][value="random"]').locator('..').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const map=MAPS[Math.floor(makeRng(52)()*MAPS.length)];await expect(page.locator('#map-label')).toContainText(map.name);
 await expect.poll(()=>page.evaluate(track=>(window as any).mediaPlayed.some((m:HTMLMediaElement)=>m.src.endsWith(track)&&!m.paused&&m.currentTime>0),BGM_TRACKS[map.id])).toBe(true);expect(await page.evaluate(()=>'__qa' in window)).toBe(false);
 // Full tracks must remain seekable at their original tail even with no network.
 const complete=[];
 for(const r of manifest.files.filter((r:any)=>r.runtime.startsWith('bgm-'))){
  const result=await page.evaluate(async name=>{
   const media=new Audio('audio/'+name);media.volume=0;media.loop=true;
   await new Promise<void>((resolve,reject)=>{media.onloadedmetadata=()=>resolve();media.onerror=()=>reject(new Error('offline metadata '+name));media.load();});
   const duration=media.duration;media.pause();
   await new Promise<void>((resolve,reject)=>{media.onseeked=()=>resolve();media.onerror=()=>reject(new Error('offline seek '+name));media.currentTime=duration-.7;});
   const tailStart=media.currentTime;if(tailStart<duration-.8)throw new Error('seek did not reach tail '+name);
   let tailAdvanced=false;await media.play();
   await new Promise<void>((resolve,reject)=>{const start=performance.now(),check=()=>{if(media.currentTime>tailStart+.02)tailAdvanced=true;if(tailAdvanced&&media.currentTime<1&&!media.paused)resolve();else if(media.error||performance.now()-start>8000)reject(new Error('offline tail '+JSON.stringify({name,tailStart,time:media.currentTime,paused:media.paused,seeking:media.seeking,ended:media.ended,ready:media.readyState,network:media.networkState,tailAdvanced})));else setTimeout(check,30);};check();});
   const row={name,duration,tailStart,tailPlayed:tailAdvanced,looped:true};media.pause();media.removeAttribute('src');media.load();return row;
  },r.runtime);
  expect(Math.abs(result.duration-r.sourceSeconds)).toBeLessThan(.06);complete.push(result);
 }
 writeFileSync(`QA/v2.3.8-offline-full-bgm-${browserName}.json`,JSON.stringify(complete,null,2));

 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.screenshot({path:'QA/v2.3.0-offline-audio-settings-1194.png'});
});
