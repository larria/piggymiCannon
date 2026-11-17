import test from 'node:test';import assert from 'node:assert/strict';
import {chooseAIPosition,solveAIShot,safeAIPositions,predictAIImpact,type AIShot} from '../src/ai-planner';
import {aiScenario,aiSampleCases,measureAIShot} from './ai-scenarios';
import {DIFFICULTIES} from '../src/catalog';
import {Terrain} from '../src/terrain';
import {benchmarkAIBattles} from './ai-benchmark';

function fireSolution(g:ReturnType<typeof aiScenario>,shot:AIShot){
 Object.assign(g.active,{angle:shot.angle,power:shot.power,direction:shot.direction});g.selected=shot.weapon;const hp=g.tanks.map(t=>t.hp);assert.ok(g.fire(true));
 for(let i=0;i<3600&&g.current===0&&g.phase!=='ended';i++)g.update(1/120);
 return hp.map((h,i)=>h-g.tanks[i].hp);
}
export function coveredShooter(difficulty:'easy'|'expert'='expert'){
 const g=aiScenario(difficulty,52,'valley',400,'cannon','4.0.4');for(let x=180;x<=420;x++)g.land.column(x,320,390,true);g.land.rebuild();
 g.active.x=250;g.active.y=432;g.tanks[1].x=650;g.tanks[3].x=1050;return g;
}
test('2v2 close shots search 10-22 power at several distances and both facings with damage switches off',()=>{
 for(const direction of [-1,1])for(const distance of [75,90,110,130,170]){
  const g=aiScenario('expert',52,'valley',distance,'cannon');g.active.x=direction===1?220:950;g.active.direction=direction;
  g.tanks[1].x=g.active.x+direction*distance;g.tanks[1].direction=-direction;
  g.tanks[2].x=direction===1?70:1130;g.tanks[3].x=direction===1?1180:70;g.tanks[3].crew='dad';g.tanks[3].hp=g.tanks[3].maxHP=g.tanks[1].hp;
  const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active));assert.equal(shot.target,1);assert.ok(shot.effective);
  assert.ok(shot.power>=10&&shot.power<22,`${direction}/${distance}: ${shot.power}`);
  const damage=fireSolution(g,shot);assert.ok(damage[1]>0,`${direction}/${distance}`);assert.equal(damage[0],0);assert.equal(damage[2],0);
 }
});
test('2v2 aim ignores an intervening ally only when friendly fire is off',()=>{
 const g=aiScenario('expert',52,'valley',130,'cannon');g.tanks[2].x=280;g.tanks[2].y=432;
 const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active));const damage=fireSolution(g,shot);assert.ok(damage[1]>0);assert.equal(damage[0],0);assert.equal(damage[2],0);
 const risky=aiScenario('expert',52,'valley',130,'cannon');risky.tanks[2].x=280;risky.config.friendlyFire=true;
 const p=predictAIImpact(risky,risky.active,'cannon-normal',shot.angle,shot.power);assert.ok(p.hits.find(h=>h.body.tank.id===2)!.body.eligible);
});
test('expert walks out of an overhead obstruction, spends fuel and re-aims; easy stays put',()=>{
 const g=coveredShooter(),roof=g.land.protectedMask.slice(),decision=chooseAIPosition(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active));
 assert.equal(decision.stay.effective,false);assert.equal(decision.best.effective,true);assert.ok(decision.best.x>g.active.x+60);
 g.active.aiCalibration={stableShots:3,disturbed:false};const fuel=g.active.fuel;g.config.timer=45;g.clock=45;g.planAI();g.aiTime=.8;const start=g.active.x;g.update(1/60);assert.ok(g.active.x>start&&g.active.x<decision.best.x);assert.equal(g.phase,'aiming');
 for(let i=0;i<600&&g.phase==='aiming';i++)g.update(1/60);
 assert.equal(g.phase,'flying');assert.ok(g.active.x>=decision.best.x-.2);assert.ok(g.active.fuel<fuel);assert.ok(g.active.movedThisTurn>60);assert.ok(g.aiTime>1.8);assert.ok(g.clock<45);
 assert.deepEqual(g.land.protectedMask,roof);for(let i=0;i<3600&&g.current===0;i++)g.update(1/120);assert.ok(g.tanks[1].hp<g.tanks[1].maxHP);
 const easy=coveredShooter('easy');measureAIShot(easy);assert.equal(easy.tanks[0].x,250);
});
test('AI candidate routes respect cliffs, overhead permanent layers, fuel, freeze, mines and other tanks',()=>{
 const g=coveredShooter(),t=g.active;t.fuel=10;const budget=t.moveDistance*.1;
 assert.ok(safeAIPositions(g,t).every(p=>Math.abs(p.x-t.x)<=budget+1e-6&&g.traversable(t,p.x)!==null));
 t.fuel=100;t.immobile=1;assert.deepEqual(safeAIPositions(g,t),[]);t.immobile=0;t.frozen=1;assert.ok(safeAIPositions(g,t).every(p=>Math.abs(p.x-t.x)<=t.moveDistance/2));t.frozen=0;
 g.tanks[2].x=330;assert.ok(safeAIPositions(g,t).every(p=>p.x<=274));
 g.tanks[2].x=70;g.land=new Terrain();for(let x=0;x<=1280;x++){g.land.column(x,550,554,true);if(x<310)g.land.column(x,450,480);}g.land.rebuild();t.x=250;t.y=432;
 assert.ok(safeAIPositions(g,t).every(p=>p.x<310));g.mines.push({x:280,y:447,owner:1,weapon:'mine-special',boost:1});assert.ok(safeAIPositions(g,t).some(p=>p.x>t.x),'enemy mine is hidden from route planning');g.mines[0].owner=t.id;g.config.selfDamage=true;assert.ok(safeAIPositions(g,t).every(p=>p.x<t.x),'known harmful mine is avoided');
});
test('team target selection can choose a farther reachable enemy over a nearer protected enemy',()=>{
 const g=aiScenario('expert',52,'valley',200,'cannon');g.active.x=300;g.tanks[1].x=500;g.tanks[1].y=532;g.tanks[3].x=900;
 g.land=new Terrain();for(let x=0;x<=1280;x++){g.land.column(x,x>=420&&x<=600?550:450,640,true);if(x>=450&&x<=560)g.land.column(x,350,460,true);}g.land.rebuild();
 assert.equal(g.enemy.id,1);const shot=solveAIShot(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active));assert.equal(shot.target,3);assert.ok(shot.effective);const damage=fireSolution(g,shot);assert.ok(damage[3]>0);
});
test('read-only prediction matches live first impact for ordinary, homing, helix and orbital shots',()=>{
 for(const weapon of ['cannon-normal','missile-special','laser-special','ion-special'] as const){
  const g=aiScenario('expert',52,'valley',320,'cannon'),t=g.active;t.angle=30;t.power=30;t.direction=1;
  const revision=g.land.revision,events=g.events.length,hp=g.tanks.map(t=>t.hp),p=predictAIImpact(g,t,weapon);
  assert.equal(g.land.revision,revision);assert.equal(g.events.length,events);assert.deepEqual(g.tanks.map(t=>t.hp),hp);assert.equal(t.shots,0);assert.equal(g.projectiles.length,0);
  let impact:{x:number;y:number}|null=null;const old=(g as any).explode.bind(g);(g as any).explode=(p:any,d?:number)=>{impact??={x:p.x,y:p.y};old(p,d);};g.projectiles=[g.launch(t,weapon)];g.phase='flying';
  for(let i=0;i<2000&&!impact;i++)g.update(1/120);assert.ok(impact,weapon);assert.ok(Math.hypot(p.x-impact.x,p.y-impact.y)<4,`${weapon}: ${JSON.stringify([p.x,p.y,impact])}`);
 }
});
test('fixed 960-action FIRST-shot corpus: reduced opening accuracy, observable failures and difficulty grades',()=>{
 const cases=aiSampleCases();assert.equal(cases.length,240);assert.equal(new Set(cases.map(c=>c.seed)).size,240);
 const report:any={protocol:'v1',shotsPerLevel:240,uniqueSeeds:240,criterion:'direct or >=max(30,5% victim maxHP) enemy HP/shield loss in one completed action; all cases retained; no fog; 2v2; self/friendly off',levels:{}};
 for(const d of DIFFICULTIES){let effective=0,direct=0,moved=0,nearest=0,intentional=0;const breakdown:any={};
  for(const c of cases){
   const shot=measureAIShot(aiScenario(d.id,c.seed,c.map,c.distance,c.vehicle));effective+=+shot.effective;direct+=+shot.direct;moved+=+(shot.moved>2);nearest+=+shot.nearestHit;intentional+=+(shot.decision?.intentionalMiss??false);
   const key=c.distance?'flat-'+c.distance:c.map,b=breakdown[key]??={n:0,hits:0};b.n++;b.hits+=+shot.effective;
  }
  report.levels[d.id]={effective,direct,moved,nearest,intentional,rate:effective/240,breakdown};
 }
 console.log('AI accuracy report',JSON.stringify(report));const levels=report.levels;
 // Opening shots intentionally have less calibration than the stable corpus below.
 // No geometric, damage or collision rule is softened to create a hit.
 assert.ok(levels.expert.rate>=.64&&levels.expert.rate<=.77,JSON.stringify(levels.expert));assert.ok(240-levels.expert.effective>=25);
 assert.ok(levels.easy.rate<.55);assert.ok(levels.normal.rate-levels.easy.rate>=.06);assert.ok(levels.hard.rate-levels.normal.rate>=.06);assert.ok(levels.expert.rate-levels.hard.rate>=.06);
 assert.ok(levels.expert.moved>0);assert.equal(levels.easy.moved,0);assert.equal(levels.normal.moved,0);
});
test('expert all-AI team battle finishes with ordinary rotation and finite state',()=>{
 const g=aiScenario('expert',52,'factory');g.tanks.forEach(t=>t.controller='ai');g.config.slots.forEach(s=>s.controller='ai');
 for(let i=0;i<30000&&g.phase!=='ended';i++)g.update(1/30);
 assert.equal(g.phase,'ended');assert.ok(g.tanks.every(t=>Number.isFinite(t.hp)&&Number.isFinite(t.x)&&t.fuel>=0));assert.ok(g.tanks.every(t=>t.shots>0||t.hp===0));assert.equal(g.delayEnabled,false);
});
test('fog planning uses remembered approximate positions rather than live hidden coordinates',()=>{
 const plans=[];
 for(const shift of [0,200]){
  const g=aiScenario('expert',52,'valley',400,'cannon');g.fog=true;g.tanks[1].x+=shift;g.tanks[3].x-=shift;
  g.planAI();plans.push({angle:g.active.angle,power:g.active.power,direction:g.active.direction,decision:g.aiDecision});
 }
 assert.deepEqual(plans[0],plans[1]);
});
test('a ceiling requiring two turns produces safe progress without borrowing fuel',()=>{
 const g=coveredShooter();for(let x=421;x<=560;x++)g.land.column(x,320,390,true);g.land.rebuild();g.tanks[1].x=900;g.tanks[3].x=1180;
 const plan=chooseAIPosition(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active));assert.equal(plan.stay.effective,false);assert.equal(plan.best.effective,false);assert.ok(plan.best.x>g.active.x+60);assert.ok(plan.best.x-g.active.x<=g.active.moveDistance);assert.equal(g.active.fuel,100);
 const direction=Math.sign(plan.best.x-g.active.x);while(Math.abs(plan.best.x-g.active.x)>.1)assert.ok(g.move(direction,Math.min(1/60,Math.abs(plan.best.x-g.active.x)/g.active.moveSpeed),true));
 g.nextTurn();while(g.current!==0)g.nextTurn();assert.equal(g.active.fuel,100);const next=chooseAIPosition(g,g.active,['cannon-normal','cannon-special'],g.opponents(g.active));assert.ok(next.best.effective);assert.ok(Math.abs(next.best.x-g.active.x)<=g.active.moveDistance);assert.equal(g.active.y,432);
});
test('an AI route interrupted by a collapsing floor waits for landing and recomputes power',()=>{
 const g=coveredShooter();g.land=new Terrain();for(let x=0;x<=1280;x++){g.land.column(x,450,480);g.land.column(x,550,554,true);if(x>=180&&x<=420)g.land.column(x,320,390,true);}g.land.rebuild();g.planAI();g.aiTime=.8;const oldPower=g.active.power;
 g.crater(274,450,50,80);assert.ok(g.active.fallVelocity>0);
 for(let i=0;i<200&&g.active.fallVelocity>0;i++){g.update(1/120);assert.notEqual(g.phase,'flying');}
 assert.equal(g.active.y,532);for(let i=0;i<200&&g.phase==='aiming';i++)g.update(1/120);
 assert.equal(g.phase,'flying');assert.ok(Math.abs(g.active.power-oldPower)>1);assert.ok(g.projectiles.every(p=>p.y>480));
});

