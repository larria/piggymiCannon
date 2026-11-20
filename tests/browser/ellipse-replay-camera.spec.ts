import {test,expect} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';import {boot} from './qa-app';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
test.use({deviceScaleFactor:2});
test('iPad: export, delete, import, play and verify the same recording; errors preserve local clips',async({page,browserName})=>{
 await boot(page,true,'factory','missile','bowl');
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.setAim(35,30);g.fire();for(let i=0;i<100;i++)g.update(.01);g.paused=true;});
 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.locator('[data-action="save-replay"]').click();await expect(page.locator('#toast')).toContainText('已保存本局录像');await page.locator('#close-dialog').click();await page.locator('#exit-match').click();await page.locator('[data-action="leave-match"]').click();await page.locator('[data-dialog="replays"]').click();
 const clips=await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-replays-v1')!));
 const download=page.waitForEvent('download');await page.locator('[data-export-replay]').click();const file=await download;expect(file.suggestedFilename()).toMatch(/^piggy-replay-factory-.*\.json$/);const path=test.info().outputPath('clip.json');await file.saveAs(path);expect(JSON.parse(readFileSync(path,'utf8'))).toEqual(clips[0]);
 await page.locator('[data-delete-replay]').click();await expect(page.locator('[data-play-replay]')).toHaveCount(0);await page.locator('#replay-file').setInputFiles(path);await expect(page.locator('#toast')).toContainText('录像已导入');await expect(page.locator('[data-play-replay]')).toHaveCount(1);
 await page.locator('#replay-file').setInputFiles(path);await expect(page.locator('[data-play-replay]')).toHaveCount(1);
 await page.locator('#replay-file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.locator('#toast')).toContainText('JSON');await expect(page.locator('[data-play-replay]')).toHaveCount(1);
 for(const selector of ['#import-replay','[data-play-replay]','[data-export-replay]','[data-delete-replay]']){const r=await page.locator(selector).boundingBox();expect(r!.width).toBeGreaterThanOrEqual(44);expect(r!.height).toBeGreaterThanOrEqual(44);expect(r!.y+r!.height).toBeLessThanOrEqual(834);}
 await page.screenshot({path:`QA/v${version}-replay-exchange-${browserName}-1194.png`,scale:'css'});
 await page.locator('[data-play-replay]').click();await page.keyboard.press('F5');await expect(page.locator('#replay-status')).toHaveText('播放完毕 · 已校验');expect(await page.evaluate(()=>(window as any).__qa.playback.recording.id)).toBe(clips[0].id);expect(await page.locator('#fire-button').isDisabled()).toBe(true);
 writeFileSync(`QA/v${version}-replay-exchange-${browserName}.json`,JSON.stringify({importExportRoundTrip:true,deduplicated:true,invalidFilePreservesClips:true,importedPlaybackVerified:true,viewport:{width:1194,height:834}},null,2));
});
test('iPad Pixi: centred high hit and low graze dig by actual ellipse height',async({page,browserName})=>{
 await boot(page,true,'factory','cannon','bowl');await page.waitForFunction(()=>(window as any).__qa.renderer.backend==='pixi');
 const report=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;q.recorder.detach();g.paused=false;g.update=()=>{};g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:i?850:450,y:432,fallVelocity:0}));const fire=(x:number,y:number,hit?:number)=>{g.explode({...g.launch(g.active,'cannon-normal'),x,y,vx:0,vy:500},hit);};fire(450,398,0);fire(850,450,1);const snapshot=g.battleSnapshot();g.blasts=[];g.texts=[];g.particles=[];g.drainEvents();q.renderer.focusAt(650,450);q.renderer.draw(.2);q.updateUI();return {version:g.gameVersion,terrain:snapshot.events.filter((e:any)=>e.type==='terrain').map((e:any)=>e.data),profiles:snapshot.events.filter((e:any)=>e.type==='excavation-profile').map((e:any)=>e.data),backend:q.renderer.backend};});
 expect(report.terrain[0].x).toBe(450);expect(report.terrain[0].y).toBe(398);expect(report.terrain[1].y).toBe(450);expect(report.terrain[0].removed).toBeLessThan(report.terrain[1].removed);expect(report.terrain[0].radius).toBeCloseTo(99.9);expect(report.terrain[0].depth).toBeCloseTo(66.6);expect(report.backend).toBe('pixi');expect(await page.locator('#game-overlay').isVisible()).toBe(false);
 await page.screenshot({path:`QA/v${version}-ellipse-height-${browserName}-1194.png`,scale:'css'});writeFileSync(`QA/v${version}-ellipse-height-${browserName}.json`,JSON.stringify(report,null,2));
});
test('after the lowest Meteor round hits an obstacle, the camera immediately targets the next airborne round',async({page})=>{
 await boot(page,true,'factory','multi','bowl');
 const report=await page.evaluate(()=>{
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder.detach();
  const update=g.update.bind(g);g.update=()=>{};g.phase='flying';g.observation={kind:'ground',target:null,point:null};
  g.land.mask.fill(0);g.land.protectedMask.fill(0);
  for(let x=1630;x<=1790;x++)g.land.column(x,620,642,true);
  for(let x=760;x<=1080;x++)g.land.column(x,250,270,true);g.land.rebuild();
  for(const t of g.tanks){t.x=820+t.id*80;t.y=232;t.fallVelocity=0;}
  const p=(v:any)=>Object.assign(g.launch(g.active,'multi-normal'),v);
  const low=p({x:1710,y:604,vx:0,vy:720,delay:0}),next=p({x:300,y:-150,vx:50,vy:30,delay:0}),high=p({x:1200,y:-270,vx:-45,vy:20,delay:0});
  g.projectiles=[low,high,next];
  const original=r.camera.update.bind(r.camera);r.camera.update=(dt:number,target:{x:number;y:number})=>{r.qaTarget=target;original(dt,target);};
  const frame=(dt=0)=>{r.draw(dt);return {autoX:r.qaTarget.x+r.viewWidth/2,autoY:r.qaTarget.y+r.viewHeight/2,x:r.offsetX,y:r.offsetY};};
  r.follow();r.camera.center(low.x,low.y,false);r.camera.follow();const before=frame();
  update(.045);const alive=g.projectiles.map((shot:any)=>shot===next?'next':shot===high?'high':'low'),impact=g.observation.point;
  const after=frame(.016),expected={x:next.x,y:next.y};
  r.camera.center(1200,300,false);const manual=frame(.2);r.camera.follow();const recovered=frame(.2);
  r.camera.update=original;
  return {before,after,expected,alive,impact,manual,recovered};
 });
 expect(report.before.autoX).toBe(1710);expect(report.before.autoY).toBe(604);
 expect(report.alive).toEqual(['high','next']);expect(report.impact.x).toBeCloseTo(1710,0);
 expect(report.after.autoX).toBeCloseTo(report.expected.x,6);expect(report.after.autoY).toBeCloseTo(report.expected.y,6);
 expect(report.after.x).toBeLessThan(report.before.x);expect(report.manual.x).toBeGreaterThan(report.recovered.x);
});
