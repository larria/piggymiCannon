import test from 'node:test';import assert from 'node:assert/strict';
import {aiAimOffset,ALL_WEAPONS} from '../src/catalog.ts';
import {WEAPON_REFERENCE} from '../src/weapon-reference.ts';
import {Game,makeRng} from '../src/engine.ts';import {VEHICLES,VEHICLE_WEAPONS,resolveVehicle,vehicleById} from '../src/vehicles.ts';
const game=(id:any='cannon',other:any='cannon')=>{const g=new Game({vehicle0:id,vehicle1:other,mode:'hotseat',seed:52,timer:0,fog:false,fireLine:false});g.start();return g;};
test('the classic roster has twelve ordinary tanks, hidden dragon and twenty-six named weapons',()=>{
 assert.equal(VEHICLES.length,13);assert.equal(VEHICLES.filter(v=>!v.hidden).length,12);assert.equal(VEHICLE_WEAPONS.length,26);
 assert.equal(new Set(VEHICLE_WEAPONS.map(w=>w.shape)).size,26);assert.equal(new Set(VEHICLE_WEAPONS.map(w=>w.sound)).size,26);
 assert.equal(VEHICLE_WEAPONS.find(w=>w.id==='cannon-normal')!.name,'大铅弹');assert.equal(VEHICLE_WEAPONS.find(w=>w.id==='cannon-special')!.name,'小红豆');
});

