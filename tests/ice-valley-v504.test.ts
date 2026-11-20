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

test('new ice rims reach 266 (5% thinner than the coast midspan) with monotone outer slopes, separate bands and an unchanged thin branch',()=>{
 const g=game('5.1.3'),old=game('5.1.2'),w=g.worldWidth,h=g.worldHeight;
 const coast=new Game({map:'coast',seed:52},'5.1.3'),coastMid=coast.worldWidth/2;
 const thickness=(x:number,y:number)=>g.land.bottom(x,y)-y;
 const bridge=coast.land.bottom(coastMid)-coast.ground(coastMid);assert.equal(bridge,280);
 for(const [edge,side,fractions] of [[0,'left',[0,.06,.18,.31,.46,.61,.666]],[w,'right',[1,.94,.82,.70,.58,.48,.416]]] as const){
  assert.equal(thickness(edge,g.ground(edge)),bridge*.95);assert.equal(old.land.bottom(edge)-old.ground(edge),58);
  const depths=fractions.map(u=>{const x=Math.round(w*u),b=iceValleyBands(x,w,h,'5.1.3').find(b=>b.side===side)!;return thickness(x,Math.ceil(b.top));});
  assert.ok(depths.every((n,i)=>!i||n<depths[i-1]),depths.join(','));
 }
 for(let x=Math.ceil(w*.41);x<=w*.67;x+=3){
  const [upper,lower]=iceValleyBands(x,w,h,'5.1.3').sort((a,b)=>a.top-b.top);
  assert.ok(Math.ceil(lower.top)-g.land.bottom(x,Math.ceil(upper.top))>55);
 }
 for(let x=Math.ceil(w*.3);x<=w*.58;x+=3){
  const y=Math.ceil(iceValleyBranch(x,w,h));assert.equal(thickness(x,y),4);assert.ok(!g.land.solid(x,y-1));
 }
 const x=50,y=g.ground(x);g.crater(x,y,20,12);assert.ok(!g.land.solid(x,y));assert.ok(g.land.solid(x,y+30));
 for(let n=0;n<60;n++)g.update(.01);assert.ok(g.tanks.every(t=>t.hp===t.maxHP&&t.fallVelocity===0));
});
