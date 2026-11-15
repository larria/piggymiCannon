import {Game} from './legacy-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import {WATER_Y} from '../src/engine.ts';
import {MAPS,ALL_WEAPONS,excavation} from '../src/catalog.ts';
import {TEMPLE_NODES,templeRail} from '../src/classic-maps.ts';

const ready=(config={})=>{const g=new Game({seed:52,timer:0,fog:false,fireLine:false,...config});g.start();return g;};
const run=(g:Game,seconds:number,until?:(g:Game)=>boolean)=>{for(let i=0;i<seconds*120;i++){g.update(1/120);if(until?.(g))break;}};

test('fog lasts two completed actions and ignores pauses, handoff and supply animation',()=>{
 const g=ready({mode:'hotseat',fog:true});g.paused=true;run(g,90);assert.equal(g.fogTurnsRemaining,2);
 g.paused=false;g.nextTurn();assert.equal(g.fog,true);assert.equal(g.fogTurnsRemaining,1);
 run(g,90);assert.equal(g.fogTurnsRemaining,1);g.acceptHandoff();g.nextTurn();assert.equal(g.fog,false);
 assert.equal(g.drainEvents().filter(e=>e.type==='weather').length,1);
 const supply=ready({mode:'hotseat',fog:true});supply.turn=4;supply.nextTurn();assert.equal(supply.phase,'supply');
 run(supply,8);assert.equal(supply.fog,true);assert.equal(supply.fogTurnsRemaining,1);
 supply.acceptHandoff();supply.nextTurn();assert.equal(supply.fog,false);
});

test('AI matches alternate whole actions despite unequal vehicles, waiting or double-fire stock',()=>{
 for(const pair of [['cannon','sea'],['sea','cannon'],['bowl','dragon']] as const){
  const g=ready({map:'factory',vehicle0:pair[0],vehicle1:pair[1],difficulty:'expert'});
  g.tanks.forEach(t=>t.hp=t.maxHP=100000);
  for(let turn=0;turn<8;turn++){
   assert.equal(g.current,turn%2);const t=g.active;
   t.nextActionAt=turn%2===0?1e7:0;t.items.double=1;t.tactics=4;
   if(g.current===0){g.selectWeapon(`${pair[0]}-special`);g.useItem('double');g.active.direction=-1;g.active.power=10;assert.ok(g.fire());}
   const shots=t.shots;run(g,20,x=>(x.current!==t.id&&x.phase==='aiming')||x.phase==='ended');
   assert.notEqual(g.phase,'ended');assert.equal(g.current,1-t.id);
   assert.equal(t.shots,shots+(t.id===1?1:0),'one fire invocation per action');
  }
 }
});

test('hotseat reproduces the documented 980 versus 780 cannon initiative example',()=>{
 const g=ready({mode:'hotseat',vehicle0:'cannon',vehicle1:'cannon'});
 const first=g.active;first.tactics=3;first.items.double=1;
 assert.ok(g.useItem('double'));assert.ok(g.selectWeapon('cannon-special'));assert.ok(g.fire());
 assert.equal(first.lastDelay,980);assert.equal(first.shots,1);assert.equal(g.projectiles.length,2);assert.equal(g.fire(),false);
 g.projectiles=[];g.nextTurn();g.acceptHandoff();assert.equal(g.current,1);
 assert.ok(g.selectWeapon('cannon-special'));assert.ok(g.fire());assert.equal(g.active.lastDelay,780);
 g.projectiles=[];g.nextTurn();assert.equal(g.current,1,'lower waiting player receives another action');
 g.acceptHandoff();assert.equal(g.active.itemDelay,0);assert.equal(g.active.actionTime,0);
});

test('attack, item, movement and aiming time accumulate waiting; pauses and flights do not',()=>{
 const g=ready({mode:'hotseat',vehicle0:'cannon',vehicle1:'cannon'}),t=g.active;
 run(g,3);assert.equal(g.delayFor(t,'cannon-normal'),710);assert.equal(g.delayFor(t,'cannon-special'),810);
 const time=t.actionTime;g.paused=true;run(g,3);g.paused=false;assert.equal(t.actionTime,time);
 assert.ok(g.move(-1,.1));assert.ok(g.delayFor(t,'cannon-normal')>710);
 assert.ok(g.useItem('boost'));assert.equal(t.itemDelay,200);
 assert.ok(g.fire());const delay=t.lastDelay;run(g,.2);assert.equal(t.actionTime,time);assert.equal(t.lastDelay,delay);
});

