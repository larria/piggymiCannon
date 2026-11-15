import {test,expect} from '@playwright/test';import {boot} from './qa-app';

for(const width of [1194,1210])test(`${width} iPad: golden volley disappears on a lethal hit and the turn resumes`,async({page,browserName})=>{
 await page.setViewportSize({width,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 await page.evaluate(()=>{
  const q=(window as any).__qa;q.newMatch({...q.game.config,map:'valley',timer:0,fog:false,fireLine:false,selfDamage:false,friendlyFire:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',vehicle:i===0?'dragon':'cannon',team:i%2}))},true);
  const g=(window as any).__qa.game;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.wind=0;
  g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:[200,650,70,1150][i],y:432,fallVelocity:0,shield:0}));
  const target=g.tanks[1];target.hp=130;g.selectWeapon('dragon-special');g.active.angle=45;
  let best=Infinity;for(let power=10;power<=100;power+=.5){const d=Math.abs(g.predict(45,power,'dragon-special',12,g.active).x-target.x);if(d<best){best=d;g.active.power=power;}}
  // Run a real volley from muzzle to impact. Pause after the real killing damage
  // to inspect the blast and same-frame cancellation, without fabricating hits.
  let frozen=false;const update=g.update.bind(g);g.update=(dt:number)=>{if(!frozen)update(dt);};g.resumeQA=()=>{frozen=false;};
  const damage=g.damage.bind(g);g.damage=(t:any,...args:any[])=>{const hp=t.hp;damage(t,...args);if(t.id===1&&hp>0&&t.hp<=0)frozen=true;};
  g.fire();(window as any).__qa.updateUI();
 });
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[1].hp),{timeout:15000}).toBe(0);
 const result=await page.evaluate(()=>{const g=(window as any).__qa.game;return {phase:g.phase,projectiles:g.projectiles.length,cache:g.volleyTargets.size,blasts:g.blasts.length,locks:g.log.filter((s:string)=>s.includes('锁定目标')).length,explosions:g.log.filter((s:string)=>s.includes('黄金导弹')&&s.includes('命中')).length,allyHP:[g.tanks[0].hp,g.tanks[2].hp],allyMax:[g.tanks[0].maxHP,g.tanks[2].maxHP]};});
 expect(result.phase).toBe('resolving');expect(result.projectiles).toBe(0);expect(result.cache).toBe(0);expect(result.blasts).toBeGreaterThan(0);expect(result.locks).toBeGreaterThan(1);expect(result.explosions).toBe(1);expect(result.allyHP).toEqual(result.allyMax);
 await expect(page.locator('[data-hud]')).toHaveCount(4);await expect(page.locator('#game-overlay')).toBeHidden();
 await page.screenshot({path:`QA/v2.2.1-volley-${browserName==='webkit'?'webkit-':''}${width}.png`});
 await page.evaluate(()=>{(window as any).__qa.game.resumeQA();});
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.current),{timeout:8000}).not.toBe(0);
 expect(await page.evaluate(()=>(window as any).__qa.game.current)).not.toBe(1);expect(errors).toEqual([]);
});
