import test from 'node:test';import assert from 'node:assert/strict';
import {Game,WATER_Y,MAX_CLIMB_ANGLE} from '../src/engine.ts';
import {Terrain} from '../src/terrain.ts';
import {MAPS,TURN_ITEMS,excavation,weaponHasTrail} from '../src/catalog.ts';
import {chooseResultPosition} from '../src/result-layout.ts';
const ready=(config={})=>{const g=new Game({seed:52,timer:0,fog:false,fireLine:false,...config});g.start();return g;};
const flat=(config={})=>{const g=ready(config);g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.tanks.forEach((t,i)=>{t.x=175+i*930;t.y=432;});g.wind=0;return g;};
const run=(g:Game,seconds:number)=>{for(let i=0;i<seconds*120;i++)g.update(1/120);};
test('45 to 60 degree solid and thin platforms climb without pixel or lookahead false positives',()=>{
 assert.equal(MAX_CLIMB_ANGLE,60);
 for(const angle of [40,45,50,55,59,59.9,60])for(const direction of [-1,1])for(const thickness of [8,20,250]){
  const g=ready();g.land=new Terrain();g.terrain=g.land.surface;const grade=Math.tan(angle*Math.PI/180);
  for(let x=0;x<=1280;x++){const top=480-direction*(x-200)*grade;g.land.column(x,top,top+thickness);}
  g.land.rebuild();g.active.x=200;g.active.y=g.ground(200)-18;
  for(let step=0;step<20;step++){assert.ok(g.move(direction,.04),`${angle}°, ${direction}, ${thickness}px, ${step}`);g.update(.01);assert.equal(g.active.fallVelocity,0);}
  assert.ok(Math.abs(g.active.x-200)>50);assert.ok(Math.abs(g.tankSlope(g.active))*180/Math.PI>angle-2);
 }
});
test('extreme slopes, tall isolated walls and broken platforms remain blocked',()=>{
 for(const angle of [65,70,80]){const g=flat();g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450-(x-200)*Math.tan(angle*Math.PI/180),640);g.land.rebuild();g.active.x=200;g.active.y=g.ground(200)-18;assert.equal(g.move(1,.1),false,`${angle}`);}
 for(const gap of [false,true]){const g=flat();g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)if(!gap||x<225||x>255)g.land.column(x,x>225?420:450,640);g.land.rebuild();g.active.x=200;g.active.y=432;for(let i=0;i<30;i++)g.move(1,.04);if(gap)assert.ok(g.active.x>225);else assert.ok(g.active.x<225);}
});
test('initial four items stay empty after use; full slots reject crates without healing or overwrite',()=>{
 const g=flat(),t=g.active;g.useItem('double');assert.equal(t.items.double,0);
 for(let i=0;i<4;i++)g.nextTurn();assert.equal(t.items.double,0);assert.equal(g.useItem('double'),false);
 for(const item of TURN_ITEMS)t.items[item]=1;t.hp=90;t.ammo.homing=1;
 const before={items:{...t.items},hp:t.hp,ammo:{...t.ammo},fuel:t.fuel};
 g.crates=['medical','double','transfer','boost','homing','ammo'].map(type=>({x:t.x,y:t.y,type:type as any}));run(g,.05);
 assert.equal(g.crates.length,6);assert.deepEqual({items:t.items,hp:t.hp,ammo:t.ammo,fuel:t.fuel},before);
 t.items.double=0;run(g,.03);assert.equal(t.items.double,1);assert.equal(g.crates.length,5);assert.equal(t.hp,90);run(g,.03);assert.equal(g.crates.length,5);
});
test('a matching empty supply slot receives one item and does not auto-apply the item',()=>{
 const g=flat(),t=g.active;t.items.repair=0;t.hp=90;g.crates=[{x:t.x,y:t.y,type:'medical'}];run(g,.03);assert.equal(t.items.repair,1);assert.equal(t.hp,90);
 t.items.teleport=0;g.crates=[{x:t.x,y:t.y,type:'transfer'}];run(g,.03);assert.equal(t.items.teleport,1);assert.equal(g.teleporting,false);
});
test('direct head impacts excavate under the feet; orbital excavation is full-sized and shallow',()=>{
 for(const id of ['cannon-normal','cannon-special','multi-normal','ion-special'] as const){
  const g=flat({vehicle0:id.split('-')[0] as any,vehicle1:'cannon'}),e=g.enemy;const before=g.land.mask.reduce((a,b)=>a+b,0);
  (g as any).explode({...g.launch(g.active,id),x:e.x-12,y:e.y-34},e.id);
  assert.ok(g.land.mask.reduce((a,b)=>a+b,0)<before,id);assert.ok(e.hp<e.maxHP,id);
 }
 const normal=excavation('cannon-normal',false),orbital=excavation('ion-special',true);
 assert.deepEqual(orbital,excavation('ion-special',false));assert.ok(orbital.radius<normal.radius&&orbital.radius>normal.radius*.85);assert.ok(orbital.depth<normal.depth*.5);
});
test('all multi and dragon volleys have distinct impact positions, including nine independent guidance endpoints',()=>{
 for(const vehicle of ['multi','dragon'] as const)for(const slot of ['normal','special'] as const){
  const id=`${vehicle}-${slot}` as const,g=flat({vehicle0:vehicle,mode:'hotseat'});g.selectWeapon(id);g.active.angle=45;g.active.power=45;g.fire();
  const initial=g.projectiles.length;assert.equal(initial,slot==='normal'?3:9);
  if(id==='dragon-special'){
   const e=g.enemy;g.projectiles.forEach((p,i)=>Object.assign(p,{x:e.x-70+i*12,y:e.y-75,vx:50,vy:140,age:.5}));g.update(.01);
   assert.equal(g.projectiles.filter(p=>p.homing).length,9);assert.equal(new Set(g.projectiles.map(p=>`${p.lockX.toFixed(1)},${p.lockY.toFixed(1)}`)).size,9);
  }else{
   // Keep the target away from these landings to measure their actual terrain impacts.
   g.enemy.x=1240;run(g,6);const hits=g.drainEvents().filter(e=>e.type==='explosion');
   assert.equal(hits.length,initial,id);assert.ok(new Set(hits.map(e=>Math.round(e.x!))).size>=initial-1,id);
  }
 }
});
test('cannon rounds never accumulate a flight trail, and a fresh or ended match has no power marker',()=>{
 for(const id of ['cannon-normal','cannon-special'] as const){const g=flat({vehicle0:'cannon'});assert.equal(g.active.lastPower,null);g.selectWeapon(id);g.fire();run(g,.1);assert.equal(g.projectiles[0].trail.length,0);assert.equal(weaponHasTrail(id),false);assert.equal(g.active.lastPower,68);g.damage(g.enemy,9999,0);run(g,10);assert.ok(g.tanks.every(t=>t.lastPower===null));}
 assert.equal(weaponHasTrail('multi-normal'),true);
});
test('seeded deployments vary, include close encounters, and always have safe separated escape routes',()=>{
 let close=0,total=0;const positions=new Set<string>();
 for(const map of MAPS)for(let seed=1;seed<=35;seed++){
  const g=ready({map:map.id,seed,vehicle0:'bowl',vehicle1:'cannon'}),same=ready({map:map.id,seed,vehicle0:'bowl',vehicle1:'cannon'});
  assert.deepEqual(g.tanks.map(t=>[t.x,t.y]),same.tanks.map(t=>[t.x,t.y]));
  const distance=g.enemy.x-g.active.x;assert.ok(distance>=120,map.id);close+=Number(distance<=280);total++;
  positions.add(`${map.id}:${g.active.x}:${g.enemy.x}`);
  for(const t of g.tanks){assert.ok(g.stablePlatform(t.x),map.id);assert.ok(t.y+18<WATER_Y-30);assert.ok(g.traversable(t,t.x-60)!==null||g.traversable(t,t.x+60)!==null,map.id);}
  run(g,.1);assert.ok(g.tanks.every(t=>t.hp===t.maxHP),map.id);
 }
 assert.ok(close>total*.08&&close<total*.4);assert.ok(positions.size>total*.65);
});
test('result placement finds free space around actors who spawned in the middle',()=>{
 const actors=[{x:550,y:145,width:100,height:125},{x:930,y:320,width:90,height:50}];
 const pos=chooseResultPosition(1172,614,370,347,actors);assert.equal(pos.overlap,0);assert.ok(pos.x>=16&&pos.x+370<=1172-16);assert.ok(pos.y>=16&&pos.y+347<=614-16);
});
test('all nine golden missiles actually hit distinct points while retaining independent tracking',()=>{
 const g=flat({vehicle0:'dragon',vehicle1:'cannon',mode:'hotseat'});g.land.protectedMask.set(g.land.mask);g.enemy.hp=g.enemy.maxHP=100000;
 g.selectWeapon('dragon-special');g.active.angle=45;g.active.power=45;g.fire();const seen=new Set(),points:{x:number;y:number}[]=[];
 for(let i=0;i<1800&&g.phase!=='handoff';i++){g.update(1/120);for(const blast of g.blasts)if(!seen.has(blast)){seen.add(blast);points.push({x:blast.x,y:blast.y});}}
 assert.equal(points.length,9);assert.equal(g.tanks[1].hp,100000-9*130);assert.equal(g.drainEvents().filter(e=>e.type==='lock').length,9);
 assert.equal(new Set(points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`)).size,9);
 assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>10);
});
