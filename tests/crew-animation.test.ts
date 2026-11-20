import assert from 'node:assert/strict';
import test from 'node:test';
import {CrewAnimationClock,isCrewFalling,reactionSeconds} from '../src/crew-animation';
import type {Tank} from '../src/engine';

const pilot=()=>({id:1,x:120,y:160,hp:100,shield:0,angle:35,direction:1,shots:0,fallVelocity:0,reaction:null} as Tank);

test('idle routines follow 20 seconds of match time per pilot and stop on motion, aiming, firing or a hit',()=>{
 const clock=new CrewAnimationClock(),a=pilot(),b={...pilot(),id:2};
 clock.update(a,0,false);clock.update(b,2,false);
 assert.equal(clock.idleAge(1,19.999),null);
 clock.update(a,20,false);assert.equal(clock.idleAge(1,20),0);
 assert.equal(clock.idleAge(2,20),null);
 assert.equal(clock.idleAge(1,23),null);
 assert.ok(clock.idleAge(1,43)!>0);
 const changes=[()=>a.x++,()=>a.direction*=-1,()=>a.angle++,()=>a.shots++,()=>a.hp--,()=>a.shield++,()=>a.fallVelocity=5];
 for(const [i,change] of changes.entries()){
  const now=(i+1)*30;
  clock.update(a,now,false);change();clock.update(a,now+.1,false);
  assert.equal(clock.idleAge(a.id,now+19),null);
  assert.equal(clock.idleAge(b.id,22),0);
 }
 clock.reset();assert.equal(clock.idleAge(1,240),null);
});

test('each impact starts tears for at least two original reaction lengths without extending the engine reaction',()=>{
 for(const kind of ['graze','direct','fall'] as const){
  const t=pilot(),clock=new CrewAnimationClock(),duration=reactionSeconds(kind);
  t.reaction={kind,remaining:duration};clock.update(t,0,false);assert.equal(clock.cryAge(t.id,0),0);
  t.reaction=null;clock.update(t,duration,false);
  assert.equal(clock.cryAge(t.id,duration),duration);
  assert.notEqual(clock.cryAge(t.id,2*duration-.001),null);
  assert.equal(clock.cryAge(t.id,2*duration),null);
  t.reaction={kind,remaining:duration};clock.update(t,2*duration,false);
  assert.equal(clock.cryAge(t.id,2*duration),0);
 }
});

test('a living tank cries through ordinary falls until landing or exiting, without crying during a normal parachute descent',()=>{
 const t=pilot();t.fallVelocity=1;
 assert.equal(isCrewFalling(t),true);
 t.fallVelocity=80;assert.equal(isCrewFalling(t),true);
 t.parachute={startedAt:0};assert.equal(isCrewFalling(t),false);
 t.parachute=null;t.fallVelocity=0;assert.equal(isCrewFalling(t),false);
 t.fallVelocity=50;t.outOfBounds=true;assert.equal(isCrewFalling(t),false);
});

test('landing starts a fresh two-second crying tail even after the hit animation expired',()=>{
 const t=pilot(),clock=new CrewAnimationClock();
 t.reaction={kind:'direct',remaining:1.4};clock.update(t,0,false);
 t.fallVelocity=80;clock.update(t,2.7,false);
 t.reaction=null;clock.update(t,3,false);assert.equal(clock.cryAge(t.id,3),null);
 t.fallVelocity=0;clock.update(t,4,false);assert.equal(clock.cryAge(t.id,4),0);
 assert.ok(clock.cryAge(t.id,5.999)!>1.99);assert.equal(clock.cryAge(t.id,6),null);
 t.fallVelocity=80;clock.update(t,7,false);
 t.fallVelocity=0;t.outOfBounds=true;clock.update(t,8,false);assert.equal(clock.cryAge(t.id,8),null);
});
