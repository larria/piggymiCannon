import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,FLIGHT_SPEED} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {Terrain} from '../src/terrain';
import {lowestProjectile} from '../src/camera';
import {ReplayPlayer,ReplayRecorder} from '../src/replay';
import {DOUBLE_SHOT_INTERVAL} from '../src/salvo';

function ready(vehicle:'multi'|'missile',version='5.1.6'){
 const slots=defaultSlots();slots[0].vehicle=vehicle;slots[1].vehicle='cannon';slots[1].controller='human';
 const g=new Game({slots,map:'factory',seed:52,timer:0,fireLine:false,fog:false},version);
 g.start();g.land=new Terrain(g.worldWidth,g.worldHeight);
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,600,g.worldHeight,true);
 g.land.rebuild();g.wind=0;
 g.tanks.forEach((t,i)=>Object.assign(t,{x:i?1250:190,y:582,fallVelocity:0}));
 return g;
}

test('Meteor special departs in three spaced banks, retains the lowest airborne camera target and doubles the entire cadence',()=>{
 const game=ready('multi');game.selected='multi-special';game.active.doubleShot=true;game.setAim(45,40);
 const startTime=game.elapsed,recorder=new ReplayRecorder(game);
 assert.ok(game.fire());
 const salvo=game.projectiles.slice(0,9),echo=game.projectiles.slice(9);
 assert.equal(salvo.filter(p=>p.delay===0).length,1);
 assert.equal(lowestProjectile(game.projectiles),salvo[0]);
 assert.equal(new Set(salvo.map(p=>`${p.vx}/${p.vy}`)).size,9);
 assert.ok(salvo[8].delay/FLIGHT_SPEED>.285&&salvo[8].delay/FLIGHT_SPEED<.3);
 for(let i=0;i<9;i++)assert.ok(Math.abs((echo[i].delay-salvo[i].delay)/FLIGHT_SPEED-DOUBLE_SHOT_INTERVAL)<1e-9);
 for(let i=0;i<128;i++)game.update(.01);
 const stages=game.battleSnapshot().events.filter(e=>e.type==='salvo-launch');
 assert.equal(stages.length,16);assert.ok(stages.every((e,i)=>i===0||e.time>stages[i-1].time));
 assert.ok(stages[7].time-startTime<.31);assert.ok(stages[15].time-startTime>1);
 assert.equal(game.drainEvents().filter(e=>e.type==='shot').length,2);
 const replay=new ReplayPlayer(recorder.export());recorder.detach();
 for(let i=0;i<100&&!replay.done;i++)replay.advance(.03);
 assert.equal(replay.verified,true);
 const old=ready('multi','5.1.5');old.selected='multi-special';assert.ok(old.fire());assert.ok(old.projectiles.every(p=>p.delay===0));
});

test('each Flyfire contact emits four real explosion cues on both a tank and bare permanent land',()=>{
 for(const tankHit of [true,false]){
  const game=ready('missile'),target=game.tanks[1];assert.ok(game.fire());game.drainEvents();
  Object.assign(game.projectiles[0],{x:1250,y:tankHit?target.y-34:592,vx:0,vy:500,age:2});
  if(!tankHit)target.x+=300;
  for(let i=0;i<160&&game.projectiles.length;i++)game.update(.005);
  const impacts=game.battleSnapshot().events.filter(e=>e.type==='impact');
  assert.deepEqual(impacts.map(e=>e.data.section),[1,2,3,4]);
  assert.equal(new Set(impacts.map(e=>e.data.y)).size,1);
  assert.equal(game.drainEvents().filter(e=>e.type==='explosion'&&e.weapon==='missile-normal').length,4);
  if(tankHit){
   const damage=game.battleSnapshot().events.filter(e=>e.type==='damage'&&e.data.target===1).map(e=>e.data.actual);
   assert.equal(damage.length,4);assert.ok(damage.every((n,i)=>n>0&&(i===0||n<damage[i-1])));
  }else assert.equal(target.hp,target.maxHP);
 }
});
