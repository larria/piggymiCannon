import test from 'node:test';import assert from 'node:assert/strict';
import {freshProgression,freshProfile,rankIndex,aiRank,RANKS,emptyCombat,scoreChange,settleProgression,readProgression,decodeProgression,PROGRESSION_KEY,ACHIEVEMENTS,type MatchProgress} from '../src/progression';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {ReplayRecorder,ReplayPlayer,replayDigest} from '../src/replay';
const match=(id='one',human=true):MatchProgress=>({id,map:'factory',competitors:[{id:0,crew:'mimi',team:0,controller:human?'human':'ai',difficulty:'easy',points:0,tier:0,vehicle:'cannon',metrics:{...emptyCombat(),shots:2,damage:1000,kills:1}},{id:1,crew:'dad',team:1,controller:'ai',difficulty:'expert',points:0,tier:3,vehicle:'sea',metrics:{...emptyCombat(),shots:10,damage:9999,kills:4}}]});
function game(){const slots=defaultSlots();slots[0].vehicle='cannon';slots[1].vehicle='sea';return new Game({slots,seed:52,map:'factory',fog:false,fireLine:false,timer:0,competition:{id:'unit',points:{mimi:605,dad:9000}}},'4.0.0');}
test('exact four tier thresholds, downgrades and fixed AI difficulty map',()=>{
 assert.deepEqual([0,1999,2000,5999,6000,11999,12000,99999].map(points=>rankIndex(points)),[0,0,1,1,2,2,3,3]);assert.deepEqual(RANKS.map(r=>aiRank(r.difficulty)),[0,1,2,3]);
 const g=game();assert.equal(g.medal(g.tanks[0]),2);assert.equal(g.medal(g.tanks[1]),0);g.tanks[1].difficulty='expert';assert.equal(g.medal(g.tanks[1]),3);assert.equal(g.progress!.competitors[1].points,0);
});
test('all 16 own/opponent tier combinations: higher wins earn more; lower losses deduct more',()=>{
 for(let own=0;own<4;own++)for(let other=0;other<4;other++){
  assert.equal(scoreChange(true,own,[other]),Math.max(10,Math.min(60,30+10*(other-own))));
  assert.equal(scoreChange(false,own,[other]),-Math.max(5,Math.min(35,20+5*(own-other))));
 }assert.equal(scoreChange(true,0,[1,3]),50);assert.equal(scoreChange(false,2,[0,2]),-25);
});
test('AI never modifies its human profile, even when it wins or has a high saved human medal',()=>{
 for(const winner of [0,1,null]){const state=freshProgression();state.profiles.dad={...freshProfile(),points:1800,games:10};const before=JSON.stringify(state.profiles.dad),m=match(`ai-${winner}`);
  const result=settleProgression(state,m,winner,{ended:true});assert.equal(JSON.stringify(result.state.profiles.dad),before);assert.equal(result.results.length,1);
  assert.equal(result.state.profiles.mimi.points,winner===0?54:0);assert.equal(result.state.profiles.mimi.damage,1000);
 }
 const state=freshProgression();assert.deepEqual(settleProgression(state,match('all-ai',false),0,{ended:true}),{state,results:[]});
});
test('only complete live human matches settle once; spectator/replay/exit do not count',()=>{
 const state=freshProgression(),m=match();for(const options of [{ended:false},{ended:true,replay:true}])assert.deepEqual(settleProgression(state,m,0,options),{state,results:[]});
 const result=settleProgression(state,m,0,{ended:true});assert.equal(result.state.profiles.mimi.wins,1);assert.deepEqual(settleProgression(result.state,m,0,{ended:true}),{state:result.state,results:[]});assert.equal(state.profiles.mimi.games,0);
 const restored=decodeProgression(JSON.parse(JSON.stringify(result.state)));assert.equal(settleProgression(restored,m,0,{ended:true}).results.length,0);
});
test('team human wins share outcome but use frozen starting medals and only opposing team odds',()=>{
 const state=freshProgression();state.profiles.fox.points=2000;
 const m=match();m.competitors.push({...m.competitors[0],id:2,crew:'fox',points:2000,tier:1},{...m.competitors[1],id:3,crew:'fish',team:1,tier:1});
 const r=settleProgression(state,m,0,{ended:true});assert.deepEqual(r.results.map(r=>r.delta),[45,36]);assert.equal(r.state.profiles.fox.wins,1);assert.equal(r.state.profiles.dad.games,0);assert.equal(r.state.profiles.fish.games,0);
});
test('loss can demote immediately, points floor at zero, draws neutral, achievements remain unlocked',()=>{
 const state=freshProgression();state.profiles.mimi.points=2005;state.profiles.mimi.achievements['first-win']='earlier';const m=match();m.competitors[0].tier=1;m.competitors[1].tier=0;m.competitors[0].metrics=emptyCombat();
 const r=settleProgression(state,m,1,{ended:true});assert.equal(r.results[0].delta,-25);assert.equal(r.results[0].newTier,0);assert.equal(r.state.profiles.mimi.achievements['first-win'],'earlier');
 const zero=settleProgression(freshProgression(),m,1,{ended:true});assert.equal(zero.results[0].delta,0);assert.equal(zero.results[0].requested,-25);assert.equal(zero.state.profiles.mimi.losses,1);
 const draw=settleProgression(state,m,null,{ended:true});assert.equal(draw.state.profiles.mimi.points,2005);assert.equal(draw.state.profiles.mimi.draws,1);
});
test('achievements unlock once and do not add rating; metrics and identities survive tank changes',()=>{
 let state=freshProgression();for(let i=0;i<25;i++){const m=match(`win-${i}`);m.competitors[0].metrics={...emptyCombat(),damage:4000,kills:4,healed:800,pickups:4,comboShots:2};const r=settleProgression(state,m,0,{ended:true,date:'2026-11-17'});state=r.state;if(i)assert.ok(!r.results[0].unlocked.includes('first-win'));}
 assert.equal(state.profiles.mimi.points,1350);for(const id of ['debut','first-win','ten-wins','streak','giant','damage','kills','healer','supply','combo'])assert.equal(state.profiles.mimi.achievements[id],'2026-11-17');assert.equal(ACHIEVEMENTS.length,14);
});
test('malformed/denied local storage is safe; decoding bounds values and preserves only known achievements',()=>{
 for(const text of [null,'broken',JSON.stringify({formatVersion:8})])assert.deepEqual(readProgression({getItem:()=>text}),freshProgression());assert.deepEqual(readProgression({getItem(){throw Error('denied');}}),freshProgression());
 const decoded=decodeProgression({formatVersion:1,profiles:{mimi:{points:NaN,wins:-10,damage:Infinity,achievements:{'first-win':'now',unknown:'now'}}},settled:['a']});assert.equal(decoded.profiles.mimi.points,0);assert.equal(decoded.profiles.mimi.wins,0);assert.deepEqual(decoded.profiles.mimi.achievements,{'first-win':'now'});assert.equal(PROGRESSION_KEY,'piggy-progression-v1');
});
test('combat counters credit successful human inputs, actual enemy damage and allied healing; never AI or friendly hits',()=>{
 const g=game();g.start();const human=g.tanks[0],ai=g.tanks[1];assert.equal(g.useItem('boost'),true);assert.equal(g.useItem('double'),true);g.fire();assert.equal(g.progress!.competitors[0].metrics.shots,1);assert.equal(g.progress!.competitors[0].metrics.comboShots,1);assert.equal(g.progress!.competitors[0].metrics.items,2);
 g.damage(ai,50,human.id);g.damage(human,60,ai.id);const p=g.progress!.competitors[0];assert.equal(p.metrics.damage,50);assert.equal(g.progress!.competitors[1].metrics.damage,0);
 g.damage(ai,9999,human.id);assert.equal(p.metrics.kills,1);g.config.friendlyFire=true;human.hp=50;(g as any).restoreImpact({...g.launch(human,'cannon-normal'),healing:true,x:human.x,y:human.y,boost:1,fireBoosted:false},human.id);assert.ok(p.metrics.healed>0);
 const before=p.metrics.damage;g.damage(human,5,human.id);assert.equal(p.metrics.damage,before);
});
test('4.0 snapshots and exact replay preserve human metrics/medals and pending deliveries',()=>{
 const g=game();g.start();g.pendingSupply={target:0,candidates:[0],queuedAction:3};const initial=g.battleSnapshot();assert.deepEqual(Game.fromBattleSnapshot(initial).progress,g.progress);assert.deepEqual(Game.fromBattleSnapshot(initial).pendingSupply,g.pendingSupply);
 const recorder=new ReplayRecorder(g);g.setAim(35,1);g.useItem('boost');g.fire();for(let i=0;i<40;i++)g.update(.01);const recording=recorder.export();recorder.detach();const player=new ReplayPlayer(JSON.parse(JSON.stringify(recording)));for(let i=0;i<5000&&!player.done;i++)player.advance(.03);assert.equal(player.verified,true);assert.equal(replayDigest(player.game),recording.finalDigest);assert.deepEqual(player.game.progress,g.progress);
});

