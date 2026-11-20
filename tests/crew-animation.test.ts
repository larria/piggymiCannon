import assert from 'node:assert/strict';
import test from 'node:test';
import {CREW_HEAL_SECONDS,CrewAnimationClock,isCrewFalling,reactionSeconds} from '../src/crew-animation';
import type {Tank} from '../src/engine';

const pilot=()=>({id:1,x:120,y:160,hp:100,shield:0,angle:35,direction:1,shots:0,fallVelocity:0,fallStart:160,reaction:null} as Tank);

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

const landingAt=(footY:number,bottom=960)=>()=>({footY,bottom});

test('a short supported fall adds no tears but keeps an independent reaction to a hit',()=>{
 const t=pilot(),clock=new CrewAnimationClock();clock.update(t,0,false);
 t.fallVelocity=80;clock.update(t,1,false,landingAt(t.fallStart+18+48));assert.equal(clock.cryAge(t.id,1),null);
 t.reaction={kind:'graze',remaining:.7};clock.update(t,1.1,false,landingAt(200));assert.equal(clock.cryAge(t.id,1.1),0);
 t.reaction=null;t.fallVelocity=0;clock.update(t,1.5,false);
 assert.ok(clock.cryAge(t.id,2.49)!>1.3);assert.equal(clock.cryAge(t.id,2.51),null);
});

test('a long fall keeps its tears as the tank nears the landing, then adds one second; a nearby map edge still starts tears',()=>{
 const t=pilot(),clock=new CrewAnimationClock();clock.update(t,0,false);
 t.fallVelocity=80;t.y=205;clock.update(t,2,false,landingAt(228));assert.equal(clock.cryAge(t.id,2),0);
 t.y=209;clock.update(t,3,false,landingAt(227));assert.equal(clock.cryAge(t.id,3),1);
 t.fallVelocity=0;clock.update(t,4,false);assert.equal(clock.cryAge(t.id,4),0);
 assert.ok(clock.cryAge(t.id,4.999)!>.99);assert.equal(clock.cryAge(t.id,5),null);
 t.fallStart=921;t.y=922;t.fallVelocity=80;clock.update(t,7,false,landingAt(960));assert.equal(clock.cryAge(t.id,7),0);
 t.fallVelocity=0;t.outOfBounds=true;clock.update(t,8,false);assert.equal(clock.cryAge(t.id,8),null);
});

test('healing is per pilot and only real HP gains start it; a new hit and replay restart clear it',()=>{
 const t=pilot(),other={...pilot(),id:2},clock=new CrewAnimationClock();clock.update(t,0,false);clock.update(other,0,false);
 t.shield++;clock.update(t,1,false);assert.equal(clock.healAge(t.id,1),null);
 t.hp+=25;clock.update(t,2,true);clock.update(other,2,false);
 assert.equal(clock.healAge(t.id,2),0);assert.equal(clock.healAge(other.id,2),null);
 clock.update(t,2,true);assert.equal(clock.healAge(t.id,2),0); // Pause doesn't advance the clock.
 assert.notEqual(clock.healAge(t.id,2+CREW_HEAL_SECONDS-.001),null);assert.equal(clock.healAge(t.id,2+CREW_HEAL_SECONDS+.001),null);
 t.hp+=10;clock.update(t,5,false);t.hp--;clock.update(t,5.2,false);assert.equal(clock.healAge(t.id,5.2),null);
 t.hp++;clock.update(t,6,false);assert.equal(clock.healAge(t.id,6),0);
 clock.update(t,1,false);assert.equal(clock.healAge(t.id,1),null);
});

test('a heal during a long fall still has time to show after the landing tears',()=>{
 const t=pilot(),clock=new CrewAnimationClock();clock.update(t,0,false);
 t.fallVelocity=80;clock.update(t,1,false,landingAt(240));
 t.hp+=20;clock.update(t,1.3,false,landingAt(240));
 t.fallVelocity=0;clock.update(t,2,false);clock.update(t,2.99,false);
 clock.update(t,3,false);assert.equal(clock.cryAge(t.id,3),null);assert.ok(clock.healAge(t.id,3)!<.02);
});
