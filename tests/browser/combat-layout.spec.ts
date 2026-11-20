import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
import {readFileSync,writeFileSync} from 'node:fs';
import {portraitViewWidth,PORTRAIT_TANK_ENVELOPE_WIDTH,PORTRAIT_VIEW_DIVISOR} from '../../src/portrait-viewport';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
const reportPrefix=process.env.PIGGY_LAYOUT_REPORT??`QA/v${version}-layout`;
async function inspect(page:any,label:string){
 await boot(page);await page.evaluate(()=>{const before=(window as any).__qa;before.newMatch({...before.game.config,slots:before.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:['cannon','sea','ion','missile'][i]}))},true);const q=(window as any).__qa;q.game.update=()=>{};q.renderer.focusAt(q.game.active.x,q.game.active.y);q.updateUI();});await page.waitForTimeout(400);
 const data=await page.evaluate(()=>{
  const box=(selector:string)=>{const e=document.querySelector(selector)!;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
  const chrome=getComputedStyle(document.querySelector('.combat-column')!);
  return {viewport:{w:innerWidth,h:innerHeight},column:box('.combat-column'),stage:box('#battlefield'),deck:box('.dashboard'),header:box('.scoreboard'),radius:chrome.borderRadius,border:chrome.borderWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,
   viewWidth:(window as any).__qa.renderer.viewWidth,viewHeight:(window as any).__qa.renderer.viewHeight,buttons:Object.fromEntries(['move-left','move-right','skip-button','exit-match','fire-button','face-button','aim-pad','power-meter','angle-up','angle-down'].map(id=>[id,box('#'+id)])),weaponIcons:[...document.querySelectorAll('#weapon-normal .switch-icon,#weapon-special .switch-icon')].map(e=>e.getBoundingClientRect().width),quickItems:[...document.querySelectorAll('.quick-items button')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,w:r.width,h:r.height};}),portraits:[...document.querySelectorAll('.player-hud')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1};})};
 });
 expect(data.radius).toBe('0px');expect(data.border).toBe('0px');expect(data.column.x).toBe(0);expect(data.column.y).toBe(0);expect(data.column.w).toBe(data.viewport.w);expect(data.column.bottom).toBe(data.viewport.h);expect(data.overflow).toBe(false);expect(data.stage.bottom).toBeLessThanOrEqual(data.deck.y+1);expect(data.stage.h).toBeGreaterThan(label.includes('tiny-landscape')?180:label.includes('landscape')?200:260);
 const landscape=label.includes('landscape');
 const tiny=label.includes('tiny-landscape');
 for(const [id,b] of Object.entries(data.buttons) as [string,any][]){
  let minimumWidth=44,minimumHeight=44;
  if(id==='power-meter'){minimumWidth=90;minimumHeight=landscape?20:32;}
  else if(landscape){minimumWidth=tiny?28:34;minimumHeight=36;if(id==='aim-pad')minimumWidth=minimumHeight=tiny?74:80;if(id==='face-button'){minimumWidth=tiny?26:34;minimumHeight=26;}}
  expect(b.w,id).toBeGreaterThanOrEqual(minimumWidth);expect(b.h,id).toBeGreaterThanOrEqual(minimumHeight);expect(b.x,id).toBeGreaterThanOrEqual(0);expect(b.right,id).toBeLessThanOrEqual(data.viewport.w);expect(b.bottom,id).toBeLessThanOrEqual(data.viewport.h);
 }
 const {buttons}=data;
 expect(buttons['aim-pad'].w).toBe(buttons['aim-pad'].h);
 expect(buttons['angle-up'].x).toBeGreaterThanOrEqual(buttons['aim-pad'].right);
 expect(buttons['angle-down'].y).toBeGreaterThanOrEqual(buttons['angle-up'].bottom);
 const overlaps=(a:any,b:any)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
 for(const id of ['aim-pad','face-button','angle-up','angle-down'])for(const other of Object.keys(buttons))if(id!==other)expect(overlaps(buttons[id],buttons[other]),`${id} overlaps ${other}`).toBe(false);
 expect(data.weaponIcons.length).toBe(2);expect(data.weaponIcons.every((w:number)=>w>=20)).toBe(true);if(label.startsWith('phone'))expect(data.viewHeight/data.viewWidth).toBeCloseTo(data.stage.h/data.stage.w,5);
 if(label.startsWith('phone')){if(label.includes('portrait')){expect(data.viewWidth).toBeCloseTo(portraitViewWidth(version),5);expect(PORTRAIT_TANK_ENVELOPE_WIDTH/data.viewWidth).toBeCloseTo(1/PORTRAIT_VIEW_DIVISOR,5);}else {expect(data.viewHeight).toBeCloseTo(630,5);expect(90/data.viewHeight).toBeCloseTo(1/7,4);}}
 if(landscape){
  expect(data.deck.h).toBeLessThanOrEqual(90);
  const instruments=await page.evaluate(()=>{
   const rect=(selector:string)=>{const e=document.querySelector(selector)!;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,border:getComputedStyle(e).borderWidth};};
   return {dial:rect('#aim-pad'),relative:rect('.angle-readout.relative'),absolute:rect('.angle-readout.absolute'),meters:['.energy-meter','.force-meter','.mobility-meter'].map(rect),tracks:['.energy-meter .meter-track','.force-meter .meter-track','.mobility-meter .meter-track'].map(rect),values:['#energy-value','#power-value','#fuel-value'].map(rect)};
  });
  expect(instruments.dial.x).toBeLessThanOrEqual(6);expect(instruments.relative.h).toBeGreaterThan(20);expect(instruments.absolute.h).toBeGreaterThan(20);
  for(const value of instruments.values){expect(value.w).toBeGreaterThan(0);expect(value.h).toBeGreaterThan(0);}
  for(const track of instruments.tracks){expect(track.w).toBeGreaterThan(tiny?data.viewport.w*.59:350);expect(track.h).toBeGreaterThanOrEqual(8);expect(track.border).toBe('0px');}
  expect(instruments.meters[0].bottom).toBeLessThanOrEqual(instruments.meters[1].y);expect(instruments.meters[1].bottom).toBeLessThanOrEqual(instruments.meters[2].y);
  expect(instruments.meters[2].bottom-instruments.meters[0].y).toBeLessThanOrEqual(44);
  await expect(page.locator('#relative-angle')).toBeVisible();await expect(page.locator('#absolute-angle')).toBeVisible();
 }
 expect(data.portraits.length).toBe(4);expect(data.portraits.every((p:any)=>!p.overflow)).toBe(true);
 expect(data.quickItems.length).toBe(4);for(const item of data.quickItems){expect(item.w).toBeGreaterThanOrEqual(landscape?tiny?28:34:44);expect(item.h).toBeGreaterThanOrEqual(landscape?36:44);expect(item.right).toBeLessThanOrEqual(data.viewport.w);}expect(new Set(data.quickItems.map((b:any)=>b.y)).size).toBe(1);
 for(const id of ['angle-up','angle-down','move-left','move-right','skip-button','exit-match','fire-button'])await expect(page.locator('#'+id)).toBeInViewport();
 await page.locator('#angle-up').click();await page.locator('#angle-down').click();await page.locator('#face-button').click();await page.locator('#minimap-follow').click();await page.locator('#inventory-toggle').click();await expect(page.locator('.arsenal')).toBeVisible();expect((await page.locator('.arsenal').boundingBox())!.y).toBeGreaterThanOrEqual(0);await page.locator('#arsenal-close').click();
 await page.locator('.battle-stage [data-dialog="settings"]').click();await expect(page.locator('#dialog')).toBeVisible();await page.locator('#close-dialog').click();
 writeFileSync(`${reportPrefix}-${label}.json`,JSON.stringify(data,null,2)+'\n');
 if(process.env.PIGGY_LAYOUT_CAPTURE===label||process.env.PIGGY_LAYOUT_CAPTURE==='all')await page.screenshot({path:`${reportPrefix}-${label}.png`,scale:'css'});
}
test.describe('desktop',()=>{test.use({viewport:{width:1512,height:982},isMobile:false,hasTouch:false});test('desktop fills window without changing controls',async({page})=>inspect(page,'desktop'));});
test.describe('ipad',()=>{test.use({viewport:{width:1194,height:834},isMobile:true,hasTouch:true});test('ipad fills window and preserves touch controls',async({page})=>inspect(page,'ipad'));});
test.describe('phone portrait',()=>{test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});test('phone-portrait reflows seats and keeps all actions accessible',async({page})=>inspect(page,'phone-portrait'));});
test.describe('phone landscape',()=>{test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});test('phone-landscape keeps controls above safe bottom edge',async({page})=>inspect(page,'phone-landscape'));});
test.describe('small phone landscape',()=>{test.use({viewport:{width:667,height:375},isMobile:true,hasTouch:true});test('phone-small-landscape keeps compact keys, dial and all meters',async({page})=>inspect(page,'phone-small-landscape'));});
test.describe('tiny phone landscape',()=>{test.use({viewport:{width:568,height:320},isMobile:true,hasTouch:true});test('phone-tiny-landscape keeps all instruments without a taller deck',async({page})=>inspect(page,'phone-tiny-landscape'));});
