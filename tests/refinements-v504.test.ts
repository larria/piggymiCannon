import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {VEHICLES} from '../src/vehicles';
import {SOURCE_RANGES,sourceRange,launchGravityMultiplier} from '../src/source-range';import {launchSpeed} from '../src/ballistics';
import {predictAIImpact} from '../src/ai-planner';import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
function field(version='5.0.4',vehicle:any='cannon'){
 const slots=defaultSlots().map((s,i)=>({...s,enabled:true,controller:'human' as const,team:i%2,vehicle:i===0?vehicle:'cannon' as any}));
 const g=new Game({seed:52,map:'factory',slots},version);g.start();g.wind=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.worldWidth;x++)g.land.column(x,900,g.worldHeight);g.land.rebuild();for(let i=0;i<4;i++)Object.assign(g.tanks[i],{x:100+i*600,y:882,fallVelocity:0});return g;
}
test('all26 carriers have source Range ratios, a linear1..100 ramp and the same gravity; legacy and bonus guns retain old mappings',()=>{
 for(const v of VEHICLES)for(const weapon of [v.normal,v.special])for(const power of [1,10,25,50,100])for(const angle of [0,25,45,90]){
  const g=field('5.0.4',v.id),p=g.launch(g.active,weapon,angle,power),speed=Math.hypot(p.vx,p.vy);
  assert.ok(Math.abs(speed-730*SOURCE_RANGES[v.id]/43*power/100)<1e-9,weapon+' '+power);assert.equal(launchGravityMultiplier(weapon,.52,'5.0.4'),1);
 }
 for(const v of VEHICLES)for(const w of [v.normal,v.special])for(const power of [1,50,100]){const a=launchSpeed(w,power,v.range,145,'5.0.4'),b=launchSpeed(w,power,v.range,230,'5.0.4');assert.ok(Math.abs(a*a/145-b*b/230)<1e-8);}
 assert.equal(sourceRange('sniper'),undefined);assert.equal(launchGravityMultiplier('sniper',.27,'5.0.4'),.27);
 assert.equal(launchSpeed('bowl-normal',100,1,230,'5.0.3'),730);assert.equal(launchSpeed('duke-normal',100,1.02,230,'5.0.3'),730*49/43);
 assert.equal(launchSpeed('bowl-normal',50,1,230,'5.0.3'),425);assert.equal(launchSpeed('bowl-normal',50,1,230,'5.0.4'),730*45/43*.5);
});
test('body-top corpse contact intercepts red bean; old recordings pass through and dig deeply; dead HP and scoring never change',()=>{
 let oldRemoved=0;
 for(const version of ['5.0.3','5.0.4']){
  const g=field(version),corpse=g.tanks[1];corpse.hp=0;const before=g.land.mask.reduce((n,v)=>n+v,0),score=JSON.stringify(g.progress);
  const p=g.launch(g.active,'cannon-special');Object.assign(p,{x:corpse.x,y:800,vx:0,vy:250,age:1});g.projectiles=[p];g.phase='flying';
  for(let i=0;i<200&&g.projectiles.length;i++)g.update(.002);
  const impact=g.battleSnapshot().events.find(e=>e.type==='impact')!;assert.ok(impact);
  const removed=before-g.land.mask.reduce((n,v)=>n+v,0);if(version==='5.0.3'){oldRemoved=removed;assert.equal(impact.data.directTarget,undefined);}else{assert.equal(impact.data.directTarget,corpse.id);assert.equal(impact.data.corpseContact,true);assert.ok(Math.abs(impact.data.y-(corpse.y+18-51))<1e-6);assert.ok(removed<oldRemoved*.02,`${removed}/${oldRemoved}`);assert.equal(JSON.stringify(g.progress),score);}
  assert.equal(corpse.hp,0);assert.equal(g.battleSnapshot().events.some(e=>e.type==='damage'&&e.data.target===corpse.id),false);
 }
});
test('corpse AABB follows falling position, disappears beyond the boundary and is independent of friendly fire; orbitals still reach ground',()=>{
 const g=field(),t=g.tanks[1];t.hp=0;t.team=0;g.config.friendlyFire=false;const p=g.launch(g.active,'cannon-special');p.age=1;
 assert.equal(g.firstImpact(p,t.x,800,t.x,920)?.tank?.id,t.id);t.y+=40;assert.equal(g.firstImpact(p,t.x,800,t.x,899)?.tank?.id,t.id);
 t.outOfBounds=true;assert.equal(g.firstImpact(p,t.x,800,t.x,920)?.tank,undefined);t.outOfBounds=false;t.y=g.worldHeight;assert.equal(g.bodyOccupies(t),false);
 t.y=882;const satellite={...p,weapon:'ion-special' as const,sub:true};assert.equal(g.firstImpact(satellite,t.x,800,t.x,920)?.tank,undefined);
 const healing={...p,healing:true};assert.equal(g.firstImpact(healing,t.x,800,t.x,920)?.tank?.id,t.id);assert.equal(g.canRestore(t,0),false);g.active.hp=0;assert.equal(g.firstImpact(p,g.active.x,800,g.active.x,920)?.tank?.id,g.active.id);
});
test('AI carrier prediction matches actual landing for all26 native weapons under the new launch/gravity model and remains read-only',()=>{
 for(const v of VEHICLES)for(const weapon of [v.normal,v.special]){const g=field('5.0.4',v.id),t=g.active;g.tanks.slice(1).forEach(b=>b.x=2600);const before=replayDigest(g),pred=predictAIImpact(g,t,weapon,35,42);assert.equal(replayDigest(g),before);
  g.projectiles=[g.launch(t,weapon,35,42)];g.phase='flying';for(let i=0;i<4000&&g.projectiles.length;i++)g.update(.001);
  const hit=g.battleSnapshot().events.find(e=>e.type==='impact'||e.type==='mine-place');assert.ok(hit,weapon);assert.ok(Math.hypot(hit.data.x-pred.x,hit.data.y-pred.y)<12,v.id+': '+JSON.stringify({pred:{x:pred.x,y:pred.y},hit:hit.data}));
 }
});
test('AI sees corpses as blockers, not targets or healing recipients; exact recording/resume preserves new collision and old rules',()=>{
 for(const version of ['5.0.3','5.0.4']){const g=field(version),t=g.tanks[1];t.hp=0;t.x=350;const digest=replayDigest(g),pred=predictAIImpact(g,g.active,'cannon-special',15,35);assert.equal(replayDigest(g),digest);if(version==='5.0.4')assert.equal(pred.hits.find(h=>h.body.tank.id===t.id)?.damage,0);
  const recorder=new ReplayRecorder(g);g.setAim(35,40);g.fire();for(let i=0;i<350;i++)g.update(.01);
  const saved=Game.fromBattleSnapshot(g.battleSnapshot());assert.equal(replayDigest(saved),replayDigest(g));const player=new ReplayPlayer(recorder.export());for(let i=0;i<1000&&!player.done;i++)player.advance(.05);assert.equal(player.verified,true);assert.equal(replayDigest(player.game),replayDigest(g));recorder.detach();
 }
});

