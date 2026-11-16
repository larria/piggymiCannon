import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,makeRng} from './legacy-fixture';
import {MAPS} from '../src/catalog';

test('random map consumes the recorded seeded draw, reaches every map, and stays replayable',()=>{
 const seen=new Set<string>();
 for(let seed=0;seed<60;seed++){
  const a=new Game({seed,mapChoice:'random'}),b=new Game({seed,mapChoice:'random'});
  const expected=MAPS[Math.floor(makeRng(seed)()*MAPS.length)].id;
  assert.equal(a.config.map,expected);assert.equal(b.config.map,expected);seen.add(expected);
  assert.deepEqual(a.land.mask,b.land.mask);assert.deepEqual(a.tanks,b.tanks);
  const s=a.battleSnapshot();assert.equal(s.initial.config.map,expected);assert.equal(s.initial.mapName,MAPS.find(m=>m.id===expected)!.name);
  assert.equal(s.initial.config.mapChoice,'random');assert.equal(s.current.config.map,expected);
  assert.equal(s.events.find(e=>e.type==='map-selection')!.data.actual,expected);
  assert.equal(s.events.find(e=>e.type==='rng')!.rngIndex,1);
  assert.ok(a.battleSnapshotText().includes(`（${expected}）`));
  const restored=Game.fromBattleSnapshot(s);assert.equal(restored.config.map,expected);assert.deepEqual(restored.battleSnapshot().rng,s.rng);
  a.start();restored.start();a.nextTurn();restored.nextTurn();assert.deepEqual(restored.battleSnapshot().rng,a.battleSnapshot().rng);
 }
 assert.deepEqual([...seen].sort(),MAPS.map(m=>m.id).sort());
});

test('explicit maps keep their old seeded terrain and do not consume a random-map draw',()=>{
 for(const m of MAPS){const a=new Game({map:m.id,seed:52}),b=new Game({map:m.id,mapChoice:m.id,seed:52});assert.deepEqual(a.land.mask,b.land.mask);assert.deepEqual(a.tanks,b.tanks);assert.deepEqual(a.battleSnapshot().rng,b.battleSnapshot().rng);assert.equal(b.battleSnapshot().events.some(e=>e.type==='map-selection'),false);}
});