test('36 complete all-AI matches include weaker openings and disturbed poses while all games finish',()=>{
 const report=benchmarkAIBattles();console.log('AI complete battle report',JSON.stringify(report));
 assert.equal(report.unfinished,0);assert.equal(report.games,36);assert.ok(report.shots>=350);assert.ok(report.rate>=.60&&report.rate<=.79,JSON.stringify(report));assert.ok(report.shots-report.hits>=70);assert.ok(report.moves>=20);
});
test('mid and long range solutions still hit through headwind and tailwind',()=>{
 for(const distance of [220,400,650,900])for(const wind of [-12,0,12]){
  const g=aiScenario('expert',52,'valley',distance,'cannon');g.wind=wind;
  const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active));assert.ok(shot.power>=10&&shot.power<=100);assert.ok(shot.angle>=g.active.minAngle&&shot.angle<=g.active.maxAngle);
  const damage=fireSolution(g,shot);assert.ok(damage[1]+damage[3]>0,`${distance}/${wind}`);assert.equal(damage[0],0);assert.equal(damage[2],0);
 }
});
test('a close-range deliberate lapse still faces a known enemy rather than an empty side',()=>{
 const g=aiScenario('expert',52,'valley',130,'cannon');const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active),-300,true,true,1);
 assert.equal(shot.direction,1);assert.ok(shot.angle>=25&&shot.angle<=45);assert.ok(shot.power>=10&&shot.power<=100);assert.equal(shot.effective,false);
});

test('240 seeded stable expert shots approach the 77 percent ceiling and outperform opening shots',()=>{
 const cases=aiSampleCases();let hits=0,direct=0;for(const c of cases){const g=aiScenario('expert',c.seed,c.map,c.distance,c.vehicle);g.active.aiCalibration={stableShots:3,disturbed:false};const shot=measureAIShot(g);hits+=+shot.effective;direct+=+shot.direct;}
 const rate=hits/cases.length;console.log('AI stable calibration report',JSON.stringify({shots:cases.length,hits,direct,rate}));assert.ok(rate>=.73&&rate<=.80);assert.ok(cases.length-hits>=45);
});
