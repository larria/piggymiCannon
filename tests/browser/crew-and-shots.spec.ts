import {expect,test} from '@playwright/test';
import {boot} from './qa-app';

test('water shell pixels are sized by the real carve and stay upright as trajectory changes',async({page})=>{
 await boot(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const data=await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game,r=q.renderer;q.recorder.detach();g.paused=true;
  g.phase='flying';g.fog=false;g.fireLine=null;g.blasts=[];g.crates=[];g.particles=[];g.shake=0;r.tank=()=>{};r.windMotes=[{x:-1000,y:0,alpha:0}];
  const x=g.worldWidth/2,y=260;r.focusAt(x,y);r.draw(.35);
  const snapshot=()=>{r.draw(0);const px=Math.round((x-r.offsetX)*r.ratio),py=Math.round((y-r.offsetY)*r.ratio),w=Math.ceil(290*r.ratio),h=Math.ceil(110*r.ratio),startX=px-Math.floor(w/2),startY=py-h+Math.ceil(12*r.ratio),bytes=r.ctx.getImageData(startX,startY,w,h).data;
    let left=w,right=-1,top=h,bottom=-1,hash=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=(j*w+i)*4;if(bytes[k+3]>110){left=Math.min(left,i);right=Math.max(right,i);top=Math.min(top,j);bottom=Math.max(bottom,j);hash=(Math.imul(hash,33)^k)>>>0;}}return {w:(right-left+1)/r.ratio,h:(bottom-top+1)/r.ratio,tip:(startY+bottom-py)/r.ratio,hash};};
  return ['water-normal','water-special'].map(weapon=>{
    const p=g.launch(g.active,weapon);Object.assign(p,{x,y,vx:250,vy:0,delay:0,phase:0,fireBoosted:false,homing:false});g.projectiles=[p];
    const horizontal=snapshot();p.vx=-15;p.vy=420;const descending=snapshot();return {horizontal,descending};
  });
 });
 for(const [i,{horizontal,descending}] of data.entries()){
  const [width,depth]=i===0?[246,81]:[192,63];expect(descending).toEqual(horizontal);
  expect(Math.abs(horizontal.w-width)).toBeLessThan(5);expect(Math.abs(horizontal.h-depth)).toBeLessThan(8);expect(Math.abs(horizontal.tip)).toBeLessThan(4);
 }
});

test('queued items are visible by their original slot until firing and the minimap pulse moves without a canvas animation',async({page})=>{
 await boot(page);
 const dot=page.locator('.minimap-turn-pulse');await expect(dot).toBeVisible();
 const dotX=await dot.evaluate(e=>e.style.left),dotAnimation=await dot.evaluate(e=>getComputedStyle(e).animationName);expect(dotAnimation).toBe('minimap-turn-beacon');
 const slots=page.locator('#quick-items');
 await slots.locator('[data-item="boost"]').click();
 await expect(slots.getByRole('button',{name:/威力加强待发/})).toBeDisabled();
 await slots.locator('[data-item="double"]').click();
 await slots.locator('[data-item="repair"]').click();
 await expect(slots.locator('.pending-shot-item')).toHaveCount(3);
 await expect(slots.locator('[data-item="repair"]')).toHaveAttribute('aria-pressed','true');
 const animation=await slots.locator('[data-item="repair"]').evaluate(e=>getComputedStyle(e,'::after').animationName);expect(animation).toBe('pending-shot-wash');
 await slots.locator('[data-item="repair"]').click();await expect(slots.locator('.pending-shot-item')).toHaveCount(2);
 await page.locator('#fire-button').click();await expect(slots.locator('.pending-shot-item')).toHaveCount(0);
 await page.evaluate(()=>{const q=(window as any).__qa;q.recorder.detach();q.game.projectiles=[];q.game.nextTurn();q.updateUI();});
 await expect.poll(()=>dot.evaluate(e=>e.style.left)).not.toBe(dotX);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await dot.evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.locator('#minimap-toggle').click();await expect(dot).toBeHidden();
});

test('four portrait-matched crew are legible together on the iPad battlefield',async({page,browserName})=>{
 await boot(page,true,'coast','cannon','water');await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 await page.evaluate(()=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i,vehicle:['cannon','water','duke','beetle'][i]}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder.detach();g.update=()=>{};g.wind=4;g.fog=false;g.fireLine=null;g.particles=[];g.crates=[];
  const center=g.worldWidth*.5;g.tanks.forEach((t:any,i:number)=>{const x=center+(i-1.5)*204;Object.assign(t,{x,y:g.ground(x)-18,fallVelocity:0});});
  g.drainEvents();r.focusAt(center,g.tanks[0].y-65);r.draw(.4);q.updateUI();
 });
 await page.locator('#quick-items [data-item="repair"]').click();
 await expect(page.locator('.minimap-turn-pulse')).toBeVisible();
 await expect(page.locator('#toast')).not.toHaveClass(/visible/);
 const framed=await page.evaluate(()=>{
   const {game:g,renderer:r}=(window as any).__qa,center=g.worldWidth*.5;
   g.tanks.forEach((t:any,i:number)=>{const x=center+(i-1.5)*167;Object.assign(t,{x,y:g.ground(x)-18,fallVelocity:0});});
   r.zoomBy(1.55);r.camera.center(center,g.tanks[0].y-118,false);r.draw(0);
   return g.tanks.every((t:any)=>t.x>r.offsetX+60&&t.x<r.offsetX+r.viewWidth-60);
 });
 expect(framed).toBe(true);
 await page.screenshot({path:`.workbuddy/v5.0.11-crew-ipad-${browserName}.png`,scale:'css',animations:'disabled'});
});

test('every crew visibly changes pose when moving, firing, taking a hit, falling and celebrating',async({page})=>{
 await boot(page);
 const checks=await page.evaluate(()=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i,vehicle:'cannon'}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder.detach();g.update=()=>{};
  const c=document.createElement('canvas');c.width=170;c.height=140;const ctx=c.getContext('2d')!,original=r.ctx;r.ctx=ctx;
  const checks=g.tanks.map((t:any)=>{
   const pose=()=>{ctx.resetTransform();ctx.clearRect(0,0,c.width,c.height);ctx.translate(85-t.x,104-t.y);r.labelRects=[];r.portraitHits=[];r.time=1.2;r.tank(t);const data=ctx.getImageData(18,46,134,72).data;let hash=17;for(let i=0;i<data.length;i++)hash=(Math.imul(hash,31)+data[i])>>>0;return hash;};
   g.phase='aiming';g.winner=null;t.fallVelocity=0;r.time=1.2;
   const idle=pose();g.movingUntil[t.id]=g.elapsed+.5;const moving=pose();g.movingUntil[t.id]=0;
   g.projectiles=[g.launch(t,'cannon-normal')];const firing=pose();g.projectiles=[];
   t.reaction={kind:'direct',remaining:1};const hurt=pose();t.reaction=null;
   t.fallVelocity=80;const falling=pose();t.fallVelocity=0;
   g.phase='ended';g.winner=t.team;const winning=pose();return new Set([idle,moving,firing,hurt,falling,winning]).size;
  });r.ctx=original;r.invalidate();return checks;
 });expect(checks).toEqual([6,6,6,6]);
});
