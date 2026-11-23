import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {templeNodes,templeNode,templeCanopy,templeRail} from '../src/classic-maps';
import {ReplayRecorder,ReplayPlayer} from '../src/replay';

const ready=(version='5.1.5')=>{const g=new Game({map:'temple',seed:52,slots:defaultSlots().map(s=>({...s,controller:'human',vehicle:'cannon'})),fog:false,fireLine:false},version);g.start();return g;};
test('every temple deck has a gentle swell; the bottom islands are small, uniform and at different heights',()=>{
 const g=ready(),legacy=ready('5.1.4'),w=g.worldWidth,h=g.worldHeight;
 for(const [from,to,y] of [[.27,.73,.28],[.016,.075,.52],[.925,.985,.52],[.475,.525,.46],[.33,.67,.64],[.225,.325,.75],[.695,.795,.75]]){
   const levels=Array.from({length:30},(_,i)=>g.ground(w*(from+(to-from)*i/29),h*y-22));
   assert.ok(Math.max(...levels)-Math.min(...levels)>=2,`${from} deck has no visible swell`);
   assert.ok(Math.max(...levels)-Math.min(...levels)<30);
   assert.equal(legacy.ground(w*(from+to)/2,h*y-22),Math.ceil(h*y));
 }
 const nodes=templeNodes(g.layoutScale),caps=nodes.map(x=>templeCanopy(x,g.layoutScale));
 assert.equal(new Set(caps.map(c=>c.radius)).size,1);
 const oldMean=nodes.reduce((n,x)=>n+templeNode(x,g.layoutScale).radius,0)/nodes.length;
 assert.ok(caps[0].radius/oldMean>1.07&&caps[0].radius/oldMean<1.13);
 const oldHeight=nodes.reduce((n,x)=>{const old=templeNode(x,g.layoutScale);return n+old.bottom-templeRail(x,g.layoutScale)+old.rise;},0)/nodes.length;
 assert.ok((caps[0].bottom-caps[0].crown)/oldHeight>1.07&&(caps[0].bottom-caps[0].crown)/oldHeight<1.13);
 assert.ok(new Set(caps.map(c=>c.crown)).size>=4);
 assert.notDeepEqual(g.land.protectedMask,legacy.land.protectedMask);
 const x=460,y=g.ground(x,1100);assert.equal(g.land.bottom(x,y)-y,4);g.crater(x,y,20,20);assert.equal(g.ground(x,1100),h);
});
test('all five protected cap profiles catch a falling tank and let it stand at 45° on either side, then drive off',()=>{
 const g=ready(),t=g.active;
 for(const x of templeNodes(g.layoutScale)){
   const cap=templeCanopy(x,g.layoutScale);g.crater(x,cap.crown,100,46);
   assert.equal(g.ground(x,1110),cap.crown);assert.equal(g.land.protectedMask[cap.crown*g.land.stride+x],1);
   for(const direction of [-1,1]){
     Object.assign(t,{x,y:cap.crown-80,fallVelocity:1,fallStart:cap.crown-80,fuel:100});
     for(let j=0;j<240&&t.fallVelocity>0;j++)g.update(1/120);
     assert.equal(t.fallVelocity,0);assert.equal(t.y,g.support(x,cap.crown)-18);
     let angle=0;
     for(let j=0;j<48&&t.fallVelocity===0;j++){
       assert.ok(g.move(direction,1/120));g.update(1/120);
       if(!t.fallVelocity)angle=Math.max(angle,Math.abs(g.tankSlope(t))*180/Math.PI);
     }
     assert.ok(angle>=44,`cap at ${x}, direction ${direction}: ${angle}°`);
     assert.ok(t.fallVelocity>0&&Math.abs(t.x-x)>cap.radius);
   }
 }
});
test('versioned temple terrain and spawn positions reproduce on old and new replay tapes',()=>{
 for(const version of ['5.1.4','5.1.5']){
   const g=ready(version),record=new ReplayRecorder(g);g.setAim(45,25);g.fire();for(let i=0;i<260;i++)g.update(1/120);
   const replay=new ReplayPlayer(record.export());for(let i=0;i<400&&!replay.done;i++)replay.advance(.02);
   assert.equal(replay.verified,true);record.detach();
 }
});
