import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';import {Terrain} from '../src/terrain';import {defaultSlots} from '../src/crew';
function game(seed=52,allHuman=false){const slots=defaultSlots().map((s,i)=>({...s,vehicle:'cannon' as const,controller:allHuman?'human' as const:i===0?'human' as const:'ai' as const,enabled:allHuman||i<2,team:allHuman?i%2:i}));const g=new Game({slots,map:'factory',seed,timer:45,fog:false,fireLine:false},'4.0.0');g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960,true);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:220+i*420,y:432,fallVelocity:0}));g.wind=0;return g;}
test('delivery queues during AI turn and drops immediately BEFORE the selected human acts',()=>{
 const g=game();g.turn=4;g.nextTurn();assert.equal(g.active.controller,'ai');assert.equal(g.crates.length,0);assert.equal(g.pendingSupply?.target,0);assert.equal(g.phase,'aiming');g.nextTurn();assert.equal(g.active.id,0);assert.equal(g.crates.length,1);assert.equal(g.crates[0].recipient,0);assert.equal(g.phase,'supply');assert.equal(g.humanTurn,false);assert.equal(g.fire(true),false);
 const event=g.battleSnapshot().events.find(e=>e.type==='supply-selection')!;assert.equal(event.data.target,g.active.id);assert.equal(event.data.queuedAction,5);assert.equal(event.data.deliveryAction,6);
 let landedAt=0;for(let i=0;i<2500&&g.phase==='supply';i++){g.update(.01);if(!g.crates[0].falling&&!landedAt)landedAt=g.elapsed;assert.equal(g.clock,45);}assert.equal(g.phase,'aiming');assert.equal(g.active.id,0);assert.equal(g.humanTurn,true);assert.ok(g.elapsed-landedAt>.9);
});
test('cadence remains five actions, not every human turn; all-AI battles generate no human deliveries',()=>{
 const g=game();for(let i=0;i<4;i++){g.nextTurn();assert.equal(g.crates.length,0);}g.nextTurn();assert.ok(g.pendingSupply);g.nextTurn();assert.equal(g.crates.length,1);for(let i=0;i<3;i++)g.nextTurn();assert.equal(g.crates.length,1);assert.equal(g.pendingSupply,null);g.nextTurn();assert.equal(g.crates.length,2);
 const ai=game();ai.tanks.forEach(t=>t.controller='ai');for(let i=0;i<20;i++)ai.nextTurn();assert.equal(ai.crates.length,0);assert.equal(ai.pendingSupply,null);
});
test('seeded uniform recipient draw covers every human including teammates; actual deliveries never precede AI',()=>{
 const counts=[0,0,0,0];for(let seed=1;seed<=96;seed++){const g=game(seed,true);g.turn=4;g.nextTurn();const queued=g.battleSnapshot().events.find(e=>e.type==='supply-queued')!;counts[queued.data.target]++;assert.deepEqual(queued.data.candidates,[0,1,2,3]);for(let i=0;i<5&&!g.crates.length;i++)g.nextTurn();assert.ok(g.crates.length);assert.equal(g.crates[0].recipient,g.active.id);}
 console.log('4.0 seeded recipients',counts);assert.ok(counts.every(n=>n>=14&&n<=34));
});
test('queued target death cancels safely; queue/cadence restore reproducibly and old version remains immediate',()=>{
 const g=game();g.turn=4;g.nextTurn();const restored=Game.fromBattleSnapshot(g.battleSnapshot());g.nextTurn();restored.nextTurn();assert.deepEqual(restored.crates,g.crates);assert.deepEqual(restored.pendingSupply,g.pendingSupply);assert.deepEqual(restored.battleSnapshot().rng,g.battleSnapshot().rng);
 const legacy=new Game({...g.config,seed:52},'3.2.9');legacy.start();legacy.turn=4;legacy.nextTurn();assert.equal(legacy.pendingSupply,null);assert.equal(legacy.progress,null);assert.ok(legacy.crates.length);
 const dead=game(7,true);dead.pendingSupply={target:2,candidates:[0,1,2,3],queuedAction:3};dead.tanks[2].hp=0;dead.nextTurn();assert.equal(dead.pendingSupply,null);assert.ok(dead.battleSnapshot().events.some(e=>e.type==='supply-cancel'));
});
