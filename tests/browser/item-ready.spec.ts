import {test,expect} from '@playwright/test';
import {boot} from './qa-app';

test('quick-item seals survive fit and reduced motion, then clear when cancelled or fired',async({page})=>{
 await boot(page);
 const items=page.locator('#quick-items'),repair=items.locator('[data-item="repair"]');
 const original=await repair.boundingBox();
 await repair.click();
 await expect(repair).toHaveAttribute('aria-pressed','true');
 await expect(repair.locator('.item-ready-seal')).toBeVisible();
 expect(await repair.evaluate(e=>getComputedStyle(e,'::after').animationName)).toBe('item-ready-ink');
 const armed=await repair.boundingBox();
 expect([armed?.width,armed?.height]).toEqual([original?.width,original?.height]);
 await items.locator('[data-item="double"]').click();
 await expect(items.getByRole('button',{name:/双发待发/}).locator('.item-ready-seal')).toBeVisible();
 if(process.env.PIGGY_CAPTURE_ITEMS)await page.screenshot({path:'/tmp/piggy601-items-ipad.png'});
 for(const [width,height] of [[1512,982],[844,390],[390,844],[320,568]]){
  await page.setViewportSize({width,height});
  const box=await items.boundingBox(),seal=await repair.locator('.item-ready-seal').boundingBox(),slot=await repair.boundingBox();
  expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
  expect(seal!.x+seal!.width).toBeLessThanOrEqual(slot!.x+slot!.width);
  expect(seal!.y).toBeGreaterThan(slot!.y);
  if(process.env.PIGGY_CAPTURE_ITEMS&&width===844)await page.screenshot({path:'/tmp/piggy601-items-phone.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await repair.evaluate(e=>getComputedStyle(e,'::after').animationName)).toBe('none');
 await expect(repair.locator('.item-ready-seal')).toBeVisible();
 await repair.click();
 await expect(repair.locator('.item-ready-seal')).toHaveCount(0);
 await page.locator('#fire-button').click();
 await expect(items.locator('.item-ready-seal')).toHaveCount(0);
});
