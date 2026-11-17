import test from 'node:test';import assert from 'node:assert/strict';
import {Game,makeRng} from '../src/engine';import {defaultSlots} from '../src/crew';
import {rollBattleWeather,rollSnow,fireLinePlacement,fireLineVisual,weatherCameraPoint,WEATHER_OBSERVATION_SECONDS,WEATHER_CLEAR_ROUNDS} from '../src/weather';
import {ReplayRecorder,ReplayPlayer} from '../src/replay';
function game(seed=52){const g=new Game({slots:defaultSlots().map((s,i)=>({...s,enabled:true,team:i%2,controller:'human',vehicle:'sea'})),map:'factory',timer:45,seed},'3.2.7');g.start();g.crates=[100,200,300].map(x=>({x,y:500,type:'ammo'}));return g;}
function settle(g:Game){for(let i=0;i<400&&g.weatherObservation;i++)g.update(.01);assert.equal(g.weatherObservation,null);}
function round(g:Game){const r=g.round;for(let i=0;i<20&&g.round===r;i++){settle(g);g.nextTurn();}assert.equal(g.round,r+1);}
function forceFire(g:Game,duration=2){(g as any).windChangeRound=999;(g as any).weatherNextRound=g.round+1;const draws=[.5,.9,.02,.2,.4,duration===1?.1:.8];(g as any).rng=()=>draws.shift()??.9;round(g);assert.ok(g.fireLine);}
test('rare weather uses one mutually exclusive draw, combined probability at most 1/40',()=>{
 assert.equal(rollBattleWeather(()=>0),'fog');assert.equal(rollBattleWeather(()=>1/80),'fireLine');assert.equal(rollBattleWeather(()=>1/40),null);
 const rng=makeRng(945),n=100000;let fog=0,fire=0;for(let i=0;i<n;i++){const kind=rollBattleWeather(rng);fog+=+(kind==='fog');fire+=+(kind==='fireLine');}
 assert.ok(fog>1100&&fog<1400);assert.ok(fire>1100&&fire<1400);assert.ok((fog+fire)/n<.027);assert.equal(rollBattleWeather(()=>0,false,false),null);
});
test('2v2 duration is 1–2 COMPLETE rounds, never member actions, wall time or pauses',()=>{
 for(const duration of [1,2]){const g=game();forceFire(g,duration);assert.equal(g.fireLineTurnsRemaining,duration);assert.equal(g.humanTurn,false);const before={turn:g.turn,clock:g.clock,action:g.active.actionTime,rng:g.battleSnapshot().rng};g.paused=true;g.update(.05);assert.equal(g.weatherObservation!.age,0);g.paused=false;g.skipTurn();assert.equal(g.turn,before.turn);assert.equal(g.fire(true),false);assert.equal(g.move(1,.1,true),false);assert.equal(g.useItem('boost',true),false);settle(g);assert.equal(g.clock,before.clock);assert.equal(g.active.actionTime,before.action);assert.deepEqual(g.battleSnapshot().rng,before.rng);
  for(let r=0;r<duration;r++){const left=duration-r;const at=g.round;for(let i=0;i<3;i++){g.nextTurn();assert.equal(g.round,at);assert.equal(g.fireLineTurnsRemaining,left);}g.nextTurn();assert.equal(g.round,at+1);}
  assert.equal(g.fireLine,null);assert.equal(g.weatherObservation!.kind,'disappear');assert.equal(g.fireLineTurnsRemaining,0);settle(g);assert.equal(g.humanTurn,true);
 }
});
test('after weather ends there are at least five entirely clear rounds before any repeat',()=>{
 const g=game();forceFire(g,1);settle(g);round(g);const end=g.round;assert.equal(g.fireLine,null);settle(g);(g as any).rng=()=>.02;
 for(let i=0;i<WEATHER_CLEAR_ROUNDS;i++){round(g);assert.equal(g.fog,false);assert.equal(g.fireLine,null);assert.ok(g.round<g.battleSnapshot().current.weatherCooldownUntil);}
 assert.equal(g.round,end+5);
});
test('placement lies between living opposing players, never allied/dead pairs or too close',()=>{
 const players=[{id:0,team:0,hp:1,x:100,y:400},{id:1,team:0,hp:1,x:140,y:420},{id:2,team:1,hp:1,x:1800,y:600},{id:3,team:1,hp:0,x:800,y:300}];
 for(let i=0;i<100;i++){const p=fireLinePlacement(players,makeRng(i))!;const [a,b]=p.players.map(id=>players[id]);assert.notEqual(a.team,b.team);assert.ok(a.hp>0&&b.hp>0);assert.ok(p.x>a.x+28&&p.x<b.x-28);assert.ok(p.y>=360&&p.y<=560);}
 assert.equal(fireLinePlacement(players.filter(p=>p.team===0),()=>0),null);assert.equal(fireLinePlacement([{...players[0]},{...players[2],x:130}],()=>0),null);
});
test('leaf/snow selection is deterministic and always exactly one kind, suited to each map',()=>{
 for(const map of ['valley','coast','moon','factory','temple','egypt'] as const){const a=makeRng(36),b=makeRng(36);for(let i=0;i<100;i++)assert.equal(rollSnow(map,a),rollSnow(map,b));}
 assert.equal(rollSnow('moon',()=>.5),true);assert.equal(rollSnow('egypt',()=>.5),false);
});
test('fire-line appearance/exit animate monotonically, camera returns before unlocking, and use no RNG',()=>{
 const line={x:1300,top:50,bottom:910},actor={x:200,y:440};for(const kind of ['appear','disappear'] as const){const rows=Array.from({length:101},(_,i)=>{const observation={kind,line,point:{x:1300,y:500},age:WEATHER_OBSERVATION_SECONDS*i/100};return {...fireLineVisual(observation),point:weatherCameraPoint(observation,actor)};});for(let i=1;i<rows.length;i++)assert.ok(kind==='appear'?rows[i].alpha>=rows[i-1].alpha:rows[i].alpha<=rows[i-1].alpha);assert.deepEqual(rows.at(-1)!.point,actor);}
});
test('new snapshots and exact replay preserve scheduled weather, cooldown, animation and this match RNG',()=>{
 const g=game(52),recorder=new ReplayRecorder(g);for(let i=0;i<8;i++)g.nextTurn();assert.equal(g.weatherObservation?.kind,'appear');g.update(.03);const s=g.battleSnapshot(),copy=Game.fromBattleSnapshot(s);assert.equal(copy.snow,g.snow);for(let i=0;i<30;i++){g.update(.01);copy.update(.01);}assert.deepEqual(copy.battleSnapshot().current,g.battleSnapshot().current);assert.deepEqual(copy.battleSnapshot().rng,g.battleSnapshot().rng);const p=new ReplayPlayer(recorder.export());while(!p.done)p.advance(.05);assert.equal(p.verified,true);recorder.detach();
});
test('rage and crossing fire line multiply to 2.25; item plus line still grants fireBoosted only once',()=>{
 for(const item of [false,true]){const g=game();g.weatherObservation=null;g.active.hp=g.active.maxHP*.4;g.active.boost=item;const p=g.launch(g.active,'sea-normal');Object.assign(p,{x:600,y:200,vx:200,vy:0,age:.2});g.fireLine={x:601,top:50,bottom:910};g.projectiles=[p];g.phase='flying';g.update(.02);assert.equal(p.boost,2.25);assert.equal(p.fireBoosted,true);assert.equal(p.boostSources!.rage,1.5);assert.equal(p.boostSources!.fire,item?'item':'line');Object.assign(p,{x:g.tanks[1].x,y:g.tanks[1].y});(g as any).explode(p,1);const d=g.battleSnapshot().events.filter(e=>e.type==='damage'&&e.data.target===1).at(-1)!.data;assert.equal(d.factors.filter((f:any)=>f.source.includes('fireBoosted')).length,1);assert.equal(d.factors.find((f:any)=>f.source==='海怪发怒').value,1.5);assert.equal(d.requested,Math.round(d.base*d.factors.reduce((n:number,f:any)=>n*f.value,1)));}
});

test('3.2.6 recordings keep their original weather/action timing, random draws and digest shape',()=>{
 const g=new Game({seed:52,fog:true,fireLine:true,slots:defaultSlots().map(s=>({...s,controller:'human',vehicle:'sea'}))},'3.2.6');g.start();assert.ok(g.fog&&g.fireLine);const r=new ReplayRecorder(g);g.nextTurn();assert.equal(g.fogTurnsRemaining,1);g.nextTurn();assert.equal(g.fog,false);assert.equal(g.fireLine,null);assert.equal('weatherObservation' in g.battleSnapshot().current,false);const p=new ReplayPlayer(r.export());while(!p.done)p.advance(.1);assert.equal(p.verified,true);r.detach();
});
