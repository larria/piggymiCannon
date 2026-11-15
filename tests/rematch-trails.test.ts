import {test} from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';
import {ALL_WEAPONS,weaponHasTrail} from '../src/catalog';import {VEHICLES} from '../src/vehicles';import {freshMatchSeed} from '../src/match-seed';import {projectileDrawScale} from '../src/projectile-art';

test('fresh match seeds handle frozen clocks, rollback and 32-bit aliases without rejecting map repeats',()=>{
 const played=new Set<number>();for(let n=0;n<200;n++){const seed=freshMatchSeed(52,played);assert.equal(seed,52+n);assert.ok(!played.has(seed));played.add(seed);}
 assert.equal(freshMatchSeed(52+2**32,played),252);assert.equal(freshMatchSeed(0,played),0);assert.equal(freshMatchSeed(60,played),252);
});

test('all 39 shells collect history only when fireBoosted, clearing stale ordinary trails',()=>{
 for(const w of ALL_WEAPONS)for(const boosted of [false,true]){
  const g=new Game({seed:52,fog:false,fireLine:false});g.start();g.wind=0;
  const p=g.launch(g.active,w.id);p.x=600;p.y=90;p.vx=40;p.vy=-20;p.fireBoosted=boosted;p.boost=boosted?1.5:1;p.trail=[{x:590,y:90}];
  g.projectiles=[p];g.phase='flying';for(let n=0;n<8;n++)g.update(.01);
  assert.equal(weaponHasTrail(w.id),false);assert.equal(p.trail.length>0,boosted,w.id);assert.ok(p.trail.length<=40);assert.equal(p.scale,g.launch(g.active,w.id).scale);
 }
});

test('double salvos keep independent star histories and ordinary homing/orbital salvos stay trail-free',()=>{
 for(const v of VEHICLES)for(const weapon of [v.normal,v.special])for(const boosted of [false,true]){
  const g=new Game({seed:52,fog:false,fireLine:false});g.start();g.active.vehicleId=v.id;g.active.ammo[weapon]=Infinity;g.active.boost=boosted;g.active.doubleShot=true;g.active.selectedWeapon=weapon;g.selected=weapon;g.active.angle=45;g.active.power=80;
  assert.ok(g.fire());const projectiles=[...g.projectiles];assert.equal(projectiles.length,(ALL_WEAPONS.find(w=>w.id===weapon)!.shots??1)*2);
  projectiles.forEach((p,i)=>{p.x=300+i*3;p.y=70;p.vx=10;p.vy=-10;});for(let n=0;n<50;n++)g.update(.01);
  assert.ok(projectiles.every(p=>(p.trail.length>0)===boosted));assert.equal(new Set(projectiles.map(p=>p.trail)).size,projectiles.length);
 }
});

test('fire-line entry creates stars once; rage alone and transfer rounds remain ordinary',()=>{
 const g=new Game({seed:52,fog:false,fireLine:true});g.start();g.wind=0;g.fireLine={x:601,top:20,bottom:300};
 const p=g.launch(g.active,'missile-special');Object.assign(p,{x:600,y:80,vx:200,vy:-5});g.projectiles=[p];g.phase='flying';g.update(.02);assert.equal(p.fireBoosted,true);assert.equal(p.boost,1.5);assert.ok(p.trail.length>0);
 for(let n=0;n<10;n++)g.update(.01);assert.equal(p.boost,1.5);
 const r=g.launch(g.active,'sea-normal');Object.assign(r,{x:700,y:80,vx:20,vy:-5,rage:true,boost:1.5,fireBoosted:false});g.projectiles=[r];g.update(.05);assert.equal(r.trail.length,0);
 const transfer=g.launch(g.active,'shell');Object.assign(transfer,{transfer:true,x:600,y:80,vx:200,vy:-5});g.projectiles=[transfer];g.update(.02);assert.equal(transfer.fireBoosted,false);assert.equal(transfer.trail.length,0);
 assert.equal(projectileDrawScale('cannon-special'),1.35);assert.equal(projectileDrawScale('cannon-normal'),1);assert.ok(ALL_WEAPONS.every(w=>projectileDrawScale(w.shape??w.id)>=1&&projectileDrawScale(w.shape??w.id)<=1.35));
});

test('orbital child rounds inherit only the existing boosted star flag and never add a multiplier',()=>{
 for(const boosted of [false,true]){
  const g=new Game({seed:52,fog:false,fireLine:false});g.start();g.wind=0;const p=g.launch(g.active,'ion-special');
  const x=Math.round(g.active.x);Object.assign(p,{x,y:g.ground(x)+1,vx:0,vy:1,fireBoosted:boosted,boost:boosted?1.5:1});g.projectiles=[p];g.phase='flying';g.update(.01);
  const child=g.projectiles.find(p=>p.sub)!;assert.ok(child);assert.equal(child.boost,boosted?1.5:1);assert.equal(child.fireBoosted,boosted);
  for(let n=0;n<40;n++)g.update(.01);assert.equal(child.trail.length>0,boosted);assert.equal(child.scale,1);
 }
});
