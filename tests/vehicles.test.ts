import test from 'node:test';import assert from 'node:assert/strict';
import {aiAimOffset} from '../src/catalog.ts';
import {Game,makeRng} from '../src/engine.ts';import {VEHICLES,VEHICLE_WEAPONS,resolveVehicle,vehicleById} from '../src/vehicles.ts';
const game=(id:any='cannon',other:any='cannon')=>{const g=new Game({vehicle0:id,vehicle1:other,mode:'hotseat',seed:52,timer:0,fog:false,fireLine:false});g.start();return g;};
test('the classic roster has twelve ordinary tanks, hidden dragon and twenty-six named weapons',()=>{
 assert.equal(VEHICLES.length,13);assert.equal(VEHICLES.filter(v=>!v.hidden).length,12);assert.equal(VEHICLE_WEAPONS.length,26);
 assert.equal(new Set(VEHICLE_WEAPONS.map(w=>w.shape)).size,26);assert.equal(new Set(VEHICLE_WEAPONS.map(w=>w.sound)).size,26);
 assert.equal(VEHICLE_WEAPONS.find(w=>w.id==='cannon-normal')!.name,'大铅弹');assert.equal(VEHICLE_WEAPONS.find(w=>w.id==='cannon-special')!.name,'小红豆');
});
test('tank health, firing arc, mobility and owned guns are applied by the engine',()=>{
 for(const v of VEHICLES){const g=game(v.id),t=g.active;assert.equal(t.hp,v.hp);assert.equal(t.maxHP,v.hp);assert.equal(t.moveDistance,v.movement*3);
 g.setAim(-100,50);assert.equal(t.angle,v.minAngle);g.setAim(190,50);assert.equal(t.angle,v.maxAngle);
 assert.ok(g.selectWeapon(v.special));assert.equal(g.selectWeapon('heavy'),false);assert.equal(t.ammo[v.normal],Infinity);}
});
test('random selection gives dragon ten percent and regular tanks equal chances',()=>{
 const rng=makeRng(789),counts:Record<string,number>={};for(let i=0;i<13000;i++){const id=resolveVehicle('random',rng);counts[id]=(counts[id]??0)+1;}
 assert.ok(counts.dragon>1150&&counts.dragon<1450);for(const v of VEHICLES.filter(v=>!v.hidden))assert.ok(counts[v.id]>800&&counts[v.id]<1150);
});
test('each owned ordinary and special shot resolves without locking the turn',()=>{
 for(const v of VEHICLES)for(const id of [v.normal,v.special]){
  const g=game(v.id);g.selectWeapon(id);g.active.power=58;assert.ok(g.fire(),id);
  for(let i=0;i<2800&&!['handoff','ended'].includes(g.phase);i++)g.update(1/120);
  assert.ok(['handoff','ended'].includes(g.phase),`${id}: ${g.phase}`);
 }
});
test('poison stops at red health; purple water freezes movement; mines are actual traps',()=>{
 const g=game('water'),t=g.enemy;t.immobile=3;g.nextTurn();g.acceptHandoff();assert.equal(g.move(1,.1),false);
 t.immobile=0;t.poisoned=true;t.hp=Math.ceil(t.maxHP/3)+3;g.nextTurn();g.nextTurn();assert.equal(t.hp,Math.ceil(t.maxHP/3));
 const trap=game('mine');trap.mines.push({x:trap.active.x+8,y:trap.active.y+16,owner:1,weapon:'mine-special',boost:1});const hp=trap.active.hp;trap.move(1,.05);assert.ok(trap.active.hp<hp);assert.equal(trap.mines.length,0);
});
test('special attack delay affects initiative and sea rage scales damage without unlimited stacking',()=>{
 const g=game('sea'),v=vehicleById('sea');g.active.hp=400;assert.equal(g.launch(g.active,v.special).boost,1.5);g.active.boost=true;assert.equal(g.launch(g.active,v.special).boost,2.25);
 const regular=game('cannon'),special=game('cannon');regular.selectWeapon('cannon-normal');special.selectWeapon('cannon-special');regular.fire();special.fire();assert.ok(special.active.lastDelay>regular.active.lastDelay);
});
test('all homing weapon intentional misses are outside the acquisition radius',()=>{
 const rng=makeRng(19);for(let i=0;i<1000;i++){const aim=aiAimOffset('expert','missile-special',rng);if(aim.miss)assert.ok(Math.abs(aim.offset)>140);}
});
test('追魂弹 emits a lock event and keeps a live target for its tracking animation',()=>{
 const g=game('missile'),target=g.enemy,p=g.launch(g.active,'missile-special');
 Object.assign(p,{x:target.x-90,y:target.y-65,vx:80,vy:130,age:.2});g.projectiles=[p];g.phase='flying';g.update(.04);
 assert.ok(p.homing);assert.equal(p.lockX,target.x);assert.equal(p.lockY,target.y);assert.ok(p.lockAge>0);
 assert.ok(g.drainEvents().some(e=>e.type==='lock'&&e.weapon==='missile-special'));
});

test('a mine chain detonates each trap once and keeps unrelated distant mines',()=>{
 const g=game('cannon','mine'),x=g.active.x,y=g.active.y+15;
 const traps=[5,10,15,180].map(offset=>({x:x+offset,y,owner:1,weapon:'mine-special' as const,boost:1}));g.mines.push(...traps);
 g.explode({...g.launch(g.active,'cannon-normal'),x:x+5,y});
 assert.deepEqual(g.mines,[traps[3]]);
 assert.equal(g.drainEvents().filter(e=>e.type==='explosion'&&e.weapon==='mine-special').length,3);
});
