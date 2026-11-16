import {Game} from './legacy-fixture';
import test from 'node:test';import assert from 'node:assert/strict';
import {TERRAIN_H} from '../src/terrain';
import {BRIDGE_THICKNESS} from '../src/engine.ts';
import {TURN_ITEMS,excavation} from '../src/catalog.ts';
import {VEHICLES,vehicleById} from '../src/vehicles.ts';
import {isRaging,isRedHealth,redHealthLimit} from '../src/health.ts';
import {breathingPose} from '../src/feedback.ts';
const ready=(config={})=>{const g=new Game({seed:52,timer:0,fog:false,fireLine:false,...config});g.start();return g;};
const run=(g:Game,seconds:number,until?:(g:Game)=>boolean)=>{for(let i=0;i<seconds*120;i++){g.update(1/120);if(until?.(g))break;}};

test('bridge absorbs one ordinary cannon ground impact but repeated shots still excavate through',()=>{
 const g=ready({map:'coast',vehicle0:'cannon',vehicle1:'cannon'}),x=640,top=g.ground(x),bottom=g.land.bottom(x);
 assert.equal(bottom-top,BRIDGE_THICKNESS);const p=g.launch(g.active,'cannon-normal');Object.assign(p,{x,y:top+.5});
 (g as any).explode(p);assert.ok(g.ground(x)<bottom-5);assert.ok(g.land.solid(x,bottom-8));
 const dig=excavation('cannon-normal',false);for(let i=0;i<10&&g.ground(x)<TERRAIN_H;i++)g.crater(x,g.ground(x),dig.radius,dig.depth);
 assert.equal(g.ground(x),TERRAIN_H,'repeated ordinary impacts can remove the remaining support');
 const victim=g.enemy;victim.x=x;victim.y=top-18;victim.fallStart=victim.y;victim.fallVelocity=1;run(g,4);assert.equal(victim.hp,0);
});
test('both tanks have exactly four distinct one-count starting items',()=>{
 const g=ready({vehicle0:'sea',vehicle1:'crossbow'});
 for(const t of g.tanks){assert.deepEqual(Object.keys(t.items).filter(id=>t.items[id as keyof typeof t.items]>0).sort(),[...TURN_ITEMS].sort());for(const id of TURN_ITEMS)assert.equal(t.items[id],1);}
 assert.ok(g.useItem('double'));assert.equal(g.active.items.double,0);assert.equal(g.useItem('boost'),false);
 g.nextTurn();assert.equal(g.tanks[0].items.double,0);g.nextTurn();assert.equal(g.tanks[0].items.double,0);
 assert.equal(g.active.itemUsed,false);assert.equal(g.itemUnavailable('boost'),null);
});
test('a transfer shell follows real flight, consumes one item and moves beyond the old click range',()=>{
 const g=ready({map:'factory',vehicle0:'cannon',vehicle1:'bowl'}),t=g.active;
 g.wind=0;t.x=175;t.y=g.ground(175)-18;g.enemy.x=1105;g.enemy.y=g.ground(1105)-18;t.angle=35;t.power=50;const start=t.x,hp=g.enemy.hp,ammo=t.ammo['cannon-special'];g.selectWeapon('cannon-special');
 assert.ok(g.useItem('teleport'));assert.equal(t.items.teleport,1);assert.ok(g.fire());
 assert.equal(g.projectiles.length,1);const p=g.projectiles[0];assert.ok(p.transfer);assert.equal(t.items.teleport,0);assert.equal(t.ammo['cannon-special'],ammo);
 assert.equal(g.fire(),false);assert.equal(g.useItem('double'),false);
 let landing:{x:number;y:number}|null=null;
 for(let i=0;i<2000&&g.projectiles.length;i++){landing={x:p.x,y:p.y};g.update(1/120);}
 assert.ok(landing);assert.ok(t.x>start+230);assert.ok(Math.abs(t.x-landing.x)<8);assert.equal(g.enemy.hp,hp);
 assert.equal(g.selected,'cannon-special');assert.equal(g.blasts.length,0);assert.ok(g.log.some(line=>line.includes('抵达落点')));
});
test('off-map transfer does not move the tank or turn into a damaging normal weapon',()=>{
 const g=ready({map:'factory'}),t=g.active,start=t.x;g.wind=0;t.direction=-1;t.angle=5;t.power=100;
 g.useItem('teleport');g.fire();run(g,5,x=>x.current!==0);assert.equal(t.x,start);assert.equal(t.items.teleport,0);assert.equal(g.tanks[1].hp,150);
});
test('all thirteen vehicles use thirty-percent red health; sea rage is strictly below fifty percent',()=>{
 for(const v of VEHICLES){const t={maxHP:v.hp,hp:Math.ceil(v.hp*.3)+1,vehicleId:v.id};assert.equal(isRedHealth(t),false);
  t.hp--;assert.equal(isRedHealth(t),true);assert.equal(breathingPose(t.hp,.3,t.maxHP,t.vehicleId).active,v.id!=='sea');
 }
 const g=ready({vehicle0:'sea'}),t=g.active;t.hp=t.maxHP*.5;assert.equal(isRaging(t),false);assert.equal(g.launch(t,'sea-normal').boost,1);
 t.hp--;assert.equal(isRaging(t),true);assert.equal(g.launch(t,'sea-normal').boost,1.5);
 t.hp=redHealthLimit(t);assert.equal(breathingPose(t.hp,.4,t.maxHP,t.vehicleId).active,false);
 const a=breathingPose(30,0),b=breathingPose(30,.3);assert.ok(Math.abs(a.bob-b.bob)>5);assert.ok(Math.abs(a.scale-b.scale)>.1);
});
test('poison damages every vehicle by twenty-percent maximum health until red, never kills',()=>{
 for(const v of VEHICLES){const g=ready({vehicle0:v.id}),t=g.active;t.poisoned=true;t.poisonOwner=1;
  for(let i=0;i<4;i++){if(g.current!==0)g.nextTurn();const hp=t.hp;g.nextTurn();assert.equal(hp-t.hp,Math.min(Math.ceil(t.maxHP*.2),hp-redHealthLimit(t)));}
  assert.equal(t.hp,redHealthLimit(t));assert.equal(t.poisoned,false);assert.ok(t.hp>0);
 }
 const g=ready({vehicle0:'crossbow',vehicle1:'cannon'}),e=g.enemy;e.hp=redHealthLimit(e);
 (g as any).explode({...g.launch(g.active,'crossbow-special'),x:e.x,y:e.y},e.id);assert.equal(e.poisoned,false);
});
test('losers remain as pigs on safe land but disappear after falling off; results keep animating',()=>{
 const land=ready({map:'factory'});land.damage(land.enemy,9999,0);run(land,.1);assert.equal(land.phase,'ended');run(land,2);
 assert.equal(land.enemy.outOfBounds,false);assert.equal(land.enemy.fallVelocity,0);assert.ok(land.resultAge>1.9);
 const drop=ready({map:'coast'}),e=drop.enemy;drop.crater(e.x,drop.ground(e.x),90,TERRAIN_H);run(drop,5,x=>x.phase==='ended');
 assert.equal(e.hp,0);assert.equal(e.outOfBounds,true);
});
