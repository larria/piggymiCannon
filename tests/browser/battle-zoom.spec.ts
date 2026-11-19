import {test,expect} from '@playwright/test';import {wheelZoomFactor} from '../../src/battle-zoom';import {boot} from './qa-app';import {writeFileSync} from 'node:fs';
const errors=new WeakMap<object,string[]>();
test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
async function setup(page:any){await page.addInitScript(()=>{Date.now=()=>52;});await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');await page.evaluate(()=>{let q=(window as any).__qa;q.newMatch({...q.game.config,map:'factory',mapChoice:'factory',timer:0,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:['cannon','duke','mine','water'][i],team:i%2}))},true);q=(window as any).__qa;const g=q.game;q.recorder.detach();g.update=()=>{};g.tanks.forEach((t:any,i:number)=>{t.x=[830,1130,1490,1850][i];t.y=g.support(t.x,g.worldHeight*.29+1)-18;t.fallVelocity=0;});q.renderer.focusAt(1344,g.worldHeight*.29+90);q.updateUI();});await page.waitForTimeout(500);}
async function info(page:any){return page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer;return {zoom:r.zoom,w:r.viewWidth,h:r.viewHeight,x:r.offsetX,y:r.offsetY,ratio:r.ratio,raster:[r.canvas.width,r.canvas.height],gpuRaster:[r.stage.canvas.width,r.stage.canvas.height],tiles:r.stage.tiles.length,uploads:r.stage.uploads,static:[r.staticTerrain.width,r.staticTerrain.height],world:q.game.worldWidth,angle:q.game.active.angle,power:q.game.active.power,snapshot:JSON.stringify(q.game.battleSnapshot()),viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1};});}
const devices=[{name:'pc',width:1512,height:982,touch:false},{name:'ipad',width:1194,height:834,touch:true},{name:'phone-landscape',width:844,height:390,touch:true},{name:'phone-portrait',width:390,height:844,touch:true}];
for(const device of devices)test.describe(device.name,()=>{
 test.use({viewport:{width:device.width,height:device.height},deviceScaleFactor:2,isMobile:device.touch,hasTouch:device.touch});
 test('wheel zoom uses approved initial size, keeps the anchor and retained textures, and follows after locating',async({page,browserName})=>{
  await setup(page);const initial=await info(page);expect(initial.zoom).toBe(1);const box=(await page.locator('#battlefield').boundingBox())!;
  await page.evaluate(()=>document.querySelector('#battlefield')!.addEventListener('wheel',e=>{const w=e as WheelEvent;(window as any).__zoomWheel={delta:w.deltaY,mode:w.deltaMode,pinch:w.ctrlKey,x:w.clientX,y:w.clientY};},{once:true}));const anchor={x:box.x+box.width*.5,y:box.y+box.height*.5};await page.mouse.move(anchor.x,anchor.y);if(browserName==='webkit'&&device.touch)await page.locator('#battlefield').dispatchEvent('wheel',{deltaY:-90,deltaMode:0,clientX:anchor.x,clientY:anchor.y});else await page.mouse.wheel(0,-90);await page.waitForTimeout(200);const after=await info(page);
  const event=await page.evaluate(()=>(window as any).__zoomWheel);expect(event.delta).toBeLessThan(0);expect(after.zoom).toBeCloseTo(wheelZoomFactor(event.delta,event.mode,event.pinch),5);expect(after.w*after.zoom).toBeCloseTo(initial.w,6);const u=(event.x-box.x)/box.width,v=(event.y-box.y)/box.height;expect(after.x+after.w*u).toBeCloseTo(initial.x+initial.w*u,3);expect(after.y+after.h*v).toBeCloseTo(initial.y+initial.h*v,3);
  expect(after.snapshot).toBe(initial.snapshot);expect(after.raster).toEqual(initial.raster);expect(after.gpuRaster).toEqual(initial.gpuRaster);expect(after.static).toEqual(initial.static);expect(after.uploads).toBe(initial.uploads);expect(after.viewport).toEqual(initial.viewport);expect(after.overflow).toBe(false);
  await page.evaluate(()=>{const r=(window as any).__qa.renderer;for(let i=0;i<60;i++){r.zoomBy(i%2?1/1.01:1.01);r.draw(0);}});expect((await info(page)).uploads).toBe(initial.uploads);
  const mini=(await page.locator('#minimap').boundingBox())!;await page.mouse.click(mini.x+mini.width*.8,mini.y+mini.height*.6);await page.waitForTimeout(400);await page.locator('#minimap-follow').click();await page.waitForTimeout(400);
  const followed=await info(page);const actor=await page.evaluate(()=>(window as any).__qa.game.active.x);expect(followed.x).toBeCloseTo(Math.max(0,Math.min(followed.world-followed.w,actor-followed.w/2)),0);expect(followed.zoom).toBeCloseTo(after.zoom,6);
  // Inspect the factory's slanted platform edges without changing the player's controls.
  await page.evaluate(landscape=>{const q=(window as any).__qa;q.renderer.focusAt(1344,q.game.worldHeight*.29+(landscape?-18:90));},device.name==='phone-landscape');await page.waitForTimeout(400);
  const final=await info(page);writeFileSync(`QA/v5.0.10-zoom-${device.name}-${browserName}.json`,JSON.stringify({device,initial:{...initial,snapshot:undefined},zoomed:{...after,snapshot:undefined},final:{...final,snapshot:undefined}},null,2));
  if(process.env.PIGGY_ZOOM_CAPTURE===device.name)await page.screenshot({path:`QA/v5.0.10-zoom-${device.name}-${browserName}.png`,scale:'css'});
 });
});
async function pointer(page:any,type:string,id:number,x:number,y:number){await page.locator('#battlefield').dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===71,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,bubbles:true});}
test('two-touch pinch pans and zooms, consumes release/hold, and recovers after cancellation',async({page})=>{
 await setup(page);const before=await info(page),b=(await page.locator('#battlefield').boundingBox())!,y=b.y+b.height*.7,x=b.x+b.width*.5;
 await pointer(page,'pointerdown',71,x-40,y);await pointer(page,'pointerdown',72,x+40,y);await pointer(page,'pointermove',72,x+80,y);await pointer(page,'pointermove',71,x-60,y);
 await pointer(page,'pointerup',71,x-60,y);await pointer(page,'pointerup',72,x+80,y);await page.waitForTimeout(650);const pinched=await info(page);expect(pinched.zoom).toBeCloseTo(1.75,5);expect(pinched.snapshot).toBe(before.snapshot);expect(pinched.uploads).toBe(before.uploads);await expect(page.locator('.portrait-view')).toHaveCount(0);
 await pointer(page,'pointerdown',71,x-40,y);await pointer(page,'pointerdown',72,x+40,y);await pointer(page,'pointercancel',71,x-40,y);await pointer(page,'pointerup',72,x+40,y);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+50,y,{steps:6});await page.mouse.up();expect((await info(page)).x).not.toBe(pinched.x);expect((await info(page)).angle).toBe(before.angle);
});
test('trackpad ctrl-wheel and Safari gesture scale each apply once without page zoom',async({page})=>{
 await setup(page);const b=(await page.locator('#battlefield').boundingBox())!,anchor={clientX:b.x+b.width/2,clientY:b.y+b.height/2};const initial=await info(page);
 await page.locator('#battlefield').dispatchEvent('wheel',{...anchor,deltaY:-20,ctrlKey:true,deltaMode:0});expect((await info(page)).zoom).toBeCloseTo(Math.exp(.18),5);
 await page.evaluate(anchor=>{const field=document.querySelector('#battlefield')!;for(const [type,scale] of [['gesturestart',1],['gesturechange',1.2],['gestureend',1.2]] as const){const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,anchor,{scale});field.dispatchEvent(e);}},anchor);
 const next=await info(page);expect(next.zoom).toBeCloseTo(Math.exp(.18)*1.2,5);expect(next.viewport).toEqual(initial.viewport);expect(next.snapshot).toBe(initial.snapshot);
});
test('paused zoom redraws once; bounds, orientation change, new match and popup isolation remain valid',async({page})=>{
 await setup(page);await page.evaluate(()=>{const q=(window as any).__qa;q.game.paused=true;q.renderer.draw(0);q.renderer.zoomBy(10);q.renderer.draw(.01);});const max=await info(page);expect(max.zoom).toBe(1.8);
 const frames=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,n=r.frames;r.draw(.01);return r.frames-n;});expect(frames).toBe(0);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);const rotated=await info(page);expect(rotated.zoom).toBe(1.8);expect(rotated.w).toBeLessThanOrEqual(rotated.world);expect(rotated.x).toBeGreaterThanOrEqual(0);expect(rotated.x+rotated.w).toBeLessThanOrEqual(rotated.world+.01);
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.paused=false;q.renderer.zoomBy(.001);});const min=await info(page);expect(min.zoom).toBeGreaterThanOrEqual(.7);expect(min.w).toBeLessThanOrEqual(min.world);
 await page.locator('.battle-stage [data-dialog="settings"]').click();await page.locator('#battlefield').dispatchEvent('wheel',{deltaY:-100});expect((await info(page)).zoom).toBe(min.zoom);
 await page.evaluate(()=>{const q=(window as any).__qa;q.newMatch({...q.game.config},true);});expect((await info(page)).zoom).toBe(1);
});
test('Canvas fallback uses the same zoom and cannot invalidate retained terrain on every gesture',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(original as any).apply(this,[type,...args]);} as any;});
 await boot(page);await page.evaluate(()=>{const q=(window as any).__qa;q.game.update=()=>{};q.renderer.focusAt(1344,500);q.renderer.draw(0);});await page.waitForTimeout(400);
 const before=await page.evaluate(()=>{const r=(window as any).__qa.renderer;return {backend:r.backend,staticRatio:r.staticRatio,size:[r.staticTerrain.width,r.staticTerrain.height],ratio:r.ratio};});
 await page.evaluate(()=>{const r=(window as any).__qa.renderer;r.zoomBy(1.4);r.draw(0);});const after=await page.evaluate(()=>{const r=(window as any).__qa.renderer;return {backend:r.backend,zoom:r.zoom,staticRatio:r.staticRatio,size:[r.staticTerrain.width,r.staticTerrain.height],ratio:r.ratio};});
 expect(before.backend).toBe('canvas');expect(after.zoom).toBe(1.4);expect(after.size).toEqual(before.size);expect(after.staticRatio).toBe(before.staticRatio);expect(after.ratio).toBeCloseTo(before.ratio*1.4,8);
});

test('native multi-touch dispatch zooms the field without changing aim or triggering a page gesture',async({page,context,browserName})=>{
 await setup(page);const before=await info(page),b=(await page.locator('#battlefield').boundingBox())!,x=b.x+b.width*.5,y=b.y+b.height*.75;
 if(browserName==='chromium'){
  const cdp=await context.newCDPSession(page);const points=(spread:number)=>[{x:x-spread,y,id:71},{x:x+spread,y,id:72}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(40)});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(64)});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{
  await pointer(page,'pointerdown',71,x-40,y);await pointer(page,'pointerdown',72,x+40,y);await pointer(page,'pointermove',71,x-64,y);await pointer(page,'pointermove',72,x+64,y);await pointer(page,'pointerup',71,x-64,y);await pointer(page,'pointerup',72,x+64,y);
 }
 await page.waitForTimeout(250);const after=await info(page);expect(after.zoom).toBeCloseTo(1.6,3);expect(after.snapshot).toBe(before.snapshot);expect(after.viewport).toEqual(before.viewport);expect(after.uploads).toBe(before.uploads);
});
