import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('Pixi preparation preserves 13 vehicle textures, has one frame driver and releases resources',async({page,browserName})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tools/pixi3-lab/');await page.waitForFunction(()=>(window as any).__pixiProbe);
 const initial=await page.evaluate(()=>{const p=(window as any).__pixiProbe;return {version:(window as any).__pixiVersion,ticker:p.app.ticker.started,comparisons:p.textures.map((_:any,i:number)=>p.compare(i)),uploads:p.uploads};});
 expect(initial.ticker).toBe(false);expect(initial.uploads).toBe(13);
 for(const c of initial.comparisons){expect(c.width).toBe(320);expect(c.height).toBe(320);expect(c.opaquePixels).toBeGreaterThan(400);expect(c.meanChannelError).toBeLessThan(.1);expect(c.maxChannelError).toBeLessThanOrEqual(2);expect(c.largeErrorFraction).toBe(0);}
 const empty=await page.evaluate(()=>{try{(window as any).__pixiProbe.upload(Object.assign(document.createElement('canvas'),{width:0}));return false;}catch{return true;}});expect(empty).toBe(true);
 const benchmarks=[];
 for(const count of [4,100])for(const mode of ['paths','cached-canvas','pixi'])benchmarks.push(await page.evaluate(async({count,mode})=>(window as any).__pixiProbe.benchmark(count,mode),{count,mode}));
 expect(benchmarks.every(b=>b.uploads===13)).toBe(true);
 const lost=await page.evaluate(()=>{const p=(window as any).__pixiProbe,n=p.renders;p.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));p.render();const skipped=p.renders===n;p.canvas.dispatchEvent(new Event('webglcontextrestored'));p.render();return {skipped,resumed:p.renders===n+1};});expect(lost).toEqual({skipped:true,resumed:true});
 const disposed=await page.evaluate(()=>{const p=(window as any).__pixiProbe;p.destroy();p.destroy();return {textures:p.textures.length,sources:p.sources.length,render:p.render(),destroyed:p.destroyed};});expect(disposed).toEqual({textures:0,sources:0,render:false,destroyed:true});
 expect(errors).toEqual([]);
 writeFileSync(`QA/pixi3-${browserName}-texture-probe.json`,JSON.stringify({formatVersion:1,...initial,benchmarks,emptyRejected:empty,lifecycle:lost,disposed,errors,note:'Isolated static vehicle proof; 100 sprites is synthetic stress, actual game has <=4 tanks. Timings measure CPU submission only. This case injects lifecycle events; the separate context-recovery report exercises real GPU loss. Production fallback switching remains unimplemented.'},null,2)+'\n');
});
test('real WebGL context loss reuploads retained textures and resumes',async({page,browserName})=>{
 await page.goto('/tools/pixi3-lab/');await page.waitForFunction(()=>(window as any).__pixiProbe);
 const supported=await page.evaluate(()=>{const p=(window as any).__pixiProbe;const ext=p.app.renderer.gl.getExtension('WEBGL_lose_context');(window as any).__lossExtension=ext;if(ext)ext.loseContext();return Boolean(ext);});
 test.skip(!supported,'GPU does not expose WEBGL_lose_context; hardware recovery remains unverified');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pixiProbe.lost)).toBe(true);
 const skipped=await page.evaluate(()=>(window as any).__pixiProbe.render());expect(skipped).toBe(false);
 await page.waitForTimeout(150);await page.evaluate(()=>(window as any).__lossExtension.restoreContext());
 await expect.poll(()=>page.evaluate(()=>(window as any).__pixiProbe.lost)).toBe(false);
 const comparisons=await page.evaluate(()=>{const p=(window as any).__pixiProbe;return p.textures.map((_:any,i:number)=>p.compare(i));});
 for(const c of comparisons)expect(c.maxChannelError).toBeLessThanOrEqual(2);
 writeFileSync(`QA/pixi3-${browserName}-context-recovery.json`,JSON.stringify({formatVersion:1,supported,skippedDrawWhileLost:skipped===false,comparisons,scope:'Real WEBGL_lose_context loss/restore; same live renderer and retained CPU texture sources. Production fallback switching is not yet implemented.'},null,2)+'\n');
 await page.evaluate(()=>(window as any).__pixiProbe.destroy());
});
