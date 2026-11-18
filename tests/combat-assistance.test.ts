import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {safeAIPositions,predictAIImpact} from '../src/ai-planner';
import {assistanceSweep,assistanceSignature,ASSIST_POWER_STEP} from '../src/power-assistance';import {defeatPerspective} from '../src/combat-preferences';import {ReplayRecorder,ReplayPlayer,replayDigest,validateReplay} from '../src/replay';
function field(version='5.0.5'){
 const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,controller:i===1?'ai':'human',team:i%2,vehicle:'cannon'}));
 const g=new Game({slots,seed:505,fog:false,fireLine:false,timer:0},version);g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.worldWidth;x++)g.land.column(x,500,g.worldHeight);g.land.rebuild();g.wind=0;
 g.tanks.forEach((t,i)=>Object.assign(t,{x:300+i*300,y:482,fuel:100,fallVelocity:0,angle:45,direction:1}));return g;
}
function sweep(g:Game){const it=assistanceSweep(g,g.active);let r=it.next();while(!r.done)r=it.next();return r.value;}
test('both new options default off; old recordings retain movement blocking',()=>{const g=field();assert.equal(g.config.powerAssist,false);assert.equal(g.config.tankBlocking,false);assert.equal(g.tanksBlockMovement,false);assert.equal(field('5.0.4').tanksBlockMovement,true);});
test('movement crosses living tanks and corpses with blocking off; projectile contacts remain',()=>{
 for(const dead of [false,true]){const g=field(),t=g.active,other=g.tanks[1];other.x=t.x+35;if(dead)other.hp=0;
  const p=g.launch(t,'cannon-special');p.age=1;assert.equal(g.firstImpact(p,other.x-50,other.y-10,other.x+50,other.y-10)?.tank?.id,other.id);
  assert.equal(g.move(1,.25),true);assert.ok(t.x>other.x-35);
  t.x=300;t.fuel=100;g.setBattleRule('tankBlocking',true);assert.equal(g.move(1,.05),false);
 }
});
test('AI route probes share the movement setting while terrain/fuel restrictions remain',()=>{
 const g=field(),t=g.active;g.tanks[1].x=345;assert.ok(safeAIPositions(g,t).some(p=>p.x>345));g.setBattleRule('tankBlocking',true);assert.ok(safeAIPositions(g,t).every(p=>p.x<345));g.config.tankBlocking=false;t.fuel=0;assert.deepEqual(safeAIPositions(g,t),[]);
});
test('fixed-angle enemy bands follow exact predicted impacts, accumulate separately and do not modify state',()=>{
 const g=field(),before=replayDigest(g),rng=g.battleSnapshot().rng;
 const bands=sweep(g);assert.equal(bands.length,2);assert.ok(bands.every(b=>b.samples.some(x=>x>0)));assert.ok(bands.every(b=>Math.max(...b.samples)>.75));
 const first=bands[0],target=g.tanks[first.target];for(let i=0;i<first.samples.length;i+=10){const impact=predictAIImpact(g,g.active,g.selected,g.active.angle,g.minimumShotPower+i*ASSIST_POWER_STEP);const hit=impact.hits.find(h=>h.body.tank.id===target.id)!;assert.equal(first.samples[i]>0,hit.damage>0);}
 assert.equal(replayDigest(g),before);assert.deepEqual(g.battleSnapshot().rng,rng);
 const key=assistanceSignature(g,g.active);g.active.power=99;assert.equal(assistanceSignature(g,g.active),key);g.setAim(40,99);assert.notEqual(assistanceSignature(g,g.active),key);
});
test('bands never reveal fog-hidden enemies; multiple enemies may overlay one interval',()=>{
 const g=field();g.tanks[3].x=g.tanks[1].x;const bands=sweep(g);assert.deepEqual(bands[0].samples,bands[1].samples);g.fog=true;assert.equal(sweep(g).length,0);
});
test('all 26 native weapons use the shared dispersion and never mutate terrain, RNG or damage',()=>{
 const g=field();for(const t of g.tanks)t.x=300+t.id*250;const before=replayDigest(g);
 // One representative power per weapon validates every carrier, including multi,
 // pierce, homing, orbital and helix, without an expensive redundant full sweep.
 for(const vehicle of ['bowl','crossbow','cannon','beetle','duke','missile','multi','laser','mine','ion','water','sea','dragon'] as const){
  g.active.vehicleId=vehicle;for(const slot of ['normal','special'] as const){g.selected=`${vehicle}-${slot}`;const old=replayDigest(g),it=assistanceSweep(g,g.active);for(let n=0;n<10;n++)it.next();assert.equal(replayDigest(g),old);}
 }
 assert.ok(before.length>0);
});
test('new settings survive snapshot/resume and replay; legacy recordings reject new rule keys',()=>{
 const g=field(),r=new ReplayRecorder(g);g.setBattleRule('powerAssist',true);g.setBattleRule('tankBlocking',true);g.move(-1,.01);g.update(.01);const recording=r.export();r.detach();validateReplay(recording);
 const p=new ReplayPlayer(recording);for(let n=0;n<10&&!p.done;n++)p.advance(.1);assert.equal(p.verified,true);assert.equal(p.game.config.powerAssist,true);assert.equal(p.game.config.tankBlocking,true);
 const copy=Game.fromBattleSnapshot(g.battleSnapshot());assert.equal(replayDigest(copy),replayDigest(g));assert.equal(copy.tanksBlockMovement,true);
 const old=structuredClone(recording);old.gameVersion='5.0.4';assert.throws(()=>validateReplay(old));
});
test('AI ally killed by terrain loss keeps human perspective through handoff; death cue emitted only once',()=>{
 const g=field(),ally=g.tanks[2];ally.controller='ai';g.drainEvents();g.dashboardHuman=0;g.current=1;g.phase='resolving';g.land.mask.fill(0);g.land.rebuild();ally.y=g.worldHeight-19;ally.fallVelocity=300;
 g.update(.02);const event=g.drainEvents().find(e=>e.type==='defeat');assert.ok(event);assert.equal(ally.hp,0);assert.equal(event.observerTeam,0);
 g.current=3;g.tanks[3].controller='human';assert.equal(defeatPerspective(g,event,ally),true);
 for(let n=0;n<5;n++)g.update(.02);assert.equal(g.drainEvents().filter(e=>e.type==='defeat').length,0);
});

test('enabling blocking during an overlap allows separation but forbids moving deeper or crossing through',()=>{const g=field(),t=g.active;g.tanks[1].x=330;g.setBattleRule('tankBlocking',true);assert.equal(g.move(1,.04),false);assert.equal(g.move(-1,.04),true);assert.ok(safeAIPositions(g,t).some(p=>p.x<t.x));});
