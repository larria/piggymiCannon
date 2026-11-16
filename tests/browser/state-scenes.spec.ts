import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
test('music and effects switches operate and persist independently in both directions',async({page})=>{
 await page.addInitScript(()=>{(window as any).audioPlays=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){(window as any).audioPlays.push(this.src);return play.call(this);};});
 await boot(page,false);await page.locator('#sound-button').click();
 await page.locator('#music-toggle').click();await expect(page.locator('#effects-toggle')).toHaveAttribute('aria-checked','true');
 await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','false');await page.getByRole('button',{name:'设置好了',exact:false}).click();
 expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);
 const plays=await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx-click')).length);
 await page.locator('#sound-button').click();expect(await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx-click')).length)).toBeGreaterThan(plays);
 await page.locator('#effects-toggle').click();await page.locator('#music-toggle').click();await page.getByRole('button',{name:'设置好了',exact:false}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-settings')!))).toMatchObject({soundEnabled:false,musicEnabled:true});
 const mutedPlays=await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx-click')).length);
 await page.locator('#sound-button').click();expect(await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx-click')).length)).toBe(mutedPlays);
 await page.screenshot({path:'QA/slots-regression-independent-audio-ipad.png'});await page.reload();await page.locator('#sound-button').click();
 await expect(page.locator('#effects-toggle')).toHaveAttribute('aria-checked','false');await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','true');
});
test('fog keeps true enemy health and thirty-percent breathing is distinct from sea rage',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=true;g.fogTurnsRemaining=2;g.tanks[0].hp=Math.ceil(g.tanks[0].maxHP*.3);g.tanks[1].hp=Math.floor(g.tanks[1].maxHP*.49);});
 await expect(page.locator('#hp-0')).toHaveText('276 / 920');await expect(page.locator('#hp-1')).toHaveText('431 / 880');
 expect(await page.locator('#hp-bar-1').evaluate(el=>parseFloat(el.style.width))).toBeCloseTo(431/880*100,2);
 await expect.poll(()=>page.locator('#hp-bar-1').evaluate(el=>el.getBoundingClientRect().width/el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(431/880,2);
 await expect(page.locator('#hp-bar-0')).toHaveClass(/critical/);await expect(page.locator('#hp-bar-1')).not.toHaveClass(/critical/);
 await page.screenshot({path:'QA/slots-regression-fog-true-health-ipad.png'});
 await page.evaluate(()=>(window as any).__qa.game.fog=false);await expect(page.locator('#status-0')).toContainText('喘气中');await expect(page.locator('#status-1')).toContainText('发怒');await expect(page.locator('#status-1')).not.toContainText('喘气');
 await page.screenshot({path:'QA/slots-regression-breathing-and-rage-ipad.png'});
});
test('victory and prone crying animate before and around the result card on both small iPads',async({page})=>{
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await boot(page);
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.damage(g.enemy,9999,0);});await expect(page.locator('#hp-1')).toHaveText('0 / 880');
  await expect(page.locator('#game-overlay')).toBeHidden();await page.waitForTimeout(700);
  const a=await page.locator('#battlefield').evaluate((c:any)=>c.toDataURL());await page.waitForTimeout(350);
  const b=await page.locator('#battlefield').evaluate((c:any)=>c.toDataURL());expect(a).not.toBe(b);
  expect(await page.evaluate(()=>(window as any).__qa.game.enemy.outOfBounds)).toBe(false);
  await page.screenshot({path:`QA/slots-regression-victory-crying-${width}x834.png`});
  await expect(page.locator('.result')).toBeVisible({timeout:5000});await page.screenshot({path:`QA/slots-regression-result-card-${width}x834.png`});
 }
});
test('a killed unsupported loser settles off-map and does not leave a wreck or a crying pig after falling through the world',async({page})=>{
 await boot(page,true,'coast');await page.evaluate(()=>{const g=(window as any).__qa.game;g.crater(g.enemy.x,g.ground(g.enemy.x),180,960);g.damage(g.enemy,9999,0);});
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.enemy.outOfBounds)).toBe(true);
 await page.screenshot({path:'QA/slots-regression-defeat-off-map-ipad.png'});
});
test('transfer uses the force meter and moves to its landing position without damaging the enemy',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.active.x=175;g.active.y=g.ground(175)-18;g.enemy.x=1105;g.enemy.y=g.ground(1105)-18;g.wind=0;g.active.angle=35;});
 await page.locator('#quick-items [data-item="teleport"]').click();await expect(page.locator('#fire-note')).toContainText('转移弹已装填');
 await expect(page.locator('#fire-button')).toBeEnabled();await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');
 await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
 const outcome=await page.evaluate(()=>{const g=(window as any).__qa.game;return {x:g.tanks[0].x,hp:g.tanks[1].hp,stock:g.tanks[0].items.teleport,shots:g.tanks[0].shots,log:g.log};});
 expect(outcome.x).toBeGreaterThan(405);expect(outcome.hp).toBe(880);expect(outcome.stock).toBe(0);expect(outcome.shots).toBe(1);expect(outcome.log.some((s:string)=>s.includes('抵达落点'))).toBe(true);
});
test('direct graze and fall expressions stay visibly different with enlarged motions',async({page})=>{
 await boot(page);
 for(const reaction of ['direct','graze','fall']){await page.evaluate(kind=>{(window as any).__qa.game.tanks[0].reaction={kind,remaining:20};},reaction);await page.waitForTimeout(200);await page.screenshot({path:`QA/slots-regression-reaction-${reaction}-ipad.png`});}
});

