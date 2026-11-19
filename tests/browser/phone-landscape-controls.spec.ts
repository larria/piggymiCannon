import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
import {portraitViewWidth} from '../../src/portrait-viewport';

async function ready(page:any){
 await boot(page);
 await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game;
  g.update=()=>{};g.wind=0;g.fog=false;g.land.mask.fill(0);g.land.protectedMask.fill(0);
  for(let x=0;x<g.worldWidth;x++)g.land.column(x,600,g.worldHeight);
  g.land.rebuild();g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:700+i*550,y:582,fallVelocity:0}));
  Object.assign(g.active,{minAngle:0,maxAngle:90,angle:35,power:1,lastPower:65,powerMarker:80,direction:1});
  g.active.ammo.homing=2;q.renderer.follow(true);q.updateUI();
 });
}
async function tap(page:any,selector:string){const r=(await page.locator(selector).boundingBox())!;await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);}

for(const viewport of [{width:844,height:390},{width:667,height:375},{width:568,height:320}])test.describe(`${viewport.width}px landscape controls`,()=>{
 test.use({viewport,isMobile:true,hasTouch:true});
 test('bonus weapon, dial, fine adjustment, marking and charging remain usable in the compact deck',async({page})=>{
  await ready(page);await expect(page.locator('#weapon-bonus')).toBeVisible();
  const controls=['#weapon-normal','#weapon-special','#weapon-bonus','.quick-items button','#move-left','#move-right','#angle-up','#angle-down','#skip-button','#exit-match','#fire-button'];
  const rects=await page.locator(controls.join(',')).evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {id:e.id||e.getAttribute('data-item'),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:s.width,min:s.minWidth,max:s.maxWidth,key:s.getPropertyValue('--landscape-key'),viewport:innerWidth};}));
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
   const a=rects[i],b=rects[j];expect(Math.min(a.right,b.right)<=Math.max(a.x,b.x)||Math.min(a.bottom,b.bottom)<=Math.max(a.y,b.y),JSON.stringify({a,b,rects})).toBe(true);
  }
  for(const id of ['weapon-normal','weapon-special','weapon-bonus','move-left','move-right','angle-up','angle-down','skip-button','exit-match','fire-button'])await page.locator('#'+id).click({trial:true});
  await tap(page,'#angle-up');expect(await page.evaluate(()=>(window as any).__qa.game.active.angle)).toBe(36);
  const down=(await page.locator('#angle-down').boundingBox())!;await page.mouse.move(down.x+down.width/2,down.y+down.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
  const held=await page.evaluate(()=>(window as any).__qa.game.active.angle);expect(held).toBeLessThan(35);await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).__qa.game.active.angle)).toBe(held);
  const pad=(await page.locator('#aim-pad').boundingBox())!,angle=40*Math.PI/180;
  await page.locator('#aim-pad').evaluate(e=>e.addEventListener('pointerdown',event=>{const p=event as PointerEvent;(window as any).__dialTouch={x:p.clientX,y:p.clientY};},{once:true}));
  await page.touchscreen.tap(pad.x+pad.width/2+Math.cos(angle)*28,pad.y+pad.height/2-Math.sin(angle)*28);
  const actualAim=await page.evaluate(()=>{const q=(window as any).__qa,r=document.querySelector('#aim-pad')!.getBoundingClientRect(),p=(window as any).__dialTouch,dx=p.x-r.x-r.width/2,dy=p.y-r.y-r.height/2;return {angle:q.game.active.angle,expected:Math.atan2(-dy,Math.abs(dx))*180/Math.PI+(dx<0?-1:1)*q.game.tankSlope(q.game.active)*180/Math.PI};});
  expect(actualAim.angle).toBeCloseTo(actualAim.expected,5);
  await tap(page,'#face-button');expect(await page.evaluate(()=>(window as any).__qa.game.active.direction)).toBe(-1);
  const power=(await page.locator('#power-meter').boundingBox())!;await page.touchscreen.tap(power.x+power.width*.7,power.y+power.height/2);
  expect(await page.evaluate(()=>(window as any).__qa.game.active.powerMarker)).toBeCloseTo(70,0);
  await expect(page.locator('#previous-power')).toBeVisible();await expect(page.locator('#power-marker')).toBeVisible();
  const art=await page.locator('#weapon-switcher canvas').evaluateAll(elements=>elements.map(e=>{const c=e as HTMLCanvasElement,r=c.getBoundingClientRect(),pixels=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;return {shape:c.dataset.shell,w:r.width,h:r.height,sourceAspect:c.width/c.height,visible:getComputedStyle(c.parentElement!).display,alpha:[...pixels].filter((_,i)=>i%4===3).filter(x=>x>20).length};}));
  expect(art.every(c=>c.w>0&&c.h>0&&c.alpha>20),JSON.stringify(art)).toBe(true);
  for(const canvas of art)expect(canvas.w/canvas.h,canvas.shape).toBeCloseTo(canvas.sourceAspect,3);
  if(process.env.PIGGY_LANDSCAPE_CAPTURE===String(viewport.width))await page.screenshot({path:`QA/phone-landscape-draft-controls-${viewport.width}.png`,scale:'css'});
  const fire=(await page.locator('#fire-button').boundingBox())!;await page.mouse.move(fire.x+fire.width/2,fire.y+fire.height/2);await page.mouse.down();await page.waitForTimeout(350);
  const before=await page.locator('#charge-fill').boundingBox();await page.waitForTimeout(350);const after=await page.locator('#charge-fill').boundingBox();expect(after!.width).toBeGreaterThan(before!.width+20);expect(after!.height).toBeGreaterThan(10);await page.mouse.up();
  expect(await page.evaluate(()=>(window as any).__qa.game.active.shots)).toBe(1);
 });
 test('rotation keeps camera aspect, Pixi scale and all simulation parameters consistent',async({page})=>{
  await ready(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
  const state=()=>page.evaluate(()=>{const q=(window as any).__qa,g=q.game;return {rng:g.battleSnapshot().rng,positions:g.tanks.map((t:any)=>({x:t.x,y:t.y,hp:t.hp})),wind:g.wind,motion:g.motionScale};});
  const before=await state();
  await page.setViewportSize({width:viewport.height,height:viewport.width});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.viewWidth)).toBeCloseTo(portraitViewWidth('5.0.7'),5);
  expect(await state()).toEqual(before);
  await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.viewHeight)).toBeCloseTo(630,4);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).__qa.renderer;return r.stage.app.renderer.resolution===r.ratio;})).toBe(true);
  const display=await page.evaluate(()=>{const r=(window as any).__qa.renderer,b=r.canvas.getBoundingClientRect();return {aspect:r.viewHeight/r.viewWidth,css:b.height/b.width,scale:r.stage.app.renderer.resolution,ratio:r.ratio,width:r.canvas.width,cssWidth:b.width,dpr:Math.min(devicePixelRatio,2)};});
  expect(display.aspect).toBeCloseTo(display.css,5);expect(display.scale).toBe(display.ratio);expect(Math.abs(display.width-display.cssWidth*display.dpr)).toBeLessThanOrEqual(1);
  expect(await state()).toEqual(before);await expect(page.locator('#relative-angle')).toBeVisible();await expect(page.locator('#absolute-angle')).toBeVisible();
 });
});
