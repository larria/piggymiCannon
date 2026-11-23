import {expect,test} from '@playwright/test';
import {boot} from './qa-app';

// Check actual Web Audio scheduling, including when the clip has not decoded.
test('four Flyfire impacts play with four distinct onsets for either decoded or fallback audio',async({page})=>{
 await boot(page,true,'factory','missile','sea');
 const result=await page.evaluate(async()=>{
  const q=(window as any).__qa,a=q.audio,g=q.game;
  a.unlock();a.pause(false);a.setMusicEnabled(false);a.setSoundEnabled(true);await a.context.resume();
  q.recorder?.detach();g.update=()=>{};
  const clip='sfx-bomb-missile-normal.mp3';await a.loadClip(clip);const buffer=a.buffers.get(clip);
  const proto=AudioBufferSourceNode.prototype,old=proto.start;
  let onsets:number[]=[];proto.start=function(at=0,offset=0,duration?:number){onsets.push(at);if(duration===undefined)old.call(this,at,offset);else old.call(this,at,offset,duration);};
  try{
   const burst=()=>{onsets=[];a.resetEffects();for(let i=0;i<4;i++)a.play('explosion',420,420,'missile-normal');return onsets.slice();};
   const decoded=burst();a.buffers.delete(clip);const fallback=burst();
   a.resetEffects();if(buffer)a.buffers.set(clip,buffer);
   return {loaded:!!buffer,decoded,fallback};
  }finally{proto.start=old;}
 });
 expect(result.loaded).toBe(true);
 for(const starts of [result.decoded,result.fallback]){
  expect(starts).toHaveLength(4);
  for(let i=1;i<starts.length;i++)expect(starts[i]-starts[i-1]).toBeGreaterThanOrEqual(.1);
 }
});

test('iPad battlefield shows pure white empty health slots, green/red fills and animated compact fire rings',async({page,browserName})=>{
 await boot(page,true,'factory','water','sea');
 await page.waitForFunction(()=>(window as any).__qa.renderer.stage?.available);
 const result=await page.evaluate(()=>{
  const q=(window as any).__qa,r=q.renderer,g=q.game;
  q.recorder?.detach();g.update=()=>{};g.wind=0;
  const x=Math.round(g.worldWidth/2),y=600;
  g.tanks.forEach((t:any,i:number)=>{t.x=x+(i?207:-74);t.y=y;t.direction=i?-1:1;t.fallVelocity=0;t.angle=27;});
  g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let xx=0;xx<=g.worldWidth;xx++)g.land.column(xx,y+18,g.worldHeight,true);g.land.rebuild();
  g.tanks[0].hp=Math.round(g.tanks[0].maxHP*.76);g.tanks[1].hp=Math.round(g.tanks[1].maxHP*.42);
  r.zoomBy(1.55);r.camera.center(x+65,y-50,false);r.invalidate();r.draw(0);
  const sample=()=>{const data=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;const colors=[0,0];for(let i=0;i<data.length;i+=4){const c=(data[i]<<16)+(data[i+1]<<8)+data[i+2];if(c===0x66aa53)colors[0]++;if(c===0xdb4f49)colors[1]++;}return colors;};
  const empty=g.tanks.map((t:any)=>{
   const label=r.portraitHits.find((hit:any)=>hit.id===t.id);
   const x=Math.floor((label.x+18*g.layoutScale-r.offsetX)*r.ratio);
   const y=Math.floor((label.y+(t.crew==='fox'?24.5:27.5)*g.layoutScale-r.offsetY)*r.ratio);
   return Array.from(r.ctx.getImageData(x,y,1,1).data);
  });
  const raging=sample();g.tanks[1].hp=Math.round(g.tanks[1].maxHP*.7);r.invalidate();r.draw(0);const calm=sample();
  g.tanks[1].hp=Math.round(g.tanks[1].maxHP*.42);r.invalidate();r.draw(0);
  const cx=(g.tanks[1].x-r.offsetX)*r.ratio,cy=(g.tanks[1].y-r.offsetY)*r.ratio;
  r.windMotes.forEach((m:any)=>{m.alpha=0;});
  r.invalidate();r.draw(0);
  const hash=()=>{const points=r.ctx.getImageData(Math.round(cx-48*r.ratio),Math.round(cy-61*r.ratio),Math.round(96*r.ratio),Math.round(70*r.ratio)).data;let n=0;for(const p of new Uint32Array(points.buffer))n=Math.imul(n^p,16777619);return n;};
  const before=hash();r.invalidate();r.draw(.137);const after=hash();
  g.tanks[0].hp=Math.round(g.tanks[0].maxHP*.22); r.invalidate();r.draw(0);const low=sample();
  g.tanks[0].hp=Math.round(g.tanks[0].maxHP*.76); r.invalidate();r.draw(0);
  return {empty,raging,calm,low,animated:before!==after};
 });
 await page.screenshot({path:`.workbuddy/v5.1.6/battle-${browserName}.png`,scale:'css'});
 expect(result.raging[0]).toBeGreaterThan(40);expect(result.raging[1]).toBeGreaterThan(40);expect(result.empty).toEqual([[255,255,255,255],[255,255,255,255]]);
 expect(result.calm[1]).toBeLessThan(result.raging[1]);expect(result.calm[0]).toBeGreaterThan(result.raging[0]);expect(result.animated).toBe(true);
 expect(result.low[1]).toBeGreaterThan(result.raging[1]);
});

