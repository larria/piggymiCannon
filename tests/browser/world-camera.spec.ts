import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {writeFileSync} from 'node:fs';
for(const map of ['valley','coast','moon','factory','temple','egypt'])test(`expanded ${map} keeps full depth on Pixi and minimap`,async({page,browserName})=>{
 await boot(page);await page.evaluate(map=>{const q=(window as any).__qa;q.newMatch({...q.game.config,map,mapChoice:map,timer:0,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:'cannon',team:i%2}))},true);},map);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const state=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer;r.follow();r.draw(.3);return {width:g.worldWidth,height:g.worldHeight,viewWidth:r.viewWidth,ratio:r.ratio,zoom:r.zoom,textures:r.terrainTiles.all().map((t:any)=>[t.canvas.width,t.canvas.height]),tanks:g.tanks.map((t:any)=>({x:t.x,y:t.y,hp:t.hp,max:t.maxHP,fall:t.fallVelocity})),errors:[]};});
 const dims:any={valley:[4608,1908],coast:[4608,714],moon:[6144,807],factory:[4500,1782],temple:[4608,2028],egypt:[4608,1287]};expect([state.width,state.height]).toEqual(dims[map]);expect(state.viewWidth).toBe(1280);expect(state.zoom).toBe(1);expect(state.textures.every(t=>Math.max(...t)<=1024)).toBe(true);expect(state.tanks.every(t=>t.hp===t.max&&t.fall===0)).toBe(true);
 // Lower permanent features are visible, while the mini overview always contains the whole world.
 const mini=await page.locator('#minimap').boundingBox();await page.mouse.click(mini!.x+mini!.width/2,mini!.y+mini!.height*.87);await page.waitForTimeout(400);
 await page.screenshot({path:`QA/v3.2.0-world-${map}-1194-${browserName}.png`});writeFileSync(`QA/v3.2.0-world-${map}-${browserName}.json`,JSON.stringify(state,null,2));
});
test('each turn recenters on the actor after manual panning; world edges clamp smoothly',async({page,browserName})=>{
 await boot(page);await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch({...q.game.config,map:'factory',timer:0,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:'cannon',team:i%2}))},true);const g=(window as any).__qa.game;g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:[960,100,1700,1080][i],y:g.ground([960,100,1700,1080][i])-18}));});
 const results=[];
 for(let i=0;i<8;i++){
  await page.evaluate(()=>{const q=(window as any).__qa;q.renderer.panBy(1000,-600);q.game.nextTurn();for(let i=0;i<1000&&q.game.phase==='supply';i++)q.game.update(.01);});
  await page.waitForTimeout(1400);
  const p=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,t=q.game.active;return {actor:t.id,x:r.offsetX,y:r.offsetY,expectedX:Math.max(0,Math.min(q.game.worldWidth-r.viewWidth,t.x-r.viewWidth/2)),expectedY:Math.max(-q.game.worldHeight,Math.min(Math.max(0,q.game.worldHeight-r.viewHeight),t.y-r.viewHeight/2)),width:r.viewWidth,height:r.viewHeight};});
  expect(p.x).toBeCloseTo(p.expectedX,0);expect(p.y).toBeCloseTo(p.expectedY,0);results.push(p);
 }
 expect(new Set(results.map(r=>r.actor)).size).toBe(4);writeFileSync(`QA/v3.2.0-turn-centering-${browserName}.json`,JSON.stringify(results,null,2));
});
test('terrain below former waterline remains visible and playable',async({page})=>{
 await boot(page);await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=g.worldWidth;x++)g.land.column(x,g.bottomY-70,g.bottomY);g.land.rebuild();g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:900+i*200,y:g.bottomY-88,fallVelocity:0}));q.renderer.focusAt(960,g.bottomY-88);q.updateUI();});await page.waitForTimeout(400);
 const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,g=q.game;return {hp:g.tanks.map((t:any)=>t.hp),y:g.active.y,height:g.worldHeight,screenFoot:(g.active.y+18-r.offsetY)/r.viewHeight,maskBottom:g.land.solid(960,g.bottomY-10)};});
 expect(data.hp.every(v=>v>0)).toBe(true);expect(data.y).toBe(data.height-88);expect(data.screenFoot).toBeLessThanOrEqual(1);expect(data.maskBottom).toBe(true);
});
test('iPad DPR2 keeps entity scale and the expanded retained texture fits mobile GPU bounds',async({browser})=>{
 const context=await browser.newContext({baseURL:'http://localhost:4177/piggymiCannon/',viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();
 try{await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer;q.game.paused=true;r.invalidate();r.draw(0);return {ratio:r.ratio,width:r.viewWidth,textures:r.terrainTiles.all().map((t:any)=>[t.canvas.width,t.canvas.height]),max:r.stage.app.renderer.gl.getParameter(r.stage.app.renderer.gl.MAX_TEXTURE_SIZE),backend:r.backend};});expect(data.ratio).toBe(2);expect(data.width).toBe(1280);expect(data.textures.every(t=>Math.max(...t)<=1024&&Math.max(...t)<=data.max)).toBe(true);}
 finally{await context.close();}
});
