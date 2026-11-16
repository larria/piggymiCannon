import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Game,type Crate} from '../src/engine';import {defaultSlots} from '../src/crew';import {BattleCamera} from '../src/camera';
import {supplyCameraTarget,SUPPLY_APPROACH_SECONDS,SUPPLY_LANDING_SECONDS} from '../src/supply-camera';
import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
const ready=(version='3.2.4')=>{const g=new Game({slots:defaultSlots().map(s=>({...s,controller:'human'})),map:'factory',seed:52,timer:45,fog:false,fireLine:false},version);g.start();g.turn=4;g.nextTurn();assert.equal(g.phase,'supply');return g;};
function visible(c:Crate,camera:{x:number;y:number},w=1280,h=500){assert.ok(c.x-36>=camera.x&&c.x+36<=camera.x+w,JSON.stringify({c,camera}));assert.ok(c.y-(c.falling?68:10)>=camera.y&&c.y+25<=camera.y+h,JSON.stringify({c,camera}));}
test('supply framing includes remote X, complete parachutes and simultaneous drops without changing zoom',()=>{
 for(const actor of [{x:100,y:600},{x:1800,y:600}])for(const boxes of [[{x:40,y:-50,falling:true}],[{x:1880,y:900,falling:true}],[{x:420,y:220,falling:true},{x:1420,y:310,falling:true}]]){
  const camera=new BattleCamera();camera.configure(1280,500);const target=supplyCameraTarget(boxes,actor,1280,500);camera.update(1,target);boxes.forEach(c=>visible(c,camera));
 }
});
test('oversized drop groups are visited rather than framing empty space',()=>{
 const boxes=[{x:80,y:100,falling:true},{x:1840,y:800,falling:true}],actor={x:900,y:400};
 for(const [time,index] of [[0,0],[1.4,1],[2.8,0]]){const c=new BattleCamera();c.configure(1280,500);c.update(1,supplyCameraTarget(boxes,actor,1280,500,time));visible(boxes[index],c);}
});
test('approach moves the camera before descent; entire remote fall and settling stay visible',()=>{
 const g=ready(),box=g.crates.find(c=>c.falling)!;box.x=1600;g.active.x=100;g.active.y=g.ground(100)-18;
 const camera=new BattleCamera();camera.configure(1280,500);camera.center(g.active.x,g.active.y,false);
 const target=supplyCameraTarget([box],g.active,1280,500);camera.center(target.x+640,target.y+250);camera.manual=null;
 let seen=0;
 for(let i=0;i<650&&g.phase==='supply';i++){g.update(1/60);camera.update(1/60,supplyCameraTarget([box],g.active,1280,500));if(g.supplyObservation?.approach===0){visible(box,camera);seen++;}}
 assert.ok(seen>100);assert.equal(box.falling,false);assert.equal(g.phase,'aiming');assert.equal(g.clock,45);
});
test('approach, landing display and AI clock freeze on pause and tour; no extra hazard damage',()=>{
 const g=ready(),box=g.crates.find(c=>c.falling)!,start={x:box.x,y:box.y};
 g.paused=true;g.update(.05);assert.equal(g.supplyObservation?.approach,SUPPLY_APPROACH_SECONDS);assert.deepEqual({x:box.x,y:box.y},start);
 g.paused=false;g.introLocked=true;g.update(.05);assert.deepEqual({x:box.x,y:box.y},start);g.introLocked=false;
 g.fires.push({x:g.active.x,y:g.active.y+18,radius:100,owner:0,weapon:'napalm',clock:0,turns:3});const hp=g.active.hp,action=g.active.actionTime;
 for(let i=0;i<500&&box.falling;i++)g.update(.01);assert.equal(box.falling,false);assert.equal(g.phase,'supply');const landed=g.elapsed;
 g.paused=true;for(let i=0;i<100;i++)g.update(.05);assert.equal(g.elapsed,landed);g.paused=false;
 while(g.phase==='supply')g.update(.01);assert.ok(g.elapsed-landed>=SUPPLY_LANDING_SECONDS-.02);assert.ok(g.elapsed-landed<=SUPPLY_LANDING_SECONDS+.02);assert.equal(g.active.hp,hp);assert.equal(g.active.actionTime,action);assert.equal(g.clock,45);
});
test('all simultaneous boxes land before the display timer starts; old landed boxes are excluded',()=>{
 const g=ready(),c=g.crates[0];g.crates.push({x:1300,y:-250,falling:true,vy:80,vx:0,type:'double'},{x:500,y:400,type:'medical'});g.supplyObservation!.crates=[0,1];
 for(let i=0;i<1000&&c.falling;i++)g.update(.01);assert.equal(g.phase,'supply');assert.ok(g.crates[1].falling);
 while(g.crates[1].falling)g.update(.01);const landed=g.elapsed;while(g.phase==='supply')g.update(.01);assert.ok(g.elapsed-landed>.9);assert.equal(g.supplyObservation,null);
});
test('snapshots and new recordings preserve approach, falling and landed observation state',()=>{
 for(const stage of ['approach','falling','landed']){
  const g=ready();if(stage==='falling')for(let i=0;i<80;i++)g.update(.01);if(stage==='landed')while(g.crates.some(c=>c.falling))g.update(.01);
  const copy=Game.fromBattleSnapshot(g.battleSnapshot());assert.deepEqual(copy.supplyObservation,g.supplyObservation);assert.equal(replayDigest(copy),replayDigest(g));
  const recorder=new ReplayRecorder(g);for(let i=0;i<600;i++){g.update(.01);copy.update(.01);}assert.equal(replayDigest(copy),replayDigest(g));
  const p=new ReplayPlayer(recorder.export());for(let i=0;i<1000&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);recorder.detach();
 }
});
test('actual v3.2.3 recording keeps original supply physics, settling and digest',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/supply-v3.2.3.json',import.meta.url),'utf8'));assert.equal(old.gameVersion,'3.2.3');assert.ok(!('supplyObservation' in old.initial.current));
 const p=new ReplayPlayer(old);for(let i=0;i<1000&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);assert.ok(!('supplyObservation' in p.game.battleSnapshot().current));
 const g=ready('3.2.3'),c=g.crates[0],y=c.y;g.update(.01);assert.ok(c.y>y);assert.equal(g.supplyObservation,null);
});
