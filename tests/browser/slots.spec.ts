import {holdSkip} from './hold-skip';
import {test,expect} from '@playwright/test';import {boot,hold} from './qa-app';
const prefix='QA/slots';
const open=async(page:any)=>{await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();};
const activate=async(page:any,n:number)=>{for(let i=2;i<n;i++)await page.locator(`[data-enable="${i}"]`).click();};
const startSlots=async(page:any)=>{await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.getByRole('button',{name:'跳过开场巡游',exact:true}).click();};
test('11-inch setup gate: default, three/four seats, flags and sound/safety controls at both sizes',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('piggy-settings'));for(const width of [1194,1210]){await page.setViewportSize({width,height:834});await open(page);await expect(page.locator('.slot-row')).toHaveCount(4);await expect(page.locator('.empty-slot')).toHaveCount(2);await expect(page.locator('.mode-choices,.formation-strip,.hotseat-style')).toHaveCount(0);await page.screenshot({path:`${prefix}-default-${width}.png`});
 await activate(page,3);await page.locator('[data-team="2"]').selectOption('2');await page.locator('[data-difficulty="2"]').selectOption('hard');await page.screenshot({path:`${prefix}-three-teams-${width}.png`});await page.locator('[data-enable="3"]').click();await page.locator('[data-team="3"]').selectOption('3');await page.locator('[data-controller="2"]').selectOption('human');await expect(page.locator('[data-difficulty="2"]')).toBeDisabled();await page.screenshot({path:`${prefix}-four-flags-mixed-${width}.png`});
 for(const [i,team] of [0,0,1,1].entries())await page.locator(`[data-team="${i}"]`).selectOption(String(team));await page.screenshot({path:`${prefix}-paired-flags-${width}.png`});expect(await page.locator('[data-slot="0"] .crew-name').evaluate(e=>getComputedStyle(e).color)).toBe(await page.locator('[data-slot="1"] .crew-name').evaluate(e=>getComputedStyle(e).color));
 for(let i=0;i<4;i++){await page.locator(`[data-controller="${i}"]`).selectOption('ai');await page.locator(`[data-difficulty="${i}"]`).selectOption(['easy','normal','hard','expert'][i]);}await page.screenshot({path:`${prefix}-all-ai-${width}.png`});await page.locator('[data-setup-setting="allowDragon"]').click();await page.locator('[data-owner="3"]').click();await page.locator('[data-choice="dragon"]').click();await expect(page.locator('[data-choice="dragon"]')).toHaveClass(/selected/);await page.locator('[data-setup-setting="selfDamage"]').click();await page.locator('[data-setup-setting="friendlyFire"]').click();await page.locator('[data-setup-setting="musicEnabled"]').click();await page.screenshot({path:`${prefix}-rules-same-screen-${width}.png`});
 const bounds=await page.locator('#dialog').boundingBox();expect(bounds!.height).toBeLessThan(800);const overflow=await page.locator('#dialog-content').evaluate(e=>e.scrollWidth>e.clientWidth+1);expect(overflow).toBe(false);
 await page.locator('#close-dialog').click();await page.reload();}
});
test('only enabled slots spawn and three/four colors apply consistently to names and handoff',async({page})=>{
 await open(page);await activate(page,4);await page.locator('[data-enable="1"]').click();await page.locator('[data-controller="2"]').selectOption('human');await page.locator('[data-controller="3"]').selectOption('human');await page.locator('[data-team="2"]').selectOption('2');await page.locator('[data-team="3"]').selectOption('3');await page.locator('#turn-timer').selectOption('0');await startSlots(page);await expect(page.locator('[data-hud]')).toHaveCount(3);await expect(page.locator('[data-slot-id="1"]')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks.map((t:any)=>t.slot))).toEqual([0,2,3]);await page.screenshot({path:prefix+'-three-hole-combat.png'});await holdSkip(page);await expect(page.locator('#turn-text')).toContainText('阿狸');await expect(page.locator('#game-overlay')).toBeHidden();await page.screenshot({path:prefix+'-handoff-flag-c.png'});
 const color=await page.locator('[data-slot-id="2"] .crew-name').evaluate(e=>getComputedStyle(e).color);expect(color).toBe('rgb(56, 106, 140)');expect(await page.locator('#turn-text .crew-name').evaluate(e=>getComputedStyle(e).color)).toBe(color);
});
test('same flag cooperation, four-human game and four-way victory retain clear colored names',async({page})=>{
 await open(page);await activate(page,4);for(let i=0;i<4;i++){await page.locator(`[data-controller="${i}"]`).selectOption('human');await page.locator(`[data-team="${i}"]`).selectOption(String(i));}await page.locator('#turn-timer').selectOption('0');await startSlots(page);await expect(page.locator('[data-hud]')).toHaveCount(4);await page.screenshot({path:prefix+'-four-human-four-flags.png'});
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.tanks.forEach((t:any,i:number)=>{t.x=180+i*290;t.y=g.ground(t.x)-18;});for(let i=0;i<3;i++)g.damage(g.tanks[i],99999,3);g.nextTurn();});await expect(page.locator('.result')).toBeVisible({timeout:6000});await expect(page.locator('.result h2')).toContainText('小黄鱼');expect(await page.locator('.result h2 .crew-name').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(130, 96, 35)');await page.screenshot({path:prefix+'-flag-d-winner.png'});
});
test('Mimi and Dad art/state review keeps distinct connected bodies',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=false;g.tanks.forEach((t:any,i:number)=>{t.x=530+i*520;t.y=g.ground(t.x)-18;});});
 for(const state of ['idle','move','fire','hurt','breath','poison','freeze','rage','win','lose']){
 await page.evaluate(state=>{const q=(window as any).__qa,g=q.game;g.paused=false;g.phase='aiming';g.resultAge=0;g.projectiles=[];g.tanks.forEach((t:any)=>{t.hp=t.maxHP;t.reaction=null;t.poisoned=false;t.frozen=0;t.immobile=0;});g.movingUntil=[0,0];if(state==='move')g.movingUntil=[g.elapsed+5,g.elapsed+5];if(state==='fire'){g.projectiles=g.tanks.map((t:any)=>g.launch(t,t.selectedWeapon));g.phase='flying';}if(state==='hurt')g.tanks.forEach((t:any)=>t.reaction={kind:'direct',remaining:5});if(state==='breath')g.tanks.forEach((t:any)=>t.hp=Math.ceil(t.maxHP*.3));if(state==='poison')g.tanks.forEach((t:any)=>t.poisoned=true);if(state==='freeze')g.tanks.forEach((t:any)=>t.immobile=1);if(state==='rage')g.tanks.forEach((t:any)=>{t.vehicleId='sea';t.hp=Math.floor(t.maxHP*.49);});if(state==='win'||state==='lose'){g.phase='ended';g.winner=state==='win'?0:1;g.tanks[state==='win'?1:0].hp=0;}q.renderer.time=.8;q.updateUI();},state);await page.waitForTimeout(120);await page.screenshot({path:`${prefix}-pigs-${state}.png`});}
});
test('13 reference-colored vehicles share their updated shape across selection and atlas',async({page})=>{
 await open(page);await page.screenshot({path:prefix+'-thirteen-vehicle-selector.png'});await page.locator('[data-dialog="vehicles"]').click();await expect(page.locator('.vehicle-atlas article')).toHaveCount(13);await page.screenshot({path:prefix+'-thirteen-atlas.png'});
});
test('production slots persist flags/controllers without resurrecting an empty Mimi or changing Dad identity',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1210,height:834});await page.goto('./');
 // This persistence test starts after the first complete PWA installation.
 // Reloading during the initial install cancels WebKit's pending Worker/image fetches.
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.evaluate(()=>localStorage.removeItem('piggy-settings'));await page.reload();
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await activate(page,4);await page.locator('[data-enable="0"]').click();
 for(const [i,team] of [[1,3],[2,2],[3,1]])await page.locator(`[data-team="${i}"]`).selectOption(String(team));
 await page.locator('[data-controller="1"]').selectOption('human');await page.locator('[data-difficulty="2"]').selectOption('hard');await page.locator('[data-controller="3"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');
 await page.screenshot({path:prefix+'-empty-mimi-three-flags-1210.png'});await startSlots(page);
 await expect(page.locator('[data-hud]')).toHaveCount(3);await expect(page.locator('[data-slot-id="0"]')).toHaveCount(0);
 for(const [slot,color] of [[1,'rgb(130, 96, 35)'],[2,'rgb(56, 106, 140)'],[3,'rgb(70, 108, 68)']])expect(await page.locator(`[data-slot-id="${slot}"] .crew-name`).evaluate(e=>getComputedStyle(e).color)).toBe(color);
 const portrait=page.locator('[data-slot-id="1"] .portrait-button');await portrait.click();await expect(page.locator('#portrait-art')).toHaveCount(0);
 await hold(page,portrait);await expect(page.locator('#portrait-art img')).toHaveAttribute('data-portrait-primary',/portraits\/dad\.png$/);await expect(page.locator('#portrait-saying')).toContainText('大猪头');await page.locator('[data-action="close"]').click();
 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.screenshot({path:prefix+'-general-settings-1210.png'});await page.getByRole('switch',{name:'背景音乐',exact:true}).click();await page.locator('[data-action="close"]').click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-settings')!).config);expect(stored.slots.map((s:any)=>s.enabled)).toEqual([false,true,true,true]);expect(stored.mode).toBeUndefined();expect(stored.formation).toBeUndefined();expect(stored.seats).toBeUndefined();
 await page.reload();await page.getByRole('button',{name:'进入战场',exact:true}).click();await expect(page.locator('[data-slot="0"]')).toHaveClass(/empty-slot/);await expect(page.locator('[data-team="1"]')).toHaveValue('3');await expect(page.locator('[data-difficulty="2"]')).toHaveValue('hard');await expect(page.locator('[data-controller="1"]')).toHaveValue('human');
 expect(await page.evaluate(()=>'__qa' in window)).toBe(false);expect(errors).toEqual([]);
});