const flatGame=(id:any='cannon',other:any='cannon')=>{
 const g=game(id,other);g.land.mask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.tanks.forEach(t=>t.y=432);g.wind=0;return g;
};
test('all twenty-six guns match the historical shot counts and all thirty-nine visuals have unique colors and shapes',()=>{
 assert.equal(Object.keys(WEAPON_REFERENCE).length,26);
 for(const w of VEHICLE_WEAPONS)assert.equal(w.shots,WEAPON_REFERENCE[w.id]!.shots,w.id);
 assert.equal(new Set(ALL_WEAPONS.map(w=>w.color)).size,39);assert.equal(new Set(ALL_WEAPONS.map(w=>w.shape)).size,39);
 assert.equal(VEHICLE_WEAPONS.find(w=>w.id==='missile-special')!.damage,90);
});
test('all nine golden missiles lock independently across the spread and continue tracking a wreck',()=>{
 const g=flatGame('dragon'),t=g.active,e=g.enemy;g.selectWeapon('dragon-special');t.angle=45;
 let best=Infinity;for(let power=20;power<=65;power+=.5){const hit=g.predict(45,power,'dragon-special',12,t),distance=Math.abs(hit.x-e.x);if(distance<best){best=distance;t.power=power;}}
 assert.ok(best<15);g.fire();assert.equal(g.projectiles.length,9);
 g.projectiles.forEach((p,i)=>Object.assign(p,{x:e.x-330+i*55,y:340,vx:100,vy:50,age:.5}));g.update(.01);
 assert.equal(g.projectiles.filter(p=>p.homing&&p.lockTarget===e.id).length,9);
 const ages=g.projectiles.map(p=>p.lockAge);e.hp=0;g.update(.01);
 assert.equal(g.projectiles.length,9);g.projectiles.forEach((p,i)=>assert.ok(p.lockAge>ages[i]));
 assert.equal(g.drainEvents().filter(e=>e.type==='lock').length,9);
});
test('classic guidance has no IFF and can acquire the shooter or a dead nearby tank',()=>{
 for(const dead of [false,true]){
 const g=flatGame('missile'),t=g.active,p=g.launch(t,'missile-special');if(dead)t.hp=0;
 Object.assign(p,{x:t.x+65,y:t.y-40,vx:80,vy:80,age:.5});g.projectiles=[p];g.phase='flying';g.update(.01);
 assert.equal(p.lockTarget,t.id);assert.ok(p.homing);
 }
});
test('triple laser and twin electric rings weave around one carrier path instead of spreading apart',()=>{
 for(const id of ['laser','sea'] as const){
 const g=flatGame(id);g.selectWeapon(vehicleById(id).special);g.active.angle=30;g.fire();let widest=0;for(let i=0;i<5;i++){g.update(.04);widest=Math.max(widest,...g.projectiles.map(p=>Math.hypot(p.weaveX,p.weaveY)));}
 const [first,...rest]=g.projectiles;assert.equal(g.projectiles.length,id==='laser'?3:2);
 for(const p of rest){assert.ok(Math.abs((p.x-p.weaveX)-(first.x-first.weaveX))<.001);assert.ok(Math.abs((p.y-p.weaveY)-(first.y-first.weaveY))<.001);}
 assert.ok(widest>5);
 }
});
test('four-section flyfire creates remaining projectiles and explodes no more than four times',()=>{
 const g=flatGame('missile'),e=g.enemy;let p=g.launch(g.active,'missile-normal');Object.assign(p,{x:e.x,y:e.y-3,vx:0,vy:10,age:.5});g.projectiles=[p];
 for(let section=0;section<4;section++){
  for(let tick=0;tick<30;tick++){const done=(g as any).stepProjectile(p,1/180);if(done){g.projectiles=g.projectiles.filter(q=>q!==p);break;}}
  if(section<3){const next=g.projectiles[0];assert.notEqual(next,p);assert.equal(next.penetrations,section+1);p=next;}
 }
 assert.equal(g.projectiles.length,0);assert.equal(g.drainEvents().filter(e=>e.type==='explosion'&&e.weapon==='missile-normal').length,4);
});
test('purple water immobilizes a damaged enemy for exactly one own action, including grazes',()=>{
 for(const offset of [0,40]){
  const g=flatGame('water'),e=g.enemy;
  g.explode({...g.launch(g.active,'water-special'),x:e.x+offset,y:e.y},offset===0?e.id:undefined);
  assert.equal(e.immobile,1);g.nextTurn();g.acceptHandoff();assert.equal(g.current,e.id);
  assert.equal(g.move(-1,.1),false);assert.ok(g.fire());g.projectiles=[];g.nextTurn();assert.equal(e.immobile,0);
  while(g.current!==e.id)g.nextTurn();g.acceptHandoff();assert.ok(g.move(-1,.1));
 }
 const self=flatGame('water');self.explode({...self.launch(self.active,'water-special'),x:self.active.x,y:self.active.y},0);assert.equal(self.active.immobile,0);
});
test('hovering tanks do not trigger ground mines, while a direct mine hit still damages them',()=>{
 for(const id of ['laser','water'] as const){const g=flatGame(id,'mine'),t=g.active;g.mines=[{x:t.x+5,y:448,owner:1,weapon:'mine-special',boost:1}];const hp=t.hp;g.move(1,.05);assert.equal(t.hp,hp);assert.equal(g.mines.length,1);
 g.mines=[];g.explode({...g.launch(g.enemy,'mine-special'),x:t.x,y:t.y},t.id);assert.ok(t.hp<hp);}
 const direct=flatGame('cannon','mine'),stepped=flatGame('cannon','mine');
 direct.explode({...direct.launch(direct.enemy,'mine-special'),x:direct.active.x,y:direct.active.y},0);
 stepped.explode({...stepped.launch(stepped.enemy,'mine-special'),x:stepped.active.x,y:stepped.active.y,mineArmed:true},0);
 assert.ok(stepped.active.hp<direct.active.hp);
});
test('poison ticks twenty percent only after the victim own action and stops at thirty percent',()=>{
 const g=flatGame('crossbow','duke');g.tanks.forEach(t=>t.poisoned=true);const before=g.tanks.map(t=>t.hp);
 g.nextTurn();assert.equal(g.tanks[0].hp,before[0]-Math.ceil(g.tanks[0].maxHP*.2));assert.equal(g.tanks[1].hp,before[1]);
 g.nextTurn();assert.equal(g.tanks[1].hp,before[1]-Math.ceil(g.tanks[1].maxHP*.2));
 const sea=flatGame('sea');sea.active.poisoned=true;sea.active.hp=sea.active.maxHP*.5+3;sea.nextTurn();assert.ok(sea.tanks[0].hp<sea.tanks[0].maxHP*.5);assert.ok(sea.tanks[0].poisoned);
});
test('fire and gas damage by simulated seconds and pause during handoff and supply animation',()=>{
 const g=flatGame('bowl','water');g.enemy.x=g.active.x+35;
 g.fires=[{x:g.active.x,y:450,radius:65,turns:6,owner:1,weapon:'bowl-special',clock:0}];const hp=g.tanks.map(t=>t.hp);
 for(let i=0;i<53;i++)g.update(.04);assert.equal(g.active.hp,hp[0]-2);assert.equal(g.enemy.hp,hp[1]-8);
 const before=g.tanks.map(t=>t.hp);g.phase='handoff';for(let i=0;i<53;i++)g.update(.04);assert.deepEqual(g.tanks.map(t=>t.hp),before);
 g.phase='supply';g.crates=[{x:500,y:-600,type:'medical',falling:true,vy:80,vx:0}];for(let i=0;i<53;i++)g.update(.04);assert.deepEqual(g.tanks.map(t=>t.hp),before);g.crates=[];
 g.phase='aiming';g.fires=[];g.gases=[{x:g.active.x,y:g.active.y,radius:75,turns:6,owner:1,clock:0}];for(let i=0;i<53;i++)g.update(.04);assert.equal(g.active.hp,before[0]-4);
});

