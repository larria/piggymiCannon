import {test,expect} from '@playwright/test';import {boot} from './qa-app';
async function arrange(page:any,roof=false){
 await boot(page);await page.evaluate((roof:boolean)=>{
  const q=(window as any).__qa;
  q.newMatch({...q.game.config,map:'valley',timer:0,fog:false,fireLine:false,selfDamage:false,friendlyFire:false,slots:q.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:i===0?'ai':'human',difficulty:'expert',vehicle:'cannon',team:i%2}))},true);
  const g=(window as any).__qa.game;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++){g.land.column(x,450,640,true);if(roof&&x>=180&&x<=420)g.land.column(x,320,390,true);}g.land.rebuild();
  g.tanks.forEach((t:any,i:number)=>{t.x=(roof?[250,650,70,1050]:[220,310,70,1180])[i];t.y=432;t.hp=t.maxHP=920;t.fallVelocity=0;t.direction=i%2?-1:1;});
  // Deterministic presentation of one non-miss action only. Accuracy statistics
  // use 240 genuine independent seeds per level, without this visual fixture RNG.
  g.rng=()=>.9;g.wind=0;q.updateUI();
 },roof);
}
test('1194 iPad: expert automatically chooses a low-power 2v2 close shot without hurting allies',async({page,browserName})=>{
 await page.setViewportSize({width:1194,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await arrange(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.aiDecision?.target)).toBe(1);
 const power=await page.evaluate(()=>(window as any).__qa.game.tanks[0].power);expect(power).toBeGreaterThanOrEqual(10);expect(power).toBeLessThan(22);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[1].hp),{timeout:8000}).toBeLessThan(920);
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].hp)).toBe(920);expect(await page.evaluate(()=>(window as any).__qa.game.tanks[2].hp)).toBe(920);
 await expect(page.locator('[data-hud]')).toHaveCount(4);await expect(page.locator('#game-overlay')).toBeHidden();await page.screenshot({path:browserName==='webkit'?'QA/v2.2-ai-webkit-close-1194.png':'QA/v2.2-ai-close-1194.png'});expect(errors).toEqual([]);
});
test('1210 iPad: expert visibly travels below permanent support, then fires from the improved position',async({page,browserName})=>{
 await page.setViewportSize({width:1210,height:834});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await arrange(page,true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[0].x),{timeout:8000}).toBeGreaterThan(280);
 const moving=await page.evaluate(()=>{const g=(window as any).__qa.game;return {x:g.tanks[0].x,fuel:g.tanks[0].fuel,phase:g.phase,y:g.tanks[0].y};});expect(moving.x).toBeLessThan(378);expect(moving.fuel).toBeLessThan(100);expect(moving.phase).toBe('aiming');expect(moving.y).toBe(432);
 await page.screenshot({path:browserName==='webkit'?'QA/v2.2-ai-webkit-move-1210.png':'QA/v2.2-ai-move-1210.png'});await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.tanks[1].hp),{timeout:10000}).toBeLessThan(920);
 expect(await page.evaluate(()=>(window as any).__qa.game.tanks[0].x)).toBeCloseTo(378,1);await expect(page.locator('#game-overlay')).toBeHidden();expect(errors).toEqual([]);
});
