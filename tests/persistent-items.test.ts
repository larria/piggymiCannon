import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultSlots} from '../src/crew';
import {Game} from '../src/engine';
import {putBackpackItem} from '../src/backpack';
import {ReplayRecorder,ReplayPlayer} from '../src/replay';

function match(version='5.1.2',timer=0){
 const g=new Game({map:'coast',seed:52,timer,fog:false,fireLine:false,slots:defaultSlots().map((s,i)=>({...s,enabled:i<2,team:i,controller:'human',vehicle:'cannon'}))},version);
 g.start();return g;
}
function handoff(g:Game){if(g.phase==='handoff')g.acceptHandoff();}
function cycle(g:Game){const who=g.current;g.skipTurn();handoff(g);for(let i=0;g.current!==who&&i<5;i++){g.skipTurn();handoff(g);}assert.equal(g.current,who);}

test('boosted double recovery survives two turn changes and a snapshot, then fires and consumes exactly once',()=>{
 const g=match(),t=g.active;
 assert.ok(g.useItem('double',false,0));assert.ok(g.useItem('boost',false,2));assert.ok(g.useItem('repair',false,3));
 const duplicate=putBackpackItem(t,'double');assert.equal(duplicate,0);
 g.skipTurn();handoff(g);assert.notEqual(g.current,t.id);assert.equal(g.restoring,false);assert.equal(g.active.doubleShot,false);
 assert.equal(g.itemArmed(3,t),true);assert.ok(g.useItem('teleport',false,1));
 const restored=Game.fromBattleSnapshot(g.battleSnapshot());
 for(let i=0;restored.current!==t.id&&i<5;i++){restored.skipTurn();handoff(restored);}assert.equal(restored.current,t.id);
 assert.equal(restored.restoring,true);assert.equal(restored.teleporting,false);
 assert.equal(restored.itemUnavailable('double',false,duplicate),'已装填双发');assert.equal(restored.useItem('double',false,duplicate),false);
 assert.match(restored.itemUnavailable('teleport',false,1)!,/不能同时装填/);
 assert.equal(restored.active.itemDelay,0);assert.ok(restored.selectWeapon('cannon-special'));assert.ok(restored.restoring);
 restored.active.fallVelocity=1;assert.equal(restored.fire(),false);assert.ok(restored.active.doubleShot);
 restored.active.fallVelocity=0;restored.setAim(45,1);assert.ok(restored.fire());
 assert.equal(restored.projectiles.length,2);assert.ok(restored.projectiles.every(p=>p.healing&&p.boost===1.5));
 assert.equal(restored.active.items.repair,0);assert.equal(restored.active.items.double,1);assert.equal(restored.active.queuedShot,undefined);
 assert.equal(restored.active.itemDelay,200);
 assert.equal(restored.tanks[1].queuedShot?.ammo?.item,'teleport');
});

test('a timed-out double transfer remains loaded; explicit unload preserves stock and a later shot clears it',()=>{
 const g=match('5.1.2',1),id=g.current;g.clock=1;
 assert.ok(g.useItem('double'));assert.ok(g.useItem('teleport',false,1));
 for(let i=0;i<30&&g.current===id;i++)g.update(.05);
 handoff(g);assert.notEqual(g.current,id);assert.ok(g.battleSnapshot().events.some(e=>e.type==='timeout'));
 for(let i=0;g.current!==id&&i<5;i++){g.skipTurn();handoff(g);}assert.equal(g.current,id);assert.equal(g.teleporting,true);assert.equal(g.active.doubleShot,true);
 assert.ok(g.useItem('teleport',false,1));assert.equal(g.teleporting,false);assert.equal(g.active.items.teleport,1);
 assert.ok(g.useItem('teleport',false,1));g.setAim(45,8);assert.ok(g.fire());
 assert.equal(g.projectiles.length,2);assert.ok(g.projectiles[0].transfer&&g.projectiles[1].awaitTransfer);
 assert.equal(g.active.items.teleport,0);
});

test('cross-turn item carry replays exactly while 5.1.1 retains its original behavior',()=>{
 for(const version of ['5.1.1','5.1.2']){
  const g=match(version),recorder=new ReplayRecorder(g);
  assert.ok(g.useItem('boost'));assert.ok(g.useItem('double'));assert.ok(g.useItem('repair'));cycle(g);
  assert.equal(g.active.boost,version==='5.1.2');assert.equal(g.active.doubleShot,version==='5.1.2');assert.equal(g.restoring,version==='5.1.2');
  g.setAim(45,1);assert.ok(g.fire());for(let i=0;i<24;i++)g.update(.0125);
  const player=new ReplayPlayer(recorder.export());while(!player.done)player.advance(.2);
  assert.equal(player.verified,true);assert.deepEqual(player.game.tanks,g.tanks);recorder.detach();
 }
});
