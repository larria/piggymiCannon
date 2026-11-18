import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {Terrain} from '../src/terrain';
import {calibrationProfile,calibrationDisturbed,advanceCalibration,AI_STABLE_SHOTS,type AICalibration} from '../src/ai-calibration';
import {DIFFICULTIES,aiAimOffset} from '../src/catalog';import {ReplayRecorder,ReplayPlayer} from '../src/replay';
function game(difficulty='expert'){const slots=defaultSlots();slots[0].controller='ai';slots[0].difficulty=difficulty as any;slots.forEach(s=>s.vehicle='cannon');const g=new Game({slots,seed:52,timer:0,fog:false,fireLine:false},'3.2.7');g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:i?850:250,y:432,fallVelocity:0}));g.wind=0;return g;}
test('first and disrupted shots have larger lapse/error, steady shots approach a difficulty bounded ceiling',()=>{
 for(const d of DIFFICULTIES){const state:AICalibration={stableShots:0,disturbed:false},profiles=[];for(let i=0;i<7;i++){profiles.push(calibrationProfile(d.id,state));advanceCalibration(state);}assert.ok(profiles[0].missChance>profiles[3].missChance);assert.ok(profiles[0].error>profiles[3].error);for(let i=1;i<profiles.length;i++)assert.ok(profiles[i].missChance<=profiles[i-1].missChance);assert.deepEqual(profiles[3],profiles[6]);assert.equal(state.stableShots,AI_STABLE_SHOTS);const disturbed=calibrationProfile(d.id,{stableShots:0,disturbed:true});assert.ok(disturbed.missChance>profiles[0].missChance);}
 assert.equal(calibrationProfile('expert',{stableShots:3,disturbed:false}).ceiling,.77);
 const stable=DIFFICULTIES.map(d=>calibrationProfile(d.id,{stableShots:3,disturbed:false}).missChance);assert.ok(stable.every((p,i)=>i===0||p<stable[i-1]));
});
test('calibration affects aim offset only, retains seeded draw order and never rolls damage or a hit result',()=>{
 const values=[.35,.9,.5],a=[...values],b=[...values];const baseline=aiAimOffset('expert','cannon-normal',()=>a.shift()!),first=aiAimOffset('expert','cannon-normal',()=>b.shift()!,calibrationProfile('expert',{stableShots:0,disturbed:true}));assert.equal(baseline.miss,false);assert.equal(first.miss,true);assert.ok(Math.abs(first.offset)>100);
 const g=game();g.active.aiCalibration={stableShots:3,disturbed:false};const p=g.launch(g.active,'cannon-normal');g.active.aiCalibration={stableShots:0,disturbed:true};assert.equal(g.launch(g.active,'cannon-normal').boost,p.boost);
});
test('enemy excavation resets only when slope/landing changes; hp loss, own digging or unrelated terrain do not reset',()=>{
 const g=game();g.active.aiCalibration={stableShots:3,disturbed:false};g.damage(g.active,1,1);assert.equal(g.active.aiCalibration.stableShots,3);g.crater(1600,450,30,20,{owner:1,weapon:'cannon-normal'});assert.equal(g.active.aiCalibration.terrainPending,undefined);g.crater(260,455,35,25,{owner:1,weapon:'cannon-normal'});assert.ok(g.active.aiCalibration.terrainPending);while(g.active.fallVelocity>0)(g as any).updateTanks(.02);assert.ok(calibrationDisturbed(g.active.aiCalibration,g.active.x,g.active.y,g.tankSlope(g.active)));g.planAI();assert.equal(g.active.aiCalibration.stableShots,0);assert.equal(g.active.aiCalibration.disturbed,true);assert.ok(g.battleSnapshot().events.some(e=>e.type==='ai-disturbed'));
 const own=game();own.active.aiCalibration={stableShots:3,disturbed:false};own.crater(260,455,35,25,{owner:0,weapon:'cannon-normal'});assert.equal(own.active.aiCalibration.terrainPending,undefined);
});
test('even easy AI recovers a blocked shot after terrain disturbance, but respects fuel/freeze limits',()=>{
 for(const blocked of [false,true]){const g=game('easy');for(let x=180;x<=420;x++)g.land.column(x,320,390,true);g.land.rebuild();g.active.aiCalibration={stableShots:0,disturbed:true};if(blocked)g.active.fuel=0;g.planAI();if(blocked)assert.equal(g.aiDecision!.goalX,g.active.x);else assert.ok(Math.abs(g.aiDecision!.goalX-g.active.x)>60);}
});
test('replanning does not train accuracy; only a real shot advances it; restoration and replay preserve state',()=>{
 const g=game(),r=new ReplayRecorder(g);g.planAI();assert.equal(g.active.aiCalibration!.stableShots,0);g.planAI();assert.equal(g.active.aiCalibration!.stableShots,0);g.fire(true);assert.equal(g.active.aiCalibration!.stableShots,1);g.update(.02);const restored=Game.fromBattleSnapshot(g.battleSnapshot());assert.deepEqual(restored.active.aiCalibration,g.active.aiCalibration);
 // planAI called directly is intentionally test-only; normal plans run inside recorded update.
 r.detach();const h=game(),tape=new ReplayRecorder(h);for(let i=0;i<300;i++)h.update(.02);const p=new ReplayPlayer(tape.export());while(!p.done)p.advance(.1);assert.equal(p.verified,true);assert.deepEqual(p.game.tanks.map(t=>t.aiCalibration),h.tanks.map(t=>t.aiCalibration));tape.detach();
});

test('legacy bonus airstrike still prepares and fires once with the new calibration gate',()=>{
 const g=game();g.active.vehicleId=null;g.active.turnsTaken=3;g.active.tactics=0;for(const id of Object.keys(g.active.ammo))g.active.ammo[id as keyof typeof g.active.ammo]=0;g.active.ammo.airstrike=2;g.planAI();assert.equal(g.aiDecision!.weapon,'airstrike');g.aiTime=1.8;g.update(.01);assert.equal(g.phase,'flying');assert.equal(g.active.shots,1);assert.equal(g.projectiles.length,3);
});

test('teammate excavation can disturb aim even with friendly damage off; the next attack still recalibrates',()=>{
 const g=game();g.tanks[1].team=g.active.team;g.active.aiCalibration={stableShots:3,disturbed:false};g.crater(260,455,35,25,{owner:1,weapon:'cannon-normal'});assert.ok(g.active.aiCalibration.terrainPending);while(g.active.fallVelocity>0)(g as any).updateTanks(.02);(g as any).refreshAICalibration(g.active);assert.equal(g.active.aiCalibration.disturbed,true);assert.equal(g.active.aiCalibration.stableShots,0);
});

test('new normal-error calibration preserves old recordings, first-shot penalties and all difficulty ceilings',()=>{const state={stableShots:3,disturbed:false};assert.equal(calibrationProfile('normal',state,'5.0.3').error,75);assert.equal(calibrationProfile('normal',state,'5.0.4').error,70);assert.equal(calibrationProfile('normal',{stableShots:0,disturbed:false},'5.0.4').missChance,.62);assert.equal(calibrationProfile('expert',state,'5.0.4').ceiling,.77);});
