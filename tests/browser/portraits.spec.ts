import {test,expect} from '@playwright/test';

test('provided PNG portraits and Mom name stay consistent across iPad setup, HUD, portraits and turns',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await page.goto('./');
  await page.evaluate(()=>localStorage.removeItem('piggy-settings'));await page.reload();
  await page.getByRole('button',{name:'进入战场',exact:true}).click();
  for(const [slot,id] of [[0,'mimi'],[1,'dad']] as const){
   const img=page.locator(`[data-slot="${slot}"] img`);
   await expect(img).toHaveAttribute('src',`/piggymiCannon/portraits/${id}.png`);
   await expect(img).toHaveJSProperty('naturalWidth',960);
  }
  await expect(page.locator('[data-slot="3"] .crew-name')).toHaveText('小黄鱼妈妈');
  for(let i=0;i<4;i++){
   if(i>=2)await page.locator(`[data-enable="${i}"]`).click();
   await page.locator(`[data-controller="${i}"]`).selectOption('human');
   await page.locator(`[data-owner="${i}"]`).click();await page.locator('[data-choice="cannon"]').click();
  }
  await page.locator('#turn-timer').selectOption('0');
  expect(await page.locator('.slot-name strong').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
  expect(await page.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await page.screenshot({path:`QA/v2.2.6-portraits-setup-${width}.png`});
  await page.getByRole('button',{name:'开始对局',exact:true}).click();
  await expect(page.locator('[data-slot-id="3"] .player-name .crew-name')).toHaveText('小黄鱼妈妈');
  for(const [slot,id] of [[0,'mimi'],[1,'dad']] as const){
   const img=page.locator(`[data-slot-id="${slot}"] .avatar img`);
   await expect(img).toHaveAttribute('src',`/piggymiCannon/portraits/${id}.png`);
   await expect(img).toHaveJSProperty('naturalWidth',960);
   await page.locator(`[data-slot-id="${slot}"] .portrait-button`).click();
   await expect(page.locator('#portrait-art img')).toHaveAttribute('src',`/piggymiCannon/portraits/${id}.png`);
   await expect(page.locator('#portrait-art img')).toHaveJSProperty('naturalWidth',960);
   if(slot===1&&width===1194)await page.screenshot({path:'QA/v2.2.6-dad-portrait-1194.png'});
   await page.locator('[data-action="close"]').click();
  }
  await page.locator('[data-slot-id="3"] .portrait-button').click();
  await expect(page.locator('.portrait-view h2')).toHaveText('小黄鱼妈妈');
  await expect(page.locator('#portrait-saying')).toContainText('小黄鱼妈妈');
  await expect(page.locator('#portrait-art img')).toHaveAttribute('src','/piggymiCannon/portraits/fish.png');
  await page.locator('[data-action="close"]').click();
  for(let i=0;i<3;i++)await page.locator('#skip-button').click();
  await expect(page.locator('#turn-text .crew-name')).toHaveText('小黄鱼妈妈');
  expect(await page.locator('.player-name .crew-name').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().right<=e.parentElement!.getBoundingClientRect().right+1))).toBe(true);
  await page.screenshot({path:`QA/v2.2.6-portraits-combat-${width}.png`});
 }
 expect(errors).toEqual([]);
});
