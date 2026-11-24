import {build} from 'esbuild';
import {expect,test} from '@playwright/test';
import {resolve} from 'node:path';
import {boot} from './qa-app';

const vectorReview=build({stdin:{contents:`
 import {VEHICLES} from './vehicles';
 import {paintVehicle} from './vehicle-art';
 import {paintDefeatedCrew} from './crew-death-art';
 window.review={VEHICLES,paintVehicle,paintDefeatedCrew};
 `,resolveDir:resolve('src'),loader:'ts'},bundle:true,write:false,format:'iife'}).then(r=>r.outputFiles[0].text);

test('all thirteen battle silhouettes stay close in size at the same angle',async({page})=>{
 await page.addScriptTag({content:await vectorReview});
 const dimensions=await page.evaluate(()=>{
  const {VEHICLES,paintVehicle}=(window as any).review;
  const c=document.createElement('canvas');c.width=400;c.height=320;
  const ctx=c.getContext('2d')!;
  return VEHICLES.map((vehicle:any)=>{
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,400,320);
   ctx.setTransform(4,0,0,4,200,220);paintVehicle(ctx,vehicle,30,0,0,false);
   const {data}=ctx.getImageData(0,0,400,320);let l=400,r=0,t=320,b=0;
   for(let y=0;y<320;y++)for(let x=0;x<400;x++)if(data[(x+y*400)*4+3]>127){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   return {vehicle:vehicle.id,width:(r-l+1)/4,height:(b-t+1)/4};
  });
 });
 expect(dimensions).toHaveLength(13);
 for(const {vehicle,width,height} of dimensions){
  expect(width,vehicle).toBeGreaterThanOrEqual(74);expect(width,vehicle).toBeLessThanOrEqual(81);
  expect(height,vehicle).toBeGreaterThanOrEqual(50);expect(height,vehicle).toBeLessThanOrEqual(62);
 }
});

test('Mimi and Fox visibly lift their fists, with no pounding while falling or with reduced motion',async({page})=>{
 await page.addScriptTag({content:await vectorReview});
 const movement=await page.evaluate(()=>{
  const {paintDefeatedCrew}=(window as any).review;
  const c=document.createElement('canvas');c.width=300;c.height=200;
  const ctx=c.getContext('2d')!;
  const pawInk={mimi:[245,179,158],fox:[231,109,71]};
  function contactInk(id:'mimi'|'fox',t:number,reduced=false,falling=false){
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,300,200);
   ctx.setTransform(3,0,0,3,150,100);paintDefeatedCrew(ctx,id,t,reduced,falling);
   // Measure the warm paw pigment at the ground contact, not the tears/coat.
   const {data}=ctx.getImageData(192,133,32,22);let n=0;
   const rgb=pawInk[id];for(let i=0;i<data.length;i+=4)if(data[i]===rgb[0]&&data[i+1]===rgb[1]&&data[i+2]===rgb[2]&&data[i+3]>250)n++;
   return n;
  }
  return (['mimi','fox'] as const).map(id=>{
   const liftAt=(id==='mimi'?.86:.73)*.16;
   return {id,rest:contactInk(id,0),lift:contactInk(id,liftAt),reduced:contactInk(id,liftAt,true),falling:contactInk(id,liftAt,false,true)};
  });
 });
 for(const {id,rest,lift,reduced,falling} of movement){
  expect(rest,id).toBeGreaterThan(80);expect(rest-lift,id).toBeGreaterThan(80);
  expect(reduced,id).toBeGreaterThan(80);expect(falling,id).toBeGreaterThan(80);
 }
});

test('Fox and Fish move their own tail tips while defeated, and hold still with reduced motion',async({page})=>{
 await page.addScriptTag({content:await vectorReview});
 const poses=await page.evaluate(()=>{
  const {paintDefeatedCrew}=(window as any).review;
  const c=document.createElement('canvas');c.width=360;c.height=240;
  const ctx=c.getContext('2d')!;
  function tailHeight(id:'fox'|'fish',t:number,reduced:boolean){
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,360,240);
   ctx.setTransform(3,0,0,3,180,120);paintDefeatedCrew(ctx,id,t,reduced,false);
   const area=id==='fox'?{x:16,w:60,rgb:[254,224,176]}:{x:110,w:60,rgb:[239,175,80]};
   const {data}=ctx.getImageData(area.x,40,area.w,158);let count=0,ySum=0;
   for(let i=0;i<data.length;i+=4){
    const [r,g,b]=area.rgb;
    if(data[i]===r&&data[i+1]===g&&data[i+2]===b&&data[i+3]>250){count++;ySum+=Math.floor(i/4/area.w);}
   }
   return count?ySum/count:null;
  }
  return (['fox','fish'] as const).map(id=>{
   const rate=id==='fox'?10:13;
   const raised=Math.PI/2/rate,lowered=3*Math.PI/2/rate;
   return {id,active:[tailHeight(id,raised,false),tailHeight(id,lowered,false)],still:[tailHeight(id,raised,true),tailHeight(id,lowered,true)]};
  });
 });
 for(const {id,active,still} of poses){
  expect([...active,...still],id).not.toContain(null);
  expect(active[1]!-active[0]!,id).toBeGreaterThan(12);
  expect(still[0],id).toBe(still[1]);
 }
});

test('11-inch iPad renders dressed pilots and all four land defeat figures in the battlefield',async({page,browserName})=>{
 await boot(page,false);
 await page.evaluate(()=>{
  const q=(window as any).__qa;
  q.newMatch({...q.game.config,timer:0,map:'factory',mapChoice:'factory',slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i%2,vehicle:['bowl','duke','mine','water'][i]}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder?.detach();g.update=()=>{};g.wind=0;
  const x=Math.round(g.worldWidth/2),y=600;
  g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:x+(i-1.5)*149,y,direction:1,angle:30,fallVelocity:0}));
  g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let xx=0;xx<=g.worldWidth;xx++)g.land.column(xx,y+18,g.worldHeight,true);g.land.rebuild();
  r.zoomBy(1.65);r.camera.center(x,y-55,false);r.invalidate();r.draw(0);
 });
 await expect(page.locator('#battlefield')).toHaveAttribute('data-render-backend','pixi');
 await page.screenshot({path:`.workbuddy/v5.1.8/pilots-${browserName}.png`,scale:'css'});
 await page.evaluate(()=>{
  const {game:g,renderer:r}=(window as any).__qa;
  for(const t of g.tanks)g.damage(t,99999,t.id^1);
  g.texts=[];r.time=.15;r.windMotes.length=0;r.invalidate();r.draw(0);
 });
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks.every((t:any)=>t.hp===0&&t.defeat&&!t.outOfBounds))).toBe(true);
 await page.screenshot({path:`.workbuddy/v5.1.8/defeated-${browserName}.png`,scale:'css'});
});
