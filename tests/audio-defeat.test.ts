import {test} from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';

test('death audio cue emits exactly once for a mid-match land or water defeat',()=>{
 for(const water of [false,true]){
  const slots=defaultSlots();slots.forEach((s,i)=>{s.enabled=true;s.controller='human';s.vehicle='cannon';s.team=i%2;});
  const g=new Game({slots,seed:52,fog:false,fireLine:false,timer:0});g.start();g.drainEvents();
  const victim=g.tanks[1];if(water){victim.y=600;victim.outOfBounds=true;}
  g.damage(victim,99999,0);assert.equal(g.drainEvents().filter(e=>e.type==='defeat').length,1);assert.equal(g.phase,'aiming');assert.equal(g.winner,null);
  for(let n=0;n<10;n++)g.update(.05);g.damage(victim,99999,0);g.nextTurn();
  assert.equal(g.drainEvents().filter(e=>e.type==='defeat').length,0);assert.equal(victim.hp,0);assert.equal(!!victim.defeat,!water);
  assert.equal(g.battleSnapshot().critical.filter(e=>e.type==='death').length,1);
 }
});