test('a real arrow applies poison and each victim action visibly ticks to the red limit',async({page})=>{
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await boot(page,true,'factory','crossbow','cannon');
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=false;g.fireLine=null;g.wind=0;
   g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();
   g.tanks.forEach((t:any,i:number)=>{t.x=905+i*200;t.y=432;});
   g.crates=[40,80,120].map(x=>({x,y:436,type:'ammo'}));
  });
  await page.locator('#weapon-special').click();
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.setAim(15,35);g.fire();});
  await expect(page.locator('#hp-1')).toHaveText('840 / 920');
  expect(await page.evaluate(()=>(window as any).__qa.game.tanks[1].poisoned)).toBe(true);
  const capture=async(hp:number,name:string)=>{
   await expect(page.locator('#hp-1')).toHaveText(`${hp} / 920`);
   await expect.poll(()=>page.locator('#hp-bar-1').evaluate(el=>el.getBoundingClientRect().width/el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(hp/920,2);
   await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
   await expect(page.locator('#game-overlay')).toBeHidden();
   if(name==='stopped')await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.texts.some((text:any)=>text.tankId===1&&text.text.startsWith('毒伤')))).toBe(false);
   await page.screenshot({path:`QA/slots-regression-poison-${name}-${width}x834.png`});
  };
  await capture(840,'applied');
  const readyVictim=async()=>{
   for(let action=0;action<6;action++){
    const state=await page.evaluate(()=>{const g=(window as any).__qa.game;return {current:g.current,phase:g.phase};});
    if(state.current===1&&state.phase==='aiming')return;
    if(state.phase!=='aiming'){await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});continue;}
    await page.locator('#skip-button').click();await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
   }
   throw new Error('Victim did not receive an action');
  };
  for(const [i,hp]of [656,472,288,276].entries()){
   await readyVictim();await page.locator('#skip-button').click();await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
   const effect=await page.evaluate(()=>{const g=(window as any).__qa.game;return {hp:g.tanks[1].hp,poisoned:g.tanks[1].poisoned,texts:g.texts.map((t:any)=>t.text),log:g.log};});
   expect(effect.hp).toBe(hp);expect(effect.poisoned).toBe(hp>276);
   expect(effect.texts).toContain(`毒伤 −${i===3?12:184}`);expect(effect.log.some((s:string)=>s.includes(`生命 ${hp}/920`))).toBe(true);
   await capture(hp,`tick-${i+1}`);
  }
  await expect(page.locator('#hp-bar-1')).toHaveClass(/critical/);await readyVictim();await page.locator('#skip-button').click();
  await expect(page.locator('#hp-1')).toHaveText('276 / 920');
  await capture(276,'stopped');
 }
});

test('celebration keeps a continuous head torso and legs at both jump peaks',async({page})=>{
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await boot(page);
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.damage(g.enemy,9999,0);});await expect(page.locator('#hp-1')).toHaveText('0 / 880');
  await expect.poll(()=>page.locator('#hp-bar-1').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThan(.5);
  await page.evaluate(()=>(window as any).__qa.game.paused=true);
  for(const [i,time]of [Math.PI/12,Math.PI/4].entries()){
   const connected=await page.evaluate(time=>{
    const q=(window as any).__qa,r=q.renderer,t=q.game.tanks[0];r.time=time;r.draw(0);
    const scale=r.ratio,w=Math.round(100*scale),h=Math.round(110*scale);
    const data=r.ctx.getImageData(Math.round((t.x-r.offsetX-50)*scale),Math.round((t.y-r.offsetY-80)*scale),w,h).data;
    const skin=new Uint8Array(w*h),seen=new Uint32Array(w*h);
    for(let p=0;p<w*h;p++){const o=p*4,[red,green,blue]=[data[o],data[o+1],data[o+2]];skin[p]=Number(red>185&&green>125&&blue>95&&red-green>25&&green-blue>5);}
    let largest={area:0,height:0},component=0;
    for(let p=0;p<w*h;p++)if(skin[p]&&!seen[p]){
     const queue=[p];seen[p]=++component;let min=h,max=0;
     for(let j=0;j<queue.length;j++){const at=queue[j],x=at%w,y=Math.floor(at/w);min=Math.min(min,y);max=Math.max(max,y);
      for(const next of [x>0?at-1:-1,x<w-1?at+1:-1,y>0?at-w:-1,y<h-1?at+w:-1])if(next>=0&&skin[next]&&!seen[next]){seen[next]=component;queue.push(next);}}
     if(queue.length>largest.area)largest={area:queue.length,height:max-min+1};
    }
    // The helmet has a different color. Check the cheek and belly themselves,
    // rather than expecting the helmet to be part of a skin-colored component.
    const tilt=Math.sin(time*8)*.16,jump=Math.abs(Math.sin(time*8))*13;
    const slope=q.game.tankSlope(t);
    const at=(x:number,y:number)=>{const px=(-10+x*Math.cos(tilt)-y*Math.sin(tilt))*t.direction,py=-13+x*Math.sin(tilt)+y*Math.cos(tilt)-jump;return Math.round((80+px*Math.sin(slope)+py*Math.cos(slope))*scale)*w+Math.round((50+px*Math.cos(slope)-py*Math.sin(slope))*scale);};
    const cheek=seen[at(0,-14)],belly=seen[at(0,3)];
    return {area:largest.area/(scale*scale),headAndBodyConnected:cheek>0&&cheek===belly};
   },time);
   await page.screenshot({path:`QA/slots-regression-celebration-connected-peak-${i+1}-${width}x834.png`});
   expect(connected.area).toBeGreaterThan(400);expect(connected.headAndBodyConnected).toBe(true);
  }
 }
});
