import {holdSkip} from './hold-skip';
import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {VEHICLES} from '../../src/vehicles';import {readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
for(const width of [1194,1210])test(`${width} iPad portraits replace battlefield names; flags, wind, items and team handoffs stay consistent`,async({page,browserName})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:834});await boot(page);
 await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i<2?0:1,vehicle:'cannon'})),fog:false,fireLine:false},true);q.updateUI();});
 for(const [slot,id] of [[2,'fox'],[3,'fish']] as const){const img=page.locator(`[data-slot-id="${slot}"] img`);await expect(img).toHaveAttribute('data-portrait-primary',`/piggymiCannon/portraits/${id}.png`);await expect(img).toHaveJSProperty('naturalWidth',512);}
 await expect.poll(()=>page.evaluate(()=>{const q=(window as any).__qa,ctx=q.renderer.ctx,draw=ctx.drawImage,fill=ctx.fillText;let portraits=0;const words:string[]=[];ctx.drawImage=function(source:any,...args:any[]){if(source.width===64&&source.height===64)portraits++;return draw.apply(this,[source,...args]);};ctx.fillText=function(word:string,...args:any[]){words.push(word);return fill.apply(this,[word,...args]);};q.renderer.draw(0);ctx.drawImage=draw;ctx.fillText=fill;return portraits===4&&!q.game.tanks.some((t:any)=>words.includes(t.name));})).toBe(true);
 const before=await page.evaluate(()=>(window as any).__qa.game.wind);const sequence=[];
 for(let i=0;i<4;i++){sequence.push(await page.evaluate(()=>{const q=(window as any).__qa;return {slot:q.game.active.slot,round:q.game.round};}));await holdSkip(page);if(i<3)expect(await page.evaluate(()=>(window as any).__qa.game.wind)).toBe(before);}
 expect(sequence.map(s=>s.slot)).toEqual([0,2,1,3]);expect(sequence.map(s=>s.round)).toEqual([1,1,1,1]);await expect(page.locator('#round-text')).toContainText('02');
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.events.length)).toBe(0);
 // No generic click/death/item sample starts for an actual item tap.
 await page.evaluate(async()=>{const q=(window as any).__qa;await q.audio.preloadForMatch(['cannon']);const start=AudioBufferSourceNode.prototype.start;(window as any).itemSamples=[];AudioBufferSourceNode.prototype.start=function(...args:any[]){(window as any).itemSamples.push([...q.audio.buffers].find((e:any)=>e[1]===this.buffer)?.[0]??'synthesis');return (start as any).apply(this,args);};});
 await page.locator('[data-item="boost"]').first().click();expect(await page.evaluate(()=>(window as any).itemSamples)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__qa.game.active.boost)).toBe(true);expect(await page.evaluate(()=>(window as any).__qa.game.itemCues.map((c:any)=>c.item))).toContain('boost');
 await page.waitForTimeout(150);await page.screenshot({path:`QA/v${version}-portraits-item-${width}-${browserName}.png`});
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.itemCues.length)).toBe(0);expect(await page.evaluate(()=>(window as any).__qa.game.active.boost)).toBe(true);expect(errors).toEqual([]);
});
test('all 13 movement loops use moveN, ordinary release is quiet, exhaustion alone uses UnmoveN',async({page})=>{
 await boot(page);await page.evaluate(async()=>{const q=(window as any).__qa;await q.audio.preloadForMatch(['bowl','crossbow','cannon','beetle','duke','mine','missile','multi','laser','water','ion','sea','dragon']);q.game.paused=true;q.audio.resetEffects();const start=AudioBufferSourceNode.prototype.start;(window as any).movementSamples=[];AudioBufferSourceNode.prototype.start=function(...args:any[]){const a=q.audio;const name=[...a.buffers].find((e:any)=>e[1]===this.buffer)?.[0];if(name)(window as any).movementSamples.push({name,loop:this.loop});return (start as any).apply(this,args);};});
 for(const v of VEHICLES){const samples=await page.evaluate(id=>{const a=(window as any).__qa.audio;(window as any).movementSamples=[];a.updateMovement(true,400,600,id);a.updateMovement(true,401,600,id);a.updateMovement(false,401,600,id);const release=[...(window as any).movementSamples];a.updateMovement(true,400,600,id);a.updateMovement(false,400,600,id,true);return {release,all:(window as any).movementSamples};},v.id);
 expect(samples.release).toEqual([{name:`sfx-move-${v.id}.mp3`,loop:true}]);expect(samples.all).toContainEqual({name:`sfx-stop-${v.id}.mp3`,loop:false});}
});
