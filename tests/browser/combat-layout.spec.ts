import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
import {readFileSync,writeFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
async function inspect(page:any,label:string){
 await boot(page);await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:['cannon','sea','ion','missile'][i]}))},true);q.game.update=()=>{};q.renderer.focusAt(q.game.active.x,q.game.active.y);q.updateUI();});await page.waitForTimeout(400);
 const data=await page.evaluate(()=>{
  const box=(selector:string)=>{const e=document.querySelector(selector)!;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
  const chrome=getComputedStyle(document.querySelector('.combat-column')!);
  return {viewport:{w:innerWidth,h:innerHeight},column:box('.combat-column'),stage:box('#battlefield'),deck:box('.dashboard'),header:box('.scoreboard'),radius:chrome.borderRadius,border:chrome.borderWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,
   viewWidth:(window as any).__qa.renderer.viewWidth,viewHeight:(window as any).__qa.renderer.viewHeight,buttons:Object.fromEntries(['move-left','move-right','skip-button','exit-match','fire-button','face-button','aim-pad','power-meter','angle-up','angle-down'].map(id=>[id,box('#'+id)])),weaponIcons:[...document.querySelectorAll('#weapon-normal .switch-icon,#weapon-special .switch-icon')].map(e=>e.getBoundingClientRect().width),quickItems:[...document.querySelectorAll('.quick-items button')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,w:r.width,h:r.height};}),portraits:[...document.querySelectorAll('.player-hud')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1};})};
 });
 expect(data.radius).toBe('0px');expect(data.border).toBe('0px');expect(data.column.x).toBe(0);expect(data.column.y).toBe(0);expect(data.column.w).toBe(data.viewport.w);expect(data.column.bottom).toBe(data.viewport.h);expect(data.overflow).toBe(false);expect(data.stage.bottom).toBeLessThanOrEqual(data.deck.y+1);expect(data.stage.h).toBeGreaterThan(label.includes('landscape')?200:260);
 for(const [id,b] of Object.entries(data.buttons) as [string,any][]){if(label.includes('landscape')&&id==='aim-pad')continue;expect(b.w,id).toBeGreaterThanOrEqual(id==='power-meter'?90:44);expect(b.h,id).toBeGreaterThanOrEqual(id==='power-meter'?32:44);expect(b.x,id).toBeGreaterThanOrEqual(0);expect(b.right,id).toBeLessThanOrEqual(data.viewport.w);expect(b.bottom,id).toBeLessThanOrEqual(data.viewport.h);}
 expect(data.weaponIcons.length).toBe(2);expect(data.weaponIcons.every((w:number)=>w>=20)).toBe(true);if(label.startsWith('phone'))expect(data.viewHeight/data.viewWidth).toBeCloseTo(data.stage.h/data.stage.w,5);
 if(label.startsWith('phone')){if(label.includes('portrait'))expect(134/data.viewWidth).toBeLessThanOrEqual(.1);else if(129/data.viewHeight>.1){expect(data.stage.h).toBeLessThan(320);expect(data.viewWidth).toBe(2688);}}
 expect(data.portraits.length).toBe(4);expect(data.portraits.every((p:any)=>!p.overflow)).toBe(true);
 expect(data.quickItems.length).toBe(4);for(const item of data.quickItems){expect(item.w).toBeGreaterThanOrEqual(44);expect(item.h).toBeGreaterThanOrEqual(44);expect(item.right).toBeLessThanOrEqual(data.viewport.w);}expect(new Set(data.quickItems.map((b:any)=>b.y)).size).toBe(1);
 for(const id of ['angle-up','angle-down','move-left','move-right','skip-button','exit-match','fire-button'])await expect(page.locator('#'+id)).toBeInViewport();
 await page.locator('#angle-up').click();await page.locator('#minimap-follow').click();await page.locator('#inventory-toggle').click();await expect(page.locator('.arsenal')).toBeVisible();expect((await page.locator('.arsenal').boundingBox())!.y).toBeGreaterThanOrEqual(0);await page.locator('#arsenal-close').click();
 await page.locator('.battle-stage [data-dialog="settings"]').click();await expect(page.locator('#dialog')).toBeVisible();await page.locator('#close-dialog').click();
 writeFileSync(`QA/v${version}-layout-${label}.json`,JSON.stringify(data,null,2)+'\n');
 if(process.env.PIGGY_LAYOUT_CAPTURE===label)await page.screenshot({path:`QA/v${version}-layout-${label}.png`,scale:'css'});
}
test.describe('desktop',()=>{test.use({viewport:{width:1440,height:900},isMobile:false,hasTouch:false});test('desktop fills window without changing controls',async({page})=>inspect(page,'desktop'));});
test.describe('ipad',()=>{test.use({viewport:{width:1194,height:834},isMobile:true,hasTouch:true});test('ipad fills window and preserves touch controls',async({page})=>inspect(page,'ipad'));});
test.describe('phone portrait',()=>{test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});test('phone-portrait reflows seats and keeps all actions accessible',async({page})=>inspect(page,'phone-portrait'));});
test.describe('phone landscape',()=>{test.use({viewport:{width:844,height:390},isMobile:true,hasTouch:true});test('phone-landscape keeps controls above safe bottom edge',async({page})=>inspect(page,'phone-landscape'));});
test.describe('small phone landscape',()=>{test.use({viewport:{width:667,height:375},isMobile:true,hasTouch:true});test('phone-small-landscape keeps full-sized keys and weapon icons',async({page})=>inspect(page,'phone-small-landscape'));});
