import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {Terrain} from '../src/terrain';
import {defaultSlots} from '../src/crew';
import {bodyFallSpeed,parachuteFallSpeed} from '../src/fall-motion';
import {ReplayPlayer,ReplayRecorder} from '../src/replay';

function field(version:string,fallDamage=false,platform=true){
 const g=new Game({map:'factory',seed:52,fallDamage,timer:0,fog:false,fireLine:false,slots:defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:'human',vehicle:'cannon'}))},version);g.start();
 g.land=new Terrain(g.worldWidth,g.worldHeight);g.terrain=g.land.surface;
 for(let x=550;x<=950;x++)if(platform)g.land.column(x,690,694,true);
 for(let x=1100;x<=2300;x++)g.land.column(x,690,694,true);
 g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:i?1450:700,y:i?672:130,fallVelocity:i?0:1,fallStart:i?672:130}));g.wind=0;
 return g;
}
function until(g:Game,done:()=>boolean,dt=1/120){for(let i=0;i<3000&&!done();i++)g.update(dt);assert.ok(done());return g.elapsed;}

test('faster live tanks and corpses still stop on a four-pixel platform; fall damage retains its distance rule',()=>{
 for(const kind of ['tank','corpse','parachute']){
  const times=['5.1.3','5.1.4'].map(version=>{
   const g=field(version,true),t=g.active,hp=t.hp;
   if(kind==='parachute')t.parachute={projectile:1} as NonNullable<typeof t.parachute>;
   if(kind==='corpse'){t.hp=0;t.deathResolved=true;t.defeat={x:t.x,y:t.y,slope:0,direction:1,age:0} as NonNullable<typeof t.defeat>;}
   const time=until(g,()=>t.fallVelocity===0);
   assert.equal(t.y,672);assert.equal(t.outOfBounds,false);assert.equal(t.parachute??null,null);
   if(kind==='corpse')assert.equal(t.defeat?.y,672);
   else assert.equal(t.hp,kind==='tank'?hp-Math.round((672-130-35)*.3):hp);
   return time;
  });
  assert.ok(times[1]<times[0]*.87,`${kind}: ${times}`);
 }
 assert.equal(bodyFallSpeed(879,.05,230,true),880);
 assert.equal(parachuteFallSpeed(199,.05,true),200);
});

test('an unsupported tank stays alive until it crosses the world bottom, even with fall damage off',()=>{
 for(const version of ['5.1.3','5.1.4']){
  const g=field(version,false,false),t=g.active;let y=t.y;
  until(g,()=>{if(t.hp>0){assert.ok(t.y+18<g.worldHeight);y=t.y;}return t.hp<=0;});
  assert.ok(y+18<g.worldHeight&&t.y+18>=g.worldHeight);assert.equal(t.outOfBounds,true);
 }
});

test('accelerated supply shares its predictor in either wind; landing camera dwell is still in real seconds',()=>{
 for(const wind of [-18,18]){
  const times=['5.1.3','5.1.4'].map(version=>{
   const g=field(version);g.active.y=672;g.active.fallVelocity=0;g.wind=wind;
   const expected=g.predictSupply(750);assert.ok(expected);
   g.phase='supply';g.supplySettling=1.2;g.crates=[{x:750,y:-50,type:'boost',falling:true,vy:80,vx:0}];
   const time=until(g,()=>!g.crates[0].falling),box=g.crates[0];
   assert.ok(Math.abs(box.x-expected.x)<3,`${version}: ${box.x} vs ${expected.x}`);assert.equal(box.y,676);
   assert.equal(box.vy,g.supplyFallLimit);assert.ok(g.supplySettling>1.19);assert.equal(g.phase,'supply');
   const after=until(g,()=>g.phase!=='supply');assert.ok(after-time>=1.18);
   return time;
  });
  assert.ok(times[1]<times[0]*.82,`${wind}: ${times}`);
 }
});

test('both versions restore and replay their own fall timing from an already airborne state',()=>{
 for(const version of ['5.1.3','5.1.4']){
  const g=field(version),record=new ReplayRecorder(g);until(g,()=>g.active.fallVelocity===0);
  const player=new ReplayPlayer(record.export());for(let i=0;i<3000&&!player.done;i++)player.advance(1/120);
  assert.equal(player.verified,true,version);assert.equal(player.game.active.y,672);assert.equal(player.game.supplyFallAcceleration,version==='5.1.3'?220:320);record.detach();
 }
});
