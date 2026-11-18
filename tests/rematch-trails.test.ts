import {test} from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';
import {ALL_WEAPONS,weaponHasTrail,MODERN_TRAIL_POINTS,MODERN_TRAIL_LENGTH} from '../src/catalog';import {VEHICLES} from '../src/vehicles';import {freshMatchSeed} from '../src/match-seed';import {projectileDrawScale} from '../src/projectile-art';

test('fresh match seeds handle frozen clocks, rollback and 32-bit aliases without rejecting map repeats',()=>{
 const played=new Set<number>();for(let n=0;n<200;n++){const seed=freshMatchSeed(52,played);assert.equal(seed,52+n);assert.ok(!played.has(seed));played.add(seed);}
 assert.equal(freshMatchSeed(52+2**32,played),252);assert.equal(freshMatchSeed(0,played),0);assert.equal(freshMatchSeed(60,played),252);
});

test('39 shells keep only modern weak histories or boosted stars, clearing other eras',()=>{
 for(const w of ALL_WEAPONS)for(const boosted of [false,true]){
  const g=new Game({seed:52,fog:false,fireLine:false},'5.0.1');g.start();g.wind=0;
  const p=g.launch(g.active,w.id);p.x=600;p.y=90;p.vx=40;p.vy=-20;p.fireBoosted=boosted;p.boost=boosted?1.5:1;p.trail=[{x:590,y:90}];
  g.projectiles=[p];g.phase='flying';for(let n=0;n<8;n++)g.update(.01);
  const modern=VEHICLES.some(v=>v.era==='现代系'&&(v.normal===w.id||v.special===w.id));assert.equal(weaponHasTrail(w.id,'5.0.1'),modern);assert.equal(p.trail.length>0,boosted||modern,w.id);assert.ok(p.trail.length<=(boosted?40:MODERN_TRAIL_POINTS));if(!boosted){const length=p.trail.reduce((sum,q,i)=>i?sum+Math.hypot(q.x-p.trail[i-1].x,q.y-p.trail[i-1].y):sum,0);assert.ok(length<=MODERN_TRAIL_LENGTH+1e-6);}assert.equal(p.scale,g.launch(g.active,w.id).scale);
 }
});

test('trail eligibility follows mutable catalog era, and fast modern rounds still draw a short segment',()=>{
 const vehicle=VEHICLES.find(v=>v.era==='古代系')!,era=vehicle.era;
 try{assert.equal(weaponHasTrail(vehicle.normal,'5.0.1'),false);vehicle.era='现代系';assert.equal(weaponHasTrail(vehicle.normal,'5.0.1'),true);assert.equal(weaponHasTrail(vehicle.special,'5.0.1'),true);vehicle.era='未来系';assert.equal(weaponHasTrail(vehicle.normal,'5.0.1'),false);}finally{vehicle.era=era;}
 const modern=VEHICLES.find(v=>v.era==='现代系')!,g=new Game({seed:52,fog:false,fireLine:false},'5.0.1');g.start();const p=g.launch(g.active,modern.normal);Object.assign(p,{x:500,y:70,vx:1000,vy:0});g.projectiles=[p];g.phase='flying';g.update(.05);g.update(.05);
 assert.ok(p.trail.length>=2&&p.trail.length<=MODERN_TRAIL_POINTS);const length=p.trail.reduce((n,q,i)=>i?n+Math.hypot(q.x-p.trail[i-1].x,q.y-p.trail[i-1].y):n,0);assert.ok(length<=MODERN_TRAIL_LENGTH+1e-6);
 p.trail=[{x:p.x-100,y:p.y}];(g as any).stepProjectile(p,.05);assert.equal(p.trail.length,2);assert.ok(Math.abs(Math.hypot(p.trail[1].x-p.trail[0].x,p.trail[1].y-p.trail[0].y)-MODERN_TRAIL_LENGTH)<1e-6);
});

test('double salvos keep independent histories for modern trails and all-era stars',()=>{
 for(const v of VEHICLES)for(const weapon of [v.normal,v.special])for(const boosted of [false,true]){
  const g=new Game({seed:52,fog:false,fireLine:false},'5.0.1');g.start();g.active.vehicleId=v.id;g.active.ammo[weapon]=Infinity;g.active.boost=boosted;g.active.doubleShot=true;g.active.selectedWeapon=weapon;g.selected=weapon;g.active.angle=45;g.active.power=80;
  assert.ok(g.fire());const projectiles=[...g.projectiles];assert.equal(projectiles.length,(ALL_WEAPONS.find(w=>w.id===weapon)!.shots??1)*2);
  projectiles.forEach((p,i)=>{p.x=300+i*3;p.y=70;p.vx=10;p.vy=-10;});for(let n=0;n<100;n++)g.update(.01);
  assert.ok(projectiles.every(p=>(p.trail.length>0)===(boosted||v.era==='现代系')));if(!boosted)assert.ok(projectiles.every(p=>p.trail.length<=MODERN_TRAIL_POINTS));assert.equal(new Set(projectiles.map(p=>p.trail)).size,projectiles.length);
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
  const g=new Game({seed:52,fog:false,fireLine:false},'5.0.1');g.start();g.wind=0;const p=g.launch(g.active,'ion-special');
  const x=Math.round(g.active.x);Object.assign(p,{x,y:g.ground(x)+1,vx:0,vy:1,fireBoosted:boosted,boost:boosted?1.5:1});g.projectiles=[p];g.phase='flying';g.update(.01);
  const child=g.projectiles.find(p=>p.sub)!;assert.ok(child);assert.equal(child.boost,boosted?1.5:1);assert.equal(child.fireBoosted,boosted);
  for(let n=0;n<40;n++)g.update(.01);assert.equal(child.trail.length>0,boosted);assert.equal(child.scale,1);
 }
});
