import {test,expect} from '@playwright/test';import {boot} from './qa-app';
async function arrange(page:any){
 await boot(page);await page.evaluate(()=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,map:'valley',timer:0,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:'cannon',team:i%2}))},true);
  const g=(window as any).__qa.game;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.wind=0;g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:[200,650,70,1130][i],y:432,fallVelocity:0}));
  const update=g.update.bind(g);let frozen=false;g.update=(dt:number)=>{if(!frozen)update(dt);};g.freezeQA=()=>frozen=true;g.resumeQA=()=>frozen=false;
  (window as any).__corpsePixels=async(id:number)=>{
   const q=(window as any).__qa,r=q.renderer,t=q.game.tanks[id],pose=t.defeat??t,c=document.createElement('canvas');c.width=160;c.height=130;const ctx=c.getContext('2d')!,old=r.ctx,time=r.time;
   ctx.translate(80-pose.x,80-pose.y);try{r.ctx=ctx;r.time=2;r.tank(t);}finally{r.ctx=old;r.time=time;}
   const pixels=ctx.getImageData(0,0,160,130).data;let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])opaque++;
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))).map(v=>v.toString(16).padStart(2,'0')).join('');return {opaque,hash};
  };
 });
}
for(const width of [1194,1210])test(`${width} iPad: mid-match crying appears on the killing frame and survives repeated attacks and holes`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await arrange(page);
 const state=await page.evaluate(()=>{const g=(window as any).__qa.game,e=g.tanks[1];e.hp=1;g.fire();Object.assign(g.projectiles[0],{x:e.x,y:e.y-10,vx:0,vy:1,age:.5});g.update(.001);g.freezeQA();(window as any).__qa.updateUI();return {phase:g.phase,hp:e.hp,pose:e.defeat,fall:e.fallVelocity,winner:g.winner};});
 expect(state.hp).toBe(0);expect(state.pose).toBeTruthy();expect(state.fall).toBe(0);expect(state.phase).toBe('resolving');expect(state.winner).toBeNull();
 const first=await page.evaluate(()=>(window as any).__corpsePixels(1));expect(first.opaque).toBeGreaterThan(200);await expect(page.locator('#game-overlay')).toBeHidden();
 await page.screenshot({path:`QA/v2.2.3-corpse-${browserName==='webkit'?'webkit-':''}immediate-${width}.png`});
 await page.evaluate(()=>{const g=(window as any).__qa.game,e=g.tanks[1];for(const d of [0,25,40])g.explode({...g.launch(g.active,'cannon-normal'),x:e.x+d,y:e.y},e.id);g.crater(e.x,450,100,250);for(let turn=0;turn<8;turn++)g.nextTurn();g.resumeQA();for(let i=0;i<16;i++)g.update(.05);g.freezeQA();(window as any).__qa.updateUI();});
 const later=await page.evaluate(()=>(window as any).__corpsePixels(1));expect(later).toEqual(first);
 const after=await page.evaluate(()=>{const g=(window as any).__qa.game,e=g.tanks[1];return {pose:e.defeat,out:e.outOfBounds,fall:e.fallVelocity,support:g.support(e.x,e.y+18),phase:g.phase,current:g.current};});
 expect(after.pose).toEqual(state.pose);expect(after.out).toBe(false);expect(after.fall).toBe(0);expect(after.support).toBeGreaterThanOrEqual(579);expect(after.phase).not.toBe('ended');expect(after.current).not.toBe(1);
 await expect(page.locator('[data-hud]')).toHaveCount(4);await expect(page.locator('.result')).not.toBeVisible();
 await page.screenshot({path:`QA/v2.2.3-corpse-${browserName==='webkit'?'webkit-':''}excavated-${width}.png`});expect(errors).toEqual([]);
});
test('all four prone identities share the battle/result path, while bottom exits draw zero pixels',async({page})=>{
 await arrange(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.freezeQA();g.tanks.forEach((t:any)=>g.damage(t,99999,t.id,true,'fall'));});
 const portraits=[];for(let id=0;id<4;id++){const pixels=await page.evaluate(id=>(window as any).__corpsePixels(id),id);expect(pixels.opaque).toBeGreaterThan(150);portraits.push(pixels.hash);}expect(new Set(portraits).size).toBe(4);
 await page.evaluate(()=>(window as any).__qa.game.phase='ended');for(let id=0;id<4;id++)expect((await page.evaluate(id=>(window as any).__corpsePixels(id),id)).hash).toBe(portraits[id]);
 await arrange(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.freezeQA();g.tanks[1].y=960;g.damage(g.tanks[1],99999,0);});expect((await page.evaluate(()=>(window as any).__corpsePixels(1))).opaque).toBe(0);
});
test('a first 2v2 death does not show results; the final death preserves the three-second celebration',async({page})=>{
 await arrange(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.freezeQA();g.damage(g.tanks[1],99999,0);g.nextTurn();(window as any).__qa.updateUI();});await expect(page.locator('.result')).not.toBeVisible();
 await page.evaluate(()=>{const g=(window as any).__qa.game;g.damage(g.tanks[3],99999,0);g.nextTurn();g.resumeQA();(window as any).__qa.updateUI();});await expect(page.locator('#game-overlay')).toBeHidden();await page.waitForTimeout(1000);await expect(page.locator('#game-overlay')).toBeHidden();
 await expect(page.locator('.result')).toBeVisible({timeout:5000});expect((await page.evaluate(()=>(window as any).__corpsePixels(1))).opaque).toBeGreaterThan(200);
});
