import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {ReplayPlayer,ReplayRecorder,parseReplayFile,exportReplay} from '../src/replay';

function match(humans:number,version='5.1.4',seed=52){
 const slots=defaultSlots().map((s,i)=>({...s,vehicle:'cannon' as const,enabled:true,controller:i<humans?'human' as const:'ai' as const,team:i%2}));
 const g=new Game({slots,map:'factory',seed,timer:0,fog:false,fireLine:false},version);g.start();
 g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.land.width;x++)g.land.column(x,450,g.land.height,true);g.land.rebuild();
 g.tanks.forEach((t,i)=>Object.assign(t,{x:240+i*420,y:432,fallVelocity:0}));g.wind=0;return g;
}
const events=(g:Game,type:string)=>g.battleSnapshot().events.filter(e=>e.type===type);
function advance(g:Game,turn:number){while(g.turn<turn)g.nextTurn();}
function takeFirst(g:Game){
 for(let i=0;i<10&&!g.crates.length;i++)g.nextTurn();
 assert.equal(g.crates.length,1);assert.equal(g.crates[0].recipient,g.active.id);assert.equal(g.active.controller,'human');
 assert.equal(events(g,'supply-queued')[0].data.queuedAction,5);return g.turn;
}

test('first supply checks at the same action; later drops use the number of living humans',()=>{
 for(const [humans,gap] of [[1,12],[2,10],[3,8],[4,6]]){
  const g=match(humans),old=match(humans,'5.1.3');const first=takeFirst(g);
  assert.equal(takeFirst(old),first);
  assert.equal(events(g,'supply-selection')[0].data.nextAction,first+gap);
  g.crates=[];old.crates=[];advance(old,10);assert.equal(events(old,'supply-queued')[1].data.queuedAction,10);
  assert.equal('lastSupplyDelivery' in old.battleSnapshot().current,false);
  advance(g,first+gap-1);assert.equal(events(g,'supply-queued').length,1);assert.equal(g.crates.length,0);
  g.nextTurn();const queue=events(g,'supply-queued')[1].data;
  assert.equal(queue.queuedAction,first+gap);assert.deepEqual(queue.candidates,Array.from({length:humans},(_,id)=>id));
  for(let i=0;i<4&&!g.crates.length;i++)g.nextTurn();assert.equal(g.crates.length,1);
  assert.equal(g.crates[0].recipient,g.active.id);assert.equal(g.active.id,queue.target);assert.equal(g.active.controller,'human');
 }
 const ai=match(0);advance(ai,24);assert.equal(ai.crates.length,0);assert.equal(events(ai,'supply-queued').length,0);
});

test('a smaller surviving human roster extends the cooldown across a snapshot restore',()=>{
 const game=match(3),first=takeFirst(game);game.crates=[];
 game.tanks[1].hp=0;game.tanks[2].controller='ai';
 advance(game,first+9);assert.equal(events(game,'supply-queued').length,1);
 const restored=Game.fromBattleSnapshot(game.battleSnapshot());
 assert.equal(restored.battleSnapshot().current.lastSupplyDelivery,first);
 for(const g of [game,restored]){
  advance(g,first+11);assert.equal(g.crates.length,0);assert.equal(g.pendingSupply,null);
  advance(g,first+12);assert.deepEqual(events(g,'supply-queued').at(-1)?.data.candidates,[0]);
  for(let i=0;i<4&&!g.crates.length;i++)g.nextTurn();assert.equal(g.crates[0].recipient,0);
 }
 assert.deepEqual(game.crates,restored.crates);assert.deepEqual(game.battleSnapshot().rng,restored.battleSnapshot().rng);
});


test('an exported replay crosses the second-drop cooldown with the same recipient and landing',()=>{
 const g=match(2),first=takeFirst(g);g.crates=[];
 const recorder=new ReplayRecorder(g);
 advance(g,first+10);for(let i=0;i<4&&!g.crates.length;i++)g.nextTurn();
 assert.equal(g.crates.length,1);
 for(let i=0;i<1440&&g.phase==='supply';i++)g.update(1/120);
 assert.equal(g.crates[0].falling,false);
 const replay=new ReplayPlayer(parseReplayFile(exportReplay(recorder.export()),'5.1.4'));
 for(let i=0;i<1800&&!replay.done;i++)replay.advance(1/120);
 assert.equal(replay.verified,true);assert.deepEqual(replay.game.crates,g.crates);recorder.detach();
});
