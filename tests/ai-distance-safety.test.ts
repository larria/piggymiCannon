import {test} from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {shotSafety,chooseSafeAIShot} from '../src/ai-safety';import {calibrationProfile} from '../src/ai-calibration';import {aiTargetDistance} from '../src/ai-distance';import {solveAIShot} from '../src/ai-planner';import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
function field(version='5.0.6',thick=4){const slots=defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:i===0?'ai' as const:'human' as const,vehicle:'cannon' as const,difficulty:'expert' as const}));const g=new Game({slots,seed:506,map:'coast',timer:0,fog:false,fireLine:false},version);g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,500+thick);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:500+i*200,y:482,fallVelocity:0,angle:35,power:30,direction:1,tactics:0}));g.wind=0;return g;}
test('accuracy decreases monotonically with distance; close expert approaches77% ceiling and keeps warmup/disturbance penalties',()=>{
 for(const difficulty of ['easy','normal','hard','expert'] as const){const profiles=[.1,.2,.4,.6,.9,1.25,2].map(distance=>calibrationProfile(difficulty,{stableShots:3,disturbed:false},'5.0.6',distance));for(let i=1;i<profiles.length;i++){assert.ok(profiles[i].missChance>=profiles[i-1].missChance);assert.ok(profiles[i].error>=profiles[i-1].error);}assert.ok(profiles[0].missChance<profiles[3].missChance);assert.ok(profiles[6].missChance>profiles[3].missChance);
  for(const distance of [.1,.7,2]){const stable=calibrationProfile(difficulty,{stableShots:3,disturbed:false},'5.0.6',distance),first=calibrationProfile(difficulty,{stableShots:0,disturbed:false},'5.0.6',distance),disturbed=calibrationProfile(difficulty,{stableShots:0,disturbed:true},'5.0.6',distance);assert.ok(first.missChance>stable.missChance);assert.ok(disturbed.missChance>=first.missChance);assert.ok(disturbed.error>first.error);}
 }
 assert.ok(Math.abs(calibrationProfile('expert',{stableShots:3,disturbed:false},'5.0.6',.1).missChance-.23)<1e-10);assert.deepEqual(calibrationProfile('expert',{stableShots:3,disturbed:false},'5.0.5',.1),calibrationProfile('expert',{stableShots:3,disturbed:false},'5.0.5',2));
});
test('distance uses the recorded logical viewport and known fog positions, not camera pans or hidden coordinates',()=>{const g=field();const before=aiTargetDistance(g,g.active);assert.ok(before<.2);g.tanks[1].x+=1500;assert.ok(aiTargetDistance(g,g.active)>before);g.fog=true;const fog=aiTargetDistance(g,g.active);g.tanks[1].x-=1000;assert.equal(aiTargetDistance(g,g.active),fog);});
test('source excavation predicts a lethal loss of a thin support but retains permanent or lower support; no state/RNG changes',()=>{
 const g=field(),t=g.active;let unsafe:any;
 for(let power=5;power<=45;power++){const risk=shotSafety(g,t,'cannon-normal',35,power);if(risk.out){unsafe={power,risk};break;}}assert.ok(unsafe);assert.equal(unsafe.risk.unsafe,true);
 const before=replayDigest(g);assert.deepEqual(shotSafety(g,t,'cannon-normal',35,unsafe.power),unsafe.risk);assert.equal(replayDigest(g),before);
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,800,850,true);g.land.rebuild();const lower=shotSafety(g,t,'cannon-normal',35,unsafe.power);assert.equal(lower.out,false);assert.equal(lower.unsafe,false);
 g.land.protectedMask.set(g.land.mask);g.land.rebuild();assert.equal(shotSafety(g,t,'cannon-normal',35,unsafe.power).fall,0);
 assert.equal(shotSafety(field('5.0.5'),field('5.0.5').active,'cannon-normal',35,unsafe.power).unsafe,false);
});
test('final AI fire refuses its own lethal dig regardless of damage switches; skip does not consume ammo or train calibration',()=>{
 const g=field(),t=g.active;let power=0;for(let p=5;p<=45;p++)if(shotSafety(g,t,'cannon-normal',35,p).unsafe){power=p;break;}assert.ok(power);t.power=power;t.aiCalibration={stableShots:0,disturbed:false};g.selected='cannon-normal';const stock=t.ammo[g.selected];assert.equal(g.fire(true),false);assert.equal(t.shots,0);assert.equal(t.ammo['cannon-normal'],stock);assert.equal(t.aiCalibration.stableShots,0);assert.ok(g.battleSnapshot().events.some(e=>e.type==='ai-safety-plan'));assert.equal(t.hp,t.maxHP);
});
test('safe fallback remains within angle/power/fuel ranges and never overwrites damage/hit/RNG mechanics',()=>{
 const g=field(),t=g.active,preferred=solveAIShot(g,t,['cannon-normal','cannon-special'],g.opponents(t));const before=replayDigest(g),safe=chooseSafeAIShot(g,t,['cannon-normal','cannon-special'],g.opponents(t),preferred);assert.equal(replayDigest(g),before);if(safe){assert.ok(safe.angle>=t.minAngle&&safe.angle<=t.maxAngle);assert.ok(safe.power>=1&&safe.power<=100);assert.equal(shotSafety(g,{...t,x:safe.x,y:safe.y},safe.weapon,safe.angle,safe.power,safe.direction).unsafe,false);}
});
test('AI can skip an entirely enclosed permanent firing position and a saved recording reproduces its decisions',()=>{
 const g=field(),t=g.active;g.tanks[1].x=1400;t.fuel=0;for(let x=t.x-90;x<t.x+90;x++)g.land.column(x,300,500,true);g.land.rebuild();g.planAI();assert.equal(g.aiDecision?.skip,true);const actor=g.current;g.aiTime=2;for(let i=0;i<50;i++)g.update(.05);assert.equal(g.current,actor);for(let i=0;i<12;i++)g.update(.05);assert.notEqual(g.current,actor);
 const h=field(),r=new ReplayRecorder(h);for(let n=0;n<90;n++)h.update(.03);const p=new ReplayPlayer(r.export());for(let n=0;n<100&&!p.done;n++)p.advance(.1);assert.equal(p.verified,true);r.detach();
});
test('even with friendly damage disabled, excavation threatening an ally below/near the target blocks the shot',()=>{
 const g=field(),t=g.active;for(let x=380;x<=570;x++)g.land.column(x,500,504,true);g.land.rebuild();const ally={...t,id:2,x:750,y:482,team:t.team,controller:'ai' as const};g.tanks.push(ally);g.config.friendlyFire=false;
 let risk:any,power=0;for(let p=15;p<=45;p++){const r=shotSafety(g,t,'cannon-normal',35,p);if(r.allies?.some(a=>a.lethal)){risk=r;power=p;break;}}
 assert.ok(risk);assert.equal(risk.out,false);assert.ok(risk.allies.some((a:any)=>a.target===2&&a.out));assert.equal(risk.selfDamage,0);const before=replayDigest(g);shotSafety(g,t,'cannon-normal',35,power);assert.equal(replayDigest(g),before);
 t.power=power;assert.equal(g.fire(true),false);assert.equal(g.current,0);assert.equal(g.aiDecision?.skipAt,g.elapsed+3);
});
test('enabled friendly damage is assessed before firing and weighted above equivalent enemy damage',()=>{
 const g=field('5.0.6',500),t=g.active;g.config.friendlyFire=true;const ally={...g.tanks[1],id:2,team:t.team,hp:40,x:720};g.tanks.push(ally);let risk:any;
 for(let p=20;p<=45;p++){const r=shotSafety(g,t,'cannon-special',35,p);if(r.allies?.some(a=>a.damage>0)){risk=r;break;}}assert.ok(risk);assert.ok(risk.friendlyCost>risk.allies.reduce((n:number,a:any)=>n+a.damage,0));assert.ok(risk.allies.some((a:any)=>a.lethal));assert.equal(risk.unsafe,true);
});
test('near-shot AI preserves native1..9% solutions instead of silently raising them to10%',()=>{for(const version of ['5.0.5','5.0.6']){const g=field(version);(g as any).applyAIShot({angle:35,power:3,direction:1,weapon:'cannon-normal',target:1,utility:10,effective:true,x:g.active.x,y:g.active.y},3);assert.ok(version==='5.0.5'?g.active.power===10:g.active.power>2&&g.active.power<4);}});
test('salvo and double-shot overkill is capped at the enemy remaining HP/shield in the risk tradeoff',()=>{const g=field('5.0.6',500);g.active.vehicleId='dragon';g.active.doubleShot=true;g.tanks[1].hp=20;for(const power of [15,25,40]){const r=shotSafety(g,g.active,'dragon-special',35,power);assert.ok((r.enemyBenefit??0)<=20);}});
