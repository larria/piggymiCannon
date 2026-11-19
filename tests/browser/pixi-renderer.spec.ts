import {test,expect} from '@playwright/test';
import {build} from 'esbuild';import {execFileSync} from 'node:child_process';import {writeFileSync,readFileSync} from 'node:fs';
import {boot} from './qa-app';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
const oldSource=execFileSync('git',['show','pre-pixi-v3.0.0:src/renderer.ts'],{encoding:'utf8'});
const oldVehicle=execFileSync('git',['show','pre-pixi-v3.0.0:src/vehicle-art.ts'],{encoding:'utf8'});
const legacy=build({stdin:{contents:oldSource,resolveDir:process.cwd()+'/src',loader:'ts'},bundle:true,write:false,format:'esm',define:{'import.meta.env.BASE_URL':'"/piggymiCannon/"'},plugins:[{name:'original-vehicle-art',setup(b){b.onLoad({filter:/\/vehicle-art\.ts$/},()=>({contents:oldVehicle,loader:'ts',resolveDir:process.cwd()+'/src'}));}}]}).then(r=>r.outputFiles[0].text);
test('retained Pixi world matches Canvas in six expanded maps; body sizes and poses match the pre-Pixi release',async({page,browserName})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 await page.route('**/legacy-renderer.js',async route=>route.fulfill({contentType:'text/javascript',body:await legacy}));
 const report=await page.evaluate(async()=>{
  const {Renderer:Legacy}=await import('/legacy-renderer.js' as string),q=(window as any).__qa,r=q.renderer;
  const c=document.createElement('canvas');Object.assign(c.style,{position:'fixed',left:'-5000px',width:r.canvas.clientWidth+'px',height:r.canvas.clientHeight+'px'});document.body.append(c);
  const old=new Legacy(c,q.game);old.draw(0);await new Promise(resolve=>setTimeout(resolve,600));const cases=[];
  for(const map of ['valley','coast','moon','factory','temple','egypt']){
   const originalNow=Date.now;try{Date.now=()=>300300+['valley','coast','moon','factory','temple','egypt'].indexOf(map);q.newMatch({...q.game.config,map,mapChoice:undefined,fog:false,fireLine:false,snow:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:['cannon','missile','water','sea'][i]}))},true);}finally{Date.now=originalNow;}
   const g=(window as any).__qa.game;g.paused=true;old.setGame(g);
   for(const time of [0,1.137,2.83]){
    r.time=time;r.invalidate();r.draw(0);r.manualFocus=Math.round(r.offsetY*r.ratio)/r.ratio;r.offsetX=Math.round(r.offsetX*r.ratio)/r.ratio;r.invalidate();r.stage.signature='';r.draw(0);

    const combined=document.createElement('canvas');combined.width=c.width;combined.height=c.height;const ctx=combined.getContext('2d')!;
    ctx.drawImage(r.stage.canvas,0,0);ctx.drawImage(r.canvas,0,0);
    const a=ctx.getImageData(0,0,c.width,c.height).data;const savedStage=r.stage;r.stage=null;r.invalidate();r.draw(0);const b=r.ctx.getImageData(0,0,c.width,c.height).data;r.stage=savedStage;r.invalidate();r.draw(0);
    let sum=0,large=0,max=0;for(let n=0;n<a.length;n++){const d=Math.abs(a[n]-b[n]);sum+=d;max=Math.max(max,d);if(d>12)large++;}
    cases.push({map,time,mean:sum/a.length,largeFraction:large/a.length,max});
   }
  }
  const g=(window as any).__qa.game,t=g.active,original={...t},savedPhase=g.phase,savedProjectiles=g.projectiles;
  const ids=['bowl','crossbow','cannon','beetle','duke','mine','missile','multi','laser','water','ion','sea','dragon'];
  for(const id of ids)for(const state of ['idle','move','fire','hurt','win','lose']){
   Object.assign(t,original,{vehicleId:id,angle:state==='fire'?105:-10,poisoned:state==='hurt'?1:0,frozen:state==='hurt'?1:0,hp:state==='lose'?0:state==='hurt'?Math.floor(original.maxHP*.25):original.hp,outOfBounds:false,defeat:original.defeat,reaction:state==='hurt'?{kind:'direct'}:null});
   g.phase=state==='win'?'ended':'aiming';g.winner=state==='win'?t.team:null;g.movingUntil[t.id]=state==='move'?g.elapsed+1:0;g.projectiles=state==='fire'?[{owner:t.id,age:.2}]:[];
   if(state==='lose')t.defeat={x:t.x,y:t.y,slope:g.tankSlope(t),direction:t.direction};
   const images=[];
   for(const painter of [r,old]){const image=document.createElement('canvas');image.width=400;image.height=460;const ctx=image.getContext('2d')!;ctx.fillStyle='#f4f2eb';ctx.fillRect(0,0,400,460);ctx.scale(2,2);ctx.translate(100-t.x,110-t.y);const saved=painter.ctx;painter.ctx=ctx;painter.labelRects=[];painter.time=1.137;try{painter.tank(t);}finally{painter.ctx=saved;}images.push(ctx.getImageData(0,0,400,460).data);}
   let sum=0,large=0,max=0;for(let n=0;n<images[0].length;n++){const d=Math.abs(images[0][n]-images[1][n]);sum+=d;max=Math.max(max,d);if(d>12)large++;}
   cases.push({map:'vehicle:'+id+':'+state,time:1.137,mean:sum/images[0].length,largeFraction:large/images[0].length,max});
  }
  Object.assign(t,original);g.phase=savedPhase;g.projectiles=savedProjectiles;
  c.remove();return cases;
 });
 writeFileSync(`QA/v${version}-${browserName}-pixel-comparison.json`,JSON.stringify({formatVersion:1,cases:report,errors},null,2));
 for(const c of report){expect(c.mean,JSON.stringify(c)).toBeLessThan(.25);expect(c.largeFraction,JSON.stringify(c)).toBeLessThan(c.map.startsWith('vehicle:')?.01:.001);}
 expect(errors).toEqual([]);
});
test('Pixi loses and restores context, preserves the fallback and reuses resources across 50 matches',async({page,browserName})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,stage=r.stage,initialTextures=stage.textures.length;for(let i=0;i<50;i++){q.newMatch({...q.game.config,map:i%2?'factory':'temple',mapChoice:undefined},true);r.draw(0);}const g=(window as any).__qa.game;g.paused=true;r.invalidate();r.draw(0);const frames=r.frames,dial=q.dashboard.dialFrames;for(let i=0;i<240;i++){r.draw(1/60);q.dashboard.draw(g,g.active,r.offsetY,r.viewHeight);}return {sameStage:r.stage===stage,textures:r.stage.textures.length,initialTextures,expectedTextures:1+Math.ceil((g.worldWidth+64)/256)*Math.ceil(g.worldHeight/256),canvasCount:document.querySelectorAll('.pixi-battle-layer').length,pauseFrames:r.frames-frames,dialFrames:q.dashboard.dialFrames-dial};});
 expect(data.sameStage).toBe(true);expect(data.textures).toBe(data.expectedTextures);expect(data.textures).toBe(data.initialTextures);expect(data.canvasCount).toBe(1);expect(data.pauseFrames).toBe(0);expect(data.dialFrames).toBeLessThanOrEqual(1);
 const supported=await page.evaluate(()=>{const r=(window as any).__qa.renderer;const ext=r.stage.app.renderer.gl.getExtension('WEBGL_lose_context');(window as any).__lose=ext;if(ext)ext.loseContext();return Boolean(ext);});expect(supported).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('canvas');
 await page.waitForTimeout(150);await page.evaluate(()=>(window as any).__lose.restoreContext());
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 writeFileSync(`QA/v${version}-${browserName}-lifecycle.json`,JSON.stringify({formatVersion:1,...data,realContextRecovery:supported},null,2));
});
test('fractional canvas height does not cause repeated GPU resize or submission',async({page})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const result=await page.evaluate(()=>{const r=(window as any).__qa.renderer,s=r.stage,before=s.frames;for(let i=0;i<200;i++){s.sync(false,false,2,377.333);s.draw(0,0,0,0,377.333);}const data={frames:s.frames-before,height:s.app.screen.height,pixels:s.canvas.height};s.sync(false,false,r.ratio,r.viewHeight);r.invalidate();return data;});
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
