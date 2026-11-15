import {test,expect} from '@playwright/test';import {boot} from './qa-app';
for(const width of [1194,1210])for(const map of ['factory','temple'])test(`${width} iPad: ${map} permanent surfaces change real body/aim angles by movement`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 const before=await page.evaluate((map:string)=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,map,timer:0,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:'cannon',team:i%2}))},true);
  const g=(window as any).__qa.game;g.wind=0;g.tanks.forEach((t:any,i:number)=>{t.x=(map==='factory'?[64,300,820,1120]:[318,930,95,1185])[i];t.y=g.support(t.x,map==='factory'?520:500)-18;t.fallVelocity=0;t.direction=i%2?-1:1;});g.setAim(35,50);(window as any).__qa.updateUI();return {x:g.active.x,slope:g.tankSlope(g.active)*180/Math.PI,absolute:g.aim(g.active).absolute};
 },map);
 const button=await page.locator('#move-right').boundingBox();await page.mouse.move(button!.x+button!.width/2,button!.y+button!.height/2);await page.mouse.down();
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.active.x)).toBeGreaterThan(map==='factory'?124:348);await page.mouse.up();await page.waitForTimeout(200);
 const after=await page.evaluate(()=>{const g=(window as any).__qa.game,t=g.active;return {x:t.x,y:t.y,slope:g.tankSlope(t)*180/Math.PI,absolute:g.aim(t).absolute,relative:t.angle,min:g.aim(t,t.minAngle).absolute,max:g.aim(t,t.maxAngle).absolute,fuel:t.fuel,fall:t.fallVelocity,hp:t.hp,maxHP:t.maxHP};});
 expect(after.x).toBeGreaterThan(before.x);expect(Math.abs(after.slope-before.slope)).toBeGreaterThan(15);expect(after.fuel).toBeLessThan(100);expect(after.fall).toBe(0);expect(after.hp).toBe(after.maxHP);expect(after.absolute).toBeCloseTo(after.relative-after.slope,8);
 await expect(page.locator('#relative-angle')).toHaveText('35°');await expect(page.locator('#absolute-angle')).toHaveText(`${Math.round(after.absolute)}°`);await expect(page.locator('#angle-limits')).toContainText(`水平 ${Math.round(after.min)}–${Math.round(after.max)}°`);
 await expect(page.locator('[data-hud]')).toHaveCount(4);await expect(page.locator('#game-overlay')).toBeHidden();const field=await page.locator('#battlefield').boundingBox();expect(field!.height).toBeGreaterThan(600);
 await page.screenshot({path:`QA/v2.2.5-floor-${browserName==='webkit'?'webkit-':''}${map}-${width}.png`});expect(errors).toEqual([]);
});
test('revised classic previews and facts remain readable inside the compact setup',async({page,browserName})=>{
 await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('.map-notes summary').click();
 await page.locator('input[name="map"][value="factory"]').locator('..').click();await expect(page.locator('#map-choice-note')).toContainText('连续斜面');await expect(page.locator('#map-choice-note')).toContainText('本作重绘');
 await page.locator('input[name="map"][value="temple"]').locator('..').click();await expect(page.locator('#map-choice-note')).toContainText('蘑菇');await expect(page.locator('#map-choice-note')).toContainText('4像素');await expect(page.locator('canvas[data-map-preview]')).toHaveCount(6);
 await expect.poll(async()=>{const bottom=await page.locator('#deploy-slots').boundingBox();return bottom!.y+bottom!.height;}).toBeLessThanOrEqual(814);
 await page.screenshot({path:`QA/v2.2.5-setup-${browserName==='webkit'?'webkit-':''}mapnotes-1194.png`});
});
