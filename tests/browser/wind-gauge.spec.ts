import {test,expect} from '@playwright/test';import {boot} from './qa-app';
for(const width of [1194,1210])test(`${width} iPad wind area is text-free, signed and compact beside the minimap`,async({page})=>{
 await page.setViewportSize({width,height:834});await boot(page);await expect(page.locator('.stage-top .wind-chip,#wind-label')).toHaveCount(0);await expect(page.locator('#minimap-panel #wind-gauge')).toHaveCount(1);
 for(const wind of [0,1,-1,9,-9,11,-11]){
  await page.evaluate(wind=>{const q=(window as any).__qa;q.game.wind=wind;q.updateUI();},wind);
  const gauge=page.locator('#wind-gauge');await expect(gauge).toHaveText('');await expect(gauge).toHaveAttribute('aria-valuenow',String(wind));
  const visual=await gauge.evaluate(e=>{const r=e.getBoundingClientRect(),fill=e.querySelector('.wind-area')!.getBoundingClientRect(),center=e.querySelector('.wind-center')!.getBoundingClientRect(),end=e.querySelector<HTMLElement>('.wind-end')!;return {width:r.width,height:r.height,fillWidth:fill.width,fillLeft:fill.left,fillRight:fill.right,center:center.x+center.width/2,markerHidden:end.hidden,hasText:(e.textContent??'').trim().length};});
  expect(visual.height).toBeLessThanOrEqual(10);expect(visual.width).toBeGreaterThan(140);expect(visual.hasText).toBe(0);expect(visual.markerHidden).toBe(wind===0);
  expect(visual.fillWidth).toBeCloseTo((visual.width-2)*Math.abs(wind)/11/2,0);
  if(wind>0){expect(Math.abs(visual.fillLeft-visual.center)).toBeLessThan(1);expect(visual.fillRight).toBeGreaterThan(visual.center);}else if(wind<0){expect(Math.abs(visual.fillRight-visual.center)).toBeLessThan(1);expect(visual.fillLeft).toBeLessThan(visual.center);}else expect(visual.fillWidth).toBe(0);
  if(wind===0||wind===-1||wind===9)await page.screenshot({path:`QA/v2.3.4-wind-${wind===0?'calm':wind<0?'left-light':'right-strong'}-${width}.png`});
 }
 const panel=await page.locator('#minimap-panel').boundingBox(),field=await page.locator('#battlefield').boundingBox();expect(panel!.width).toBeLessThan(180);expect(panel!.height).toBeLessThan(90);expect(panel!.y+panel!.height).toBeLessThan(field!.y+field!.height);
 const before=await page.evaluate(()=>{const q=(window as any).__qa;return {angle:q.game.active.angle,power:q.game.active.power,shots:q.game.active.shots,focus:q.renderer.manualFocus};}),area=await page.locator('#wind-gauge').boundingBox();await page.touchscreen.tap(area!.x+area!.width/2,area!.y+area!.height/2);expect(await page.evaluate(()=>{const q=(window as any).__qa;return {angle:q.game.active.angle,power:q.game.active.power,shots:q.game.active.shots,focus:q.renderer.manualFocus};})).toEqual(before);
 await page.locator('#minimap-toggle').click();await expect(page.locator('#minimap')).toBeHidden();await expect(page.locator('#wind-gauge')).toBeVisible();const folded=await page.locator('#minimap-panel').boundingBox();expect(folded!.height).toBeLessThan(55);expect(folded!.width).toBeLessThan(100);await page.screenshot({path:`QA/v2.3.4-wind-folded-${width}.png`});
 await page.locator('#minimap-follow').click();await page.locator('#minimap-toggle').click();await expect(page.locator('#minimap')).toBeVisible();await page.locator('#minimap').click({position:{x:80,y:20}});await page.locator('#minimap-follow').click();expect(await page.evaluate(()=>(window as any).__qa.renderer.manualFocus)).toBe(null);
});
