import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {defeatedPig} from '../src/result-art';
// Node checks routing/visibility. Browser checks below use genuine Canvas paths.
(globalThis as any).Path2D=class {};
function flat(){const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,team:i%2,controller:'human',vehicle:'cannon'}));const g=new Game({slots,map:'valley',seed:52,timer:0,fog:false,fireLine:false});g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.wind=0;g.tanks.forEach((t,i)=>Object.assign(t,{x:[200,650,70,1130][i],y:432,fallVelocity:0}));return g;}
function paintCount(g:Game,id=1){let count=0;const c=new Proxy({},{get:(_t,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{count++;},set:()=>true});defeatedPig(c as any,g.tanks[id],2,0);return count;}
test('mid-match lethal impact immediately establishes a crying pose without ending or cutting the volley',()=>{
 const g=flat(),e=g.tanks[1];e.hp=1;g.fire();const shot=g.projectiles[0];Object.assign(shot,{x:e.x,y:e.y-10,vx:0,vy:1,age:.5});g.update(.001);
 assert.equal(e.hp,0);assert.ok((e as any).defeat);assert.equal(e.fallVelocity,0);assert.equal(e.outOfBounds,false);assert.equal(g.phase,'resolving');assert.equal(g.winner,null);assert.ok(paintCount(g)>0);assert.equal((e as any).defeat.y,432);
});
test('crying corpse persists through direct re-impacts, splash, total support excavation and many turns',()=>{
 const g=flat(),e=g.tanks[1];g.damage(e,99999,0);const pose=structuredClone((e as any).defeat);assert.ok(pose);
 for(const offset of [0,20,40]){(g as any).explode({...g.launch(g.active,'cannon-normal'),x:e.x+offset,y:e.y},e.id);assert.deepEqual((e as any).defeat,pose);assert.ok(paintCount(g)>0);}
 g.crater(e.x,450,100,250);assert.ok(g.support(e.x,e.y+18)>=579);
 for(let turn=0;turn<12;turn++){g.nextTurn();for(let i=0;i<10;i++)g.update(.01);assert.deepEqual((e as any).defeat,pose);assert.equal(e.outOfBounds,false);assert.equal(e.fallVelocity,0);assert.ok(paintCount(g)>0);assert.notEqual(g.current,e.id);assert.notEqual(g.phase,'ended');}
});
test('dead characters are transparent to shells and are not re-damaged or reactivated by excavation',()=>{
 const g=flat(),e=g.tanks[1];g.damage(e,99999,0);g.crater(e.x,450,100,250);const p=g.launch(g.active,'cannon-normal');Object.assign(p,{x:e.x,y:e.y-3,vx:250,vy:0,age:.5});assert.equal((g as any).projectileHit(p),undefined);
 const before=g.active.damage;g.projectiles=[p];g.phase='flying';g.drainEvents();g.update(.01);assert.equal(g.projectiles.length,1);assert.ok(p.x>e.x);assert.equal(g.active.damage,before);assert.equal(e.hp,0);assert.equal(e.fallVelocity,0);assert.equal(g.drainEvents().filter(e=>e.type==='explosion').length,0);
});
test('every gameplay phase resolves land death immediately, even when paused',()=>{
 for(const phase of ['aiming','flying','resolving','supply','handoff','ended'] as const){const g=flat();g.phase=phase;g.paused=true;g.damage(g.tanks[1],99999,0);assert.ok((g.tanks[1] as any).defeat,phase);assert.ok(paintCount(g)>0,phase);assert.equal(g.phase,phase);}
});
test('fire, gas, mines, splash, fall injury and poison-labelled damage share the same land defeat path',()=>{
 for(const cause of ['fire','gas','mine','graze','fall','poison']){const g=flat(),e=g.tanks[1];e.hp=1;
  if(cause==='fire'){g.fires=[{x:e.x,y:450,radius:40,turns:6,owner:0,weapon:'bowl-special',clock:1}];g.update(.001);}
  if(cause==='gas'){g.gases=[{x:e.x,y:e.y,radius:40,turns:6,owner:0,clock:1}];g.update(.001);}
  if(cause==='mine'){g.mines=[{x:e.x,y:448,owner:0,weapon:'mine-special',boost:1}];(g as any).triggerMines(e);}
  if(cause==='graze')(g as any).explode({...g.launch(g.active,'cannon-normal'),x:e.x+35,y:e.y});
  if(cause==='fall'){e.y=300;e.fallStart=240;e.fallVelocity=600;for(let i=0;i<80&&e.hp>0;i++)g.update(.01);}
  if(cause==='poison')g.damage(e,1,0,true,'graze','poison');
  assert.equal(e.hp,0,cause);assert.ok((e as any).defeat,cause);assert.ok(paintCount(g)>0,cause);assert.equal(e.outOfBounds,false,cause);
 }
});
test('a lethal blast that removes the original land still preserves the land death pose',()=>{
 for(const nested of [false,true]){const g=flat(),e=g.tanks[1];g.land.mask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,460);g.land.rebuild();e.hp=1;
 if(nested)g.mines=[{x:e.x,y:450,owner:0,weapon:'mine-special',boost:1}];
 (g as any).explode({...g.launch(g.active,'cannon-normal'),x:e.x,y:e.y,scale:nested?0:1},e.id);
 assert.equal(e.hp,0);assert.ok(g.support(e.x,e.y+18)>=579);assert.equal((e as any).defeat.y,432);assert.equal(e.outOfBounds,false);assert.ok(paintCount(g)>0);
 }
});
test('bottom/out-of-map death and unsupported airborne death leave no corpse; live excavation still falls',()=>{
 for(const out of [true,false]){const g=flat(),e=g.tanks[1];if(out){e.y=960;g.update(.001);}else{g.crater(e.x,450,100,250);e.fallVelocity=50;g.damage(e,99999,0);}
  assert.equal(e.hp,0);assert.equal(e.outOfBounds,true);assert.equal(paintCount(g),0);assert.equal((e as any).defeat,null);
 }
 const live=flat(),e=live.tanks[1],hp=e.hp;live.crater(e.x,450,45,100);assert.ok(e.fallVelocity>0);for(let i=0;i<300&&e.fallVelocity>0;i++)live.update(.01);assert.ok(e.hp<hp);assert.ok(e.hp>0);
});
test('final victory keeps the frozen corpse and the existing three-second result timing',()=>{
 const g=flat();g.damage(g.tanks[1],99999,0);const pose=structuredClone((g.tanks[1] as any).defeat);g.damage(g.tanks[3],99999,0);g.nextTurn();assert.equal(g.phase,'ended');assert.equal(g.resultAge,0);
 g.crater(650,450,100,250);for(let i=0;i<59;i++)g.update(.05);assert.ok(g.resultAge<3);assert.deepEqual((g.tanks[1] as any).defeat,pose);assert.ok(paintCount(g)>0);for(let i=0;i<3;i++)g.update(.05);assert.ok(g.resultAge>=3);assert.equal(g.winner,0);
});
test('snapshots retain the crying pose independently of later terrain and restored physics',()=>{
 const g=flat();g.damage(g.tanks[1],99999,0);assert.ok((g.tanks[1] as any).defeat);g.crater(650,450,100,250);const s=g.battleSnapshot(),restored=Game.fromBattleSnapshot(s);for(let i=0;i<20;i++)restored.update(.02);assert.deepEqual((restored.tanks[1] as any).defeat,(g.tanks[1] as any).defeat);assert.equal(restored.tanks[1].outOfBounds,false);assert.ok(paintCount(restored)>0);
});
