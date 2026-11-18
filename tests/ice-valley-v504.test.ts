import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {iceValleyBands,iceValleyBranch,iceValleySurface} from '../src/sky-map';import {replayDigest,ReplayRecorder,ReplayPlayer} from '../src/replay';
function game(version='5.0.4',seed=52){const g=new Game({seed,map:'moon',timer:0,fog:false,fireLine:false,slots:defaultSlots().map(s=>({...s,enabled:true,controller:'human',vehicle:'cannon'}))},version);g.start();return g;}
test('ice upper terrain consists of left-descending and right-ascending overlapping bands with a real gap; main58px and lower4px remain',()=>{
 const g=game(),w=g.worldWidth,h=g.worldHeight;
 for(const u of [.48,.53,.58]){const x=Math.round(w*u),bands=iceValleyBands(x,w,h).sort((a,b)=>a.top-b.top);assert.equal(bands.length,2);assert.ok(bands[1].top-bands[0].top>58+55);
  for(const b of bands){const top=Math.ceil(b.top);assert.equal(g.land.bottom(x,top)-top,58);assert.ok(g.land.solid(x,top));assert.equal(g.land.protectedMask[top*g.land.stride+x],0);}
  assert.equal(g.land.solid(x,Math.ceil(bands[0].top)+65),false);
 }
 assert.equal(iceValleyBands(w*.2,w,h).length,1);assert.equal(iceValleyBands(w*.85,w,h).length,1);
 const x=Math.round(w*.5),branch=Math.ceil(iceValleyBranch(x,w,h));assert.equal(g.land.bottom(x,branch)-branch,4);g.crater(x,branch,25,20);assert.equal(g.land.solid(x,branch),false);
 const old=game('5.0.3');for(const u of [.2,.5,.8])assert.equal(old.ground(Math.round(w*u)),Math.ceil(iceValleySurface(Math.round(w*u),w,h)));
});
test('new ice spawns are reproducible on the two upper bands, remain stable, and snapshots/replays keep the updated geometry',()=>{
 for(const seed of [1,7,52,210]){const g=game('5.0.4',seed),copy=game('5.0.4',seed);assert.deepEqual(g.tanks.map(t=>[t.x,t.y]),copy.tanks.map(t=>[t.x,t.y]));for(const t of g.tanks){assert.ok(t.y<700);assert.ok(g.stablePlatform(t.x));}for(let i=0;i<20;i++)g.update(.01);assert.ok(g.tanks.every(t=>t.hp===t.maxHP&&t.fallVelocity===0));}
 const g=game(),r=new ReplayRecorder(g);g.setAim(35,42);g.fire();for(let i=0;i<500;i++)g.update(.01);assert.equal(replayDigest(Game.fromBattleSnapshot(g.battleSnapshot())),replayDigest(g));const p=new ReplayPlayer(r.export());for(let i=0;i<1500&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);r.detach();
});
