import {test,expect} from '@playwright/test';import {boot} from './qa-app';
async function arrange(page:any,distance=56){
 await boot(page);await page.evaluate((distance:number)=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,map:'valley',timer:0,fog:false,fireLine:false,selfDamage:false,friendlyFire:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,team:i%2,controller:'human',vehicle:'cannon'}))},true);
  const g=(window as any).__qa.game;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.wind=0;
  g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:[220,220+distance,70,1180][i],y:432,hp:920,maxHP:920,fallVelocity:0,direction:i%2?-1:1}));g.active.angle=45;g.active.power=68;
  const update=g.update.bind(g);let frozen=false;g.update=(dt:number)=>{if(!frozen)update(dt);};
  const damage=g.damage.bind(g);g.damage=(t:any,...args:any[])=>{const hp=t.hp;damage(t,...args);if(t.id===1&&t.hp<hp)frozen=true;};
  (window as any).__tapEvents=[];for(const id of ['fire-button','power-meter'])for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','click'])document.getElementById(id)!.addEventListener(type,(e:any)=>(window as any).__tapEvents.push({type,pointer:e.pointerId,pointerType:e.pointerType,detail:e.detail,lastPower:g.tanks[0].lastPower,shots:g.tanks[0].shots}));(window as any).__qa.updateUI();
 },distance);
}
for(const width of [1194,1210])test(`${width} iPad: native short taps on fire and force meter fire minimum and hit a close enemy`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['fire-button','power-meter']){
  await arrange(page,width===1194?56:90);const r=await page.locator('#'+id).boundingBox();await page.touchscreen.tap(r!.x+r!.width/2,r!.y+r!.height/2);
  const shot=await page.evaluate(()=>{const g=(window as any).__qa.game;return {shots:g.tanks[0].shots,power:g.tanks[0].lastPower,events:(window as any).__tapEvents};});expect(shot.shots).toBe(1);expect(shot.power).toBe(1);expect(shot.events.some((e:any)=>e.type==='pointerdown'&&e.pointerType==='touch')).toBe(true);expect(shot.events.some((e:any)=>e.type==='pointerup')).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[1].hp),{timeout:8000}).toBeLessThan(920);
  expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].hp)).toBe(920);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[2].hp)).toBe(920);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>{const boxes=(window as any).__qa.renderer.labelRects;return boxes.length===4&&boxes.every((a:any,i:number)=>boxes.slice(i+1).every((b:any)=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));})).toBe(true);
  await page.screenshot({path:`QA/v2.2.4-tap-${browserName==='webkit'?'webkit-':''}${id}-${width}.png`});
 }
 expect(errors).toEqual([]);
});
test('early capture loss and another pointer cancellation do not cancel the active quick tap; late loss cannot restore power',async({page})=>{
 await arrange(page);await page.evaluate(()=>{const fire=document.getElementById('fire-button')!,bar=document.getElementById('power-meter')!;
  fire.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:701,pointerType:'touch',buttons:1}));
  fire.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId:701,pointerType:'touch'}));
  bar.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:702,pointerType:'touch'}));
  document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:701,pointerType:'touch'}));
  fire.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId:701,pointerType:'touch'}));
 });
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].lastPower)).toBe(1);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(1);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[1].hp)).toBeLessThan(920);
});
test('a genuine cancellation restores previous power and does not shoot on subsequent release/click',async({page})=>{
 await arrange(page);await page.evaluate(()=>{const fire=document.getElementById('fire-button')!;for(const type of ['pointerdown','pointercancel','lostpointercapture','pointerup'])fire.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:703,pointerType:'touch'}));fire.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));});
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(0);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].power)).toBe(68);await expect(page.locator('#fire-button')).toBeEnabled();
});
test('SPACE and intentional long touch holds retain normal charging and early release',async({page})=>{
 await arrange(page,600);await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');const space=await page.evaluate(()=>(window as any).__qa.game.tanks[0].lastPower);expect(space).toBeGreaterThan(9);expect(space).toBeLessThan(20);
 await arrange(page,600);await page.locator('#power-meter').dispatchEvent('pointerdown',{pointerId:704,pointerType:'touch',bubbles:true});await page.waitForTimeout(500);await page.locator('#power-meter').dispatchEvent('pointerup',{pointerId:704,pointerType:'touch',bubbles:true});const touch=await page.evaluate(()=>(window as any).__qa.game.tanks[0].lastPower);expect(touch).toBeGreaterThan(9);expect(touch).toBeLessThan(20);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(1);
});
test('a battlefield touch continues to aim without firing or changing previous power',async({page})=>{
 await arrange(page);const r=await page.locator('#battlefield').boundingBox();await page.touchscreen.tap(r!.x+r!.width*.65,r!.y+r!.height*.4);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(0);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].power)).toBe(68);
});
test('a full touch hold automatically fires once at 100 before release and late capture loss',async({page})=>{
 await arrange(page,600);await page.locator('#power-meter').dispatchEvent('pointerdown',{pointerId:705,pointerType:'touch',bubbles:true});
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[0].shots),{timeout:5000}).toBe(1);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].lastPower)).toBe(100);
 await page.locator('#power-meter').dispatchEvent('pointerup',{pointerId:705,pointerType:'touch',bubbles:true});await page.locator('#power-meter').dispatchEvent('lostpointercapture',{pointerId:705,pointerType:'touch',bubbles:true});expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].shots)).toBe(1);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].lastPower)).toBe(100);
});
