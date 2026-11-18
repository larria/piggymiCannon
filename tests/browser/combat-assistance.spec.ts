import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {writeFileSync,readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
async function field(page:any){await boot(page);await page.evaluate(()=>{
 const q=(window as any).__qa,g=q.game;g.update=()=>{};g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.worldWidth;x++)g.land.column(x,600,g.worldHeight);g.land.rebuild();g.wind=0;
 g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:400+i*450,y:582,fallVelocity:0,angle:40,direction:1}));q.renderer.follow(true);q.updateUI();
});}
test('settings default off, persist and show bands after settling; charging remains smooth and hints never affect AI/state',async({page,browserName})=>{
 await field(page);await page.locator('.stage-top [data-dialog="settings"]').click();for(const key of ['powerAssist','tankBlocking'])await expect(page.locator(`[data-setting="${key}"]`)).toHaveAttribute('aria-checked','false');
 if(browserName==='webkit')await page.screenshot({path:`QA/v${version}-settings-webkit-1194.png`,scale:'css'});
 await page.locator('[data-setting="powerAssist"]').click();await page.getByRole('button',{name:'设置好了',exact:false}).click();
 await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 const range=await page.locator('#power-assistance').evaluate((c:HTMLCanvasElement)=>{const image=c.getContext('2d')!.getImageData(0,0,c.width,c.height);return {width:c.width,height:c.height,maxAlpha:Math.max(...Array.from(image.data).filter((_,i)=>i%4===3)),nonzero:Array.from(image.data).filter((v,i)=>i%4===3&&v>0).length};});expect(range.nonzero).toBeGreaterThan(0);expect(range.maxAlpha).toBeGreaterThan(150);
 const angle=await page.evaluate(()=>(window as any).__qa.game.active.angle);await page.locator('#angle-up').click();await expect(page.locator('#power-assistance')).toBeHidden();expect(await page.evaluate(()=>(window as any).__qa.game.active.angle)).toBe(angle+1);await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 const up=await page.locator('#angle-up').boundingBox();await page.mouse.move(up!.x+up!.width/2,up!.y+up!.height/2);await page.mouse.down();await page.waitForTimeout(260);await expect(page.locator('#power-assistance')).toBeHidden();await page.mouse.up();await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 const b=await page.locator('#fire-button').boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();await page.waitForTimeout(240);expect(await page.evaluate(()=>(window as any).__qa.game.active.power)).toBeGreaterThan(1);await expect(page.locator('#power-assistance')).toBeVisible();await page.mouse.up();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-settings')!).config.powerAssist)).toBe(true);
 writeFileSync(`QA/v${version}-assistance-${browserName}.json`,JSON.stringify({version,range},null,2)+'\n');
});
test('iPad layout shows overlapping estimates without hiding memory/marker or shrinking existing buttons',async({page,browserName})=>{
 await field(page);await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.config.powerAssist=true;g.active.lastPower=65;g.active.powerMarker=80;g.tanks.push({...g.tanks[1],id:2,crew:'fox',x:g.tanks[1].x+30});q.updateUI();});await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 await expect(page.locator('#power-marker')).toBeVisible();const fire=await page.locator('#fire-button').boundingBox(),nudge=await page.locator('#angle-up').boundingBox();expect(fire!.height).toBeGreaterThanOrEqual(40);expect(nudge!.height).toBeGreaterThanOrEqual(40);
 if(browserName==='webkit')await page.screenshot({path:`QA/v${version}-assistance-webkit-1194.png`,scale:'css'});
});
test('disable/cancel/wind/terrain/owner changes clear old estimates; no timers survive a new match',async({page})=>{
 await field(page);await page.evaluate(()=>{const q=(window as any).__qa;q.game.config.powerAssist=true;q.updateUI();});await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 await page.evaluate(()=>(window as any).__qa.game.wind=5);await expect(page.locator('#power-assistance')).toBeHidden();await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.config.powerAssist=false;});await expect(page.locator('#power-assistance')).toBeHidden();await page.waitForTimeout(500);await expect(page.locator('#power-assistance')).toBeHidden();
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.config.powerAssist=true;q.game.active.angle=35;q.newMatch({...q.game.config,powerAssist:false},true);});await page.waitForTimeout(800);await expect(page.locator('#power-assistance')).toBeHidden();
});
test('AI ally dropping out selects the friendly death sample even when next human belongs to enemy team; applause waits',async({page})=>{
 await field(page);await page.evaluate(async()=>{const q=(window as any).__qa,a=q.audio;a.setMusicEnabled(false);a.setSoundEnabled(true);a.unlock();await a.preloadForMatch(['cannon']);(window as any).__effects=[];const old=a.play.bind(a);a.play=(type:any,...args:any[])=>{(window as any).__effects.push({type,friendly:args[3],time:performance.now()});return old(type,...args);};
 const g=q.game;g.tanks.push({...g.tanks[0],id:2,controller:'ai',hp:10,crew:'dad'});g.dashboardHuman=0;g.damage(g.tanks[2],10,0,true,'fall',undefined,{cause:'out'});g.current=1;g.events.push({type:'win',message:'test win'});
 });await expect.poll(()=>page.evaluate(()=>(window as any).__effects.filter((x:any)=>x.type==='death').length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).__effects.find((x:any)=>x.type==='death').friendly)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__effects.filter((x:any)=>x.type==='win').length),{timeout:3000}).toBe(1);
 const gap=await page.evaluate(()=>{const e=(window as any).__effects;return e.find((x:any)=>x.type==='win').time-e.find((x:any)=>x.type==='death').time;});expect(gap).toBeGreaterThanOrEqual(950);
});

