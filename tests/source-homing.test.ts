import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
import {homingProbe,sourceHomingVelocity,sourceHoming} from '../src/source-homing';
import {launchSpeedMultiplier,projectileSpeed} from '../src/ballistics';
import {restoreFraction} from '../src/item-combos';
function field(version='5.0.3',vehicle:any='missile'){
 const slots=defaultSlots();slots[0].vehicle=vehicle;slots[1].vehicle='mine';slots[1].controller='human';
 const g=new Game({seed:52,map:'factory',slots},version);g.start();g.wind=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.worldWidth;x++)g.land.column(x,900,g.worldHeight);g.land.rebuild();Object.assign(g.tanks[0],{x:100,y:882});Object.assign(g.tanks[1],{x:1350,y:882});return g;
}
test('original guidance probes ten source ticks ahead and doubles only the near-target impulse',()=>{
 assert.deepEqual(homingProbe({x:300,y:90,vx:900,vy:30},300),{x:1200,y:120});
 assert.deepEqual(sourceHomingVelocity({x:300,y:90},{x:600,y:90},300),{vx:300,vy:0});
 assert.deepEqual(sourceHomingVelocity({x:300,y:90},{x:330,y:90},300),{vx:60,vy:0});
 assert.equal(sourceHoming('5.0.2'),false);assert.equal(sourceHoming('5.0.3'),true);
});
test('all three guided weapons acquire before the old ground-height gate and then fly without wind or gravity drift',()=>{
 for(const weapon of ['missile-special','dragon-special','homing'] as const){
  const g=field('5.0.3',weapon==='dragon-special'?'dragon':'missile'),p=g.launch(g.active,weapon);Object.assign(p,{x:900,y:500,vx:250,vy:60,age:1});g.projectiles=[p];g.phase='flying';g.update(.001);assert.equal(p.homing,true,weapon);assert.equal(p.lockTarget,1);const v={vx:p.vx,vy:p.vy};g.wind=-100;g.update(.001);assert.deepEqual({vx:p.vx,vy:p.vy},v);
  for(let i=0;i<1000&&g.projectiles.length;i++)g.update(.01);assert.ok(g.tanks[1].hp<g.tanks[1].maxHP,weapon);
 }
 const old=field('5.0.2'),p=old.launch(old.active,'missile-special');Object.assign(p,{x:900,y:500,vx:250,vy:60,age:1});old.projectiles=[p];old.phase='flying';old.update(.001);assert.equal(p.homing,false);
});
test('ascending guided rounds do not acquire; a blocked straight approach still hits terrain',()=>{
 const g=field(),p=g.launch(g.active,'missile-special');Object.assign(p,{x:900,y:500,vx:250,vy:-60,age:1});g.projectiles=[p];g.phase='flying';g.update(.001);assert.equal(p.homing,false);
 const h=field(),q=h.launch(h.active,'missile-special');Object.assign(q,{x:900,y:500,vx:250,vy:60,age:1});h.land.column(1150,100,1344,true);h.projectiles=[q];h.phase='flying';for(let i=0;i<300&&h.projectiles.length;i++)h.update(.01);assert.equal(h.tanks[1].hp,h.tanks[1].maxHP);assert.equal(h.land.solid(1150,650),true);
});
test('native guidance honours self/friendly switches; the bonus round retains enemy-only selection',()=>{
 for(const weapon of ['missile-special','homing'] as const){const g=field();g.tanks[1].team=0;g.config.friendlyFire=true;const p=g.launch(g.active,weapon);Object.assign(p,{x:900,y:500,vx:250,vy:60,age:1});g.projectiles=[p];g.phase='flying';g.update(.001);assert.equal(p.homing,weapon==='missile-special');}
});
test('Duke restores source49/43 relative speed while old recordings, other guns and 1 percent stay unchanged',()=>{
 const old=field('5.0.2','duke'),g=field('5.0.3','duke');for(const id of ['duke-normal','duke-special'] as const){assert.equal(launchSpeedMultiplier(id,1.02,'5.0.2'),1.02);assert.equal(launchSpeedMultiplier(id,1.02,'5.0.3'),49/43);assert.equal(Math.hypot(g.launch(g.active,id,20,1).vx,g.launch(g.active,id,20,1).vy),Math.hypot(old.launch(old.active,id,20,1).vx,old.launch(old.active,id,20,1).vy));assert.ok(Math.abs(Math.hypot(g.launch(g.active,id,20,100).vx,g.launch(g.active,id,20,100).vy)-730*49/43)<1e-9);}
 assert.equal(launchSpeedMultiplier('cannon-normal',1,'5.0.3'),1);assert.equal(projectileSpeed(100,49/43)**2/projectileSpeed(100)**2,(49/43)**2);
});
test('recovery ceiling is60 percent, with old40 percent, falloff, boost and no excavation retained',()=>{
 for(const version of ['5.0.2','5.0.3'])for(const boost of [1,1.5]){const g=field(version,'cannon'),t=g.active;t.hp=10;const mask=g.land.mask.slice();const p={...g.launch(t,'cannon-normal'),healing:true,boost,fireBoosted:boost>1,x:t.x,y:t.y-33};(g as any).restoreImpact(p,t.id);const expected=Math.round(t.maxHP*(version==='5.0.3'?.6:.4)*boost);assert.equal(t.hp-10,expected);assert.deepEqual(g.land.mask,mask);assert.equal(restoreFraction(version),version==='5.0.3'?.6:.4);}
 const g=field('5.0.3','cannon'),t=g.active;t.hp=10;const p={...g.launch(t,'cannon-normal'),healing:true,x:t.x+60,y:t.y-33};(g as any).restoreImpact(p);assert.ok(t.hp-10>0&&t.hp-10<Math.round(t.maxHP*.6));
});

