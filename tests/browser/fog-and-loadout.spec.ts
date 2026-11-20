import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {boot} from './qa-app';
const version=JSON.parse(readFileSync('package.json','utf8')).version;

test('dense fog preserves distant terrain and shells but hides enemy hulls, portraits, minimap dots and locks',async({page,browserName})=>{
 await boot(page,true,'coast');
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const visibility=await page.evaluate(()=>{
  let q=(window as any).__qa;
  q.newMatch({...q.game.config,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:i%2?'ai':'human',team:i%2,vehicle:i===2?'beetle':'cannon'}))},true);
  q=(window as any).__qa;const {game:g,renderer:r,recorder}=q;recorder.detach();g.update=()=>{};g.phase='aiming';g.fog=true;g.fogTurnsRemaining=1;
  g.wind=0;g.fireLine=null;g.blasts=[];g.crates=[];g.particles=[];g.texts=[];g.gases=[];g.fires=[];
  const center=g.worldWidth/2,x=center+305,ground=g.ground(x);
  g.tanks.forEach((t:any,i:number)=>{const tx=center+[-290,-175,-12,305][i];Object.assign(t,{x:tx,y:g.ground(tx)-18,fallVelocity:0});});
  g.current=0;r.focusAt(center,ground-155);r.draw(.5);r.draw(0);
  const shell=g.launch(g.tanks[1],'duke-normal');Object.assign(shell,{x,y:ground-105,vx:250,vy:95,delay:0,phase:0,age:1,homing:false});
  g.projectiles=[shell];r.draw(0);q.updateUI();
  return {portraits:r.portraitHits.map((p:any)=>p.id),distance:x-g.active.x,shell:[(x-r.offsetX)/r.viewWidth,(shell.y-r.offsetY)/r.viewHeight]};
 });
 expect(visibility.portraits).toEqual([2,0]);expect(visibility.distance).toBeGreaterThan(460);
 expect(visibility.shell.every(p=>p>.1&&p<.9)).toBe(true);
 await page.screenshot({path:`.workbuddy/v${version}-fog-ipad-${browserName}.png`,scale:'css',animations:'disabled'});
 const pixels=await page.evaluate(()=>{
  const {game:g,renderer:r,dashboard:d}=(window as any).__qa,shell=g.projectiles[0],stage=r.stage;
  const x=shell.x,y=shell.y,ground=g.ground(x);
  const around=(cy:number)=>Array.from(r.ctx.getImageData(Math.round((x-r.offsetX)*r.ratio)-20,Math.round((cy-r.offsetY)*r.ratio)-15,40,30).data as Uint8ClampedArray);
  const diff=(a:number[],b:number[])=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
  const color=(x:number,y:number)=>Array.from(r.ctx.getImageData(Math.round((x-r.offsetX)*r.ratio),Math.round((y-r.offsetY)*r.ratio),1,1).data as Uint8ClampedArray);
  const shotContrast=(fog:boolean)=>{g.fog=fog;g.projectiles=[shell];r.draw(0);const withShell=around(y);g.projectiles=[];r.draw(0);return diff(withShell,around(y));};
  const pixi=[shotContrast(false),shotContrast(true)];
  r.stage=null;
  const canvas=[shotContrast(false),shotContrast(true)];
  const edge=(fog:boolean)=>{g.fog=fog;r.draw(0);return diff(color(x,ground-4),color(x,ground+16));};
  const terrain=[edge(false),edge(true)];
  r.stage=stage;g.current=1;g.fog=true;r.draw(0);
  const drawMap=()=>d.draw(g,g.dashboardTank,r.offsetY,r.viewHeight,r.offsetX,r.viewWidth);drawMap();
  const pulse=(document.querySelector('.minimap-turn-pulse') as HTMLElement).hidden;
  const mini=document.querySelector<HTMLCanvasElement>('#minimap')!.getContext('2d')!;
  const enemy=g.tanks[1],marker=()=>Array.from(mini.getImageData(Math.floor(enemy.x/g.worldWidth*300),Math.floor(enemy.y/g.worldHeight*168),1,1).data);
  const fogDot=marker();g.fog=false;drawMap();const clearDot=marker();
  g.current=0;g.fog=true;
  Object.assign(shell,{homing:true,lockTarget:1,lockX:enemy.x,lockY:enemy.y});g.projectiles=[shell];
  const cover=()=>{return Array.from(r.ctx.getImageData(Math.round((enemy.x-r.offsetX)*r.ratio)-22,Math.round((enemy.y-r.offsetY)*r.ratio)-18,44,36).data as Uint8ClampedArray);};
  r.draw(0);const hiddenLock=cover();shell.lockTarget=null;r.draw(0);const withoutLock=cover();
  return {pixi,canvas,terrain,pulse,fogDot,clearDot,lockDiff:diff(hiddenLock,withoutLock)};
 });
 for(const [clear,foggy] of [pixels.pixi,pixels.canvas,pixels.terrain]){expect(foggy).toBeGreaterThan(0);expect(foggy).toBeLessThan(clear*.65);}
 expect(pixels.pulse).toBe(true);expect(pixels.fogDot).not.toEqual(pixels.clearDot);expect(pixels.lockDiff).toBe(0);
});

