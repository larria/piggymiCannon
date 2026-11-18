import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {Terrain} from '../src/terrain';
import {solveAIShot,chooseAIPosition} from '../src/ai-planner';import {chooseSafeAIShot,shotSafety} from '../src/ai-safety';
import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
function closeTeam(version='5.0.7',distance=90,thick=280){
 const g=new Game({map:'coast',seed:52,timer:0,fallDamage:false,slots:defaultSlots().map((s,i)=>({...s,enabled:true,vehicle:'cannon',controller:i===0?'ai':'human',team:i%2}))},version);g.start();
 g.land=new Terrain(g.worldWidth,g.worldHeight);g.terrain=g.land.surface;for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,500+thick);g.land.rebuild();
 g.tanks.forEach((t,i)=>Object.assign(t,{x:[1000,1000+distance,600,1700][i],y:482,fallVelocity:0,tactics:0}));g.tanks[1].hp=100;g.wind=0;return g;
}
test('safe close knockout outranks farming a distant tank, while5.0.6 recording priority stays unchanged',()=>{
 for(const version of ['5.0.6','5.0.7']){const g=closeTeam(version),s=solveAIShot(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active));assert.equal(s.target,version==='5.0.7'?1:3);if(version==='5.0.7'){assert.ok(s.power<20);assert.equal(shotSafety(g,g.active,s.weapon,s.angle,s.power,s.direction).unsafe,false);}}
});
test('native minimum/low powers in overlapping and nearby poses can fire and kill without inventing a hit or changing damage',()=>{
 for(const distance of [30,50,90,130]){const g=closeTeam('5.0.7',distance),s=solveAIShot(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active)),safe=chooseSafeAIShot(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active),s);assert.ok(safe);assert.equal(safe.target,1);assert.ok(safe.power<25);Object.assign(g.active,{angle:safe.angle,power:safe.power,direction:safe.direction});g.selected=safe.weapon;assert.equal(g.fire(true),true);for(let n=0;n<2000&&g.current===0;n++)g.update(1/120);assert.equal(g.tanks[1].hp,0);assert.ok(g.tanks[0].hp>0);assert.ok(g.tanks[2].hp>0);}
});
test('low difficulty can choose the alternate native weapon for a nearby unsafe normal shot, without bypassing fatal excavation',()=>{
 const g=closeTeam('5.0.7',65,4);g.active.difficulty='easy';const normal=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active)),safe=chooseSafeAIShot(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active),normal);assert.ok(safe);assert.equal(shotSafety(g,{...g.active,x:safe.x,y:safe.y},safe.weapon,safe.angle,safe.power,safe.direction).unsafe,false);g.planAI();assert.notEqual(g.aiDecision?.skip,true);for(let n=0;n<1000&&g.current===0&&g.phase==='aiming';n++)g.update(.01);assert.equal(g.active.shots,1);assert.equal(g.phase,'flying');
});
test('autonomous close-combat priorities, perturbation and safety recover exactly in recordings',()=>{
 const g=closeTeam(),r=new ReplayRecorder(g);for(let n=0;n<210;n++)g.update(1/60);const p=new ReplayPlayer(r.export());for(let n=0;n<1000&&!p.done;n++)p.advance(.05);assert.equal(p.verified,true);assert.equal(replayDigest(p.game),replayDigest(g));r.detach();
});