test('new guided and Duke shots share AI prediction without mutating live state',async()=>{
 const {predictAIImpact}=await import('../src/ai-planner');
 for(const weapon of ['missile-special','duke-normal','homing'] as const){
  const g=field('5.0.3',weapon==='duke-normal'?'duke':'missile'),t=g.active;g.tanks[1].x=1000;t.angle=35;t.power=50;const rng=g.battleSnapshot().rng,revision=g.land.revision,hp=g.tanks[1].hp,prediction=predictAIImpact(g,t,weapon);assert.deepEqual(g.battleSnapshot().rng,rng);assert.equal(g.land.revision,revision);assert.equal(g.tanks[1].hp,hp);
  g.projectiles=[g.launch(t,weapon)];g.phase='flying';for(let i=0;i<2000&&g.projectiles.length;i++)g.update(.001);
  const impact=g.battleSnapshot().events.find(e=>e.type==='impact');assert.ok(impact);assert.ok(Math.hypot(impact.data.x-prediction.x,impact.data.y-prediction.y)<12,weapon);
 }
});
test('new healing and homing preserve exact save, resume and replay checksums',async()=>{
 const {ReplayRecorder,ReplayPlayer,replayDigest}=await import('../src/replay');
 for(const healing of [false,true]){
  const g=field('5.0.3',healing?'cannon':'missile');g.active.hp=100;g.tanks[1].x=1000;const recorder=new ReplayRecorder(g);if(healing){g.useItem('double');g.useItem('boost');g.useItem('repair');g.setAim(35,1);}else {g.selectWeapon('missile-special');g.setAim(35,50);}g.fire();
  for(let i=0;i<450;i++)g.update(.01);const resumed=Game.fromBattleSnapshot(g.battleSnapshot());assert.equal(replayDigest(resumed),replayDigest(g));
  const player=new ReplayPlayer(recorder.export());for(let i=0;i<1000&&!player.done;i++)player.advance(.05);assert.equal(player.verified,true);assert.equal(replayDigest(player.game),replayDigest(g));recorder.detach();
 }
});

test('new golden guidance clears live and delayed siblings as soon as the shared target dies',()=>{
 const g=field('5.0.3','dragon'),target=g.tanks[1],p=g.launch(g.active,'dragon-special');Object.assign(p,{x:900,y:500,vx:250,vy:60,age:1,volley:1});(g as any).volleyTargets.set(1,{x:target.x,y:target.y,target:null});g.projectiles=[p,{...p,delay:.75,trail:[]}];g.phase='flying';g.update(.001);assert.equal(p.lockTarget,target.id);target.hp=0;g.update(.001);assert.equal(g.projectiles.length,0);assert.equal((g as any).volleyTargets.size,0);
});