test('read-only HUD/availability/medal queries never train human metrics; only successful consumption counts',()=>{
 const g=game();g.start();const before=structuredClone(g.progress);for(let i=0;i<1000;i++){g.itemUnavailable('boost');g.itemUnavailable('double');g.itemUnavailable('repair');g.itemUnavailable('teleport');g.backpack();g.itemArmed(0);g.medal(g.active);}
 assert.deepEqual(g.progress,before);assert.equal(g.useItem('boost'),true);assert.equal(g.useItem('boost'),false);assert.equal(g.progress!.competitors[0].metrics.items,1);g.itemUnavailable('double');assert.equal(g.progress!.competitors[0].metrics.items,1);
});


test('old points are neither multiplied nor wiped; ranks and best tier are rebuilt without revoking achievements',()=>{
 const stored=freshProgression();delete stored.rankScale;
 stored.profiles.mimi={...freshProfile(),points:610,bestTier:2,achievements:{'first-win':'earned'}};
 stored.profiles.dad={...freshProfile(),points:2040,bestTier:3,achievements:{king:'earned'},equippedAchievement:'king'};
 const migrated=decodeProgression(stored);
 assert.equal(migrated.rankScale,10);assert.equal(migrated.profiles.mimi.points,610);assert.equal(migrated.profiles.mimi.bestTier,0);
 assert.equal(migrated.profiles.dad.points,2040);assert.equal(migrated.profiles.dad.bestTier,1);
 assert.equal(migrated.profiles.dad.achievements.king,'earned');assert.equal(migrated.profiles.dad.equippedAchievement,'king');
 assert.deepEqual(decodeProgression(migrated),migrated);
});

