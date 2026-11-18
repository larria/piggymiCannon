import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {ReplayRecorder,ReplayPlayer,replayDigest,validateReplay} from '../src/replay';
function game(version='5.0.4'){const slots=defaultSlots().map((s,i)=>({...s,enabled:true,controller:i%2===0?'human' as const:'ai' as const,vehicle:'cannon' as const,team:i%2}));const g=new Game({slots,seed:52,map:'factory',timer:0,fog:false,fireLine:false},version);g.start();return g;}
test('idle aim belongs to the most recent human, clamps relative range and leaves AI, power, resources, calibration and RNG untouched',()=>{
 const g=game(),human=g.active;human.power=44;g.skipTurn();g.planAI();const ai=JSON.stringify(g.active),decision=JSON.stringify(g.aiDecision),rng=g.battleSnapshot().rng,metrics=JSON.stringify(g.progress),items=JSON.stringify(human.items);
 assert.equal(g.dashboardTank.id,0);assert.equal(g.canPrepareAim,true);assert.equal(g.prepareAim(1000,0,-1),true);assert.equal(human.angle,human.maxAngle);assert.equal(human.direction,-1);assert.equal(human.power,44);assert.equal(JSON.stringify(g.active),ai);assert.equal(JSON.stringify(g.aiDecision),decision);assert.deepEqual(g.battleSnapshot().rng,rng);assert.equal(JSON.stringify(g.progress),metrics);assert.equal(JSON.stringify(human.items),items);
 assert.equal(g.prepareAim(30,2),false);assert.equal(g.prepareAim(NaN,0),false);assert.equal(g.prepareAim(30,0,0),false);assert.ok(g.battleSnapshot().events.some(e=>e.type==='aim-preparation'&&e.data.tank===0));
});
test('aim can be prepared through supply, flight, observation and handoff, but not paused, intro, lobby, ended or after the human dies',()=>{
 const g=game();g.skipTurn();for(const phase of ['supply','flying','resolving','handoff'] as const){g.phase=phase;assert.equal(g.prepareAim(38,0),true,phase);}
 g.phase='aiming';g.weatherObservation={age:0} as any;assert.equal(g.prepareAim(39,0),true);g.weatherObservation=null;
 g.paused=true;assert.equal(g.prepareAim(30,0),false);g.paused=false;g.setIntroLocked(true);assert.equal(g.prepareAim(30,0),false);g.setIntroLocked(false);for(const phase of ['lobby','ended'] as const){g.phase=phase;assert.equal(g.prepareAim(30,0),false);}g.phase='aiming';g.tanks[0].hp=0;assert.equal(g.prepareAim(30,0),false);
});
test('handover changes ownership without discarding the stored angle, and preparation saves/resumes/replays exactly',()=>{
 const g=game(),recorder=new ReplayRecorder(g);g.skipTurn();g.prepareAim(42,0,-1);g.setPowerMarker(55,0);g.nextTurn();assert.equal(g.dashboardTank.id,2);assert.equal(g.prepareAim(38,0),false);assert.equal(g.prepareAim(36,2),true);g.nextTurn();g.nextTurn();assert.equal(g.tanks[0].angle,42);assert.equal(g.tanks[0].powerMarker,55);g.update(.01);
 const clip=recorder.export();assert.ok(clip.commands.some(c=>c[0]===14));assert.equal(replayDigest(Game.fromBattleSnapshot(g.battleSnapshot())),replayDigest(g));const p=new ReplayPlayer(clip);for(let i=0;i<1000&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);assert.equal(replayDigest(p.game),replayDigest(g));recorder.detach();
 const corrupted=structuredClone(clip);corrupted.commands.push([14,38,99]);assert.throws(()=>validateReplay(corrupted));
});
test('old recordings cannot acquire the new preparation command; current in-flight vectors remain unchanged',()=>{
 const old=game('5.0.3'),r=new ReplayRecorder(old);old.skipTurn();assert.equal(old.prepareAim(40,0),false);assert.equal(r.export().commands.some(c=>c[0]===14),false);r.detach();
 const g=game();g.setAim(35,50);g.fire();const flight=JSON.stringify(g.projectiles);assert.equal(g.prepareAim(40,0),true);assert.equal(JSON.stringify(g.projectiles),flight);assert.equal(g.tanks[0].lastPower,50);
});
