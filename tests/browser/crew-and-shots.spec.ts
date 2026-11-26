import {expect,test} from '@playwright/test';
import {boot} from './qa-app';
import {holdSkip} from './hold-skip';
import {readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;

test('both water shells are half their former flight width and height and stay upright',async({page})=>{
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
  const [width,depth]=i===0?[123,40.5]:[96,31.5];expect(descending).toEqual(horizontal);
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
 await expect(slots.locator('[data-item="double"]')).toBeDisabled();
 for(let i=0;i<4;i++){
  await holdSkip(page);
  if(await page.evaluate(()=>(window as any).__qa.game.current===0))break;
 }
 await slots.locator('[data-item="double"]').click();
 await slots.locator('[data-item="repair"]').click();
 await expect(slots.locator('.pending-shot-item')).toHaveCount(3);
 await expect(slots.locator('[data-item="repair"]')).toHaveAttribute('aria-pressed','true');
 const animation=await slots.locator('[data-item="repair"]').evaluate(e=>getComputedStyle(e,'::after').animationName);expect(animation).toBe('item-ready-ink');
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
  const q=(window as any).__qa;q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i,vehicle:['cannon','sea','duke','beetle'][i]}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder.detach();g.update=()=>{};g.wind=4;g.fog=false;g.fireLine=null;g.particles=[];g.crates=[];
  const center=g.worldWidth*.5;g.tanks.forEach((t:any,i:number)=>{const x=center+(i-1.5)*204;Object.assign(t,{x,y:g.ground(x)-18,fallVelocity:0});});
  g.drainEvents();r.focusAt(center,g.tanks[0].y-65);r.draw(.4);q.updateUI();
 });
 await page.locator('#quick-items [data-item="repair"]').click();
 await expect(page.locator('.minimap-turn-pulse')).toBeVisible();
 await expect(page.locator('#toast')).not.toHaveClass(/visible/);
 const framed=await page.evaluate(()=>{
   const {game:g,renderer:r,updateUI}=(window as any).__qa,center=g.worldWidth*.5;
   g.tanks.forEach((t:any,i:number)=>{const x=center+(i-1.5)*167;Object.assign(t,{x,y:g.ground(x)-18,fallVelocity:0});});
   r.zoomBy(1.55);r.camera.center(center,g.tanks[0].y-118,false);g.tanks[1].hp=Math.floor(g.tanks[1].maxHP*.44);g.tanks[3].hp=Math.floor(g.tanks[3].maxHP*.26);r.time=1.59;r.draw(0);updateUI();
   return g.tanks.every((t:any)=>t.x>r.offsetX+60&&t.x<r.offsetX+r.viewWidth-60);
 });
 expect(framed).toBe(true);
 await page.screenshot({path:`.workbuddy/v${version}-crew-ipad-${browserName}.png`,scale:'css',animations:'disabled'});
 await page.evaluate(()=>{
  const {game:g,renderer:r}=(window as any).__qa;
  g.tanks.forEach((t:any)=>{t.team=0;t.hp=t.maxHP;});
  g.phase='ended';g.winner=0;r.time=3.16;r.draw(0);
  // Hold exactly this victory frame for visual inspection without the result card.
  g.phase='aiming';r.draw=()=>{};
 });
 await page.screenshot({path:`.workbuddy/v${version}-victory-ipad-${browserName}.png`,scale:'css',animations:'disabled'});
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

