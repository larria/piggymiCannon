import {test,expect} from '@playwright/test';import {boot} from './qa-app';
test('nearby temple spawn portraits stay at chassis height and retain their hit targets',async({page,browserName})=>{
 await boot(page);await page.evaluate(()=>{let q=(window as any).__qa;q.newMatch({...q.game.config,map:'temple',mapChoice:'temple',slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,crew:['mimi','dad','fox','fish'][i],team:i<2?0:1,controller:i===0?'human':'ai',vehicle:['sea','mine','mine','beetle'][i]}))},true);q=(window as any).__qa;q.game.update=()=>{};for(const [i,x] of [860,1876,1292,1196].entries())Object.assign(q.game.tanks[i],{x,y:359,fallVelocity:0});q.renderer.follow(true);q.renderer.draw(0);});
 const result=await page.evaluate(()=>{const q=(window as any).__qa;q.renderer.draw(0);return q.renderer.portraitHits.map((p:any)=>({...p,picked:q.renderer.portraitAt(p.x,p.y)}));});
 const fox=result.find((p:any)=>p.id===2),fish=result.find((p:any)=>p.id===3);expect(fish.y).toBe(fox.y);expect(fish.y).toBe(242);expect(Math.abs(fish.x-1196)).toBeLessThan(4);for(const p of result)expect(p.picked).toBe(p.id);
 if(browserName==='webkit')await page.screenshot({path:'QA/portrait-layout-temple-webkit-1194.png',scale:'css'});
});
test('Duke held charge reaches 100 percent and launches with the current full speed',async({page})=>{
 await boot(page,true,'coast','duke','cannon');await page.evaluate(()=>{const q=(window as any).__qa;q.game.wind=0;});
 await page.keyboard.down('Space');await expect.poll(()=>page.evaluate(()=>{const q=(window as any).__qa;return q.game.battleSnapshot().events.find((e:any)=>e.type==='fire-action')?.data.power;}),{timeout:5000}).toBe(100);await page.keyboard.up('Space');
 const launch=await page.evaluate(()=>{const q=(window as any).__qa;return q.game.battleSnapshot().events.find((e:any)=>e.type==='projectile-start').data;});expect(launch.weapon).toBe('duke-normal');expect(Math.hypot(launch.vx,launch.vy)).toBeCloseTo(730*49/43,4);
});
test('mobile short-tap recovery restores60 percent and snapshots expose the new guidance model',async({page})=>{
 await boot(page,true,'coast','duke','cannon');await page.evaluate(()=>{const g=(window as any).__qa.game;g.active.hp=10;g.wind=0;});await page.locator('#quick-items [data-item="repair"]').click();const box=await page.locator('#fire-button').boundingBox();await page.touchscreen.tap(box!.x+box!.width/2,box!.y+box!.height/2);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[0].hp),{timeout:10000}).toBe(610);
 const snapshot=await page.evaluate(()=>(window as any).__qa.game.battleSnapshot());expect(snapshot.initial.rules.restoreMaximumFraction).toBe(.6);expect(snapshot.initial.rules.homingModel).toBe('source-lookahead-v1');expect(snapshot.events.some((e:any)=>e.type==='heal'&&e.data.requested===600)).toBe(true);
});