test('each player remembers the chosen weapon; exhausted supply ammunition falls back safely',()=>{
 const g=ready({vehicle0:'water',vehicle1:'cannon'});
 const advance=()=>{g.nextTurn();if(g.phase==='supply')run(g,8,x=>x.phase==='aiming');};
 assert.ok(g.selectWeapon('water-special'));advance();g.tanks[1].selectedWeapon='cannon-special';advance();
 assert.equal(g.selected,'water-special');advance();assert.equal(g.selected,'cannon-special');advance();
 assert.ok(g.selectWeapon('water-normal'));advance();advance();assert.equal(g.selected,'water-normal');
 g.active.ammo.homing=1;assert.ok(g.selectWeapon('homing'));advance();advance();assert.equal(g.selected,'homing');
 assert.ok(g.fire());g.projectiles=[];advance();advance();assert.equal(g.selected,'water-normal');
});

test('holding left or right keeps that direction across frames without oscillating facing',()=>{
 const g=ready();g.active.angle=57;
 for(const direction of [-1,1])for(let frame=0;frame<12;frame++){
  assert.ok(g.move(direction,.04));assert.equal(g.active.direction,direction);assert.equal(g.active.angle,57);
 }
});

test('wind noticeably shifts impacts and prediction follows actual projectile flight',()=>{
 const impacts:number[]=[];
 for(const wind of [-13,13]){
  const g=ready();g.active.x=175;g.active.y=g.ground(175)-18;g.enemy.x=1105;g.enemy.y=g.ground(1105)-18;g.wind=wind;g.active.angle=65;g.active.power=60;
  const prediction=g.predict(65,60),p=g.launch(g.active,'shell');g.fire();run(g,12,x=>x.projectiles.length===0);
  const explosion=g.drainEvents().find(e=>e.type==='explosion');assert.ok(explosion?.x!==undefined);
  assert.ok(Math.abs(explosion.x-prediction.x)<12,`${wind}: actual ${explosion.x}, predicted ${prediction.x}`);
  impacts.push(explosion.x);assert.ok(p.vx>0);
 }
 assert.ok(impacts[1]-impacts[0]>200,'ordinary winds materially change long-range aiming');
});

test('factory has a permanent full-width floor which every weapon excavation preserves',()=>{
 const g=ready({map:'factory'}),floor=g.land.protectedMask.slice();
 for(const w of ALL_WEAPONS){const dig=excavation(w.id,false);g.crater(640,552,dig.radius,dig.depth);}
 g.crater(640,300,1500,1000);
 for(let i=0;i<floor.length;i++)if(floor[i])assert.equal(g.land.mask[i],1);
 for(let x=0;x<=1280;x++)assert.equal(g.ground(x),552);
 run(g,4);assert.ok(g.tanks.every(t=>t.y+18<=552&&t.y<WATER_Y));
});

test('temple has a four-pixel lower rail, permanent nodes and destructible ordinary tracks',()=>{
 const g=ready({map:'temple'}),x=500,rail=g.ground(x,500);
 assert.equal(g.land.bottom(x,rail)-rail,4);assert.ok(Math.abs(rail-templeRail(x))<1);
 g.crater(x,rail,55,40);assert.equal(g.ground(x,500),640);
 for(const node of TEMPLE_NODES){const top=g.ground(node,500);g.crater(node,top,100,90);assert.equal(g.ground(node,500),top);}
 const safe=g.active;safe.x=350;safe.y=g.ground(350,500)-18;safe.fallVelocity=0;run(g,2);assert.ok(safe.hp>0);assert.ok(safe.y<WATER_Y-18);
 const victim=g.enemy;victim.x=x;victim.y=rail-18;victim.fallVelocity=1;victim.fallStart=victim.y;run(g,3);assert.equal(victim.hp,0);
});

test('an explosion on a high platform does not delete an untouched thin lower track',()=>{
 const g=ready({map:'temple'}),rail=g.ground(175,500);g.crater(175,335,40,35);
 assert.equal(g.ground(175,500),rail);assert.equal(g.land.bottom(175,rail)-rail,4);
});

test('all six maps finish a full AI match without invalid terrain or a stalled action',()=>{
 for(const map of MAPS){
  const g=ready({map:map.id,vehicle0:'bowl',vehicle1:'sea',difficulty:'normal'});
  for(let tick=0;tick<22000&&g.phase!=='ended';tick++){
   if(g.current===0&&g.phase==='aiming'){g.planAI();g.fire();}
   g.update(1/60);
  }
  assert.equal(g.phase,'ended',map.id);assert.ok(g.tanks.every(t=>Number.isFinite(t.hp)&&t.hp>=0&&t.hp<=t.maxHP),map.id);
 }
});
