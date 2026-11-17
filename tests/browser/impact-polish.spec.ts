import {test,expect} from '@playwright/test';import {writeFileSync,readFileSync} from 'node:fs';import {boot} from './qa-app';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
test.use({deviceScaleFactor:2});
for(const weapon of ['missile-normal','cannon-normal','cannon-special','bowl-normal','ion-special'])test(`${version} actual ${weapon} contact: damage, crater and iPad composition`,async({page,browserName})=>{
 await boot(page,true,'factory',weapon.split('-')[0],'missile');await page.waitForFunction(()=>(window as any).__qa.renderer.backend==='pixi');
 const report=await page.evaluate(weapon=>{
  const q=(window as any).__qa,g=q.game;q.recorder.detach();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:i?900:160,y:432,fallVelocity:0}));g.wind=0;g.selected=weapon;g.active.selectedWeapon=weapon;
  const before=g.land.mask.reduce((n:number,v:number)=>n+v,0);g.fire();Object.assign(g.projectiles[0],{x:900,y:408,vx:0,vy:500,age:2});for(let i=0;i<1000&&g.projectiles.length;i++)g.update(.005);
  const s=g.battleSnapshot(),removed=before-g.land.mask.reduce((n:number,v:number)=>n+v,0);g.blasts=[];g.particles=[];g.texts=[];g.drainEvents();g.update=()=>{};q.renderer.focusAt(900,455);q.renderer.invalidate();q.renderer.draw(.2);q.updateUI();
  return {weapon,backend:q.renderer.backend,version:g.gameVersion,removed,ground:g.ground(900),hp:g.tanks[1].hp,maxHP:g.tanks[1].maxHP,damage:s.events.filter((e:any)=>e.type==='damage'&&e.data.target===1).map((e:any)=>e.data.requested),impacts:s.events.filter((e:any)=>e.type==='impact').map((e:any)=>e.data),terrain:s.events.filter((e:any)=>e.type==='terrain').map((e:any)=>e.data),profiles:s.events.filter((e:any)=>e.type==='excavation-profile').map((e:any)=>e.data),viewport:q.renderer.viewport};
 },weapon);
 expect(report.backend).toBe('pixi');expect(report.version).toBe(version);expect(report.damage.length).toBeGreaterThan(0);expect(await page.locator('#game-overlay').isVisible()).toBe(false);
 if(weapon==='missile-normal'){expect(report.damage).toEqual([168,134,101,67]);expect(report.removed).toBe(0);expect(report.impacts.map((e:any)=>e.section)).toEqual([1,2,3,4]);}
 if(weapon==='cannon-normal'){expect(report.terrain[0].radius).toBeCloseTo(99.9);expect(report.terrain[0].depth).toBe(32.5);expect(report.removed).toBeGreaterThan(0);}
 if(weapon==='cannon-special')expect(report.removed).toBe(0);
 if(weapon==='bowl-normal')expect(report.removed).toBe(0); // 54 - 65 < 0 for a direct hit.
 if(weapon==='ion-special'){expect(report.terrain).toHaveLength(1);expect(report.terrain[0].radius).toBeCloseTo(91.8);expect(report.terrain[0].depth).toBe(90);expect(report.profiles[0].depthReduction).toBe(0);expect(report.removed).toBeGreaterThan(10000);}
 for(const selector of ['#fire-button','#move-left','#move-right']){const r=await page.locator(selector).boundingBox();if(r){expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y+r.height).toBeLessThanOrEqual(834);}}
 writeFileSync(`QA/v${version}-${weapon}-${browserName}.json`,JSON.stringify(report,null,2));await page.screenshot({path:`QA/v${version}-${weapon}-${browserName}-1194.png`,scale:'css'});
});
