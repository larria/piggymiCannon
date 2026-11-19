import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/engine';
import {shotSafety,chooseSafeAIShot} from '../src/ai-safety';
import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
import {defaultSlots} from '../src/crew';
import {causalAIShotSafety} from '../src/ai-distance';
const fixture=JSON.parse(readFileSync(new URL('fixtures/ai-bottom-skip-5.0.8.json',import.meta.url),'utf8'));
function thunder(version='5.0.9'){
 const g=new Game(fixture.config,version);g.start();
 for(const h of fixture.holes)g.crater(h.x,h.y,h.radius,h.depth,undefined,h.round);
 g.tanks.forEach((t,i)=>Object.assign(t,fixture.tanks[i]));
 Object.assign(g,{current:fixture.actor,turn:fixture.action-1,wind:fixture.wind,elapsed:fixture.elapsed,aiTime:.8001,phase:'aiming',paused:false,introLocked:false,observation:null,aiDecision:null,aiMoveGoal:null,aiPending:null});
 const s=g.battleSnapshot();s.rng.index=fixture.rngIndex;s.rng.state=(fixture.seed+Math.imul(fixture.rngIndex,0x6D2B79F5))>>>0;
 return Game.fromBattleSnapshot(s);
}
function field(fallDamage=false,friendlyFire=false){
 const slots=defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:i===0?'ai' as const:'human' as const,vehicle:'cannon' as const,difficulty:'expert' as const}));
 const g=new Game({slots,seed:509,map:'coast',timer:0,fallDamage,friendlyFire,selfDamage:false,fog:false,fireLine:false},'5.0.9');g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,504);g.land.rebuild();g.wind=0;
 g.tanks.forEach((t,i)=>Object.assign(t,{x:500+i*200,y:482,angle:35,power:30,direction:1,fallVelocity:0}));return g;
}
test('5.0.8 snapshot reproduces the reported bottom-support risk and skip; old gate stays unchanged',()=>{
 const g=thunder('5.0.8'),s=fixture.left;
 assert.deepEqual(shotSafety(g,g.active,'mine-normal',s.angle,s.power,s.direction),fixture.reportedRisk);
 g.planAI();assert.equal(g.aiDecision?.skip,true);assert.equal(g.aiDecision?.skipAt,g.elapsed+3);
 assert.equal(g.battleSnapshot().initial.rules.aiTeamSafety,'virtual-native-excavation-v1');
 for(const version of ['5.0.6','5.0.7','5.0.8'])assert.equal(causalAIShotSafety(version),false);
 for(const version of ['5.0.9','5.1.0','6.0.0'])assert.equal(causalAIShotSafety(version),true);
});
for(const side of ['left','right'] as const)test(`雷霆 ${side}: an unrelated ally on the bottom platform does not veto the shot`,()=>{
 const g=thunder(),s=fixture[side],before=replayDigest(g),risk=shotSafety(g,g.active,'mine-normal',s.angle,s.power,s.direction);
 assert.equal(replayDigest(g),before);assert.equal(risk.enemyBenefit,s.damage);assert.equal(risk.unsafe,false);assert.equal(risk.friendlyCost,0);assert.equal(risk.holes,0);
 const ally=risk.allies!.find(a=>a.target===2)!;assert.equal(ally.out,false);assert.equal(ally.lethal,false);assert.equal(ally.fall,0);
 assert.deepEqual(ally.supportChange,{baselineGround:1332,predictedGround:1332,baselineOut:false,predictedOut:false,baselineFall:0,predictedFall:0});
 const preferred={x:g.active.x,y:g.active.y,weapon:'mine-normal' as const,angle:s.angle,power:s.power,direction:s.direction,target:s.target,utility:s.damage,effective:true};
 assert.deepEqual(chooseSafeAIShot(g,g.active,['mine-normal'],g.opponents(g.active),preferred),preferred);
 Object.assign(g.active,{angle:s.angle,power:s.power,direction:s.direction});g.selected='mine-normal';assert.equal(g.fire(true),true);
 for(let i=0;i<1000&&g.current===3;i++)g.update(1/120);
 assert.equal(g.active.id===3&&g.phase==='flying',false);assert.equal(g.tanks[3].shots,2);assert.equal(g.tanks[2].hp,467);assert.equal(g.tanks[2].y,1314);assert.equal(g.tanks[2].outOfBounds,false);
});
test('the recovered 雷霆 AI action fires automatically and old/new recordings verify deterministically',()=>{
 for(const version of ['5.0.8','5.0.9']){
  const g=thunder(version),recorder=new ReplayRecorder(g);
  for(let i=0;i<450;i++)g.update(1/120);
  assert.equal(g.tanks[3].shots,version==='5.0.8'?1:2);
  const player=new ReplayPlayer(recorder.export());for(let i=0;i<1000&&!player.done;i++)player.advance(.05);
  assert.equal(player.verified,true);assert.equal(replayDigest(player.game),replayDigest(g));recorder.detach();
 }
 assert.equal(thunder().battleSnapshot().initial.rules.aiTeamSafety,'causal-native-excavation-v2');
});
test('雷霆 still attacks left when 大猪头 is absent; the unrelated ally cannot force another skip',()=>{
 const g=thunder();g.tanks[1].hp=0;g.planAI();assert.equal(g.aiDecision?.target,0);assert.equal(g.aiDecision?.skip,undefined);assert.equal(g.active.direction,-1);
 assert.equal(g.fire(true),true);assert.equal(g.tanks[3].shots,2);assert.equal(g.tanks[2].hp,467);
});
test('valid supports 1–19px above the bottom remain safe; the live engine leaves the tank standing',()=>{
 for(const inset of [1,6,12,17,18,19]){
  const g=field(),floor=g.worldHeight-inset,ally={...g.active,id:2,x:1500,y:floor-18,team:g.active.team,hp:500};g.tanks.push(ally);
  for(let x=1400;x<1600;x++)g.land.column(x,floor,g.worldHeight,true);g.land.rebuild();
  const risk=shotSafety(g,g.active,'cannon-normal',35,40),a=risk.allies!.find(a=>a.target===2)!;
  assert.equal(a.out,false);assert.equal(a.lethal,false);assert.equal(a.supportChange!.predictedGround,floor);
  (g as any).updateTanks(1/60);assert.equal(ally.y,floor-18);assert.equal(ally.hp,500);assert.equal(ally.outOfBounds,false);
 }
});
test('pre-existing unsupported or falling allies do not add shot risk when their support is untouched',()=>{
 for(const fallDamage of [false,true])for(const floor of [800,960]){
  const g=field(fallDamage),ally={...g.active,id:2,x:1500,y:600,fallVelocity:50,fallStart:482,team:g.active.team,hp:500};g.tanks.push(ally);
  for(let x=1400;x<=1600;x++)for(let y=0;y<g.worldHeight;y++)g.land.mask[y*g.land.stride+x]=0;
  if(floor<g.worldHeight)for(let x=1400;x<=1600;x++)g.land.column(x,floor,g.worldHeight);g.land.rebuild();
  const risk=shotSafety(g,g.active,'cannon-normal',35,40),a=risk.allies!.find(a=>a.target===2)!;
  assert.equal(a.fall,0);assert.equal(a.damage,0);assert.equal(a.out,false);assert.equal(a.lethal,false);
  assert.equal(a.supportChange!.baselineGround,a.supportChange!.predictedGround);assert.equal(a.supportChange!.baselineOut,floor===g.worldHeight);
 }
});
test('newly digging through ally support is still refused even with friendly and fall damage disabled',()=>{
 const g=field(),t=g.active;for(let x=380;x<=570;x++)g.land.column(x,500,504,true);g.land.rebuild();const ally={...t,id:2,x:750,y:482,team:t.team};g.tanks.push(ally);
 let found=false;for(let power=15;power<=45;power++){
  const risk=shotSafety(g,t,'cannon-normal',35,power),a=risk.allies!.find(a=>a.target===2)!;if(!a.out)continue;
  assert.equal(risk.unsafe,true);assert.equal(a.lethal,true);assert.equal(a.supportChange!.baselineOut,false);assert.equal(a.supportChange!.predictedOut,true);
  t.power=power;assert.equal(g.fire(true),false);assert.equal(g.aiDecision?.skipAt,g.elapsed+3);found=true;break;
 }assert.equal(found,true);
});
test('adding lethal fall damage or directly killing a teammate remains unsafe',()=>{
 for(const friendlyFire of [false,true]){
  const g=field(!friendlyFire,friendlyFire),t=g.active,ally={...t,id:2,x:750,y:482,team:t.team,hp:friendlyFire?30:70};g.tanks.push(ally);
  for(let x=380;x<=570;x++)g.land.column(x,500,g.worldHeight,true);
  for(let x=650;x<=850;x++)g.land.column(x,800,g.worldHeight);g.land.rebuild();
  let found=false;for(let power=15;power<=45;power++){
   const risk=shotSafety(g,t,'cannon-normal',35,power),a=risk.allies!.find(a=>a.target===2)!;if(!a.lethal)continue;
   assert.equal(risk.unsafe,true);assert.equal(a.supportChange!.baselineOut,false);assert.equal(a.out,false);assert.ok(a.damage>=ally.hp);found=true;break;
  }assert.equal(found,true);
 }
});
test('a shot that deepens an existing fall is charged only for the added drop, but still detects a newly fatal landing',()=>{
 const g=field(true),t=g.active,ally={...t,id:2,x:750,y:600,fallVelocity:50,fallStart:482,team:t.team,hp:100};g.tanks.push(ally);
 for(let x=650;x<=850;x++)for(let y=500;y<800;y++)g.land.mask[y*g.land.stride+x]=0;
 for(let x=650;x<=850;x++)g.land.column(x,800,g.worldHeight);
 for(let x=380;x<=570;x++)g.land.column(x,500,g.worldHeight,true);g.land.rebuild();
 let found=false;for(let power=15;power<=65;power++){
  const a=shotSafety(g,t,'cannon-normal',35,power).allies!.find(a=>a.target===2)!;if(!a.lethal)continue;
  const change=a.supportChange!;assert.equal(change.baselineGround,800);assert.equal(change.baselineFall,182);assert.equal(a.out,false);
  assert.equal(a.fall,change.predictedFall-change.baselineFall);assert.ok(a.damage>0&&a.damage<ally.hp);assert.ok(change.predictedGround>800);found=true;break;
 }assert.equal(found,true);
});
test('the shooter still rejects a true loss of its own support and accepts a permanent lower landing',()=>{
 const g=field(),t=g.active;let power=0;
 for(let p=5;p<=45;p++)if(shotSafety(g,t,'cannon-normal',35,p).out){power=p;break;}assert.ok(power);
 const unsafe=shotSafety(g,t,'cannon-normal',35,power);assert.equal(unsafe.unsafe,true);assert.equal(unsafe.supportChange!.baselineOut,false);assert.equal(unsafe.supportChange!.predictedOut,true);
 for(let x=350;x<=650;x++)g.land.column(x,g.worldHeight-12,g.worldHeight,true);g.land.rebuild();
 const safe=shotSafety(g,t,'cannon-normal',35,power);assert.equal(safe.out,false);assert.equal(safe.unsafe,false);assert.equal(safe.supportChange!.predictedGround,g.worldHeight-12);
});
