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
console.log('Starting verification browser');
const browser=await chromium.launch({channel:'chrome',headless:true,...(process.env.PIGGY_VERIFY_PROXY?{proxy:{server:process.env.PIGGY_VERIFY_PROXY}}:{})});
console.log('Browser ready');
const context=await browser.newContext({viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true});
context.on('requestfailed',r=>console.log('资源请求失败',new URL(r.url()).pathname,r.failure()?.errorText));
console.log('Context ready');
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(condition,message)=>{if(!condition)throw Error(message);};
try{
 await page.addInitScript(()=>{window.__releaseMedia=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){if(!window.__releaseMedia.includes(this))window.__releaseMedia.push(this);return play.apply(this,args);};Object.defineProperty(navigator.clipboard,'writeText',{value:async text=>{window.__releaseSnapshot=text;}});});
 console.log('Opening verification target',base);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 const liveVersion=await page.evaluate(async()=> (await (await fetch('version.json?verify='+Date.now(),{cache:'no-store'})).json()).version);check(liveVersion===version,`线上版本${liveVersion}，预期${version}`);
 const entry=await page.locator('script[type="module"][src]').getAttribute('src');const relative=entry.split('/piggymiCannon/').at(-1).replace(/^\//,'');
 const bundle=await page.evaluate(async path=>Array.from(new Uint8Array(await (await fetch(path)).arrayBuffer())),entry);
 check(hash(Buffer.from(bundle))===hash(readFileSync(resolve('dist',relative))),'线上入口与本地构建不一致');
 console.log('线上版本与入口哈希已确认；正在安装完整离线包');
 await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('离线包安装超时')),210000))]);});await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:45000});
 const precache=await page.evaluate(async()=>{const names=await caches.keys(),keys=[];for(const name of names)if(name.includes('precache')){const c=await caches.open(name);keys.push(...(await c.keys()).map(r=>r.url));}return [...new Set(keys)];});
 await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'进入战场',exact:true}).waitFor();
 const offline=await page.evaluate(async files=>Promise.all(files.map(async f=>{const r=await fetch('audio/'+f.name),b=await r.arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');return {name:f.name,ok:r.ok&&actual===f.hash};})),files);check(offline.every(r=>r.ok),'离线音频缺失或哈希不一致');
 const offlinePortraits=await page.evaluate(async specs=>Promise.all(specs.map(async s=>{const r=await fetch(s.file),data=await r.arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');return {id:s.id,ok:r.ok&&actual===s.sha256};})),portraitFiles);check(offlinePortraits.every(r=>r.ok),'离线头像缺失或哈希不一致');
 const range=await page.evaluate(async()=>{const r=await fetch('audio/bgm-stage-00010.mp3',{headers:{Range:'bytes=-4096'}});return {status:r.status,bytes:(await r.arrayBuffer()).byteLength,range:r.headers.get('content-range')};});check(range.status===206&&range.bytes===4096,'离线完整配乐曲尾范围响应异常');
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-choice="cannon"]').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('input[name="map"][value="temple"]').locator('..').click();
 for(const key of ['musicEnabled','soundEnabled']){const button=page.locator(`[data-setup-setting="${key}"]`);if(await button.getAttribute('aria-checked')!=='true')await button.click();}
 check(await page.locator('#turn-timer').inputValue()==='0','新默认回合不是不限时');
 await page.waitForFunction(specs=>specs.every(s=>{const image=document.querySelector('#slot-roster img[data-crew-portrait="'+s.id+'"]');return image&&['cache','network'].includes(image.dataset.portraitSource)&&image.complete&&image.naturalWidth===s.width&&image.naturalHeight===s.height;}),portraitFiles,{timeout:20000});
 await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#battlefield').dataset.renderBackend==='pixi',null,{timeout:20000});await page.locator('#fire-button:enabled').waitFor({timeout:15000});
 await page.waitForFunction(()=>window.__releaseMedia.some(a=>a.src.includes('bgm-stage-')&&!a.paused&&a.currentTime>.2),null,{timeout:15000});
 const parts=version.split('.').map(Number),polish=parts[0]>4||parts[0]===4&&(parts[1]>0||parts[2]>=1);let emptyMeterVerified=false,powerMarkerVerified=false,midpointAimVerified=false;
 if(polish){check(await page.locator('#power-value').textContent()==='0','新局力度条未置空');check((await page.locator('#charge-fill').boundingBox()).width===0,'新局填充未置空');emptyMeterVerified=true;const b=await page.locator('#power-meter').boundingBox();await page.touchscreen.tap(b.x+b.width*.55,b.y+b.height/2);await page.waitForFunction(()=>document.querySelector('#power-marker').dataset.power==='55');}
 let angleNudgesVerified=false;
 if(await page.locator('#angle-up').count()){
  const initial=parseFloat(await page.locator('#relative-angle').textContent()),power=await page.locator('#power-value').textContent();
  for(const [id,expected] of [['angle-down',initial-1],['angle-up',initial]]){const r=await page.locator('#'+id).boundingBox();check(r.width>=44&&r.height>=44,'线上微调键过小');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForFunction(expected=>parseFloat(document.querySelector('#relative-angle').textContent)===expected,expected);}
  check(await page.locator('#power-value').textContent()===power,'微调改变了力度');angleNudgesVerified=true;
 }
 await page.locator('.battle-stage [data-dialog="settings"]').click();if(await page.locator('#repair-assets').count()){await page.locator('#repair-assets').click();await page.waitForFunction(()=>!document.querySelector('#repair-assets').disabled,null,{timeout:40000});}
 let assistanceSettingsVerified=false;
 if(version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=5000005){for(const key of ['powerAssist','tankBlocking']){const b=page.locator(`[data-setting="${key}"]`);check(await b.getAttribute('aria-checked')==='false',key+' default not off');await b.click();check(await b.getAttribute('aria-checked')==='true',key+' toggle did not enable');}assistanceSettingsVerified=true;}
 await page.locator('#copy-battle-snapshot').click();const payload=await page.evaluate(()=>window.__releaseSnapshot),snapshot=JSON.parse(payload.match(/```json\n([\s\S]*?)\n```/)[1]);
 if(assistanceSettingsVerified)check(snapshot.current.config.powerAssist===true&&snapshot.current.config.tankBlocking===true,'New settings missing in snapshot');
 if(snapshot.assetResources)check(snapshot.assetResources.failed.length===0&&snapshot.assetResources.checked===snapshot.assetResources.total,'离线素材全检失败');
 check(snapshot.gameVersion===version&&snapshot.initial.config.map==='temple'&&snapshot.initial.world.width===(version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=4000006?2688:1920)&&snapshot.initial.world.height===(version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=4000006?1344:960),'线上快照缺少实际版本／地图／新边界');
 if(polish){const tank=snapshot.current.tanks[0];check(tank.angle===(tank.minAngle+tank.maxAngle)/2,'开局射界未居中');check(tank.powerMarker===55&&tank.shots===0,'轻点未记录刻度或误发射');midpointAimVerified=true;powerMarkerVerified=true;}
 await page.locator('#close-dialog').click();await page.screenshot({path:`QA/v${version}-live-offline-1194.png`,scale:'css'});
 const progressionAtSave=await page.evaluate(()=>localStorage.getItem('piggy-progression-v1'));
 let offlineReplayVerified=false,offlineReplayExchangeVerified=false,localReplayBytes=0,healingComboVerified=false,offlineMedalUI=false,humanCounterSnapshot=false,unfinishedReplayNoScore=false;
 if(await page.locator('[data-action="save-replay"]').count()||version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=3002002){
  const modernCombo=version.split('.').map(Number).reduce((n,v)=>n*1000+v,0)>=3002007;
  if(modernCombo){for(const id of ['double','boost','repair'])await page.locator('#quick-items [data-item="'+id+'"]').click();const r=await page.locator('#fire-button').boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(50);healingComboVerified=true;}else await page.locator('#fire-button').press('Enter');await page.waitForTimeout(100);await page.locator('.battle-stage [data-dialog="settings"]').click();if(healingComboVerified){await page.locator('#copy-battle-snapshot').click();const text=await page.evaluate(()=>window.__releaseSnapshot),shot=JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);check(shot.current.projectiles.some(p=>p.healing&&p.fireBoosted&&p.boost===1.5),'线上双发强化恢复弹未发射');if(Number(version.split('.')[0])>=4){const metrics=shot.current.progress?.competitors.find(c=>c.id===0)?.metrics;check(metrics?.items===3&&metrics?.shots===1,'人类统计包含只读检查或遗漏真实消费／发射');humanCounterSnapshot=true;}check(shot.current.tanks[0].items.double===0&&shot.current.tanks[0].items.boost===0&&shot.current.tanks[0].items.repair===0,'线上组合道具消耗异常');}
  await page.locator('[data-action="save-replay"]').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('已保存本局录像'));
  localReplayBytes=await page.evaluate(()=>new TextEncoder().encode(localStorage.getItem('piggy-replays-v1')).length);
  await page.locator('#close-dialog').click();await page.locator('#exit-match').click();await page.locator('[data-action="leave-match"]').click();await page.locator('[data-dialog="replays"]').click();
  if(await page.locator('#import-replay').count()){
   const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-replays-v1'))[0]);
   const pending=page.waitForEvent('download');await page.locator('[data-export-replay]').first().click();const download=await pending,path='/tmp/piggy-'+version+'-offline-replay.json';await download.saveAs(path);check(JSON.stringify(JSON.parse(readFileSync(path,'utf8')))===JSON.stringify(original),'离线导出内容不一致');
   await page.locator('[data-delete-replay]').first().click();await page.locator('#replay-file').setInputFiles(path);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('录像已导入'));check(await page.locator('[data-play-replay]').count()===1,'离线导入未保存');offlineReplayExchangeVerified=true;
  }
  await page.locator('[data-play-replay]').first().click();await page.keyboard.press('F5');
  await page.waitForFunction(()=>document.querySelector('#replay-status').textContent==='播放完毕 · 已校验',null,{timeout:15000});
  offlineReplayVerified=true;check(await page.locator('#fire-button').isDisabled(),'录像播放仍允许开炮');await page.screenshot({path:`QA/v${version}-live-offline-replay-1194.png`,scale:'css'});
 }
 if(Number(version.split('.')[0])>=4){
  check(snapshot.current.progress?.competitors.length===2&&snapshot.current.progress?.id,'离线快照缺少战前勋章／人类统计');
  unfinishedReplayNoScore=await page.evaluate(before=>localStorage.getItem('piggy-progression-v1')===before,progressionAtSave);check(unfinishedReplayNoScore,'未完成对局／录像意外改变积分');
  await page.locator('#replay-exit').click();await page.getByRole('button',{name:'我的战绩',exact:true}).click();
  check(await page.locator('.rank-ladder .rank-medal').count()===4&&await page.locator('.achievement-grid article').count()===14,'离线勋章／成就UI缺失');
  await page.getByRole('tab',{name:'小黄鱼',exact:true}).click();check((await page.locator('.rank-profile').textContent()).includes('小黄鱼'),'离线人类档案不能切换');offlineMedalUI=true;await page.locator('#close-dialog').click();
 }
 const portraitBackup=await page.evaluate(async()=>{let files=0,bytes=0;for(const name of await caches.keys())if(name.startsWith('piggy-portrait-thumbs')){const cache=await caches.open(name);for(const key of await cache.keys()){files++;bytes+=(await(await cache.match(key)).arrayBuffer()).byteLength;}}return {files,bytes};});check(portraitBackup.files===4&&portraitBackup.bytes<=320000,'小头像备份数量／大小异常');
 const state=await page.evaluate(()=>({backend:document.querySelector('#battlefield').dataset.renderBackend,version:document.querySelector('#stage-version-button').textContent,map:document.querySelector('#map-label').textContent,productionWithoutQA:!('__qa' in window),timerHidden:document.querySelector('#timer').classList.contains('hidden')}));check(state.productionWithoutQA&&state.timerHidden&&state.version.includes(version),'生产接口／不限时／版本异常');check(errors.length===0,errors.join('\n'));
 writeFileSync(reportFile,JSON.stringify({formatVersion:1,version,base,verifiedAt:new Date().toISOString(),liveBundleMatchesLocal:true,offlineReload:true,offlinePixi:true,allOfflineAudioHashesMatch:true,audioFiles:files.length,precacheURLs:precache.length,range,actualMap:snapshot.initial.config.map,mapName:snapshot.initial.mapName,seed:snapshot.initial.config.seed,world:snapshot.initial.world,snapshotFormatVersion:snapshot.formatVersion,allMaterialHashesVerifiedOffline:!!snapshot.assetResources?.total,actualMapMusicPlayedOffline:true,allFourPortraitsDecodedOffline:true,allOfflinePortraitHashesMatch:true,portraitBackup,angleNudgesVerified,independentSwitchesEnabled:true,assistanceSettingsVerified,offlineReplayVerified,offlineReplayExchangeVerified,healingComboVerified,offlineMedalUI,humanCounterSnapshot,unfinishedReplayNoScore,emptyMeterVerified,powerMarkerVerified,midpointAimVerified,localReplayBytes,...state,errors},null,2)+'\n');
 console.log(`v${version} 线上入口与本地一致；离线Pixi、4头像、${files.length}音频、完整曲尾、地图与快照通过`);
}finally{await context.close();await browser.close();}