test('idle routines change every pilot, tears persist after a hit and a long fall, safe short drops stay dry, healing and team reactions draw, and angry Sea Monster has flames',async({page})=>{
 await boot(page);
 const results=await page.evaluate(()=>{
  let q=(window as any).__qa;
  q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i,vehicle:i===3?'sea':'cannon'}))},true);
  q=(window as any).__qa;const {game:g,renderer:r,recorder}=q;recorder.detach();g.update=()=>{};g.elapsed=1;r.draw(0);
  const c=document.createElement('canvas');c.width=200;c.height=130;const ctx=c.getContext('2d')!,original=r.ctx;
  const sample=(t:any,time=1.2)=>{
   ctx.resetTransform();ctx.clearRect(0,0,c.width,c.height);ctx.translate(100-t.x,100-t.y);
   r.labelRects=[];r.portraitHits=[];r.time=time;r.tank(t);
   const image=ctx.getImageData(4,54,192,64).data;let hash=0,tears=0,fire=0;
   for(let i=0;i<image.length;i+=4){const [red,green,blue,alpha]=[image[i],image[i+1],image[i+2],image[i+3]];
    hash=(Math.imul(hash,31)+red*3+green*5+blue*7+alpha)>>>0;
    if(alpha>160&&((Math.abs(red-198)<5&&Math.abs(green-239)<5&&Math.abs(blue-246)<5)||(Math.abs(red-158)<5&&Math.abs(green-217)<5&&Math.abs(blue-235)<5)))tears++;
    if(alpha>90&&red>180&&green<132&&blue<76)fire++;
   }return {hash,tears,fire};
  };
  r.ctx=ctx;const idle=g.tanks.map(sample);r.ctx=original;
  g.elapsed=21.65;r.draw(0);r.ctx=ctx;const flourish=g.tanks.map(sample);r.ctx=original;
  const t=g.tanks[0];t.reaction={kind:'direct',remaining:1.4};r.draw(0);r.ctx=ctx;const hit=sample(t);r.ctx=original;
  t.reaction=null;g.elapsed=23.8;r.draw(0);r.ctx=ctx;const extended=sample(t);r.ctx=original;
  const support=g.support.bind(g);t.fallStart=t.y;let drop=26;g.support=(x:number,y:number)=>x===t.x?t.fallStart+18+drop:support(x,y);
  g.elapsed=25.1;t.fallVelocity=80;r.draw(0);r.ctx=ctx;const shortFall=sample(t);r.ctx=original;
  t.fallVelocity=0;g.elapsed=25.2;r.draw(0);r.ctx=ctx;const shortLanding=sample(t);r.ctx=original;
  drop=80;g.elapsed=25.5;t.fallVelocity=80;r.draw(0);r.ctx=ctx;const falling=sample(t);r.ctx=original;
  t.fallVelocity=0;r.draw(0);r.ctx=ctx;const landing=sample(t);r.ctx=original;
  g.elapsed=26.49;r.draw(0);r.ctx=ctx;const afterLanding=sample(t);r.ctx=original;
  g.elapsed=26.51;r.draw(0);r.ctx=ctx;const settled=sample(t);r.ctx=original;
  const sea=g.tanks[3];sea.hp=sea.maxHP*.49;r.draw(0);r.ctx=ctx;const angry=sample(sea);r.ctx=original;
  sea.vehicleId='beetle';sea.hp=sea.maxHP;
  const breathe=g.tanks.map((pilot:any,i:number)=>{
   r.ctx=ctx;const times=[1.505-i*.5,2.099-i*.5];const healthy=times.map(at=>sample(pilot,at).hash);
   pilot.hp=Math.ceil(pilot.maxHP*.3);const red=times.map(at=>sample(pilot,at).hash);
   r.ctx=original;return red[0]!==red[1]&&red.every((hash,j)=>hash!==healthy[j]);
  });
  g.support=support;g.config.friendlyFire=true;g.elapsed=30;
  const x=g.worldWidth/2,y=g.ground(x)-18;g.tanks.forEach((pilot:any,i:number)=>Object.assign(pilot,{x:x+(i-1.5)*24,y,hp:Math.floor(pilot.maxHP*.7)}));
  r.draw(0);const repair=g.launch(t,'cannon-normal');Object.assign(repair,{x,y,healing:true});
  const initialHp=g.tanks.map((pilot:any)=>pilot.hp);g.restoreImpact(repair);const recovered=g.tanks.map((pilot:any,i:number)=>pilot.hp>initialHp[i]);g.elapsed=30.14;g.itemCues=[];r.draw(0);
  g.elapsed=30.58;r.draw(0);r.ctx=ctx;const happy=g.tanks.map(pilot=>sample(pilot));r.ctx=original;
  g.elapsed=32.6;r.draw(0);r.ctx=ctx;const normal=g.tanks.map(pilot=>sample(pilot));r.ctx=original;
  g.config.friendlyFire=false;t.team=0;const [enemy,ally,otherEnemy]=g.tanks.slice(1);enemy.team=1;ally.team=0;otherEnemy.team=1;
  g.damage(enemy,Math.ceil(enemy.maxHP*.25),t.id,false,'direct',undefined,{cause:'direct',weapon:'cannon-normal'});
  g.elapsed=33;r.draw(0);r.ctx=ctx;const pose=sample(ally),shocked=sample(otherEnemy);r.ctx=original;
  g.elapsed=35;r.draw(0);r.ctx=ctx;const normalAlly=sample(ally),normalEnemy=sample(otherEnemy);r.ctx=original;
  return {idle,flourish,hit,extended,shortFall,shortLanding,falling,landing,afterLanding,settled,angry,breathe,
   recovered,happy,normal,cheering:pose.hash!==normalAlly.hash&&pose.tears===normalAlly.tears,shock:shocked.hash!==normalEnemy.hash&&shocked.tears===normalEnemy.tears};
 });
 for(const [i,idle] of results.idle.entries())expect(results.flourish[i].hash).not.toBe(idle.hash);
 expect(results.hit.tears).toBeGreaterThan(results.settled.tears);
 expect(results.extended.tears).toBeGreaterThan(results.settled.tears);
 expect(results.shortFall.tears).toBe(results.settled.tears);
 expect(results.shortLanding.tears).toBe(results.settled.tears);
 expect(results.falling.tears).toBeGreaterThan(results.settled.tears);
 expect(results.landing.tears).toBeGreaterThan(results.settled.tears);
 expect(results.afterLanding.tears).toBeGreaterThan(results.settled.tears);
 expect(results.breathe).toEqual([true,true,true,true]);
 expect(results.angry.fire).toBeGreaterThan(results.idle[3].fire+20);
 expect(results.recovered).toEqual([true,true,true,true]);
 expect(results.happy.every((pose,i)=>pose.hash!==results.normal[i].hash&&pose.tears===results.normal[i].tears)).toBe(true);
 expect(results.cheering).toBe(true);
 expect(results.shock).toBe(true);
});

