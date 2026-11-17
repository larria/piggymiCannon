import {chromium} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const version=process.argv[2]??JSON.parse(readFileSync('package.json')).version;
const base=process.argv[3]??'https://larria.github.io/piggymiCannon/';
const reportFile=process.argv[4]??`QA/v${version}-live-verification.json`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const portraitSource=readFileSync('src/portrait-assets.ts','utf8');
const portraitSpecs=JSON.parse(portraitSource.slice(portraitSource.indexOf('{'),portraitSource.lastIndexOf('}')+1));
const portraitFiles=Object.entries(portraitSpecs).map(([id,s])=>({id,...s}));
const files=readdirSync('dist/audio').filter(n=>n.endsWith('.mp3')).map(name=>({name,hash:hash(readFileSync(resolve('dist/audio',name)))}));
const browser=await chromium.launch({channel:'chrome',headless:true,...(process.env.PIGGY_VERIFY_PROXY?{proxy:{server:process.env.PIGGY_VERIFY_PROXY}}:{})});
const context=await browser.newContext({viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(condition,message)=>{if(!condition)throw Error(message);};
try{
 await page.addInitScript(()=>{window.__releaseMedia=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){if(!window.__releaseMedia.includes(this))window.__releaseMedia.push(this);return play.apply(this,args);};Object.defineProperty(navigator.clipboard,'writeText',{value:async text=>{window.__releaseSnapshot=text;}});});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 const liveVersion=await page.evaluate(async()=> (await (await fetch('version.json?verify='+Date.now(),{cache:'no-store'})).json()).version);check(liveVersion===version,`线上版本${liveVersion}，预期${version}`);
 const entry=await page.locator('script[type="module"][src]').getAttribute('src');const relative=entry.split('/piggymiCannon/').at(-1).replace(/^\//,'');
 const bundle=await page.evaluate(async path=>Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),entry);
 check(hash(Buffer.from(bundle))===hash(readFileSync(resolve('dist',relative))),'线上入口与本地构建不一致');
 await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('离线包安装超时')),90000))]);});await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:45000});
 const precache=await page.evaluate(async()=>{const names=await caches.keys(),keys=[];for(const name of names)if(name.includes('precache')){const c=await caches.open(name);keys.push(...(await c.keys()).map(r=>r.url));}return [...new Set(keys)];});
 await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'进入战场',exact:true}).waitFor();
 const offline=await page.evaluate(async files=>Promise.all(files.map(async f=>{const r=await fetch('audio/'+f.name),b=await r.arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');return {name:f.name,ok:r.ok&&actual===f.hash};})),files);check(offline.every(r=>r.ok),'离线音频缺失或哈希不一致');
 const offlinePortraits=await page.evaluate(async specs=>Promise.all(specs.map(async s=>{const r=await fetch(s.file),data=await r.arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');return {id:s.id,ok:r.ok&&actual===s.sha256};})),portraitFiles);check(offlinePortraits.every(r=>r.ok),'离线头像缺失或哈希不一致');
 const range=await page.evaluate(async()=>{const r=await fetch('audio/bgm-temple.mp3',{headers:{Range:'bytes=-4096'}});return {status:r.status,bytes:(await r.arrayBuffer()).byteLength,range:r.headers.get('content-range')};});check(range.status===206&&range.bytes===4096,'离线完整配乐曲尾范围响应异常');
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-choice="cannon"]').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('input[name="map"][value="temple"]').locator('..').click();
 for(const key of ['musicEnabled','soundEnabled']){const button=page.locator(`[data-setup-setting="${key}"]`);if(await button.getAttribute('aria-checked')!=='true')await button.click();}
 check(await page.locator('#turn-timer').inputValue()==='0','新默认回合不是不限时');
 await page.waitForFunction(specs=>specs.every(s=>{const image=document.querySelector('#slot-roster img[data-crew-portrait="'+s.id+'"]');return image&&['cache','network'].includes(image.dataset.portraitSource)&&image.complete&&image.naturalWidth===s.width&&image.naturalHeight===s.height;}),portraitFiles,{timeout:20000});
 await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#battlefield').dataset.renderBackend==='pixi',null,{timeout:20000});await page.locator('#fire-button:enabled').waitFor({timeout:15000});
 await page.waitForFunction(()=>window.__releaseMedia.some(a=>a.src.includes('bgm-temple.mp3')&&!a.paused&&a.currentTime>.2),null,{timeout:15000});
 let angleNudgesVerified=false;
 if(await page.locator('#angle-up').count()){
  const initial=parseFloat(await page.locator('#relative-angle').textContent()),power=await page.locator('#power-value').textContent();
  for(const [id,expected] of [['angle-down',initial-1],['angle-up',initial]]){const r=await page.locator('#'+id).boundingBox();check(r.width>=44&&r.height>=44,'线上微调键过小');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForFunction(expected=>parseFloat(document.querySelector('#relative-angle').textContent)===expected,expected);}
  check(await page.locator('#power-value').textContent()===power,'微调改变了力度');angleNudgesVerified=true;
 }
 await page.locator('.battle-stage [data-dialog="settings"]').click();if(await page.locator('#repair-assets').count()){await page.locator('#repair-assets').click();await page.waitForFunction(()=>!document.querySelector('#repair-assets').disabled,null,{timeout:40000});}
 await page.locator('#copy-battle-snapshot').click();const payload=await page.evaluate(()=>window.__releaseSnapshot),snapshot=JSON.parse(payload.match(/```json\n([\s\S]*?)\n```/)[1]);
 if(snapshot.assetResources)check(snapshot.assetResources.failed.length===0&&snapshot.assetResources.checked===snapshot.assetResources.total,'离线素材全检失败');
 check(snapshot.gameVersion===version&&snapshot.initial.config.map==='temple'&&snapshot.initial.world.width===1920&&snapshot.initial.world.height===960,'线上快照缺少实际版本／地图／新边界');
 await page.locator('#close-dialog').click();await page.screenshot({path:`QA/v${version}-live-offline-1194.png`,scale:'css'});
 let offlineReplayVerified=false,localReplayBytes=0,healingComboVerified=false;
 if(await page.locator('[data-action="save-replay"]').count()||version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=3002002){
  const modernCombo=version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=3002007;
  if(modernCombo){for(const id of ['double','boost','repair'])await page.locator('#quick-items [data-item="'+id+'"]').click();const r=await page.locator('#fire-button').boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(50);healingComboVerified=true;}else await page.locator('#fire-button').press('Enter');await page.waitForTimeout(100);await page.locator('.battle-stage [data-dialog="settings"]').click();if(healingComboVerified){await page.locator('#copy-battle-snapshot').click();const text=await page.evaluate(()=>window.__releaseSnapshot),shot=JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);check(shot.current.projectiles.some(p=>p.healing&&p.fireBoosted&&p.boost===1.5),'线上双发强化恢复弹未发射');check(shot.current.tanks[0].items.double===0&&shot.current.tanks[0].items.boost===0&&shot.current.tanks[0].items.repair===0,'线上组合道具消耗异常');}
  await page.locator('[data-action="save-replay"]').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('已保存本局录像'));
  localReplayBytes=await page.evaluate(()=>new TextEncoder().encode(localStorage.getItem('piggy-replays-v1')).length);
  await page.locator('#close-dialog').click();await page.locator('#exit-match').click();await page.locator('[data-action="leave-match"]').click();await page.locator('[data-dialog="replays"]').click();await page.locator('[data-play-replay]').first().click();await page.keyboard.press('F5');
  await page.waitForFunction(()=>document.querySelector('#replay-status').textContent==='播放完毕 · 已校验',null,{timeout:15000});
  offlineReplayVerified=true;check(await page.locator('#fire-button').isDisabled(),'录像播放仍允许开炮');await page.screenshot({path:`QA/v${version}-live-offline-replay-1194.png`,scale:'css'});
 }
 const portraitBackup=await page.evaluate(async()=>{let files=0,bytes=0;for(const name of await caches.keys())if(name.startsWith('piggy-portrait-thumbs')){const cache=await caches.open(name);for(const key of await cache.keys()){files++;bytes+=(await(await cache.match(key)).arrayBuffer()).byteLength;}}return {files,bytes};});check(portraitBackup.files===4&&portraitBackup.bytes<=320000,'小头像备份数量／大小异常');
 const state=await page.evaluate(()=>({backend:document.querySelector('#battlefield').dataset.renderBackend,version:document.querySelector('#stage-version-button').textContent,map:document.querySelector('#map-label').textContent,productionWithoutQA:!('__qa' in window),timerHidden:document.querySelector('#timer').classList.contains('hidden')}));check(state.productionWithoutQA&&state.timerHidden&&state.version.includes(version),'生产接口／不限时／版本异常');check(errors.length===0,errors.join('\n'));
 writeFileSync(reportFile,JSON.stringify({formatVersion:1,version,base,verifiedAt:new Date().toISOString(),liveBundleMatchesLocal:true,offlineReload:true,offlinePixi:true,allOfflineAudioHashesMatch:true,audioFiles:files.length,precacheURLs:precache.length,range,actualMap:snapshot.initial.config.map,mapName:snapshot.initial.mapName,seed:snapshot.initial.config.seed,world:snapshot.initial.world,snapshotFormatVersion:snapshot.formatVersion,allMaterialHashesVerifiedOffline:!!snapshot.assetResources?.total,actualMapMusicPlayedOffline:true,allFourPortraitsDecodedOffline:true,allOfflinePortraitHashesMatch:true,portraitBackup,angleNudgesVerified,independentSwitchesEnabled:true,offlineReplayVerified,healingComboVerified,localReplayBytes,...state,errors},null,2)+'\n');
 console.log(`v${version} 线上入口与本地一致；离线Pixi、4头像、${files.length}音频、完整曲尾、地图与快照通过`);
}finally{await context.close();await browser.close();}
