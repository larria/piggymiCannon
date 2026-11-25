import {holdSkip} from './hold-skip';
import {test,expect} from '@playwright/test';import {boot} from './qa-app';
test('consumed items remain empty in the next action and full-slot boxes stay on the ground',async({page})=>{
 await boot(page);await page.locator('#quick-items [data-item="double"]').click();await holdSkip(page);await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
 for(let i=0;i<5;i++){await holdSkip(page);await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});const human=(await page.locator('#turn-text').textContent())!.includes('咪猪头');if(human)break;}
 await expect(page.locator('#quick-items [data-item="double"] small')).toHaveText('0');await expect(page.locator('#quick-items [data-item="double"]')).toBeDisabled();
 await page.evaluate(()=>{const g=(window as any).__qa.game,t=g.active;t.hp=Math.floor(t.maxHP*.6);g.crates=[{x:t.x+28,y:t.y+4,type:'medical'}];});
 await page.waitForTimeout(150);const full=await page.evaluate(()=>{const g=(window as any).__qa.game;return {hp:g.active.hp,stock:g.active.items.repair,boxes:g.crates.length};});
 expect(full.stock).toBe(1);expect(full.boxes).toBe(1);
 await page.screenshot({path:'QA/slots-regression-depleted-items-and-full-slot-ipad.png'});
 await page.evaluate(()=>(window as any).__qa.game.active.items.repair=0);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.crates.length)).toBe(0);
 expect(await page.evaluate(()=>(window as any).__qa.game.active.hp)).toBe(full.hp);await expect(page.locator('#quick-items [data-item="repair"] small')).toHaveText('1');
});
test('results avoid a celebrating winner in the middle of a randomized battlefield',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.active.x=640;g.active.y=g.ground(640)-18;g.enemy.x=1000;g.enemy.y=g.ground(1000)-18;g.damage(g.enemy,9999,0);});
 await expect(page.locator('.result')).toBeVisible({timeout:5000});const card=await page.locator('.result').boundingBox();
 const actor=await page.evaluate(()=>{const q=(window as any).__qa,t=q.game.tanks[0],field=document.querySelector('#battlefield')!.getBoundingClientRect(),sx=field.width/1280,sy=field.height/q.renderer.viewHeight;return {x:field.x+(t.x-40)*sx,y:field.y+(t.y-85-q.renderer.offsetY)*sy,width:80*sx,height:110*sy};});
 const area=Math.max(0,Math.min(card!.x+card!.width,actor.x+actor.width)-Math.max(card!.x,actor.x))*Math.max(0,Math.min(card!.y+card!.height,actor.y+actor.height)-Math.max(card!.y,actor.y));expect(area).toBe(0);
 await page.screenshot({path:'QA/slots-regression-results-avoid-central-winner-ipad.png'});
});
test('power reference clears on results and in a fresh match, including the same selected vehicles',async({page})=>{
 await boot(page);await expect(page.locator('#previous-power')).toBeHidden();await page.evaluate(()=>{const g=(window as any).__qa.game;g.fire();});await expect(page.locator('#previous-power')).toBeVisible();
 await page.evaluate(()=>{const g=(window as any).__qa.game;g.damage(g.enemy,9999,0);g.nextTurn();});await expect(page.locator('#previous-power')).toBeHidden();
 await expect(page.locator('.result')).toBeVisible({timeout:5000});await page.locator('[data-action="rematch"]').click();await expect(page.locator('#previous-power')).toBeHidden();
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks.every((t:any)=>t.lastPower===null))).toBe(true);
});
test('a quantized 55-degree thin platform is traversable and the tank follows its actual slope',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=false;g.land.mask.fill(0);g.land.protectedMask.fill(0);
  for(let x=0;x<=1280;x++){const top=480-(x-200)*Math.tan(55*Math.PI/180);g.land.column(x,top,top+20);}for(let x=900;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.active.x=200;g.active.y=g.ground(200)-18;g.enemy.x=1100;g.enemy.y=432;
 });
 const right=await page.locator('#move-right').boundingBox();await page.mouse.move(right!.x+right!.width/2,right!.y+right!.height/2);await page.mouse.down();await page.waitForTimeout(800);await page.mouse.up();
 const moved=await page.evaluate(()=>{const g=(window as any).__qa.game;return {x:g.active.x,angle:Math.abs(g.tankSlope(g.active))*180/Math.PI,fall:g.active.fallVelocity};});
 expect(moved.x).toBeGreaterThan(240);expect(moved.angle).toBeGreaterThan(53);expect(moved.angle).toBeLessThan(57);expect(moved.fall).toBe(0);
 await page.screenshot({path:'QA/slots-regression-climbing-55-degree-platform-ipad.png'});
});
test('direct satellite strike excavates a wide shallow crater and all multi volleys visibly fan out',async({page})=>{
 await boot(page,true,'coast','ion','cannon');await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=false;g.fireLine=null;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.active.x=175;g.active.y=432;g.enemy.x=1000;g.enemy.y=432;
  g.selectWeapon('ion-special');g.fire();Object.assign(g.projectiles[0],{x:g.enemy.x,y:g.enemy.y-34,vx:0,vy:680,sub:true,age:.5});
 });
 await expect(page.locator('#hp-1')).not.toHaveText('920 / 920');await page.waitForTimeout(250);await page.screenshot({path:'QA/slots-regression-satellite-direct-crater-ipad.png'});
 for(const vehicle of ['multi','dragon']){await page.evaluate(v=>{const q=(window as any).__qa;q.newMatch({...q.game.config,seats:undefined,vehicle0:v,vehicle1:'cannon'},true);const g=(window as any).__qa.game;g.fog=false;g.fireLine=null;g.wind=0;
  g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.active.x=175;g.active.y=432;g.enemy.x=1105;g.enemy.y=432;g.selectWeapon(`${v}-special`);g.active.angle=45;g.active.power=45;g.fire();},vehicle);
  await page.waitForTimeout(450);expect(await page.evaluate(()=>(window as any).__qa.game.projectiles.length)).toBe(9);
  await expect(page.locator('#power-value')).toHaveText('45');await page.screenshot({path:`QA/slots-regression-${vehicle}-spread-volley-ipad.png`});}
});
test('both cannon ammunition types are round in actual flight and have no trail',async({page})=>{
 await boot(page,true,'coast','cannon','cannon');
 for(const slot of ['normal','special']){
  await page.evaluate(slot=>{const q=(window as any).__qa;q.newMatch({...q.game.config},true);const g=(window as any).__qa.game;
   g.fog=false;g.fireLine=null;g.wind=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.active.x=175;g.active.y=432;g.enemy.x=1105;g.enemy.y=432;g.selectWeapon(`cannon-${slot}`);g.setAim(45,60);g.fire();
  },slot);
  await page.waitForTimeout(350);expect(await page.evaluate(()=>(window as any).__qa.game.projectiles[0].trail.length)).toBe(0);
  await page.screenshot({path:`QA/slots-regression-cannon-${slot}-round-no-trail-ipad.png`});
 }
});
