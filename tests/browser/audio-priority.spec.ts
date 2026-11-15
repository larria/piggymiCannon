import {test,expect} from '@playwright/test';import {boot} from './qa-app';
for(const width of [1194,1210])test(`${width} iPad selection BGM respects independent switches and preserves paused battle`,async({page})=>{
 await page.setViewportSize({width,height:834});await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio;return !a.selectionMusic.paused&&a.selectionMusic.currentTime>0&&a.music.paused;})).toBe(true);
 await page.screenshot({path:`QA/v2.3.1-selection-music-${width}.png`});
 await page.locator('[data-setup-setting="soundEnabled"]').click();expect(await page.evaluate(()=>(window as any).__qa.audio.selectionMusic.paused)).toBe(false);
 await page.locator('[data-setup-setting="musicEnabled"]').click();expect(await page.evaluate(()=>(window as any).__qa.audio.selectionMusic.paused)).toBe(true);
 await page.locator('[data-setup-setting="musicEnabled"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.selectionMusic.paused)).toBe(false);
 await page.locator('[data-setup-setting="soundEnabled"]').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__qa.audio;return a.selectionMusic.paused&&!a.music.paused;})).toBe(true);
 await page.locator('#pause-button').click();const round=await page.locator('#round-text').textContent();
 await page.getByRole('button',{name:'重新部署',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.selectionMusic.paused)).toBe(false);
 expect(await page.evaluate(()=>(window as any).__qa.game.paused)).toBe(true);expect(await page.evaluate(()=>(window as any).__qa.audio.context.state)).toBe('suspended');
 await page.locator('#close-dialog').click();expect(await page.evaluate(()=>(window as any).__qa.game.paused)).toBe(true);expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);await expect(page.locator('#round-text')).toHaveText(round!);
});

test('mid-match defeat uses the decoded death sample once without delaying play',async({page})=>{
 await boot(page);await page.evaluate(async()=>{const q=(window as any).__qa,slots=q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i%2,vehicle:'cannon'}));q.newMatch({...q.game.config,slots,fog:false,fireLine:false},true);await (window as any).__qa.audio.preloadForMatch(['cannon']);});
 const duration=await page.evaluate(()=>{const q=(window as any).__qa,a=q.audio,buffer=a.buffers.get('sfx-death.mp3'),start=AudioBufferSourceNode.prototype.start;(window as any).deathSounds=0;AudioBufferSourceNode.prototype.start=function(...args:any[]){if(this.buffer===buffer)(window as any).deathSounds++;return (start as any).apply(this,args);};q.game.damage(q.game.tanks[1],99999,0);return buffer.duration;});expect(duration).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).deathSounds)).toBe(1);await page.waitForTimeout(450);
 expect(await page.evaluate(()=>(window as any).__qa.game.phase)).toBe('aiming');expect(await page.evaluate(()=>(window as any).deathSounds)).toBe(1);await expect(page.locator('.result')).toHaveCount(0);
 await page.screenshot({path:'QA/v2.3.1-death-audio-1194.png'});
});