test('fog cannot reveal an enemy position through portrait or camera follow',async({page})=>{
 await boot(page,true,'coast');
 await page.evaluate(()=>{
  const {game:g,renderer:r,updateUI}=(window as any).__qa;g.update=()=>{};g.fog=true;g.phase='aiming';r.follow(false);updateUI();
 });
 await page.locator('[data-portrait="1"]').click();
 expect(await page.evaluate(()=>(window as any).__qa.renderer.camera.manual)).toBeNull();
 await page.locator('[data-portrait="0"]').click();
 expect(await page.evaluate(()=>(window as any).__qa.renderer.camera.manual)).not.toBeNull();
 const positions=await page.evaluate(()=>{
  const {game:g,renderer:r}=(window as any).__qa,enemy=g.tanks[1];
  g.active.x=100;Object.assign(enemy,{x:g.worldWidth-100,y:g.worldHeight-100,fallVelocity:100});
  r.camera.center(0,0);r.follow(false);
  const start=r.offsetX;
  enemy.controller='ai';g.current=1;r.follow();r.draw(1);const heldDuringTurn=r.offsetX;
  g.phase='resolving';g.observation={kind:'fall',target:enemy.id,point:{x:enemy.x,y:enemy.y}};
  r.draw(1);const heldDuringFall=r.offsetX;
  g.observation={kind:'ground',target:null,point:{x:g.worldWidth*.7,y:g.worldHeight*.6}};
  r.draw(1);const atImpact=r.offsetX;
  return {start,heldDuringTurn,heldDuringFall,atImpact};
 });
 expect(positions.heldDuringTurn).toBe(positions.start);expect(positions.heldDuringFall).toBe(positions.start);
 expect(positions.atImpact).toBeGreaterThan(positions.start+50);
});

test('a spent slot still shows its pending double after skipping, and a picked-up duplicate stays disabled until launch',async({page})=>{
 await boot(page,true,'coast');
 const quick=page.locator('#quick-items');await quick.locator('[data-item="double"]').click();
 await expect(quick.getByRole('button',{name:/双发待发/})).toBeDisabled();
 const carried=await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game;q.recorder.detach();const pilot=g.active;
  g.skipTurn();if(g.phase==='handoff')g.acceptHandoff();for(let i=0;g.current!==pilot.id&&i<5;i++){g.skipTurn();if(g.phase==='handoff')g.acceptHandoff();}q.updateUI();
  return {id:g.current,owner:pilot.id,loaded:g.active.doubleShot};
 });
 expect(carried).toMatchObject({id:carried.owner,loaded:true});await expect(quick.getByRole('button',{name:/双发待发/})).toBeDisabled();
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.active.items.double++;q.updateUI();});
 await expect(quick.locator('[data-item="double"]')).toBeDisabled();
 await expect(quick.locator('[data-item="double"]')).toHaveAttribute('data-help-description','已装填双发');
 await page.locator('#fire-button').click();
 await expect(quick.locator('.queued-item-chip,.pending-shot-item')).toHaveCount(0);
});
