import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {writeFileSync,readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
test.use({deviceScaleFactor:2});
async function prepare(page:any,multi=false){
 await boot(page);
 await page.evaluate(multi=>{
  let q=(window as any).__qa;q.newMatch({...q.game.config,map:'factory',mapChoice:'factory',timer:45,fog:false,fireLine:false,slots:q.game.config.slots.map((s:any)=>({...s,controller:'human',vehicle:'cannon'}))},true);q=(window as any).__qa;q.recorder.detach();const g=q.game,r=q.renderer;
  g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:i?100:1700,y:g.ground(i?100:1700)-18,fallVelocity:0}));g.firstSupplyChecked=true;g.nextSupplyAction=8;g.turn=7;g.nextTurn();
  if(g.phase!=='supply')throw Error('No delivery');const c=g.crates.find((c:any)=>c.falling);Object.assign(c,{x:multi?420:1700,y:-50,vx:0,vy:80,type:'medical'});
  if(multi){g.crates.push({x:1420,y:-50,vx:0,vy:80,type:'double',falling:true});g.supplyObservation.crates=[0,1];}
  // Controlled simulation steps, with the actual renderer and main event handler.
  (window as any).__supplyStep=g.update.bind(g);g.update=()=>{};r.follow();q.updateUI();
 },multi);
}
async function step(page:any,count:number,stopY?:number){return page.evaluate(({count,stopY})=>{
 const q=(window as any).__qa,g=q.game,r=q.renderer,result:any[]=[];
 for(let i=0;i<count;i++){
  (window as any).__supplyStep(1/60);r.draw(1/60);
  for(const e of g.drainEvents())if(e.type==='turn')r.follow();
  result.push({phase:g.phase,approach:g.supplyObservation?.approach,elapsed:g.elapsed,clock:g.clock,x:r.offsetX,y:r.offsetY,w:r.viewWidth,h:r.viewHeight,boxes:g.crates.map((c:any)=>({x:c.x,y:c.y,falling:c.falling}))});
  if(stopY!==undefined&&g.crates[0].y>=stopY)break;
 }
 q.updateUI();return result;
},{count,stopY});}
function checkVisible(states:any[]){for(const s of states.filter(s=>s.phase==='supply'&&s.approach===0))for(const b of s.boxes){expect(b.x-36-s.x).toBeGreaterThanOrEqual(-.1);expect(b.x+36-s.x).toBeLessThanOrEqual(s.w+.1);expect(b.y-(b.falling?68:10)-s.y).toBeGreaterThanOrEqual(-.1);expect(b.y+25-s.y).toBeLessThanOrEqual(s.h+.1);}}
for(const width of [1194,1210])test(`iPad ${width}: remote crate and parachute stay framed through landing, then follow returns`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});await prepare(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');expect(await page.evaluate(()=>(window as any).__qa.renderer.ratio)).toBe(2);
 const states=await step(page,350,180);checkVisible(states);expect(states.at(-1).boxes[0].x-states.at(-1).x).toBeLessThan(states.at(-1).w);
 await expect(page.locator('#game-overlay')).toHaveClass(/hidden/);await expect(page.locator('#fire-button')).toBeDisabled();
 await page.screenshot({path:`QA/v${version}-supply-falling-${width}-${browserName}.png`,scale:'css'});
 const landing=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer;while(g.crates.some((c:any)=>c.falling)){(window as any).__supplyStep(1/60);r.draw(1/60);}q.updateUI();return {time:g.elapsed,phase:g.phase,x:r.offsetX,y:r.offsetY};});expect(landing.phase).toBe('supply');
 const hold=await step(page,35);checkVisible(hold);expect(hold.at(-1).phase).toBe('supply');
 const order=await page.evaluate(()=>{const r=(window as any).__qa.renderer,result:string[]=[],tank=r.tank,rect=r.ctx.roundRect;r.tank=function(...args:any[]){result.push('tank');return tank.apply(this,args);};r.ctx.roundRect=function(...args:any[]){if(args[2]===28&&args[3]===25)result.push('crate');return rect.apply(this,args);};r.draw(0);r.tank=tank;r.ctx.roundRect=rect;return result;});expect(order.lastIndexOf('crate')).toBeGreaterThan(order.lastIndexOf('tank'));
 await page.screenshot({path:`QA/v${version}-supply-landed-${width}-${browserName}.png`,scale:'css'});
 const rest=await step(page,120);const firstAiming=rest.find((s:any)=>s.phase==='aiming');expect(firstAiming.elapsed-landing.time).toBeGreaterThan(.9);expect(rest.filter((s:any)=>s.phase==='supply').every((s:any)=>s.clock===45)).toBe(true);expect(firstAiming.clock).toBe(45);
 const final=rest.at(-1),actor=await page.evaluate(()=>(window as any).__qa.game.active.x);expect(final.x).toBeCloseTo(Math.max(0,Math.min(640,actor-640)),0);expect(final.x).toBeLessThan(1);await expect(page.locator('#fire-button')).toBeEnabled();
 writeFileSync(`QA/v${version}-supply-${width}-${browserName}.json`,JSON.stringify({states,landing,hold,rest},null,2));
});
test('multiple drops are all visible and fog does not hide the observed landed item',async({page,browserName})=>{
 await prepare(page,true);const states=await step(page,400,200);checkVisible(states);
 await page.screenshot({path:`QA/v${version}-supply-multiple-${browserName}.png`,scale:'css'});
 const landed=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer;g.fog=true;while(g.crates.some((c:any)=>c.falling)){(window as any).__supplyStep(1/60);r.draw(1/60);}let drawn=0;const original=r.ctx.roundRect;r.ctx.roundRect=function(...args:any[]){if(args[2]===28&&args[3]===25)drawn++;return original.apply(this,args);};r.draw(0);r.ctx.roundRect=original;return {drawn,phase:g.phase,count:g.crates.length};});expect(landed.phase).toBe('supply');expect(landed.drawn).toBe(landed.count);expect(landed.count).toBe(2);
});
test('manual minimap location wins; follow targets supply; pause freezes camera and display timer',async({page})=>{
 await prepare(page);await step(page,100,100);
 const mini=await page.locator('#minimap').boundingBox();await page.mouse.click(mini!.x+mini!.width*.1,mini!.y+mini!.height*.9);await page.waitForTimeout(400);
 const manual=await page.evaluate(()=>{const q=(window as any).__qa;return {manual:q.renderer.camera.manual,x:q.renderer.offsetX};});expect(manual.manual).not.toBeNull();expect(manual.x).toBeLessThan(1);
 await page.locator('#minimap-follow').click();await page.waitForTimeout(400);const followed=await page.evaluate(()=>{const q=(window as any).__qa,r=q.renderer;return {manual:r.camera.manual,inside:q.game.crates[0].x>r.offsetX&&q.game.crates[0].x<r.offsetX+r.viewWidth,x:r.offsetX};});expect(followed.manual).toBeNull();expect(followed.inside).toBe(true);expect(followed.x).toBeGreaterThan(400);
 const paused=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer;g.paused=true;r.invalidate();r.draw(.016);const before={x:r.offsetX,y:r.offsetY,frames:r.frames,elapsed:g.elapsed,approach:g.supplyObservation.approach};for(let i=0;i<120;i++){(window as any).__supplyStep(.016);r.draw(.016);}return {before,after:{x:r.offsetX,y:r.offsetY,frames:r.frames,elapsed:g.elapsed,approach:g.supplyObservation.approach}};});expect(paused.after).toEqual(paused.before);
});
test('natural turn event starts supply framing and restores actor framing without a jump',async({page})=>{
 await page.addInitScript(()=>{Date.now=()=>52;});await boot(page);
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;q.recorder.detach();g.config.timer=45;g.clock=45;g.tanks.forEach((t:any,i:number)=>Object.assign(t,{controller:'human',x:i?100:1700,y:g.ground(i?100:1700)-18,fallVelocity:0}));g.firstSupplyChecked=true;g.nextSupplyAction=8;g.turn=7;g.nextTurn();});
 const result=await page.evaluate(()=>new Promise<any>(resolve=>{const states:any[]=[];let landed:number|undefined;function sample(){const q=(window as any).__qa,g=q.game,r=q.renderer;if(g.phase==='supply'){const c=g.crates.find((c:any)=>c.falling)??g.crates.at(-1);if(!c.falling&&landed===undefined)landed=g.elapsed;states.push({phase:g.phase,approach:g.supplyObservation?.approach,elapsed:g.elapsed,clock:g.clock,x:r.offsetX,y:r.offsetY,w:r.viewWidth,h:r.viewHeight,boxes:[{x:c.x,y:c.y,falling:c.falling}]});requestAnimationFrame(sample);}else resolve({states,landed,ended:g.elapsed});}requestAnimationFrame(sample);}));
 expect(result.states.length).toBeGreaterThan(60);checkVisible(result.states);expect(result.ended-result.landed).toBeGreaterThan(.85);expect(result.states.every((s:any)=>s.clock===45)).toBe(true);await expect(page.locator('#fire-button')).toBeEnabled();
});
test('supply framing also works on Canvas fallback',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.apply(this,[type,...args] as any);};});
 await prepare(page,true);const states=await step(page,300,200);checkVisible(states);expect(await page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('canvas');
});
test('flight and resolving targets keep their existing framing; tour wins and resets supply references',async({page})=>{
 await prepare(page);await step(page,100,100);
 const result=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer,c=r.camera;
  g.crates=[];g.supplyObservation=null;g.phase='flying';g.fog=false;const p=g.launch(g.active,'cannon-normal');Object.assign(p,{x:1400,y:40,delay:0});g.projectiles=[p];r.follow(false);r.draw(.3);
  const flight={x:r.offsetX,y:r.offsetY,expectedX:Math.max(0,Math.min(640,p.x-r.viewWidth/2)),expectedY:Math.min(g.active.y-r.viewHeight/2,p.y-r.viewHeight*.3),stale:r.supplyCrates.length};
  g.phase='resolving';g.projectiles=[];g.observation={target:0,point:null,kind:'hit'};r.draw(.3);const resolved={x:r.offsetX,y:r.offsetY,expected:c.target(g.tanks[0].x,g.tanks[0].y)};
  g.phase='supply';g.crates=[{x:1700,y:-50,falling:true,type:'double'}];g.supplyObservation={approach:.55,crates:[0]};g.paused=true;r.follow();r.invalidate();r.draw(.05);const frames=r.frames,pos={x:r.offsetX,y:r.offsetY};for(let i=0;i<90;i++)r.draw(.05);const frozen={frames:r.frames-frames,x:r.offsetX-pos.x,y:r.offsetY-pos.y};
  let finished=false;r.startTour(()=>{finished=true;});const seen=new Set();for(let i=0;i<100&&!finished;i++){seen.add(r.tourPlayer);r.draw(.05);}return {flight,resolved,frozen,tour:{finished,seen:[...seen]}};
 });
 expect(result.flight.x).toBeCloseTo(result.flight.expectedX);expect(result.flight.y).toBeCloseTo(result.flight.expectedY);expect(result.flight.stale).toBe(0);expect(result.resolved.x).toBeCloseTo(result.resolved.expected.x);expect(result.resolved.y).toBeCloseTo(result.resolved.expected.y);expect(result.frozen).toEqual({frames:0,x:0,y:0});expect(result.tour.finished).toBe(true);expect(result.tour.seen).toContain(0);expect(result.tour.seen).toContain(1);
});
