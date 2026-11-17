import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
import {ReplayRecorder,ReplayPlayer,saveReplay,readReplays,deleteReplay,REPLAY_STORAGE_KEY,replayDigest,validateReplay} from '../src/replay';
const ready=(ai=false)=>{const slots=defaultSlots();slots[0].vehicle='missile';slots[1].vehicle='bowl';slots[0].controller=ai?'ai':'human';slots[1].controller=ai?'ai':'human';const g=new Game({slots,map:'factory',mapChoice:'random',seed:52,timer:0,fog:false,fireLine:false},'test-replay');g.start();return g;};
function play(recording:ReturnType<ReplayRecorder['export']>){const player=new ReplayPlayer(JSON.parse(JSON.stringify(recording)));for(let i=0;i<20000&&!player.done;i++)player.advance(.08);assert.ok(player.done);assert.equal(player.verified,true);return player;}
const memory=()=>{let encoded:string|null=null;return {getItem:()=>encoded,setItem:(key:string,value:string)=>{assert.equal(key,REPLAY_STORAGE_KEY);encoded=value;}};};
test('exact updates and inputs restore seeded terrain, inventory, rounds and current RNG from the start',()=>{
 const g=ready(),recorder=new ReplayRecorder(g);g.setIntroLocked(true);g.update(.05);g.setIntroLocked(false);
 g.move(1,.02);g.face(-1);g.setAim(32,25);g.selectWeapon('missile-normal');g.useItem('boost');g.active.power=34;g.targetX=420;g.fire();
 for(let i=0;i<410;i++)g.update([.008,.0167,.021][i%3]);g.paused=true;for(let i=0;i<50;i++)g.update(.03);g.setBattleRule('fallDamage',true);g.paused=false;g.update(.011);
 const data=recorder.export(),player=play(data);assert.equal(replayDigest(player.game),replayDigest(g));assert.deepEqual(player.game.tanks,g.tanks);assert.deepEqual(player.game.battleSnapshot().rng,g.battleSnapshot().rng);assert.equal(data.initial.initial.config.map,g.config.map);assert.equal(data.initial.initial.config.seed,52);assert.ok(data.commands.length<480);recorder.detach();
});
test('AI internals are not recorded twice; every difficulty action replays deterministic physics',()=>{
 const g=ready(true),recorder=new ReplayRecorder(g);for(let i=0;i<1000;i++)g.update(.02);
 const data=recorder.export();assert.ok(g.tanks.reduce((n,t)=>n+t.shots,0)>1);assert.ok(data.commands.every(c=>c[0]===0));const player=play(data);assert.deepEqual(player.game.tanks,g.tanks);assert.equal(player.verified,true);recorder.detach();
});
test('saving during flight includes future continuation but saving never changes or persists the diagnostic buffer',()=>{
 const h=ready(),r=new ReplayRecorder(h);h.useItem('double');h.setAim(40,65);h.fire();h.update(.03);
 const storage=memory(),before=h.battleSnapshot();saveReplay(storage,r.export());assert.deepEqual(h.battleSnapshot(),before);const saved=readReplays(storage)[0],p=play(saved);assert.ok(p.game.projectiles.some(p=>p.delay>0));
 for(let i=0;i<120;i++){h.update(.01);p.game.update(.01);}assert.deepEqual(p.game.tanks,h.tanks);assert.deepEqual(p.game.battleSnapshot().rng,h.battleSnapshot().rng);r.detach();
});
test('storage replaces a saved prefix of the same match, reloads, deletes, and handles quotas without losing old clips',()=>{
 const storage=memory(),g=ready(),r=new ReplayRecorder(g);g.update(.02);const first=r.export();saveReplay(storage,first);g.update(.03);saveReplay(storage,r.export());assert.equal(readReplays(storage).length,1);assert.ok(readReplays(storage)[0].duration>first.duration);
 const second={...r.export(),id:'another-match'};saveReplay(storage,second);assert.equal(readReplays(storage).length,2);
 const existing=storage.getItem();assert.throws(()=>saveReplay({getItem:storage.getItem,setItem:()=>{throw Error('quota');}},second),/空间不足/);assert.equal(storage.getItem(),existing);
 deleteReplay(storage,first.id);assert.equal(readReplays(storage)[0].id,second.id);deleteReplay(storage,second.id);assert.equal(readReplays(storage).length,0);r.detach();
});
test('new matches do not inherit an operation tape and incompatible or forged operations are rejected',()=>{
 const a=ready(),ra=new ReplayRecorder(a);a.setAim(23,17);const saved=ra.export();const b=ready(),rb=new ReplayRecorder(b);assert.equal(rb.export().commands.length,0);assert.throws(()=>validateReplay({...saved,formatVersion:2}),/格式/);assert.throws(()=>validateReplay({...saved,commands:[[99]]}),/不支持/);assert.throws(()=>validateReplay({...saved,commands:[[0,-1]]}),/不支持/);ra.detach();rb.detach();
});
test('playback pause/speed operate on the player, preserve rules and eventually verify the final state',()=>{
 const g=ready(),r=new ReplayRecorder(g);for(let i=0;i<100;i++)g.update(.01);const player=new ReplayPlayer(r.export());player.paused=true;player.advance(10);assert.equal(player.time,0);player.paused=false;player.speed=2;player.advance(.25);assert.ok(Math.abs(player.time-.5)<.02);player.advance(.3);assert.equal(player.done,true);assert.equal(player.verified,true);r.detach();
});
test('a complete four-seat AI battle remains replayable after the diagnostic event buffer truncates',()=>{
 const slots=defaultSlots().map((s,i)=>({...s,enabled:true,team:i%2,controller:'ai' as const,difficulty:'easy' as const,vehicle:['missile','cannon','sea','multi'][i] as any}));
 const g=new Game({slots,map:'factory',seed:318,timer:0,fog:false,fireLine:false},'test-replay');g.start();const recorder=new ReplayRecorder(g);
 for(let i=0;i<18000&&!(g.phase==='ended'&&g.resultAge>=3);i++)g.update(.04);
 assert.equal(g.phase,'ended');assert.ok(g.resultAge>=3);assert.ok(g.battleSnapshot().truncation.dropped>0);const recording=recorder.export(),player=play(recording);assert.equal(player.verified,true);assert.equal(player.game.winner,g.winner);assert.ok(JSON.stringify(recording).length<400000);console.log('Replay complete report',JSON.stringify({duration:recording.duration,commands:recording.commands.length,bytes:new TextEncoder().encode(JSON.stringify(recording)).length,truncatedDiagnosticEvents:g.battleSnapshot().truncation.dropped,completeReplayVerified:player.verified}));recorder.detach();
});
test('charge cues reproduce changing power and stop synthesis when a saved prefix ends mid-charge',()=>{
 const g=ready(),recorder=new ReplayRecorder(g);recorder.cue('charge-start');g.setAim(40,10);g.update(.02);g.setAim(40,20);g.update(.03);
 const player=play(recorder.export()),cues=player.drainCues();assert.equal(cues[0].kind,'charge-start');assert.ok(cues.some(c=>c.kind==='charge-power'&&c.power===20));assert.equal(cues.at(-1)?.kind,'charge-stop');assert.equal(player.charging,false);recorder.detach();
});
test('unlimited idle capture keeps exact dt in compact bounded blocks instead of allocating one array per frame',()=>{
 const g=ready(),recorder=new ReplayRecorder(g);for(let i=0;i<60000;i++)g.update(i%2?.016:.017);assert.ok(recorder.bufferBytes<510000);const recording=recorder.export();assert.equal(recording.commands.length,60000);const replay=play(recording);assert.equal(replay.verified,true);recorder.detach();
});

test('new pre-charge ring cue replays the wait before sound/charging, and stops cleanly without altering simulation',()=>{
 const g=ready(),r=new ReplayRecorder(g);r.cue('charge-wait');g.update(.04);g.update(.04);g.update(.02);r.cue('charge-start');g.update(.03);r.cue('charge-stop');const player=new ReplayPlayer(r.export());player.advance(.05);assert.equal(player.waiting,true);assert.equal(player.charging,false);assert.equal(player.waitingStartedAt,0);player.advance(.1);assert.equal(player.waiting,false);assert.equal(player.charging,false);assert.equal(player.verified,true);r.detach();
});
