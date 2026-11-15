import {test,expect} from '@playwright/test';import {boot} from './qa-app';
import {Game,makeRng} from '../../src/engine';import {MAPS,ALL_WEAPONS} from '../../src/catalog';import {VEHICLES} from '../../src/vehicles';import {BGM_TRACKS} from '../../src/audio-catalog';import {writeFileSync} from 'node:fs';

for(const width of [1194,1210])test(`${width} iPad repeated rematches keep random preference with fresh reproducible seeds`,async({page})=>{
 test.setTimeout(70000);await page.setViewportSize({width,height:834});await page.addInitScript(()=>{Date.now=()=>52;});await boot(page,false);await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('input[name="map"][value="random"]').locator('..').click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const results=[];
 for(let n=0;n<10;n++){
  const seed=52+n,map=MAPS[Math.floor(makeRng(seed)()*MAPS.length)];
  await expect(page.locator('#map-label')).toContainText(map.name);
  const actual=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,s=g.battleSnapshot();return {config:s.initial.config,map:g.config.map,choice:g.config.mapChoice,seed:g.config.seed,name:s.initial.mapName,event:s.events.find((e:any)=>e.type==='map-selection')?.data,music:q.audio.music.src,weather:{fog:g.fog,fire:!!g.fireLine,snow:g.snow,gravity:g.gravity},terrain:Array.from(g.land.surface),positions:g.tanks.map((t:any)=>[t.x,t.y]),critical:s.critical.length};});
  expect(actual).toMatchObject({map:map.id,choice:'random',seed,name:map.name,event:{choice:'random',actual:map.id},critical:0});expect(actual.music).toContain(BGM_TRACKS[map.id]);
  const replay=new Game(actual.config);expect(actual.terrain).toEqual(Array.from(replay.land.surface));expect(actual.positions).toEqual(replay.tanks.map(t=>[t.x,t.y]));expect(actual.weather).toEqual({fog:replay.fog,fire:!!replay.fireLine,snow:replay.snow,gravity:replay.gravity});
  expect(await page.locator('#minimap-toggle').getAttribute('data-help-description')).toContain(map.description);results.push({seed,map:map.id});
  if(n<9){await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.damage(g.tanks[1],99999,0);g.nextTurn();g.update(3.1);q.updateUI();});await page.locator('[data-action="rematch"]').click();}
 }
 expect(new Set(results.map(r=>r.seed)).size).toBe(10);writeFileSync(`QA/v2.3.2-rematch-${width}.json`,JSON.stringify(results,null,2));await page.screenshot({path:`QA/v2.3.2-random-rematch-${width}.png`});
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.damage(g.tanks[1],99999,0);g.nextTurn();g.update(3.1);q.updateUI();});await page.getByRole('button',{name:'调整槽位与战场',exact:true}).click();await expect(page.locator('input[name="map"][value="random"]')).toBeChecked();await page.locator('input[name="map"][value="factory"]').locator('..').click();await page.getByRole('button',{name:'开始对局',exact:true}).click();
 expect(await page.evaluate(()=>{const g=(window as any).__qa.game;return {map:g.config.map,choice:g.config.mapChoice,draw:g.battleSnapshot().events.some((e:any)=>e.type==='map-selection')};})).toEqual({map:'factory',choice:'factory',draw:false});await expect(page.locator('#map-label')).toContainText('钢铁工厂');
 await page.evaluate(()=>{const q=(window as any).__qa,g=q.game;g.damage(g.tanks[1],99999,0);g.nextTurn();g.update(3.1);q.updateUI();});await page.locator('[data-action="rematch"]').click();await expect(page.locator('#map-label')).toContainText('钢铁工厂');expect(await page.evaluate(()=>(window as any).__qa.game.config.mapChoice)).toBe('factory');
});

for(const width of [1194,1210])test(`${width} iPad: 39 projectiles remain legible and all 13 normal/special flights have only boosted star histories`,async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>frame(t=>{if(!(window as any).freezeFlight)cb(t);});});await page.setViewportSize({width,height:834});await boot(page);await page.waitForTimeout(100);
 const visibility=await page.evaluate(weapons=>{const q=(window as any).__qa;return weapons.map((w:any)=>{const canvas=document.createElement('canvas');canvas.width=140;canvas.height=100;const c=canvas.getContext('2d')!;c.translate(70,50);const scale=q.projectileDrawScale(w.shape??w.id);c.scale(scale,scale);q.projectileArt(c,w.shape??w.id,w.color,0);const data=c.getImageData(0,0,140,100).data;let minX=140,maxX=0,minY=100,maxY=0,pixels=0;for(let y=0;y<100;y++)for(let x=0;x<140;x++)if(data[(y*140+x)*4+3]>20){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);pixels++;}return {id:w.id,color:w.color,scale,width:maxX-minX+1,height:maxY-minY+1,pixels};});},ALL_WEAPONS.map(({id,shape,color})=>({id,shape,color})));
 expect(visibility).toHaveLength(39);for(const r of visibility){expect(r.width,r.id).toBeGreaterThanOrEqual(13);expect(r.height,r.id).toBeGreaterThanOrEqual(7);expect(r.width,r.id).toBeLessThan(52);expect(r.pixels,r.id).toBeGreaterThan(60);}writeFileSync('QA/v2.3.2-projectile-visibility.json',JSON.stringify(visibility,null,2));
 for(const v of VEHICLES)for(const weapon of [v.normal,v.special])for(const boosted of [false,true]){
  const wide=width===1210&&boosted&&['cannon-special','dragon-special','water-normal'].includes(weapon);
  const capture=await page.evaluate(({id,weapon,boosted})=>{
   (window as any).freezeFlight=true;let q=(window as any).__qa;
   const slots=q.game.config.slots.map((s:any,i:number)=>({...s,enabled:i<2,controller:'human',team:i,vehicle:id}));q.newMatch({...q.game.config,slots,allowDragon:true,map:'valley',mapChoice:'valley',fog:false,fireLine:false,snow:false,timer:0},true);q=(window as any).__qa;const g=q.game;g.wind=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,540,640);g.land.rebuild();g.tanks.forEach((t:any,i:number)=>{t.x=i?1060:260;t.y=522;});g.active.boost=boosted;g.active.doubleShot=id==='multi'||id==='dragon';g.selectWeapon(weapon);g.setAim(38,72);g.fire();const original=[...g.projectiles];for(let n=0;n<45;n++)g.update(.01);q.renderer.offsetY=0;q.renderer.manualFocus=0;q.renderer.draw(0);q.dashboard.draw(g,g.active,q.renderer.offsetY,q.renderer.viewHeight);q.updateUI();return {count:original.length,expected:g.tanks[0].shots,flags:original.map((p:any)=>p.fireBoosted),trails:original.map((p:any)=>p.trail.length),scale:original.map((p:any)=>p.scale),phase:g.phase};
  },{id:v.id,weapon,boosted});expect(capture.expected).toBe(1);expect(capture.flags.every((f:boolean)=>f===boosted)).toBe(true);expect(capture.trails.every((n:number)=>boosted?n>0:n===0)).toBe(true);expect(capture.scale.every((n:number)=>n===1)).toBe(true);
  if(!boosted&&width===1194)await page.screenshot({path:`QA/v2.3.2-flight-${weapon}-1194.png`});else if(wide)await page.screenshot({path:`QA/v2.3.2-stars-${weapon}-1210.png`});
 }
});