test('current AI solves touching/near native shots with1..100 power, including vehicles whose old10 percent shot overshoots',async()=>{
 const {solveAIShot}=await import('../src/ai-planner');
 for(const v of VEHICLES)for(const distance of [56,90]){const g=field('5.0.4',v.id);g.active.x=220;g.tanks[1].x=220+distance;g.tanks[2].x=50;g.tanks[3].hp=0;g.tanks[3].outOfBounds=true;
  const shot=solveAIShot(g,g.active,[v.normal],g.opponents(g.active));assert.equal(shot.target,1,v.id);assert.equal(shot.effective,true,v.id+'/'+distance);assert.ok(shot.power>=1&&shot.power<=100);
  Object.assign(g.active,{angle:shot.angle,power:shot.power,direction:shot.direction});const hp=g.tanks[1].hp,self=g.active.hp;g.fire();for(let i=0;i<1000&&g.projectiles.length;i++)g.update(.005);assert.ok(g.tanks[1].hp<hp,v.id+'/'+distance);assert.equal(g.tanks[0].hp,self);
 }
});
test('every collision weapon is intercepted by an on-map corpse, while satellite children keep ground-only contact',async()=>{
 const {ALL_WEAPONS}=await import('../src/catalog');const g=field(),corpse=g.tanks[1];corpse.hp=0;
 for(const w of ALL_WEAPONS){const p=g.launch(g.active,w.id);p.age=1;const hit=g.firstImpact(p,corpse.x,800,corpse.x,920);assert.equal(hit?.tank?.id,corpse.id,w.id);}
});
test('new-version AI auto-heals at1 percent and can deliver recovery to an injured teammate without targeting corpses',()=>{
 for(const self of [true,false]){const g=field();g.active.controller='ai';g.active.difficulty='expert';g.tanks[1].x=1900;g.tanks[2].x=430;g.tanks[2].team=0;g.tanks[2].hp=150;g.tanks[3].hp=0;
  if(self)g.active.hp=100;const target=self?g.active:g.tanks[2],before=target.hp;g.planAI();assert.equal(g.restoring,true);assert.equal(g.aiDecision?.target,target.id);if(self)assert.equal(g.active.power,1);g.aiTime=1;
  for(let i=0;i<1000&&target.hp===before;i++)g.update(.01);assert.ok(target.hp>before,self?'self':'ally');assert.equal(g.tanks[3].hp,0);assert.equal(g.tanks[0].items.repair,0);
 }
});

test('new falling displacement is15 percent faster, crates terminal speed300, prediction still matches real landing; legacy speeds and fall damage stay',()=>{
 const old=field('5.0.3'),g=field();for(const h of [old,g]){Object.assign(h.active,{y:300,fallVelocity:150,fallStart:300});(h as any).updateTanks(.02);}assert.ok(Math.abs((g.active.y-300)/(old.active.y-300)-1.15)<1e-9);assert.equal(g.supplyFallLimit,300);assert.equal(old.supplyFallLimit,250);
 g.wind=8;const predicted=g.predictSupply(700)!;assert.ok(predicted);g.phase='supply';g.supplyObservation=null;g.crates=[{x:700,y:-50,type:'double',falling:true,vx:0,vy:80}];let max=0;for(let i=0;i<1000&&g.crates[0].falling;i++){g.update(1/120);max=Math.max(max,g.crates[0].vy??0);}assert.equal(max,300);assert.ok(Math.abs(g.crates[0].x-predicted.x)<4);assert.equal(g.crates[0].y,predicted.y);
});
