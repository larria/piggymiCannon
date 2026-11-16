import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {writeFileSync} from 'node:fs';
for(const width of [390,530,1194,1210,1440])test(`home layout has no text/character overlap at ${width}`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});await boot(page,false);await expect(page.locator('body')).toHaveClass(/lobby-mode/);
 const data=await page.evaluate(()=>{const intro=document.querySelector('#lobby-overlay')!.getBoundingClientRect(),map=document.querySelector('#battlefield')!.getBoundingClientRect();return {intro:{top:intro.top,bottom:intro.bottom,left:intro.left,right:intro.right},map:{top:map.top,bottom:map.bottom},overflow:document.documentElement.scrollWidth>innerWidth+1,parent:document.querySelector('#lobby-overlay')!.parentElement!.className};});
 expect(data.intro.bottom).toBeLessThanOrEqual(data.map.top);expect(data.overflow).toBe(false);expect(data.parent).toContain('main-shell');
 await page.screenshot({path:`QA/v3.2.0-home-${width}-${browserName}.png`});await page.getByRole('button',{name:'进入战场',exact:true}).click();await expect(page.locator('#turn-timer')).toHaveValue('0');await page.screenshot({path:`QA/v3.2.0-home-setup-${width}-${browserName}.png`});
});
test('opening tour freezes a chosen timer, shows all players and returns to the actor',async({page,browserName})=>{
 await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-enable="2"]').click();await page.locator('[data-enable="3"]').click();await page.locator('#turn-timer').selectOption('45');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const states=[];for(let i=0;i<42;i++){states.push(await page.evaluate(()=>{const q=(window as any).__qa;return {tour:q.renderer.touring,player:q.renderer.tourPlayer,clock:q.game.clock,elapsed:q.game.elapsed,shots:q.game.active.shots,paused:q.game.paused,blocked:q.game.introLocked,overlayHidden:document.querySelector('#game-overlay')?.classList.contains('hidden')};}));await page.waitForTimeout(100);}
 expect(new Set(states.filter(s=>s.tour).map(s=>s.player)).size).toBe(4);expect(states.filter(s=>s.tour).every(s=>s.clock===45&&s.elapsed===0&&s.shots===0&&!s.paused&&s.blocked&&s.overlayHidden)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.touring)).toBe(false);await expect(page.locator('#fire-button')).toBeEnabled();
 const camera=await page.evaluate(()=>{const q=(window as any).__qa;return {zoom:q.renderer.zoom,width:q.renderer.viewWidth,x:q.renderer.offsetX,actor:q.game.active.x};});expect(camera.zoom).toBe(1);expect(camera.width).toBeCloseTo(1280);
 writeFileSync(`QA/v3.2.0-tour-${browserName}.json`,JSON.stringify({states,camera},null,2));
});
test('drag pans without aiming, minimap relocates, avatar taps focus and holds enlarge',async({page,browserName})=>{
 await boot(page);const initial=await page.evaluate(()=>{const q=(window as any).__qa;return {angle:q.game.active.angle,x:q.renderer.offsetX,y:q.renderer.offsetY};});const map=await page.locator('#battlefield').boundingBox();
 await page.mouse.move(map!.x+map!.width*.7,map!.y+map!.height*.75);await page.mouse.down();await page.mouse.move(map!.x+map!.width*.45,map!.y+map!.height*.5,{steps:12});await page.mouse.up();
 const dragged=await page.evaluate(()=>{const q=(window as any).__qa;return {angle:q.game.active.angle,x:q.renderer.offsetX,y:q.renderer.offsetY};});expect(dragged.angle).toBe(initial.angle);expect(Math.abs(dragged.x-initial.x)+Math.abs(dragged.y-initial.y)).toBeGreaterThan(20);
 const mini=await page.locator('#minimap').boundingBox();await page.mouse.click(mini!.x+mini!.width*.8,mini!.y+mini!.height*.65);await page.waitForTimeout(350);
 const before=await page.evaluate(()=>(window as any).__qa.renderer.offsetX);await page.locator('[data-portrait="0"]').click();await page.waitForTimeout(350);expect(await page.evaluate(()=>(window as any).__qa.renderer.offsetX)).not.toBe(before);await expect(page.locator('.portrait-view')).toHaveCount(0);
 const avatar=await page.locator('[data-portrait="1"]').boundingBox();await page.mouse.move(avatar!.x+avatar!.width/2,avatar!.y+avatar!.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();await expect(page.locator('.portrait-view h2')).toContainText('大猪头');
 await page.screenshot({path:`QA/v3.2.0-portrait-hold-${browserName}.png`});
});
test('backpack icons center and scrollbar theme is shared by all scrolling surfaces',async({page})=>{
 await boot(page);const data=await page.locator('#inventory-toggle').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('svg')!.getBoundingClientRect();return {dx:(s.left+s.right-r.left-r.right)/2,dy:(s.top+s.bottom-r.top-r.bottom)/2,display:getComputedStyle(e).display};});expect(Math.abs(data.dx)).toBeLessThan(1);expect(Math.abs(data.dy)).toBeLessThan(1);expect(data.display).toBe('grid');
 await page.locator('.battle-stage [data-dialog="settings"]').click();const colors=await page.evaluate(()=>[document.documentElement,document.querySelector('#dialog')!,document.querySelector('.arsenal')!].map(e=>getComputedStyle(e).getPropertyValue('scrollbar-color')));expect(colors.every(c=>c===colors[0])).toBe(true);expect(colors[0]).not.toBe('auto');
});

test('F5 can skip the opening tour while the engine clock is paused',async({page})=>{
 await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.getByRole('button',{name:'开始对局',exact:true}).click();expect(await page.evaluate(()=>(window as any).__qa.renderer.touring)).toBe(true);await page.keyboard.press('F5');await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.touring)).toBe(false);await expect(page.locator('#fire-button')).toBeEnabled();
});
