import {test,expect} from '@playwright/test';import {boot} from './qa-app';
async function clipboard(page:any,fail=false){await page.addInitScript((fail:boolean)=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{if(fail)throw new Error('denied');(window as any).__copiedBattle=text;}}}),fail);}
async function copied(page:any){return page.evaluate(()=>JSON.parse((window as any).__copiedBattle.split('```json\n')[1].split('\n```')[0]));}
for(const width of [1194,1210])test(`${width} iPad: discreet settings copy contains one consistent battle snapshot without covering controls`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});await clipboard(page);await boot(page);
 await page.evaluate(()=>{const g=(window as any).__qa.game;g.tanks[1].hp=1;g.explode({...g.launch(g.active,'cannon-normal'),x:g.tanks[1].x,y:g.tanks[1].y},1);});
 await page.locator('.stage-button[data-dialog="settings"]').click();const button=page.locator('#copy-battle-snapshot');await expect(button).toBeVisible();
 const layout=await button.evaluate((el:HTMLElement)=>{const b=el.getBoundingClientRect(),dialog=el.closest('dialog')!.getBoundingClientRect(),close=el.closest('dialog')!.querySelector('.dialog-primary')!.getBoundingClientRect();return {font:parseFloat(getComputedStyle(el).fontSize),b:{x:b.x,y:b.y,width:b.width,height:b.height},dialog:{x:dialog.x,y:dialog.y,width:dialog.width,height:dialog.height},closeBottom:close.bottom};});
 expect(layout.font).toBeLessThanOrEqual(12);expect(layout.b.y).toBeGreaterThan(0);expect(layout.closeBottom).toBeLessThanOrEqual(834);expect(layout.dialog.width).toBeLessThan(width);expect(layout.dialog.y).toBeGreaterThanOrEqual(0);
 await button.click();await expect(page.locator('#snapshot-copy-status')).toHaveText('已复制对局快照');await expect(page.locator('#snapshot-copy-status')).toHaveCSS('opacity','1');const snapshot=await copied(page);
 expect(snapshot.formatVersion).toBe(1);expect(snapshot.initial.slots).toHaveLength(4);expect(snapshot.initial.config.seed).toBeGreaterThan(0);expect(snapshot.events.some((e:any)=>e.type==='death')).toBe(true);expect(snapshot.critical.some((e:any)=>e.type==='death'&&e.data.lethal.weapon==='cannon-normal')).toBe(true);
 const payload=await page.evaluate(()=>(window as any).__copiedBattle);expect(payload).toContain('倒地');expect(payload).toContain('基础');expect(new TextEncoder().encode(payload).length).toBeLessThan(1_500_000);
 expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>/snapshot|battle-trace/.test(k)))).toBe(false);
 await page.screenshot({path:`QA/v2.2.2-copy-${browserName==='webkit'?'webkit-':''}${width}.png`});await page.locator('#close-dialog').click();await expect(page.locator('#copy-battle-snapshot')).not.toBeVisible();
});
test('clipboard rejection is explicit and keeps the current snapshot available',async({page})=>{
 await clipboard(page,true);await boot(page);await page.locator('.stage-button[data-dialog="settings"]').click();await page.locator('#copy-battle-snapshot').click();await expect(page.locator('#snapshot-copy-status')).toContainText('剪贴板不可用或未获授权');await expect(page.locator('#snapshot-copy-status')).toHaveCSS('opacity','1');
 expect(await page.evaluate(()=>(window as any).__qa.game.battleSnapshot().initial.config.seed)).toBeGreaterThan(0);
});
test('rematch, redeploy and leave-match each reset diagnostics; keyboard copy works without changing play state',async({page})=>{
 await clipboard(page);await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.recordBattle('marker','OLD_MATCH_MARKER');g.damage(g.tanks[1],99999,0);g.nextTurn();g.resultAge=4;(window as any).__qa.updateUI();});
 await page.locator('[data-action="rematch"]').click();await page.keyboard.press('Control+Shift+L');expect(await page.evaluate(()=>(window as any).__copiedBattle)).not.toContain('OLD_MATCH_MARKER');expect((await copied(page)).critical).toHaveLength(0);
 await page.evaluate(()=>(window as any).__qa.game.recordBattle('marker','REDEPLOY_MARKER'));await page.locator('.stage-button[data-dialog="settings"]').click();await page.locator('#close-dialog').click();
 await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch(q.game.config,true);});await page.keyboard.press('Control+Shift+L');expect(await page.evaluate(()=>(window as any).__copiedBattle)).not.toContain('REDEPLOY_MARKER');
 await page.evaluate(()=>(window as any).__qa.game.recordBattle('marker','LEAVE_MATCH_MARKER'));await page.locator('#exit-match').click();await page.locator('[data-action="leave-match"]').click();await page.keyboard.press('Control+Shift+L');expect(await page.evaluate(()=>(window as any).__copiedBattle)).not.toContain('LEAVE_MATCH_MARKER');expect((await copied(page)).current.phase).toBe('lobby');
});
