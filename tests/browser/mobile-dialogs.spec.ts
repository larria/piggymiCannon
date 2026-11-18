import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {readFileSync,writeFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
for(const [label,width,height] of [['portrait',390,844],['landscape',844,390]] as const)test.describe(label,()=>{
 test.use({viewport:{width,height},isMobile:true,hasTouch:true});
 test(`${label} mobile setup, settings, atlases, recordings and results remain scrollable and usable`,async({page})=>{
  const rows:any[]=[];await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();
  const measure=async(kind:string)=>{const d=await page.locator('#dialog').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1,scroll:e.scrollHeight,client:e.clientHeight};});expect(d.x).toBeGreaterThanOrEqual(0);expect(d.y).toBeGreaterThanOrEqual(0);expect(d.right).toBeLessThanOrEqual(width);expect(d.bottom).toBeLessThanOrEqual(height);expect(d.overflow,kind).toBe(false);await page.locator('#dialog').evaluate(e=>e.scrollTop=e.scrollHeight);await expect(page.locator('#dialog .dialog-primary')).toBeInViewport();rows.push({kind,...d});};
  await measure('setup');if(process.env.PIGGY_DIALOG_CAPTURE===`${label}-setup`)await page.screenshot({path:`QA/v${version}-dialog-${label}-setup.png`,scale:'css'});
  await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.evaluate(()=>{const q=(window as any).__qa;q.renderer.finishTour();q.game.update=()=>{};});
  for(const kind of ['settings','guide','stats','projectiles','replays','log']){
   await page.locator('.battle-stage [data-dialog="settings"]').evaluate((e,kind)=>e.setAttribute('data-dialog',kind),kind);await page.locator(`.battle-stage [data-dialog="${kind}"]`).last().click();
   await measure(kind);await page.locator('#close-dialog').click();await page.locator(`.battle-stage [data-dialog="${kind}"]`).last().evaluate(e=>e.setAttribute('data-dialog','settings'));
  }
  await page.evaluate(()=>{const q=(window as any).__qa;q.game.phase='ended';q.game.winner=q.game.tanks[0].team;q.game.resultAge=3;q.updateUI();});
  await expect(page.locator('.result-battle')).toBeVisible();const result=await page.locator('.result-battle').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1};});expect(result.x).toBeGreaterThanOrEqual(0);expect(result.y).toBeGreaterThanOrEqual(0);expect(result.right).toBeLessThanOrEqual(width);expect(result.bottom).toBeLessThanOrEqual(height);expect(result.overflow).toBe(false);await expect(page.locator('.result-footer [data-action="rematch"]')).toBeInViewport();await expect(page.locator('.result-footer [data-action="save-replay"]')).toBeInViewport();rows.push({kind:'result',...result});
  await page.locator('.result-footer [data-action="rematch"]').click({trial:true});await page.locator('.result-footer [data-action="save-replay"]').click({trial:true});
  if(process.env.PIGGY_DIALOG_CAPTURE===`${label}-result`)await page.screenshot({path:`QA/v${version}-dialog-${label}-result.png`,scale:'css'});
  writeFileSync(`QA/v${version}-dialogs-${label}.json`,JSON.stringify(rows,null,2)+'\n');
 });
});
