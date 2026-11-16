import {test,expect} from '@playwright/test';
async function start(page:any){
 await page.addInitScript(()=>{Date.now=()=>43;});await page.goto('./');await page.getByRole('button',{name:'进入战场',exact:true}).click();
 await page.locator('[data-choice="bowl"]').click();await page.locator('[data-owner="1"]').click();await page.locator('[data-choice="bowl"]').click();
 await page.locator('input[name="map"][value="coast"]').locator('..').click();await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();await expect(page.locator('#fire-button')).toBeEnabled({timeout:10000});
}
test('mobile default gestures are cancelled without blocking app events or normal form controls',async({page,browserName})=>{
 await start(page);const meta=await page.locator('meta[name="viewport"]').getAttribute('content');expect(meta).toContain('maximum-scale=1.0');expect(meta).toContain('user-scalable=no');
 const prevented=await page.locator('#battlefield').evaluate(el=>['gesturestart','gesturechange','gestureend','contextmenu','dblclick','selectstart','dragstart'].map(type=>{const event=new Event(type,{bubbles:true,cancelable:true});el.dispatchEvent(event);return event.defaultPrevented;}));
 expect(prevented).toEqual(Array(7).fill(true));
 expect(await page.locator('#battlefield').evaluate(el=>getComputedStyle(el).touchAction)).toBe('none');
 if(browserName==='webkit'){
  const supported=await page.evaluate(()=>CSS.supports('-webkit-touch-callout','none'));
  if(supported)expect(await page.locator('#app').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-touch-callout'))).toBe('none');
  else expect(await page.evaluate(async()=>{const css=document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!;return(await(await fetch(css.href)).text()).includes('-webkit-touch-callout:none');})).toBe(true);
 }
 await page.locator('#pause-button').click();await page.getByRole('button',{name:'声音设置',exact:true}).click();
 await page.locator('#music-toggle').click();await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','false');
 await page.screenshot({path:`QA/slots-mobile-${browserName}-mobile-settings-1194x834.png`});
});
test('holding force to maximum auto-fires before release and release does not fire again',async({page,browserName})=>{
 await start(page);const bar=await page.locator('#power-meter').boundingBox();await page.mouse.move(bar!.x+100,bar!.y+bar!.height/2);await page.mouse.down();
 await page.waitForTimeout(2700);await expect(page.locator('#fire-button')).toBeDisabled();await expect(page.locator('#fire-title')).not.toHaveText('蓄力中');
 await page.screenshot({path:`QA/slots-mobile-${browserName}-auto-full-power-1194x834.png`});
 await page.mouse.up();await page.locator('#log-button').click();const log=await page.locator('.battle-log').textContent();expect(log!.match(/咪猪头发射了巨石/g)).toHaveLength(1);
});
test('real two-finger aiming and charging survives native pinch suppression',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Native multi-touch dispatch uses CDP; WebKit checks gesture guards and real hold separately.');
 await start(page);const dial=await page.locator('#aim-pad').boundingBox(),bar=await page.locator('#power-meter').boundingBox(),session=await context.newCDPSession(page);
 const power={id:1,x:bar!.x+100,y:bar!.y+bar!.height/2},aim={id:2,x:dial!.x+dial!.width/2+15,y:dial!.y+12};
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[power]});await page.waitForTimeout(400);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[power,aim]});await expect.poll(async()=>Number(await page.locator('#angle-value').textContent())).toBeGreaterThan(50);
 await expect(page.locator('#fire-title')).toHaveText('蓄力中');expect(await page.evaluate(()=>window.visualViewport!.scale)).toBe(1);
 await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#fire-button')).toBeEnabled();
 const a={id:3,x:500,y:350},b={id:4,x:700,y:350};await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:400},{...b,x:800}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.evaluate(()=>window.visualViewport!.scale)).toBe(1);
});
