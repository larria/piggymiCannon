import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultSlots} from '../src/crew';
import {Game} from '../src/engine';
import {putBackpackItem} from '../src/backpack';
import {TURN_ITEMS} from '../src/catalog';
import {ReplayRecorder,ReplayPlayer,exportReplay,parseReplayFile} from '../src/replay';

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

test('all four 6.0.2 shot items can be cancelled and reserve the slot until successful fire',()=>{
 for(const [slot,id] of TURN_ITEMS.entries()){
  const g=match('6.0.2'),t=g.active;
  const slots=g.backpack().slice(),metrics=t.battleStats!.items;
  const nearby={x:t.x,y:t.y,type:'medical' as const},far={x:t.x+50,y:t.y,type:'boost' as const};
  g.crates=[nearby,far];
  assert.ok(g.useItem(id,false,slot));
  assert.ok(g.itemArmed(slot));assert.deepEqual(g.backpack(),slots);assert.equal(t.itemDelay,0);
  g.update(.01);assert.deepEqual(g.crates,[nearby,far]);
  assert.ok(g.useItem(id,false,slot));
  assert.equal(g.itemArmed(slot),false);assert.deepEqual(g.backpack(),slots);assert.equal(t.queuedShot,undefined);
  assert.equal(g.itemCues.length,0);assert.equal(t.battleStats!.items,metrics);
  assert.ok(g.useItem(id,false,slot));
  t.fallVelocity=10;assert.equal(g.fire(),false);assert.deepEqual(g.backpack(),slots);
  t.fallVelocity=0;g.setAim(35,1);assert.ok(g.fire());
  assert.deepEqual(g.crates,[far]);assert.equal(g.backpack()[slot],'repair');assert.equal(g.itemArmed(slot),false);
  assert.equal(t.battleStats!.items,metrics+1);assert.equal(t.itemDelay,200);
  assert.equal(g.projectiles.length,id==='double'?2:1);
  assert.equal(g.projectiles[0].boost,id==='boost'?1.5:1);
  assert.equal(!!g.projectiles[0].transfer,id==='teleport');assert.equal(!!g.projectiles[0].healing,id==='repair');
 }
});

test('6.0.2 reserves the exact duplicate slot and carries combinations across turns and replay import',()=>{
 const g=match('6.0.2'),t=g.active;
 // Two identical items in separate slots, including one later than the other.
 t.items.teleport=0;t.items.double=2;g.backpack();
 assert.ok(g.useItem('double',false,1));assert.equal(g.useItem('double',false,0),false);
 assert.equal(g.useItem('boost',false,2),false);
 cycle(g);
 assert.equal(g.itemArmed(1),true);assert.ok(g.useItem('boost',false,2));
 const r=new ReplayRecorder(g);
 assert.ok(g.useItem('repair',false,3));assert.ok(g.useItem('repair',false,3));assert.ok(g.useItem('repair',false,3));
 g.setAim(35,1);assert.ok(g.fire());
 assert.deepEqual(g.backpack(),['double',null,null,null]);assert.equal(t.itemDelay,600);
 assert.equal(g.projectiles.length,2);assert.ok(g.projectiles.every(p=>p.healing&&p.boost===1.5));
 for(let i=0;i<32;i++)g.update(.01);
 const recording=parseReplayFile(exportReplay(r.export()),'6.0.2');
 const player=new ReplayPlayer(recording);while(!player.done)player.advance(.05);
 assert.equal(player.verified,true);r.detach();
 const old=match('6.0.1');
 assert.ok(old.useItem('double',false,0));assert.equal(old.backpack()[0],null);
});