test('keyboard short taps only turn, a held key drives after turning, and touch still moves immediately',async({page})=>{
 await boot(page,true,'coast');
 await page.evaluate(()=>{
  const {game:g,recorder}=(window as any).__qa;recorder.detach();g.update=()=>{};
  const t=g.active;Object.assign(t,{x:g.worldWidth/2,y:g.ground(g.worldWidth/2)-18,direction:1,fallVelocity:0});
  g.qaMoved=[];const move=g.move.bind(g);g.move=(direction:number,dt:number)=>{g.qaMoved.push({direction,dt,at:performance.now()});return move(direction,dt);};
  (document.activeElement as HTMLElement).blur();
 });
 const short=await page.evaluate(()=>{
  for(const type of ['keydown','keyup'])document.body.dispatchEvent(new KeyboardEvent(type,{key:'ArrowLeft',bubbles:true,cancelable:true}));
  const g=(window as any).__qa.game;return {direction:g.active.direction,calls:g.qaMoved.length,x:g.active.x};
 });
 expect(short).toMatchObject({direction:-1,calls:0});
 const turnAt=await page.evaluate(()=>{
  const g=(window as any).__qa.game,now=performance.now();
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'d',bubbles:true,cancelable:true}));
  return {now,direction:g.active.direction};
 });expect(turnAt.direction).toBe(1);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.active.x)).toBeGreaterThan(short.x);
 const firstMove=await page.evaluate(()=>{
  const g=(window as any).__qa.game;document.body.dispatchEvent(new KeyboardEvent('keyup',{key:'d',bubbles:true}));return g.qaMoved[0].at;
 });expect(firstMove-turnAt.now).toBeGreaterThanOrEqual(200);
 const sameDirection=await page.evaluate(async()=>{
  const g=(window as any).__qa.game,count=g.qaMoved.length;
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  document.body.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));return g.qaMoved.length>count;
 });expect(sameDirection).toBe(true);
 const start=await page.evaluate(()=>{const g=(window as any).__qa.game;return {calls:g.qaMoved.length,x:g.active.x};});
 await page.locator('#move-left').tap();
 const touch=await page.evaluate(({calls})=>{const g=(window as any).__qa.game;return {first:g.qaMoved[calls],x:g.active.x};},start);
 expect(touch.first).toMatchObject({direction:-1,dt:1/30});expect(touch.x).toBeLessThan(start.x);
});

test('ice valley draws both thick outer rims, the air gap and the thin branch together',async({page,browserName})=>{
 await boot(page,true,'moon','cannon','water');
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const ice=await page.evaluate(()=>{
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder.detach();g.update=()=>{};g.fog=false;g.fireLine=null;
  const w=g.worldWidth,h=g.worldHeight,x=Math.round(w*.52),upper=g.ground(x),upperBottom=g.land.bottom(x,upper),lower=g.ground(x,upperBottom);
  r.zoomBy(.5);r.focusAt(w*.5,h*.51);r.draw(.5);r.draw(0);
  const c=r.terrainCanvas.getContext('2d'),rgba=(x:number,y:number)=>Array.from(c.getImageData(x,y,1,1).data);
  const left=r.offsetX+16,right=Math.min(w-16,r.offsetX+r.viewWidth-16),ground=g.ground.bind(g);
  return {iceLeft:rgba(Math.round(left),ground(left)+237),iceRight:rgba(Math.round(right),ground(right)+237),air:rgba(x,upperBottom+10),branch:rgba(x,ground(x,g.land.bottom(x,lower))+2),gap:lower-upperBottom};
 });
 expect(ice.iceLeft[3]).toBe(255);expect(ice.iceRight[3]).toBe(255);expect(ice.air[3]).toBe(0);expect(ice.branch).toEqual([130,141,111,255]);expect(ice.gap).toBeGreaterThan(55);
 await page.screenshot({path:`.workbuddy/v${version}-ice-rims-ipad-${browserName}.png`,scale:'css',animations:'disabled'});
});
