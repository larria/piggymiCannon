import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WATER_Y, WORLD_W } from '../src/engine.ts';
import { WEAPONS, MAPS, DIFFICULTIES } from '../src/catalog.ts';

const run=(g:Game,seconds:number,until?:(g:Game)=>boolean)=>{for(let i=0;i<seconds*120;i++){g.update(1/120);if(until?.(g)) break;}};
const ready=(config={})=>{const g=new Game({seed:42,timer:0,...config});g.start();return g;};

test('all maps generate safe, deterministic deployment and distinct gravity',()=>{
  for(const m of MAPS) {
    const g=ready({map:m.id}),same=ready({map:m.id});
    assert.deepEqual(g.terrain,same.terrain);
    for(const t of g.tanks){assert.ok(t.y<WATER_Y-40);assert.equal(t.hp,150);}
    assert.ok(g.terrain.every(y=>Number.isFinite(y)&&y>=150&&y<=640));
  }
  assert.ok(ready({map:'moon'}).gravity<ready().gravity);
});
test('movement consumes fuel, stays bounded, and frozen movement costs twice as much',()=>{
  const g=ready();g.wind=0;const before=g.active.x,fuel=g.active.fuel;
  assert.ok(g.move(1,0.1));assert.ok(g.active.x>before);assert.ok(g.active.fuel<fuel);
  const normal=fuel-g.active.fuel;g.active.frozen=2;const f=g.active.fuel;
  g.move(1,0.1);assert.ok(Math.abs((f-g.active.fuel)-normal*2)<0.001);
  g.active.fuel=0;assert.equal(g.move(1,0.1),false);
});
test('movement faces its absolute direction and preserves the aiming angle',()=>{
  const g=ready(),t=g.active;t.direction=1;t.angle=57;g.move(-1,0.1);
  assert.equal(t.direction,-1);assert.equal(t.angle,57);
  t.direction=-1;g.move(1,0.1);assert.equal(t.direction,1);
});
test('limited ammunition and single shot per turn cannot be bypassed',()=>{
  const g=ready();g.selectWeapon('heavy');const ammo=g.active.ammo.heavy;
  assert.ok(g.fire());assert.equal(g.tanks[0].ammo.heavy,ammo-1);assert.equal(g.fire(),false);
  run(g,15,x=>x.phase==='aiming'&&x.current===1);
  assert.equal(g.current,1);assert.equal(g.phase,'aiming');
  assert.equal(g.fire(),false,'human cannot fire for AI');
  assert.equal(g.selectWeapon('shell'),false,'human cannot modify AI selection');
});
test('each weapon finishes its flight and produces its advertised projectile pattern',()=>{
  for(const w of WEAPONS) {
    const g=ready({mode:'hotseat'});if(w.ammo===0) g.active.ammo[w.id]=1;g.selectWeapon(w.id);g.targetX=g.enemy.x;
    g.active.angle=48;g.active.power=58;
    assert.ok(g.fire(),w.name);
    if(w.id==='triple'||w.id==='airstrike') assert.equal(g.projectiles.length,3);
    if(w.id==='cluster') {run(g,3,x=>x.projectiles.some(p=>p.sub));assert.ok(g.projectiles.some(p=>p.sub));}
    run(g,18,x=>x.phase==='handoff'||x.phase==='ended');
    assert.ok(['handoff','ended'].includes(g.phase),`${w.id} did not settle: ${g.phase}`);
    assert.equal(g.projectiles.length,0,w.id);
  }
});
test('craters remove terrain permanently, cause fall damage, and water is lethal',()=>{
  const g=ready(),t=g.active;const old=g.ground(t.x);
  g.crater(t.x,old,65);assert.ok(g.ground(t.x)>old+60);
  run(g,2);assert.ok(t.hp<150);assert.equal(t.y,g.support(t.x,t.y+18)-18);
  g.crater(t.x,WATER_Y-2,100);run(g,4);assert.equal(t.hp,0);assert.equal(g.phase,'ended');assert.equal(g.winner,1);
});
test('shields still absorb damage and replenished supply respects the one-item limit',()=>{
 const g=ready(),t=g.active;t.items.shield=1;assert.ok(g.useItem('shield'));g.damage(t,25,1);assert.equal(t.hp,150);assert.equal(t.shield,15);
 g.damage(t,35,1);assert.equal(t.hp,130);assert.equal(t.shield,0);assert.equal(g.useItem('repair'),false);
 g.nextTurn();g.nextTurn();assert.ok(g.useItem('repair'));assert.equal(t.hp,150);assert.equal(t.items.repair,0);
});
test('arming a transfer can be cancelled by another item without spending the transfer shell',()=>{
 const g=ready();assert.ok(g.useItem('teleport'));assert.ok(g.teleporting);assert.ok(g.useItem('double'));
 assert.equal(g.teleporting,false);assert.equal(g.active.items.teleport,1);assert.equal(g.active.itemUsed,true);
});
test('burn damage credits the fire owner and lasts only its intended rounds',()=>{
  const g=ready();g.fires.push({x:g.enemy.x,radius:60,turns:3,owner:0});
  g.nextTurn();assert.equal(g.active.hp,136);assert.equal(g.tanks[0].damage,14);
  for(let i=0;i<5;i++) g.nextTurn();assert.equal(g.fires.length,0);
});
test('hotseat requires explicit handoff and timers/pause do not skip it',()=>{
  const g=ready({mode:'hotseat',timer:30});g.nextTurn();assert.equal(g.phase,'handoff');
  const timer=g.clock;run(g,35);assert.equal(g.clock,timer);assert.equal(g.current,1);
  g.acceptHandoff();assert.equal(g.humanTurn,true);g.paused=true;run(g,60);assert.equal(g.clock,timer);
  g.paused=false;run(g,31,x=>x.phase==='handoff');assert.equal(g.phase,'handoff');assert.equal(g.current,0);
});
test('wind changes impact and lower gravity extends flight',()=>{
  const g=ready();g.wind=-20;const left=g.predict(48,58);g.wind=20;const right=g.predict(48,58);
  assert.ok(right.x>left.x+50);
  g.wind=0;const moon=ready({map:'moon'});moon.wind=0;
  assert.ok(moon.predict(48,40).x>g.predict(48,40).x);
});
test('AI at every difficulty plans legal shots and hands the turn back',()=>{
  for(const d of DIFFICULTIES) {
    const g=ready({difficulty:d.id});g.nextTurn();assert.equal(g.current,1);
    run(g,20,x=>x.current===0||x.phase==='ended');
    assert.equal(g.tanks[1].shots,1,d.id);
    assert.ok(g.phase==='ended'||g.current===0,d.id);
    assert.ok(g.tanks[1].angle>=5&&g.tanks[1].angle<=175);
  }
});
test('supply crates can be collected and turn-41 sudden death damages the active tank',()=>{
  const g=ready(),t=g.active;g.crates.push({x:t.x,y:t.y,type:'medical'});t.hp=90;
  run(g,0.05);assert.equal(g.crates.length,0);assert.equal(t.hp,112);assert.equal(t.items.repair,1);
  g.turn=39;g.nextTurn();assert.equal(g.turn,40);assert.equal(g.active.hp,138);
});
test('a seeded automated match reaches a valid winner without deadlocking',()=>{
  const g=ready({difficulty:'expert'});
  for(let i=0;i<16000&&g.phase!=='ended';i++) {
    if(g.current===0&&g.phase==='aiming') {g.planAI();g.fire();}
    g.update(1/60);
  }
  assert.equal(g.phase,'ended');assert.ok(g.winner===0||g.winner===1||g.winner===null);
  assert.ok(g.tanks.every(t=>Number.isFinite(t.hp)&&t.hp>=0&&t.hp<=150));
  assert.ok(g.tanks.every(t=>t.x>=0&&t.x<=WORLD_W));
});
