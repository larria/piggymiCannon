import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,makeRng} from '../src/engine';import {defaultSlots,crewAvatarPath} from '../src/crew';import {nextNaturalWind,MAX_WIND_CHANGE} from '../src/wind-cycle';
function game(teams=[0,0,1,1],controller:'human'|'ai'='ai'){
 const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,team:teams[i],controller,vehicle:i===1?'mine':'cannon'}));
 const g=new Game({slots,seed:52,map:'factory',timer:0,fog:false,fireLine:false});g.start();return g;
}
test('grouped 2v2 teams alternate across human, AI and mixed controllers; teammates each get a full action',()=>{
 for(const controller of ['human','ai','mixed'])for(const teams of [[0,0,1,1],[0,1,0,1],[7,7,19,19]]){
  const g=game(teams,controller==='human'?'human':'ai');if(controller==='mixed')g.tanks[0].controller='human';
  const order:number[]=[];for(let i=0;i<16;i++){order.push(g.active.id);assert.equal(g.round,Math.floor(i/4)+1);g.nextTurn();}
  for(let i=1;i<order.length;i++)assert.notEqual(g.tanks[order[i]].team,g.tanks[order[i-1]].team);
  for(let i=0;i<order.length;i+=4)assert.equal(new Set(order.slice(i,i+4)).size,4);
  assert.equal(g.delayEnabled,controller==='human');
 }
});
test('2v2 skips dead seats, alternates available teams, never ends early, and snapshot restores round/wind initiative',()=>{
 const g=game();g.nextTurn();g.damage(g.tanks[1],99999,2);g.nextTurn();assert.equal(g.phase==='ended',false);assert.ok(g.active.hp>0);
 for(let i=0;i<8;i++){assert.notEqual(g.active.id,1);g.nextTurn();}
 const r=Game.fromBattleSnapshot(g.battleSnapshot());for(let i=0;i<7;i++){g.nextTurn();r.nextTurn();assert.equal(g.current,r.current);assert.equal(g.round,r.round);assert.equal(g.wind,r.wind);assert.deepEqual(g.battleSnapshot().rng,r.battleSnapshot().rng);}
});
test('human individual 1v1 preserves DELAY initiative while full rounds wait for both to act',()=>{
 const slots=defaultSlots();slots.forEach(s=>{s.controller='human';s.vehicle='cannon';});const g=new Game({slots,seed:4,timer:0,fog:false,fireLine:false});g.start();
 g.tanks[1].nextActionAt=2000;g.nextTurn();assert.equal(g.current,0);assert.equal(g.round,1);g.nextTurn();assert.equal(g.round,1);g.nextTurn();assert.equal(g.round,1);g.nextTurn();assert.equal(g.current,1);assert.equal(g.round,1);g.nextTurn();assert.equal(g.round,2);
});
test('wind is constant during member actions; changes every 1–2 complete rounds by at most 60% of full span',()=>{
 const g=game(),r=game();let from=g.wind,lastRound=1;const changes:number[]=[];
 for(let action=0;action<100;action++){
  const beforeRound=g.round,beforeWind=g.wind;g.tanks.forEach(t=>t.hp=t.maxHP);r.tanks.forEach(t=>t.hp=t.maxHP);g.nextTurn();r.nextTurn();assert.equal(g.wind,r.wind);
  if(beforeRound===g.round)assert.equal(g.wind,beforeWind);
  if(g.wind!==from){assert.ok(g.round-lastRound>=1&&g.round-lastRound<=2);assert.ok(Math.abs(g.wind-from)<=MAX_WIND_CHANGE+1e-9);assert.ok(Math.abs(g.wind)<=11);changes.push(g.round);lastRound=g.round;from=g.wind;}
 }
 assert.ok(changes.length>=12);assert.ok(changes.some((round,i)=>i>0&&round-changes[i-1]===2));
 assert.ok(g.battleSnapshot().events.some(e=>e.type==='wind-change'&&e.data.maxDelta===13.2));
});
test('full east wind reaches no farther west than a light 20% wind, and vice versa',()=>{
 assert.ok(Math.abs(nextNaturalWind(11,()=>0)+2.2)<1e-9);assert.ok(Math.abs(nextNaturalWind(-11,()=>1)-2.2)<1e-9);
 const rng=makeRng(123);let wind=11;for(let i=0;i<1000;i++){const next=nextNaturalWind(wind,rng);assert.ok(Math.abs(next-wind)<=13.2+1e-9);wind=next;}
});
test('silent item visual records the actual item, expires without changing mechanics, and resets per match',()=>{
 const g=game([0,1,0,1],'human');const hp=g.active.hp;assert.equal(g.useItem('boost'),true);assert.equal(g.active.boost,true);assert.equal(g.active.hp,hp);assert.deepEqual(g.itemCues,[{tank:0,item:'boost',age:0}]);
 const replay=Game.fromBattleSnapshot(g.battleSnapshot());assert.deepEqual(replay.itemCues,g.itemCues);g.paused=true;g.update(.05);assert.equal(g.itemCues[0].age,0);g.paused=false;for(let i=0;i<23;i++)g.update(.05);assert.equal(g.itemCues.length,1);for(let i=0;i<6;i++)g.update(.05);assert.equal(g.itemCues.length,0);assert.equal(g.active.boost,true);assert.equal(game().itemCues.length,0);
 assert.equal(crewAvatarPath('fox','/game/'),'/game/portraits/fox.png');assert.equal(crewAvatarPath('fish'), 'portraits/fish.png');
});
