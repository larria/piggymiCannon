import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
import {readFileSync,writeFileSync} from 'node:fs';
import {battleViewWidth} from '../../src/world-layout';
import {portraitViewWidth} from '../../src/portrait-viewport';

for(const device of [
 {name:'pc',width:1512,height:982,dpr:2,touch:false},
 {name:'ipad',width:1194,height:834,dpr:2,touch:true},
 {name:'phone-landscape',width:844,height:390,dpr:3,touch:true},
 {name:'phone-portrait',width:390,height:844,dpr:3,touch:true},
])test.describe(device.name,()=>{
 test.use({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:device.touch,hasTouch:device.touch});
 test('three views revert exactly and phone portrait keeps the approved image scale',async({page})=>{
  await page.addInitScript(()=>{Date.now=()=>52;});await boot(page);await page.evaluate(()=>{
   const before=(window as any).__qa;before.newMatch({...before.game.config,map:'factory',mapChoice:'factory',timer:0,slots:before.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:['cannon','duke','water','missile'][i],team:i%2}))},true);
   const q=(window as any).__qa;q.game.update=()=>{};q.renderer.follow();q.updateUI();
  });await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');await page.waitForTimeout(500);
  const data=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer,b=r.canvas.getBoundingClientRect();return {field:{w:b.width,h:b.height},logical:{w:r.viewWidth,h:r.viewHeight},raster:{w:r.canvas.width,h:r.canvas.height},ratio:r.ratio,world:q.game.worldWidth,version:q.game.gameVersion};});
  if(device.name==='phone-portrait'){
   const approved=JSON.parse(readFileSync('tests/fixtures/approved-portrait-view.json','utf8'));
   expect(data.logical.w).toBeCloseTo(portraitViewWidth(data.version),6);expect(data.logical.w).toBeCloseTo(approved.logical.w,6);expect(data.logical.h).toBeCloseTo(approved.logical.h,6);
   for(const key of ['raster','field'] as const)expect(data[key]).toEqual(approved[key]);expect(data.ratio).toBeCloseTo(approved.ratio,9);
  }else{
   const width=device.name==='phone-landscape'?Math.min(data.world,630*data.field.w/data.field.h):battleViewWidth(data.world);
   expect(data.logical.w).toBeCloseTo(width,6);expect(data.ratio).toBeCloseTo(Math.min(device.dpr,2)*(device.name==='phone-landscape'?data.field.w:1280)/width,6);
   expect(data.logical.h).toBeCloseTo(device.name==='phone-landscape'?630:Math.max(370,data.field.h/data.field.w*width),6);
  }
  writeFileSync(`QA/viewport-restored-${device.name}.json`,JSON.stringify({device,...data},null,2)+'\n');
  if(process.env.PIGGY_RESTORED_CAPTURE===device.name)await page.screenshot({path:`QA/viewport-restored-${device.name}.png`,scale:'css'});
 });
});
