import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/engine';
import {shotSafety,recoverFinalAIShot,blockedAIShot} from '../src/ai-safety';
import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
import {defaultSlots} from '../src/crew';
const fixture=JSON.parse(readFileSync(new URL('fixtures/ai-opening-skip-5.0.6.json',import.meta.url),'utf8'));
function opening(index:number,version='5.0.7'){
 const c=fixture.cases[index],g=new Game(fixture.config,version);g.start();
 for(const h of c.holes)g.crater(h.x,h.y,h.radius,h.depth,undefined,h.round);
 g.tanks.forEach((t,i)=>Object.assign(t,c.tanks[i],{fallVelocity:0}));
 Object.assign(g,{current:c.actor,turn:c.action-1,wind:c.wind,elapsed:c.elapsed,aiTime:.8,phase:'aiming',aiDecision:null,aiMoveGoal:null,aiPending:null});
 const snapshot=g.battleSnapshot();snapshot.rng.index=c.rngIndex;snapshot.rng.state=(fixture.seed+Math.imul(c.rngIndex,0x6D2B79F5))>>>0;
 return Game.fromBattleSnapshot(snapshot);
}
for(const [index,name] of ['阿狸／水鬼','小黄鱼／老土'].entries()){
 test(`${name}: reproduces the EXACT recorded5.0.6 aim and nonfatal risk, preserving old recordings`,()=>{
  const c=fixture.cases[index],g=opening(index,'5.0.6');g.planAI();assert.equal(g.aiDecision?.intentionalMiss,true);
  assert.equal(g.active.angle,c.reportedAim.angle);assert.equal(g.active.power,c.reportedAim.power);assert.equal(g.selected,c.reportedAim.weapon);
  assert.deepEqual(shotSafety(g,g.active,g.selected),c.reportedRisk);assert.equal(g.fire(true),false);assert.equal(g.aiDecision?.skip,true);
 });
 test(`${name}: final safety recovers a safe miss without rerolling, harming supports or raising difficulty`,()=>{
  const g=opening(index);g.planAI();const before=replayDigest(g),rng=g.battleSnapshot().rng,actor=g.active,hp=g.tanks.map(t=>t.hp);
  const candidate=recoverFinalAIShot(g,actor,g.selected,true);assert.ok(candidate);assert.equal(replayDigest(g),before);
  assert.equal(candidate.risk.enemyBenefit,0);assert.equal(candidate.risk.friendlyCost,0);assert.equal(blockedAIShot(candidate.risk),false);
  assert.equal(g.fire(true),true);assert.equal(g.aiDecision?.skip,undefined);assert.equal(g.aiDecision?.intentionalMiss,true);assert.equal(actor.shots,1);
  const adjustment=g.battleSnapshot().events.findLast(e=>e.type==='ai-safe-adjustment')!;assert.ok(adjustment);assert.equal(adjustment.rngIndex,rng.index);
  assert.ok(actor.angle>=actor.minAngle&&actor.angle<=actor.maxAngle);assert.ok(actor.power>=1&&actor.power<=100);
  const positions=g.tanks.map(t=>({x:t.x,y:t.y}));const id=actor.id;for(let i=0;i<3000&&g.current===id;i++)g.update(1/120);
  assert.equal(actor.shots,1);assert.deepEqual(g.tanks.map(t=>t.hp),hp);assert.ok(g.tanks.every((t,i)=>Math.abs(t.y-positions[i].y)<=3));
 });
 test(`${name}: automatic fire correction and subsequent simulation remain exactly replayable`,()=>{
  const g=opening(index),recorder=new ReplayRecorder(g);for(let i=0;i<150;i++)g.update(1/60);
  const player=new ReplayPlayer(recorder.export());for(let i=0;i<1000&&!player.done;i++)player.advance(.05);
  assert.equal(player.verified,true);assert.equal(replayDigest(player.game),replayDigest(g));recorder.detach();
 });
}
test('recovery retains fatal self/ally excavation guard, including damage-disabled thin supports and trapped firing positions',()=>{
 const slots=defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:i===0?'ai' as const:'human' as const,vehicle:'cannon' as const}));
 const g=new Game({slots,seed:507,map:'coast',timer:0,friendlyFire:false,selfDamage:false,fallDamage:false},'5.0.7');g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,504);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:500+i*200,y:482,fallVelocity:0,direction:1,angle:35}));
 let power=0;for(let p=5;p<=45;p++)if(shotSafety(g,g.active,'cannon-normal',35,p).unsafe){power=p;break;}assert.ok(power);
 g.active.power=power;g.selected='cannon-normal';assert.equal(g.fire(true),false);assert.equal(g.active.shots,0);assert.equal(g.aiDecision?.skipAt,g.elapsed+3);
 g.aiDecision=null;g.active.fuel=0;g.tanks[1].x=1400;for(let x=410;x<=590;x++)g.land.column(x,300,500,true);g.land.rebuild();g.planAI();assert.equal(g.aiDecision?.skip,true);
 const actor=g.current;g.aiTime=2;g.paused=true;g.update(1);assert.equal(g.current,actor);g.paused=false;for(let i=0;i<50;i++)g.update(.05);assert.equal(g.current,actor);for(let i=0;i<12;i++)g.update(.05);assert.notEqual(g.current,actor);
});
