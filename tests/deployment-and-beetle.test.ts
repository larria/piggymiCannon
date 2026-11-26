import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {MAPS} from '../src/catalog';
import {Terrain} from '../src/terrain';
import {fixedAnglePredictor} from '../src/ai-planner';
import {ReplayRecorder,ReplayPlayer,parseReplayFile,exportReplay} from '../src/replay';
import {minimumStartingSpan} from '../src/starting-tanks';

const version='6.0.1',oldVersion='6.0.0';
const crews=(count:number)=>defaultSlots().map((s,i)=>({...s,enabled:i<count,controller:'human' as const,team:i,vehicle:'beetle' as const}));
const span=(xs:number[])=>Math.max(...xs)-Math.min(...xs);
const coordinates=(g:Game)=>g.tanks.map(t=>[t.x,t.y]);

test('four tanks start spread out on playable platforms across every map',()=>{
 for(const {id:map} of MAPS)for(const seed of [1,7,29,52,210]){
  const g=new Game({map,seed,slots:crews(4)},version),width=g.worldWidth;
  const xs=g.tanks.map(t=>t.x).sort((a,b)=>a-b);
  assert.ok(span(xs)>=minimumStartingSpan(width),`${map}, seed ${seed}: ${xs}`);
  assert.ok(xs.slice(1).every((x,i)=>x-xs[i]>=90));
  assert.ok(g.tanks.every(t=>g.stablePlatform(t.x)&&g.ground(t.x)===t.y+18));
  if(map==='moon'||map==='temple')assert.ok(g.tanks.every(t=>t.y+18<=g.worldHeight*.7));
 }
 const config={map:'coast' as const,seed:29,slots:crews(4)};
 const old=new Game(config,oldVersion),live=new Game(config,version);
 assert.ok(span(old.tanks.map(t=>t.x))<minimumStartingSpan(live.worldWidth),'fixture must reproduce the crowded opening');
 assert.equal(coordinates(live).filter(([x,y],i)=>x===old.tanks[i].x&&y===old.tanks[i].y).length,3,'keep the remaining close group');
 assert.deepEqual(coordinates(live),coordinates(new Game(config,version)));
 for(const count of [2,3]){
  const config={map:'coast' as const,seed:29,slots:crews(count)};
  assert.deepEqual(coordinates(new Game(config,version)),coordinates(new Game(config,oldVersion)));
 }
});

function firingField(gameVersion:string,direction:number,wind:number,angle=40,power=57){
 const g=new Game({map:'factory',slots:crews(2),seed:12},gameVersion);
 g.start();g.land=new Terrain(g.worldWidth,g.worldHeight);g.terrain=g.land.surface;
 // Flat permanent ground isolates dispersion from one pellet opening a crater for another.
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,800,g.worldHeight,true);
 g.land.rebuild();
 Object.assign(g.active,{x:direction>0?400:g.worldWidth-400,y:782,direction});
 Object.assign(g.tanks[1],{x:direction>0?80:g.worldWidth-80,y:782});
 g.wind=wind;g.selectWeapon('beetle-special');g.setAim(angle,power);
 return g;
}
function fireAtRange(g:Game){
 const expected=[...fixedAnglePredictor(g,g.active,g.selected)(g.active.power)].map(p=>p.x).sort((a,b)=>a-b);
 assert.ok(g.fire());
 const launch=g.projectiles.map(({x,y,vx,vy})=>({x,y,vx,vy}));
 for(let i=0;i<2500&&g.projectiles.length;i++)g.update(1/240);
 const impacts=g.battleSnapshot().events.filter(e=>e.type==='impact').map(e=>e.data.x as number).sort((a,b)=>a-b);
 assert.equal(impacts.length,3);
 assert.ok(impacts.every((x,i)=>Math.abs(x-expected[i])<3),`prediction ${expected}, impacts ${impacts}`);
 return {launch,impacts};
}
test('Beetle special separates high-angle distant shots, mirrors on left aim and agrees with AI and assistance',()=>{
 const old=fireAtRange(firingField(oldVersion,1,0));
 assert.ok(span(old.impacts)<45);
 for(const [angle,power,wind] of [[40,57,0],[37,52,7],[33,48,-7]]){
  const right=fireAtRange(firingField(version,1,wind,angle,power));
  const left=fireAtRange(firingField(version,-1,-wind,angle,power));
  assert.equal(new Set(right.launch.map(p=>`${p.x},${p.y}`)).size,1);
  assert.ok(right.impacts[1]-right.impacts[0]>100&&right.impacts[2]-right.impacts[1]>100);
  assert.ok(right.impacts.every((x,i)=>Math.abs(x+left.impacts[2-i]-2688)<2));
 }
 const tap=firingField(version,1,0,40,1);assert.ok(tap.fire());assert.ok(tap.projectiles.every(p=>p.vx>0));
});

test('records and replays both the new Beetle salvo and its historical counterpart',()=>{
 for(const gameVersion of [oldVersion,version]){
  const game=new Game({map:'coast',seed:29,slots:crews(4)},gameVersion);
  game.start();const recorder=new ReplayRecorder(game);
  game.selectWeapon('beetle-special');game.setAim(40,30);assert.ok(game.fire());
  for(let i=0;i<900&&game.projectiles.length;i++)game.update(.005);
  const player=new ReplayPlayer(parseReplayFile(exportReplay(recorder.export()),version));
  for(let i=0;i<1000&&!player.done;i++)player.advance(.05);
  assert.equal(player.verified,true,gameVersion);
  recorder.detach();
 }
});