// Capture the redesigned silhouettes at the actual in-game camera scale.
test('iPad visual review of Cannon, Duke, Mine and Meteor silhouettes',async({page,browserName})=>{
 await boot(page,false);
 await page.evaluate(()=>{
  const q=(window as any).__qa;
  q.newMatch({...q.game.config,timer:0,map:'factory',mapChoice:'factory',slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i%2,vehicle:['cannon','duke','mine','multi'][i]}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder?.detach();g.update=()=>{};g.wind=0;
  const x=Math.round(g.worldWidth/2),y=600;
  g.tanks.forEach((t:any,i:number)=>{t.x=x+(i-1.5)*149;t.y=y;t.angle=i===1?26:30;t.direction=i===2?-1:1;t.fallVelocity=0;});
  g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let xx=0;xx<=g.worldWidth;xx++)g.land.column(xx,y+18,g.worldHeight,true);g.land.rebuild();
  r.zoomBy(1.65);r.camera.center(x,y-55,false);r.invalidate();r.draw(0);
 });
 await expect(page.locator('#battlefield')).toHaveAttribute('data-render-backend','pixi');
 await expect(page.locator('[data-hud] .hud-vehicle')).toHaveCount(4);
 await page.screenshot({path:`.workbuddy/v5.1.6/silhouettes-${browserName}.png`,scale:'css'});
});


test('iPad visual review of four celebratory tank crews',async({page,browserName})=>{
 await boot(page,false);
 await page.evaluate(()=>{
  const q=(window as any).__qa;
  q.newMatch({...q.game.config,timer:0,map:'factory',mapChoice:'factory',slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i%2,vehicle:['cannon','duke','mine','water'][i]}))},true);
  const {game:g,renderer:r,recorder}=(window as any).__qa;recorder?.detach();g.update=()=>{};g.wind=0;
  const x=Math.round(g.worldWidth/2),y=600;
  g.tanks.forEach((t:any,i:number)=>{t.x=x+(i-1.5)*149;t.y=y;t.direction=i%2?-1:1;t.fallVelocity=0;});
  g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let xx=0;xx<=g.worldWidth;xx++)g.land.column(xx,y+18,g.worldHeight,true);g.land.rebuild();
  g.crewCheerAge=()=>.36;
  r.zoomBy(1.65);r.camera.center(x,y-55,false);r.invalidate();r.draw(0);
 });
 await expect(page.locator('#battlefield')).toHaveAttribute('data-render-backend','pixi');
 await page.screenshot({path:`.workbuddy/v5.1.6/crew-cheer-${browserName}.png`,scale:'css'});
});