test('both deployed mines survive even when they land at the same coordinate',()=>{
 const g=flatGame('mine');g.selectWeapon('mine-special');g.fire();g.projectiles.forEach(p=>Object.assign(p,{x:700,y:451,vx:0,vy:0,age:1}));g.update(.01);
 assert.equal(g.mines.length,2);assert.equal(g.mines[0].x,g.mines[1].x);
});

test('real snowfall clears flames and gas and boosts water shots by the explicitly chosen web value',()=>{
 const g=flatGame('water');g.config.snow=true;const p=g.launch(g.active,'water-normal');assert.equal(p.boost,1.25);
 g.fires=[{x:g.active.x,y:450,radius:65,turns:6,owner:1,weapon:'bowl-special'}];g.gases=[{x:g.active.x,y:g.active.y,radius:75,turns:6,owner:1}];g.update(.01);
 assert.equal(g.fires.length,0);assert.equal(g.gases.length,0);
 g.explode({...g.launch(g.enemy,'bowl-special'),x:700,y:450});assert.equal(g.fires.length,0);
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
 t.immobile=0;t.poisoned=true;t.hp=Math.ceil(t.maxHP*.3)+3;g.nextTurn();g.nextTurn();assert.equal(t.hp,Math.ceil(t.maxHP*.3));
 const trap=game('mine');trap.mines.push({x:trap.active.x+8,y:trap.active.y+16,owner:1,weapon:'mine-special',boost:1});const hp=trap.active.hp;trap.move(1,.05);assert.ok(trap.active.hp<hp);assert.equal(trap.mines.length,0);
});
test('special attack delay affects initiative and sea rage scales damage without unlimited stacking',()=>{
 const g=game('sea'),v=vehicleById('sea');g.active.hp=400;assert.equal(g.launch(g.active,v.special).boost,1.5);g.active.boost=true;assert.equal(g.launch(g.active,v.special).boost,2.25);
 g.active.boost=false;g.active.hp=g.active.maxHP*.5-1;const shell=g.launch(g.active,v.normal);assert.equal(shell.boost,1.5);assert.equal(shell.digBoost,1.15);assert.ok(shell.rage);
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
