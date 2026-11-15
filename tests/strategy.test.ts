import {Game} from './legacy-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FLIGHT_SPEED,WATER_Y,makeRng} from '../src/engine.ts';
import {Terrain} from '../src/terrain.ts';
import {WEAPONS,DIFFICULTIES,excavation,aiAimOffset} from '../src/catalog.ts';
import {compareVersions} from '../src/version.ts';
import {breathingPose} from '../src/feedback.ts';
import {rollWeather} from '../src/weather.ts';
const ready=(config={})=>{const g=new Game({seed:52,timer:0,...config});g.start();return g;};
const run=(g:Game,seconds:number)=>{for(let i=0;i<seconds*120;i++) g.update(1/120);};

test('bridge and sky terrains have real empty space below solid platforms',()=>{
  const bridge=ready({map:'coast'}),sky=ready({map:'moon'});
  assert.ok(bridge.land.solid(175,bridge.ground(175)+10));assert.equal(bridge.land.solid(175,570),false);
  assert.ok(sky.ground(630)<250);assert.equal(sky.land.solid(630,380),false);
  assert.ok(sky.ground(630,380)>400);assert.ok(sky.land.solid(630,460));
});
test('excavating a bridge foundation drops a full-health enemy for a win',()=>{
  const g=ready({map:'coast'}),enemy=g.enemy;g.crater(enemy.x,g.ground(enemy.x)+20,65,180);
  run(g,4);assert.equal(enemy.hp,0);assert.equal(g.phase,'ended');assert.equal(g.winner,0);
});
test('a falling tank can land on a lower sky island without snapping to an upper floor',()=>{
  const g=ready({map:'moon'}),t=g.active;t.x=630;t.y=g.ground(630)-18;
  const lower=g.ground(630,380);g.crater(630,g.ground(630),110,160);run(g,4);
  assert.ok(t.hp>0&&t.hp<150);assert.ok(Math.abs(t.y+18-lower)<10);assert.ok(t.y+18<WATER_Y);
});
test('tanks cannot climb steep slopes or cross a narrow pit with a large movement step',()=>{
  const g=ready();g.land=new Terrain();g.terrain=g.land.surface;
  for(let x=0;x<=1280;x++) g.land.column(x,x<200?420:420-(x-200)*2.5,640);
  g.land.rebuild();g.active.x=196;g.active.y=402;
  assert.equal(g.move(1,0.1),false);assert.equal(g.active.x,196);
  const pit=ready({map:'coast'});pit.active.x=540;pit.active.y=pit.ground(540)-18;
  pit.crater(567,pit.ground(567),18,75);
  for(let i=0;i<20;i++) pit.move(1,0.25);
  assert.ok(pit.active.x<567);
});

const walkingCourse=(height:(x:number)=>number)=>{
 const g=ready();g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,height(x),640);g.land.rebuild();g.active.x=200;g.active.y=g.ground(200)-18;return g;
};
test('smooth reasonable slopes climb in both directions, including quantized 35-degree ground',()=>{
 for(const angle of [15,25,30,35])for(const direction of [-1,1]){
  const grade=Math.tan(angle*Math.PI/180),g=walkingCourse(x=>450-direction*(x-200)*grade);
  for(let i=0;i<30;i++){assert.ok(g.move(direction,.04),`${angle} degrees, ${direction}, step ${i}`);g.update(.01);assert.equal(g.active.fallVelocity,0);}
  assert.ok(Math.abs(g.active.x-200)>70);assert.ok(g.active.y<432);assert.ok(g.active.fuel<100);
 }
});
test('isolated 8-12 pixel ledges and reasonable staircases do not trap the treads',()=>{
 for(const height of [8,12])for(const direction of [-1,1]){
  const g=walkingCourse(x=>450-(direction*(x-230)>0?height:0));
  if(direction<0){g.active.x=260;g.active.y=g.ground(260)-18;}
  const from=g.active.x;for(let i=0;i<30;i++)assert.ok(g.move(direction,.04));assert.ok(Math.abs(g.active.x-from)>70);
 }
 const stairs=walkingCourse(x=>450-Math.max(0,Math.floor((x-220)/12))*6);for(let i=0;i<30;i++)assert.ok(stairs.move(1,.04));
 const rounded=walkingCourse(x=>450-Math.max(0,Math.min(12,x-225)));for(let i=0;i<30;i++)assert.ok(rounded.move(1,.04));
});
test('upward ledges and steep ramps remain blocked, collapsed edges allow descent',()=>{
 for(const angle of [65,70,80]){const g=walkingCourse(x=>450-(x-200)*Math.tan(angle*Math.PI/180));const from=g.active.x;assert.equal(g.move(1,.1),false);assert.equal(g.active.x,from);}
 const wall=walkingCourse(x=>450-(x>225?20:0));for(let i=0;i<20;i++)wall.move(1,.1);assert.ok(wall.active.x<225);
 const gap=walkingCourse(x=>x>225&&x<255?640:450);for(let i=0;i<20;i++)gap.move(1,.1);assert.ok(gap.active.x>225);assert.ok(gap.active.fallVelocity>0);
});
test('walking on a lower sky floor never snaps up to an overhead island',()=>{
 const g=walkingCourse(()=>510);for(let x=100;x<=400;x++)g.land.column(x,250,290);g.land.rebuild();g.active.y=492;
 for(let i=0;i<20;i++)assert.ok(g.move(1,.04));assert.equal(g.active.y,492);
});

