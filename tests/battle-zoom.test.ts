import test from 'node:test';import assert from 'node:assert/strict';
import {BattleCamera} from '../src/camera';import {boundedBattleZoom,wheelZoomFactor} from '../src/battle-zoom';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
import {FACTORY_PLATFORMS,factoryFloor,factoryPlatformColumn} from '../src/classic-maps';
test('zoom bounds preserve approved base view and constrain full-map zoom-out',()=>{
 assert.equal(boundedBattleZoom(1,1792,2688),1);assert.equal(boundedBattleZoom(.1,1792,2688),.7);assert.equal(boundedBattleZoom(10,1792,2688),1.8);
 assert.equal(boundedBattleZoom(.1,2400,2688),2400/2688);assert.equal(boundedBattleZoom(NaN,1792,2688),1);
 assert.ok(wheelZoomFactor(-100)>1);assert.ok(wheelZoomFactor(100)<1);assert.equal(wheelZoomFactor(0),1);assert.equal(wheelZoomFactor(3,1),wheelZoomFactor(48));assert.ok(wheelZoomFactor(-20,0,true)>wheelZoomFactor(-20));
});
test('zoom retains the point under the pointer, pan/follow work and edge bounds remain valid',()=>{
 const c=new BattleCamera();c.configure(1792,900,2688,1344);c.center(1344,670,false);const x=c.x+1792*.7,y=c.y+900*.35;
 c.reframe(1120,562.5,.7,.35);assert.ok(Math.abs(c.x+1120*.7-x)<1e-8);assert.ok(Math.abs(c.y+562.5*.35-y)<1e-8);
 assert.equal(c.manual!.x,c.x);c.pan(1e6,1e6);assert.equal(c.x,2688-1120);assert.equal(c.y,1344-562.5);
 c.reframe(2560,1000);assert.ok(c.x>=0&&c.x<=128);assert.ok(c.y<=344);assert.ok(c.manual!.x<=128);
 c.follow();c.update(1,{x:0,y:0});assert.equal(c.x,0);assert.equal(c.y,0);
});
test('reframing during a tween/tour cannot snap back to pre-zoom coordinates',()=>{
 const c=new BattleCamera();c.configure(1600,800,2688,1344);c.center(1344,700,false);c.center(1500,750);c.update(.15,{x:0,y:0});
 c.reframe(1000,500);const x=c.x;c.update(.001,{x:0,y:0});assert.ok(Math.abs(c.x-x)<2);c.update(1,{x:0,y:0});assert.ok(c.x>500);
 let done=0;c.startTour([{id:0,x:1800,y:700}],()=>done++);c.update(.2,{x:0,y:0});c.reframe(800,400);const before=c.x;c.update(.001,{x:0,y:0});assert.ok(Math.abs(c.x-before)<2);c.update(1,{x:0,y:0});assert.equal(done,1);
});
const ready=(version:string)=>{const slots=defaultSlots().map(s=>({...s,controller:'human' as const,vehicle:'cannon' as const}));const g=new Game({map:'factory',slots,seed:52,timer:0},version);g.start();return g;};
test('factory current platforms have short upper ramps and angled lower ends; central thickness and Z floor stay fixed',()=>{
 const g=ready('5.0.10'),old=ready('5.0.9'),w=g.worldWidth,h=g.worldHeight;
 for(const [a,b,y] of FACTORY_PLATFORMS){
  const from=a*w,to=b*w,top=y*h,mid=Math.round((from+to)/2);assert.equal(g.ground(mid,top-1),old.ground(mid,top-1));assert.equal(g.land.bottom(mid,g.ground(mid,top-1))-g.ground(mid,top-1),90);
  for(const [end,sign] of [[from,1],[to,-1]]){
   if(end===0||end===w)continue;const edge=Math.round(end+sign*8),inner=Math.round(end+sign*40),outerTop=g.ground(edge,top-1),innerTop=g.ground(inner,top-1);
   assert.ok(outerTop>innerTop);assert.ok(outerTop<top+28);assert.ok(Math.abs((outerTop-innerTop)/(edge-inner))<1);
   assert.ok(g.land.bottom(edge,outerTop)<g.land.bottom(inner,innerTop));assert.equal(g.land.protectedMask[outerTop*g.land.stride+edge],0);
  }
 }
 for(let x=0;x<w;x+=7){const y=Math.ceil(factoryFloor(x,g.layoutScale));assert.equal(g.land.protectedMask[y*g.land.stride+x],old.land.protectedMask[y*old.land.stride+x]);assert.equal(g.land.protectedMask[y*g.land.stride+x],1);}
 assert.deepEqual(factoryPlatformColumn(100,100,400,300),{top:328,bottom:328});
});
test('slanted steel stays destructible and new seeded factory deployments remain supported',()=>{
 for(let seed=1;seed<=16;seed++){
  const g=new Game({map:'factory',seed,timer:0,slots:defaultSlots().map(s=>({...s,controller:'human' as const}))},'5.0.10');g.start();const positions=g.tanks.map(t=>[t.x,t.y]);for(let i=0;i<60;i++)g.update(1/120);
  assert.ok(g.tanks.every((t,i)=>t.hp===t.maxHP&&!t.outOfBounds&&t.fallVelocity===0&&t.y===positions[i][1]));
 }
 const g=ready('5.0.10'),x=Math.ceil(g.worldWidth*.28+30),y=g.ground(x);g.crater(x,y,70,120);assert.ok(!g.land.solid(x,y));
});
