import {test,expect} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
test('production PWA keeps real battlefield zoom usable offline without changing aim or canvas pixels',async({page,context,browserName})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-choice="cannon"]').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('input[name="map"][value="factory"]').locator('..').click();await page.getByRole('button',{name:'开始对局',exact:true}).click();
 await page.locator('#fire-button:enabled').waitFor({timeout:15000});await expect.poll(()=>page.locator('#battlefield').getAttribute('data-render-backend')).toBe('pixi');
 const read=()=>page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#battlefield')!;return {ratio:c.getContext('2d')!.getTransform().a,pixels:[c.width,c.height],angle:document.querySelector('#relative-angle')!.textContent,power:document.querySelector('#power-value')!.textContent,version:document.querySelector('#stage-version-button')!.textContent,production:!('__qa' in window),viewport:[innerWidth,innerHeight]};});
 const before=await read(),box=(await page.locator('#battlefield').boundingBox())!;await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);if(browserName==='webkit')await page.locator('#battlefield').dispatchEvent('wheel',{deltaY:-100,clientX:box.x+box.width*.5,clientY:box.y+box.height*.5});else await page.mouse.wheel(0,-100);await expect.poll(async()=>(await read()).ratio).toBeGreaterThan(before.ratio);const after=await read();
 expect(after.pixels).toEqual(before.pixels);expect(after.viewport).toEqual(before.viewport);expect(after.angle).toBe(before.angle);expect(after.power).toBe(before.power);expect(after.production).toBe(true);expect(after.version).toBe('v'+version);
 await page.locator('#minimap-follow').click();expect((await read()).ratio).toBe(after.ratio);expect(errors).toEqual([]);
 writeFileSync(`QA/v${version}-production-zoom-${browserName}.json`,JSON.stringify({offline:true,before,after,followPreservesZoom:true,errors},null,2));
});