test('descending valid slopes and small steps stays grounded even with large movement frames',()=>{
 for(const direction of [-1,1]){
  const g=walkingCourse(x=>450+direction*(x-200)*Math.tan(35*Math.PI/180));
  for(let i=0;i<8;i++){assert.ok(g.move(direction,.25));assert.equal(g.active.fallVelocity,0);g.update(.01);}
  assert.ok(g.active.y>432);assert.equal(g.active.hp,150);
 }
 const step=walkingCourse(x=>450+(x>230?12:0));for(let i=0;i<30;i++){assert.ok(step.move(1,.04));assert.equal(step.active.fallVelocity,0);}
});
test('all weapons separate blast damage from excavation and dig more on a ground hit',()=>{
  const profiles=new Set<string>();
  for(const w of WEAPONS) {
    const direct=excavation(w.id,true),miss=excavation(w.id,false);
    assert.ok(miss.radius>direct.radius&&miss.depth>direct.depth);
    profiles.add(`${w.digRadius},${w.digDepth}`);
  }
  assert.equal(profiles.size,13);assert.ok(excavation('quake',false).radius>excavation('heavy',false).radius);
  assert.ok(excavation('drill',false).depth>excavation('shell',false).depth);
  assert.ok(excavation('emp',false).depth<excavation('shell',false).depth);
});
test('four starting items share one use and stay depleted across own actions',()=>{
 const g=ready(),t=g.active;assert.equal(g.itemUnavailable('teleport'),null);assert.equal(g.itemUnavailable('boost'),null);
 assert.ok(g.useItem('boost'));assert.equal(g.useItem('double'),false);assert.equal(g.useItem('teleport'),false);
 g.nextTurn();assert.equal(t.items.boost,0);g.nextTurn();assert.equal(t.items.boost,0);assert.ok(g.useItem('double'));
});
test('turn-scoped firepower cannot be stockpiled by skipping a turn',()=>{
  const g=ready();g.nextTurn();g.nextTurn();assert.ok(g.useItem('boost'));g.skipTurn();assert.equal(g.tanks[0].boost,false);
});
test('projectile playback is accelerated while the aim timer remains real time',()=>{
  assert.equal(FLIGHT_SPEED,1.8);const g=ready({timer:45});run(g,1);assert.ok(Math.abs(g.clock-44)<0.01);
  const p=g.launch(g.active,'shell');g.fire();const initial=g.projectiles[0].x;
  run(g,0.1);assert.ok(g.projectiles[0].x-initial>p.vx*0.1*1.6);
});
test('every AI level, including expert, retains substantial intentional misses',()=>{
  for(const d of DIFFICULTIES) {
    const rng=makeRng(55);let misses=0;
    for(let i=0;i<1000;i++) {const aim=aiAimOffset(d.id,'heavy',rng);if(aim.miss) {misses++;assert.ok(Math.abs(aim.offset)>100);}}
    assert.ok(misses>100&&misses<650,d.id);
  }
  assert.equal(ready().tanks[1].difficulty,'easy');
});
test('version checks compare semantic version numbers instead of cached strings',()=>{
  assert.equal(compareVersions('1.10.0','1.9.8'),1);assert.equal(compareVersions('1.1.0','1.1.0'),0);
  assert.equal(compareVersions('1.0.9','1.1.0'),-1);assert.throws(()=>compareVersions('unknown','1.1.0'));
});
test('breathing uses thirty-percent health and visibly changes pose over time',()=>{
  assert.equal(breathingPose(50,1).active,false);assert.equal(breathingPose(0,1).active,false);
  const a=breathingPose(45,0),b=breathingPose(45,0.4);
  assert.equal(a.active,true);assert.notEqual(a.bob,b.bob);assert.notEqual(a.mouth,b.mouth);
});
test('fog and fire lines are independently rolled with one in thirty probability',()=>{
  const rng=makeRng(508);let fog=0,fire=0;
  for(let i=0;i<30000;i++) {const w=rollWeather(rng);fog+=Number(w.fog);fire+=Number(w.fireLine);}
  assert.ok(fog>850&&fog<1150);assert.ok(fire>850&&fire<1150);
  const g=ready({fog:true,fireLine:true});assert.ok(g.fog&&g.fireLine);
});
test('fire-line crossing boosts a shell only once even if it crosses back',()=>{
  const g=ready({fireLine:true});g.active.x=175;g.active.y=g.ground(175)-18;g.fireLine={x:230,top:0,bottom:570};g.active.angle=5;g.active.power=50;g.fire();
  for(let i=0;i<80&&!g.projectiles[0]?.fireBoosted;i++) g.update(1/120);
  const p=g.projectiles[0];assert.ok(p?.fireBoosted);assert.equal(p.boost,1.5);
  p.x=231;p.vx=-80;g.update(0.04);assert.equal(p.boost,1.5);
});
test('supply animation pauses the turn clock and drops on reachable stable ground near the human',()=>{
  for(const map of ['valley','coast','moon','factory','temple','egypt'] as const) {
    const g=ready({map,timer:45});g.turn=4;g.nextTurn();assert.equal(g.phase,'supply',map);
    const c=g.crates.find(c=>c.falling)!;assert.ok(c);
    const clock=g.clock,start=c.x;
    for(let i=0;i<1000&&g.phase==='supply';i++) g.update(1/120);
    assert.equal(g.clock,clock);assert.equal(c.falling,false);assert.ok(g.stablePlatform(c.x));
    assert.ok(g.traversable(g.tanks[0],c.x)!==null);assert.ok(Math.abs(c.x-g.tanks[0].x)<=(g.tanks[0].fuel+36)/0.33);
    assert.ok(c.x>=40&&c.x<=1240);if(Math.abs(g.wind)>1) assert.ok(Math.abs(c.x-start)>1);
    assert.ok(g.log.some(line=>line.includes('已落地')));
  }
});
test('supplies top up double fire and grant rare homing ammunition',()=>{
  const g=ready(),t=g.active;assert.equal(t.items.double,1);assert.equal(t.ammo.homing,0);
  t.items.boost=0;g.crates.push({x:t.x,y:t.y,type:'double'},{x:t.x,y:t.y,type:'homing'});run(g,0.03);
  assert.equal(t.items.double,1);assert.equal(t.ammo.homing,1);
  g.nextTurn();g.nextTurn();assert.ok(g.useItem('double'));g.fire();assert.equal(g.projectiles.length,2);assert.equal(t.items.double,0);
});
test('the rare homing shell acquires a nearby enemy during its descent',()=>{
  const g=ready();g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.tanks.forEach((t,i)=>{t.x=i?900:200;t.y=432;t.fallVelocity=0;});const target=g.enemy,p=g.launch(g.active,'homing');
  Object.assign(p,{x:target.x-90,y:target.y-65,vx:80,vy:130,age:0.2});
  g.projectiles=[p];g.phase='flying';g.update(0.04);assert.equal(p.homing,true);
  run(g,2);assert.ok(target.hp<150);
});
test('terrain tilt rotates body-relative aiming and impact reactions stay distinct',()=>{
  const g=ready(),t=g.active;t.x=260;t.y=g.support(t.x,g.ground(t.x))-18;
  const slope=g.tankSlope(t);assert.ok(Math.abs(slope)>0.01);
  const muzzle=g.muzzle(t,45),pivot={x:t.x+Math.sin(slope)*13,y:t.y-Math.cos(slope)*13};
  const a=g.aim(t,45);assert.ok(Math.abs(muzzle.x-pivot.x-a.x*31)<0.001);assert.ok(Math.abs(muzzle.y-pivot.y-a.y*31)<0.001);
  g.damage(t,10,1,false,'direct');assert.equal(t.reaction?.kind,'direct');
  g.damage(t,1,1,false,'graze');assert.equal(t.reaction?.kind,'graze');
  g.damage(t,10,1,true,'fall');assert.equal(t.reaction?.kind,'fall');
});
