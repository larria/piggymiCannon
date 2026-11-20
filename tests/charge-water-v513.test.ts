import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {VEHICLES} from '../src/vehicles';
import {predictAIImpact} from '../src/ai-planner';
import {weaponBlastRadius} from '../src/catalog';
import {waterFlightSize,waterFootprint} from '../src/water-flight';
import {ReplayRecorder,ReplayPlayer} from '../src/replay';

const old='5.1.2',current='5.1.3';
function game(version:string,map:'coast'|'moon'='coast'){
 const slots=defaultSlots();Object.assign(slots[0],{controller:'human',vehicle:'water'});Object.assign(slots[1],{controller:'human',vehicle:'bowl'});
 const g=new Game({map,slots,seed:52,timer:0},version);g.start();g.wind=0;g.fog=false;g.fireLine=null;g.config.snow=false;return g;
}

test('all 26 native weapons raise their full-charge launch speed by 20% on both gravity profiles while taps stay the same',()=>{
 for(const map of ['coast','moon'] as const){
  const a=game(old,map),b=game(current,map);
  for(const v of VEHICLES)for(const weapon of [v.normal,v.special]){
   for(const g of [a,b])Object.assign(g.active,{vehicleId:v.id,angle:35,direction:1,hp:g.active.maxHP});
   for(const [power,ratio] of [[1,1],[100,1.2]]){
    for(const g of [a,b])g.active.power=power;
    const first=a.launch(a.active,weapon),next=b.launch(b.active,weapon);
    assert.ok(Math.abs(Math.hypot(next.vx,next.vy)/Math.hypot(first.vx,first.vy)-ratio)<1e-12,`${map}/${weapon}/${power}`);
    assert.equal(next.scale,first.scale);assert.equal(next.boost,first.boost);
   }
  }
 }
});

test('purple water keeps its source radius, integer falloff and freeze boundary despite halving the flight art',()=>{
 for(const version of [old,current]){
  assert.ok(Math.abs(weaponBlastRadius('water-special',version)-144.21858)<.001);
  for(const [offset,loss] of [[0,212],[96,70],[141,4],[144,0],[174,0]]){
   const g=game(version),e=g.enemy;Object.assign(e,{x:1200,y:600,hp:950});
   g.explode({...g.launch(g.active,'water-special'),x:e.x+offset,y:e.y-33},offset===0?e.id:undefined);
   assert.equal(950-e.hp,loss,`${version}/${offset}`);assert.equal(e.immobile,loss>0?1:0);
  }
 }
 for(const weapon of ['water-normal','water-special'] as const){
  const {halfWidth,height}=waterFlightSize(weapon,old);
  assert.deepEqual(waterFlightSize(weapon,current),{halfWidth:halfWidth/2,height:height/2});
  assert.deepEqual(waterFootprint(weapon,current),waterFootprint(weapon,old));
 }
});

test('AI preview and live flight use the same expanded charge, and both versions replay their own shot',()=>{
 for(const version of [old,current]){
  const g=game(version),r=new ReplayRecorder(g);
  g.setAim(35,34);const predicted=predictAIImpact(g,g.active,'water-normal');assert.ok(g.fire());
  for(let i=0;i<600&&g.projectiles.length;i++)g.update(1/180);
  assert.equal(g.projectiles.length,0);
  const impact=g.battleSnapshot().events.find(e=>e.type==='impact');assert.ok(impact);
  assert.ok(Math.hypot(predicted.x-impact.data!.x,predicted.y-impact.data!.y)<6);
  const replay=new ReplayPlayer(r.export());for(let i=0;i<1500&&!replay.done;i++)replay.advance(.02);
  assert.equal(replay.verified,true,version);r.detach();
 }
});