test('assistance settles once, reuses idle results and records browser frame timings',async({page,browserName})=>{
 await field(page);const data=await page.evaluate(async()=>{const g=(window as any).__qa.game;
  const measure=(ms:number)=>new Promise<number[]>(resolve=>{const gaps:number[]=[];let last=performance.now(),start=last;const tick=(now:number)=>{gaps.push(now-last);last=now;if(now-start>=ms)resolve(gaps);else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  const baseline=await measure(700);g.config.powerAssist=true;const sweep=await measure(1700);const pixels=()=>document.querySelector<HTMLCanvasElement>('#power-assistance')!.toDataURL();const before=pixels(),idle=await measure(1200);return {baseline,sweep,idle,unchanged:before===pixels(),visible:!document.querySelector<HTMLCanvasElement>('#power-assistance')!.hidden};
 });expect(data.visible).toBe(true);expect(data.unchanged).toBe(true);const summary=(rows:number[])=>{const s=[...rows].sort((a,b)=>a-b);return {frames:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],maxMs:s.at(-1)};};writeFileSync(`QA/v${version}-frame-timings-${browserName}.json`,JSON.stringify({environment:'1194x834 touch simulation, desktop host; not physical iPad',baseline:summary(data.baseline),sweep:summary(data.sweep),idle:summary(data.idle),idlePixelsUnchanged:data.unchanged},null,2)+'\n');
});

test('assistance hides and cancels outside the current human turn, even during AI pre-aim and camera movement',async({page,browserName})=>{
 await field(page);await page.evaluate(()=>{const q=(window as any).__qa;q.game.config.powerAssist=true;});await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.dashboardHuman=0;q.game.current=1;q.game.active.controller='ai';q.renderer.follow(true);q.updateUI();});await expect(page.locator('#power-assistance')).toBeHidden();await page.waitForTimeout(1000);await expect(page.locator('#power-assistance')).toBeHidden();
 await page.locator('#angle-up').click();await page.locator('#minimap-follow').click();await page.waitForTimeout(500);await expect(page.locator('#power-assistance')).toBeHidden();if(browserName==='webkit')await page.screenshot({path:`QA/v${version}-offturn-assistance-webkit-1194.png`,scale:'css'});
 await page.evaluate(()=>{const q=(window as any).__qa;q.game.current=0;q.game.phase='aiming';q.updateUI();});await expect(page.locator('#power-assistance')).toBeVisible({timeout:12000});
 for(const phase of ['supply','flying','resolving','handoff']){await page.evaluate(phase=>{const q=(window as any).__qa;q.game.phase=phase;q.updateUI();},phase);await page.waitForTimeout(150);await expect(page.locator('#power-assistance')).toBeHidden();}
});
test('a planned AI skip waits3s of active play even if the player interrupts the camera',async({page})=>{
 await field(page);const before=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.current=1;g.active.controller='ai';g.aiTime=2;g.aiDecision={target:0,fromX:g.active.x,goalX:g.active.x,weapon:g.selected,intentionalMiss:false,skip:true,skipAt:g.elapsed+3};g.update=g.constructor.prototype.update.bind(g);q.renderer.follow(true);q.updateUI();return g.elapsed;});
 await page.waitForTimeout(700);await page.evaluate(()=>(window as any).__qa.renderer.focusAt(80,160));await page.waitForTimeout(1300);expect(await page.evaluate(()=>(window as any).__qa.game.current)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.current),{timeout:3500}).toBe(0);const after=await page.evaluate(()=>(window as any).__qa.game.elapsed);expect(after-before).toBeGreaterThanOrEqual(3);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[1].shots)).toBe(0);
});
