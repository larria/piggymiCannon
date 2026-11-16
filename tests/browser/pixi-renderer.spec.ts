import {test,expect} from '@playwright/test';
import {build} from 'esbuild';import {execFileSync} from 'node:child_process';import {writeFileSync} from 'node:fs';
import {boot} from './qa-app';
test('bounded Pixi terrain tiles match Canvas fallback in all six original-scale maps',async({page,browserName})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const report=await page.evaluate(()=>{const cases=[];for(const map of ['valley','coast','moon','factory','temple','egypt']){
  const q=(window as any).__qa;q.newMatch({...q.game.config,map,mapChoice:map,fog:false,fireLine:false,snow:false},true);const g=(window as any).__qa.game,r=q.renderer;g.paused=true;
  for(const fraction of [.2,.5,.8]){r.camera.center(g.worldWidth*fraction,g.worldHeight*.75,false);r.offsetX=Math.round(r.offsetX*r.ratio)/r.ratio;r.offsetY=Math.round(r.offsetY*r.ratio)/r.ratio;r.invalidate();r.stage.signature='';r.draw(0);
   const combined=document.createElement('canvas');combined.width=r.canvas.width;combined.height=r.canvas.height;const ctx=combined.getContext('2d')!;ctx.drawImage(r.stage.canvas,0,0);ctx.drawImage(r.canvas,0,0);const a=ctx.getImageData(0,0,combined.width,combined.height).data;
   const stage=r.stage;r.stage=null;r.invalidate();r.draw(0);const b=r.ctx.getImageData(0,0,combined.width,combined.height).data;r.stage=stage;r.invalidate();r.draw(0);let sum=0,large=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;if(d>12)large++;}cases.push({map,fraction,mean:sum/a.length,largeFraction:large/a.length});
  }
 }return cases;});writeFileSync(`QA/v3.2.0-${browserName}-pixel-comparison.json`,JSON.stringify(report,null,2));
 for(const row of report){expect(row.mean,JSON.stringify(row)).toBeLessThan(.3);expect(row.largeFraction,JSON.stringify(row)).toBeLessThan(.002);}
});
test('Pixi loses and restores context, preserves the fallback and reuses resources across 50 matches',async({page,browserName})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,stage=r.stage;for(let i=0;i<50;i++){q.newMatch({...q.game.config,map:i%2?'factory':'temple',mapChoice:undefined},true);r.draw(0);}const g=(window as any).__qa.game;g.paused=true;r.invalidate();r.draw(0);const frames=r.frames,dial=q.dashboard.dialFrames;for(let i=0;i<240;i++){r.draw(1/60);q.dashboard.draw(g,g.active,r.offsetY,r.viewHeight);}return {sameStage:r.stage===stage,textures:r.stage.textureCount,canvasCount:document.querySelectorAll('.pixi-battle-layer').length,pauseFrames:r.frames-frames,dialFrames:q.dashboard.dialFrames-dial};});
 expect(data.sameStage).toBe(true);expect(data.textures).toBeLessThanOrEqual(25);expect(data.canvasCount).toBe(1);expect(data.pauseFrames).toBe(0);expect(data.dialFrames).toBeLessThanOrEqual(1);
 const supported=await page.evaluate(()=>{const r=(window as any).__qa.renderer;const ext=r.stage.app.renderer.gl.getExtension('WEBGL_lose_context');(window as any).__lose=ext;if(ext)ext.loseContext();return Boolean(ext);});expect(supported).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('canvas');
 await page.waitForTimeout(150);await page.evaluate(()=>(window as any).__lose.restoreContext());
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 writeFileSync(`QA/v3.2.0-${browserName}-lifecycle.json`,JSON.stringify({formatVersion:1,...data,realContextRecovery:supported},null,2));
});
test('fractional canvas height does not cause repeated GPU resize or submission',async({page})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const result=await page.evaluate(()=>{const r=(window as any).__qa.renderer,s=r.stage,before=s.frames;for(let i=0;i<200;i++){s.sync(false,r.terrainTiles.all(),[],2,377.333);s.draw(0,0,0,0,377.333);}const data={frames:s.frames-before,height:s.app.screen.height,pixels:s.canvas.height};s.sync(false,r.terrainTiles.all(),[],r.ratio,r.viewHeight);r.invalidate();return data;});
 expect(result).toEqual({frames:1,height:377,pixels:754});
});
test('renderer initialization failure keeps the complete Canvas fallback',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.apply(this,[type,...args] as any);};});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('canvas');expect(errors).toEqual([]);
});
test('background restore preserves pause state, cancels charge and never advances hidden time',async({page})=>{
 await boot(page);await page.keyboard.down('Space');await page.waitForTimeout(100);
 const before=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));const q=(window as any).__qa;return {elapsed:q.game.elapsed,frames:q.renderer.frames,shots:q.game.active.shots};});
 await page.waitForTimeout(350);
 expect(await page.evaluate(()=>(window as any).__qa.game.elapsed)).toBe(before.elapsed);
 expect(await page.evaluate(()=>(window as any).__qa.renderer.frames)).toBe(before.frames);
 await page.keyboard.up('Space');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.evaluate(()=>(window as any).__qa.game.paused)).toBe(false);
 expect(await page.evaluate(()=>(window as any).__qa.game.active.shots)).toBe(before.shots);
});
