import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
import {planAISelfRescue,rememberAIWait,unchangedAIWait,simulateAIRescue} from '../src/ai-rescue';
import {aiSupportReserve,chooseSupportedAIPosition,planAIProtectiveTransfer,predictAITransfer} from '../src/ai-support-strategy';
import {solveAIShot} from '../src/ai-planner';import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
function field(map:'temple'|'moon'|'coast'='coast',difficulty:'easy'|'normal'|'hard'|'expert'='easy',version='5.0.9'){
 const slots=defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:i===0?'ai' as const:'human' as const,difficulty,vehicle:'cannon' as const}));
 const g=new Game({slots,seed:509,map,timer:0,selfDamage:true,fog:false,fireLine:false},version);g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);g.wind=0;
 g.tanks.forEach((t,i)=>Object.assign(t,{x:i?900:250,y:432,fallVelocity:0}));return g;
}
function roof(g:Game,permanent=false){for(let x=0;x<=g.worldWidth;x++)g.land.column(x,450,640,true);for(let x=180;x<=420;x++)g.land.column(x,320,390,permanent);g.land.rebuild();return g;}
function supportField(map:'temple'|'moon',difficulty:'easy'|'normal'|'hard'|'expert'='normal',version='5.0.9'){
 const g=field(map,difficulty,version);g.active.x=550;g.active.y=482;g.tanks[1].y=482;
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,504);for(let x=620;x<=690;x++)g.land.column(x,700,720,true);g.land.rebuild();return g;
}
function advanceAction(g:Game){const actor=g.current;for(let i=0;i<3000&&g.current===actor&&g.phase!=='ended';i++)g.update(1/120);}
function checkReplay(g:Game,recorder:ReplayRecorder){const p=new ReplayPlayer(recorder.export());for(let i=0;i<3000&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);assert.equal(replayDigest(p.game),replayDigest(g));recorder.detach();}
test('AI waits one actual action before self excavation, then opens its own roof without fatal damage or accuracy training',()=>{
 const g=roof(field()),t=g.active;advanceAction(g);assert.equal(t.shots,0);assert.ok(t.aiStuck);assert.equal(g.current,1);
 g.skipTurn();const calibration=t.aiCalibration?.stableShots??0,recorder=new ReplayRecorder(g);advanceAction(g);
 assert.equal(t.shots,1);assert.ok(t.hp>0);assert.equal(t.outOfBounds,false);assert.equal(t.aiStuck,undefined);assert.equal(t.aiCalibration?.stableShots??0,calibration);
 assert.ok(g.battleSnapshot().events.some(e=>e.type==='ai-self-rescue'));assert.ok(g.land.revision>2);checkReplay(g,recorder);
});
test('local trap memory ignores distant excavation, resets after a local change, and cannot trigger in the same action or in5.0.8',()=>{
 const g=roof(field());rememberAIWait(g,g.active);assert.equal(unchangedAIWait(g,g.active),false);g.active.turnsTaken++;
 g.crater(1500,450,20,20);assert.equal(unchangedAIWait(g,g.active),true);g.crater(250,380,12,12);assert.equal(unchangedAIWait(g,g.active),false);assert.equal(g.active.aiStuck,undefined);
 const old=roof(field('coast','easy','5.0.8'));rememberAIWait(old,old.active);assert.equal(old.active.aiStuck,undefined);old.active.turnsTaken++;assert.equal(planAISelfRescue(old,old.active,['cannon-normal']),null);
});
test('rescue probes leave live terrain, HP, inventory, RNG and replay digest unchanged; permanent or lethal traps keep waiting',()=>{
 const g=roof(field());rememberAIWait(g,g.active);g.active.turnsTaken++;const before=replayDigest(g),plan=planAISelfRescue(g,g.active,['cannon-normal']);assert.ok(plan);assert.equal(replayDigest(g),before);
 const permanent=roof(field(),true);rememberAIWait(permanent,permanent.active);permanent.active.turnsTaken++;assert.equal(planAISelfRescue(permanent,permanent.active,['cannon-normal']),null);
 g.active.hp=1;assert.equal(planAISelfRescue(g,g.active,['cannon-normal']),null);
});
test('self rescue verifies the entire four-section Flyfire chain through live physics',()=>{
 const g=roof(field()),t=g.active;t.vehicleId='missile';t.hp=t.maxHP=2000;t.ammo['missile-normal']=Infinity;g.selected='missile-normal';
 const shot={x:t.x,y:t.y,weapon:'missile-normal' as const,angle:35,power:1,direction:1,target:t.id,utility:1,effective:false};
 const before=replayDigest(g),proof=simulateAIRescue(g,t,shot);assert.ok(proof);assert.equal(replayDigest(g),before);
 Object.assign(t,{angle:shot.angle,power:shot.power,direction:shot.direction});g.aiDecision={target:t.id,fromX:t.x,goalX:t.x,weapon:shot.weapon,intentionalMiss:false,selfRescue:true};
 assert.equal(g.fire(true),true);advanceAction(g);assert.ok(t.hp>0);assert.ok(g.battleSnapshot().events.filter(e=>e.type==='terrain').length>=4);
 t.hp=1;assert.equal(simulateAIRescue(g,t,shot),null);
});
test('an unrelated ally already falling to a lower landing does not veto live-chain rescue validation',()=>{
 const g=roof(field()),t=g.active;g.config.fallDamage=true;
 const ally={...t,id:2,x:1500,y:600,fallVelocity:50,fallStart:432,hp:500};g.tanks.push(ally);
 for(let x=1400;x<=1600;x++)for(let y=0;y<g.worldHeight;y++){const at=y*g.land.stride+x;g.land.mask[at]=0;g.land.protectedMask[at]=0;}
 for(let x=1400;x<=1600;x++)g.land.column(x,800,1000,true);g.land.rebuild();
 const shot={x:t.x,y:t.y,weapon:'cannon-normal' as const,angle:35,power:1,direction:-1,target:t.id,utility:1,effective:false};
 const before=replayDigest(g);assert.ok(simulateAIRescue(g,t,shot));assert.equal(replayDigest(g),before);
});
test('full-chain rescue validation refuses an indirect enemy mine chain that would kill a teammate',()=>{
 const g=roof(field()),t=g.active,ally={...t,id:2,x:430,hp:50};g.tanks.push(ally);
 const shot={x:t.x,y:t.y,weapon:'cannon-normal' as const,angle:35,power:1,direction:-1,target:t.id,utility:1,effective:false};
 assert.ok(simulateAIRescue(g,t,shot));
 g.mines.push({x:360,y:340,owner:1,weapon:'mine-special',boost:1},{x:390,y:375,owner:1,weapon:'mine-special',boost:1});
 const before=replayDigest(g);assert.equal(simulateAIRescue(g,t,shot),null);assert.equal(replayDigest(g),before);assert.equal(ally.hp,50);
});
for(const map of ['temple','moon'] as const)test(`${map}: veteran and higher preposition above a permanent lower landing, preserving fuel limits and re-aiming`,()=>{
 for(const difficulty of ['normal','hard','expert'] as const){
  const g=supportField(map,difficulty),t=g.active;assert.equal(aiSupportReserve(g,t).hits,0);const best=solveAIShot(g,t,['cannon-normal'],g.opponents(t)),before=replayDigest(g),plan=chooseSupportedAIPosition(g,t,['cannon-normal'],g.opponents(t),best);
  assert.ok(plan);assert.equal(replayDigest(g),before);assert.equal(plan.after.hits,3);assert.equal(plan.after.permanent,true);assert.ok(Math.abs(plan.shot.x-t.x)<=t.moveDistance);
  const fuel=t.fuel;g.planAI();assert.ok(g.aiMoveGoal!==null);const goal=g.aiMoveGoal!;g.aiTime=.8;for(let i=0;i<600&&g.phase==='aiming';i++)g.update(1/120);
  assert.equal(g.phase,'flying');assert.ok(Math.abs(t.x-goal)<1);assert.ok(t.fuel<fuel);assert.equal(t.outOfBounds,false);
 }
 const easy=supportField(map,'easy'),old=supportField(map,'normal','5.0.8');for(const g of [easy,old]){const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active));assert.equal(chooseSupportedAIPosition(g,g.active,['cannon-normal'],g.opponents(g.active),shot),null);}
});
test('support reserve counts second/third impacts on lower destructible platforms instead of assuming the first fall is death',()=>{
 const g=supportField('moon');g.land.protectedMask.fill(0);
 for(let x=420;x<=780;x++)g.land.column(x,640,710);g.land.rebuild();const two=aiSupportReserve(g,g.active);assert.equal(two.out,true);assert.ok(two.hits>0);
 for(let x=420;x<=780;x++)g.land.column(x,850,1000);g.land.rebuild();const three=aiSupportReserve(g,g.active);assert.equal(three.hits,3);assert.equal(three.out,false);
});
test('expert transfers to a robust platform when walking cannot reach it; parachute landing and recording agree',()=>{
 const g=supportField('temple','expert'),t=g.active;t.fuel=0;g.tanks[1].x=1400;
 for(let x=800;x<=1150;x++)g.land.column(x,500,800,true);g.land.rebuild();const before=replayDigest(g),plan=planAIProtectiveTransfer(g,t);assert.ok(plan);assert.equal(replayDigest(g),before);assert.equal(plan.after.hits,3);
 const predicted=predictAITransfer(g,t,plan.angle,plan.power,plan.direction)!;assert.ok(predicted);const stock=t.items.teleport,recorder=new ReplayRecorder(g);advanceAction(g);
 assert.ok(g.battleSnapshot().events.some(e=>e.type==='ai-support-transfer'));
 assert.equal(t.items.teleport,stock-1);assert.ok(t.hp>0);assert.equal(t.outOfBounds,false);assert.ok(Math.abs(t.x-predicted.landing.x)<3);assert.ok(Math.abs(t.y-predicted.landing.y)<1);checkReplay(g,recorder);
});
test('expert uses transfer BEFORE the first would-be wait, without consuming boost/double; ordinary walking saves the transfer',()=>{
 const g=roof(field('coast','expert'),true),t=g.active;t.fuel=0;g.planAI();g.aiTime=.8;assert.equal(g.aiDecision?.protectiveTransfer,true);assert.equal(g.aiDecision?.skip,undefined);assert.equal(t.aiStuck,undefined);assert.equal(t.items.boost,1);assert.equal(t.items.double,1);
 advanceAction(g);assert.ok(t.hp>0);assert.ok(t.y<432);assert.equal(t.items.teleport,0);
 const walk=supportField('temple','expert');assert.equal(planAIProtectiveTransfer(walk,walk.active),null);walk.planAI();assert.ok(walk.aiMoveGoal!==null);assert.equal(walk.teleporting,false);
});
test('transfer rejects out-of-map/no-platform landings and cannot activate for lower tiers or incompatible items',()=>{
 const g=roof(field('coast','expert'),true),t=g.active;t.fuel=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);g.land.rebuild();assert.equal(planAIProtectiveTransfer(g,t,true),null);
 for(const difficulty of ['easy','normal','hard'] as const){const h=roof(field('coast',difficulty),true);h.active.fuel=0;assert.equal(planAIProtectiveTransfer(h,h.active,true),null);}
 const h=roof(field('coast','expert'),true);h.active.fuel=0;h.active.boost=true;assert.equal(planAIProtectiveTransfer(h,h.active,true),null);h.active.boost=false;h.active.doubleShot=true;assert.equal(planAIProtectiveTransfer(h,h.active,true),null);
});