test('individual match scores distinguish passive winners, assisting winners and meaningful losing performances',()=>{
 const m=match(),state=freshProgression();state.profiles.mimi.points=400;state.profiles.fox.points=400;
 m.competitors.push({...m.competitors[0],id:2,crew:'fox',metrics:{...emptyCombat(),shots:3,items:2,pickups:1}});
 const won=settleProgression(state,m,0,{ended:true});assert.deepEqual(won.results.map(r=>r.delta),[54,0]);
 m.competitors[2].metrics.healed=300;
 const support=settleProgression(state,m,0,{ended:true});assert.deepEqual(support.results.map(r=>r.delta),[54,18]);
 m.competitors[2].metrics={...emptyCombat(),damage:300};
 assert.equal(settleProgression(state,m,0,{ended:true}).results[1].delta,18);
 const lost=(contribution:Partial<ReturnType<typeof emptyCombat>>)=>{
  m.competitors[0].metrics={...emptyCombat(),...contribution};
  return settleProgression(state,m,1,{ended:true}).results[0].delta;
 };
 assert.equal(lost({damage:1000}),-1);
 assert.equal(lost({healed:1000}),-1);
 assert.ok(lost({kills:1,damage:12})<0);
 assert.equal(lost({kills:1,damage:700,healed:299}),-1);
 assert.equal(lost({kills:1,damage:700,healed:300}),0);
 assert.equal(lost({kills:1,damage:1000}),0);
 assert.equal(lost({damage:500}),lost({healed:500}));
});
