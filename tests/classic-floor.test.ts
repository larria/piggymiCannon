import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD_W,TERRAIN_H} from '../src/terrain';
import {Game,WATER_Y} from '../src/engine';import {defaultSlots} from '../src/crew';import {factoryFloor,templeCap,templeNode,templeRail,TEMPLE_NODES} from '../src/classic-maps';
import {ALL_WEAPONS,excavation} from '../src/catalog';import {solveAIShot,safeAIPositions,predictAIImpact} from '../src/ai-planner';
function ready(map:'factory'|'temple',seed=52){const slots=defaultSlots();slots.forEach(s=>Object.assign(s,{controller:'human',vehicle:'cannon'}));const g=new Game({slots,map,seed,timer:0,fog:false,fireLine:false});g.start();return g;}
function permanentOnly(g:Game){for(let i=0;i<g.land.mask.length;i++)if(!g.land.protectedMask[i])g.land.mask[i]=0;g.land.rebuild();}
function place(g:Game,x:number,top:number){const t=g.active;t.x=x;t.y=g.support(x,top+1)-18;t.fallVelocity=0;return t;}
function refuel(g:Game){g.nextTurn();for(let i=0;i<20&&g.current!==0;i++)g.nextTurn();assert.equal(g.current,0);for(let i=0;i<2000&&g.phase==='supply';i++)g.update(1/120);assert.equal(g.phase,'aiming');}
test('factory full-width permanent Z floor has rounded connected ramps and preserves the middle steel beams',()=>{
 const g=ready('factory');assert.ok(g.land.solid(750,312));assert.equal(g.land.protectedMask[312*g.land.stride+750],0);
 let low=Infinity,high=0;for(let x=0;x<=WORLD_W;x++){const y=Math.ceil(factoryFloor(x));low=Math.min(low,y);high=Math.max(high,y);assert.ok(y<WATER_Y-12);for(let at=y;at<TERRAIN_H;at++)assert.equal(g.land.protectedMask[at*g.land.stride+x],1);if(x>0)assert.ok(Math.abs(factoryFloor(x)-factoryFloor(x-1))<1);}
 assert.ok(high-low>=35);for(const x of [0,20,92,112,132,204,224]){const h=.0001,left=(factoryFloor(x)-factoryFloor(x-h))/h,right=(factoryFloor(x+h)-factoryFloor(x))/h;assert.ok(Math.abs(left-right)<.001);}
});
test('every weapon preserves the Z floor and units cannot fall through it after all ordinary supports vanish',()=>{
 const g=ready('factory'),mask=g.land.protectedMask.slice();for(const w of ALL_WEAPONS){const dig=excavation(w.id,false);for(const x of [56,112,224,400,640,1000,1220])g.crater(x,factoryFloor(x),dig.radius,dig.depth);}
 g.crater(960,450,2000,1500);assert.deepEqual(g.land.protectedMask,mask);for(let i=0;i<mask.length;i++)if(mask[i])assert.equal(g.land.mask[i],1);
 for(let i=0;i<800;i++)g.update(1/120);assert.ok(g.tanks.every(t=>!t.outOfBounds&&t.hp>0&&t.y+18<WATER_Y));
});
test('normal movement across several Z folds neither blocks nor falls and all aim transforms follow the body',()=>{
 for(const direction of [-1,1]){const g=ready('factory');permanentOnly(g);g.enemy.x=1220;g.enemy.y=g.support(1220,factoryFloor(1220)+1)-18;const t=place(g,direction===1?40:420,factoryFloor(direction===1?40:420));let last=g.tankSlope(t),maxDelta=0,min=99,max=-99;
  for(let i=0;i<650;i++){if(t.fuel<1)refuel(g);const y=t.y;assert.ok(g.move(direction,1/120),`${direction}/${t.x}`);g.update(1/120);assert.equal(t.fallVelocity,0);assert.ok(Math.abs(t.y-y)<=1);const slope=g.tankSlope(t),deg=slope*180/Math.PI;min=Math.min(min,deg);max=Math.max(max,deg);maxDelta=Math.max(maxDelta,Math.abs(slope-last)*180/Math.PI);last=slope;
   for(const angle of [t.minAngle,35,t.maxAngle,105,-5]){const aim=g.aim(t,angle);assert.ok(Math.abs(aim.absolute-(angle-direction*deg))<1e-8);const p=g.launch(t,'cannon-normal',angle,40),m=g.muzzle(t,angle);assert.ok(Math.abs(Math.atan2(-p.vy,Math.abs(p.vx))*180/Math.PI-aim.absolute)<1e-8||aim.absolute>90||aim.absolute< -90);assert.ok(Math.hypot(m.x-(t.x+Math.sin(slope)*13+aim.x*31),m.y-(t.y-Math.cos(slope)*13+aim.y*31))<1e-8);}
  }
  assert.ok(min< -15&&max>15);assert.ok(maxDelta<4);const stop={x:t.x,y:t.y,slope:g.tankSlope(t)};for(let i=0;i<30;i++)g.update(1/120);assert.deepEqual({x:t.x,y:t.y,slope:g.tankSlope(t)},stop);
 }
});
test('mushrooms have curved permanent caps, narrow stems and thin destructible gaps',()=>{
 const g=ready('temple');for(const node of TEMPLE_NODES){const {radius,stem,rise,bottom}=templeNode(node),cap=Math.ceil(templeCap(node,node));assert.ok((templeRail(node+radius*.75)-templeCap(node+radius*.75,node))<rise*.3);assert.equal(g.land.protectedMask[cap*g.land.stride+node],1);assert.equal(g.land.protectedMask[(Math.floor(bottom)-1)*g.land.stride+node],1);assert.equal(g.land.protectedMask[(Math.floor(bottom)-1)*g.land.stride+node+Math.ceil(stem)+10],0);g.crater(node,templeRail(node),150,150);assert.equal(g.ground(node,750),cap);}
 const fresh=ready('temple'),x=240,top=fresh.ground(x,750);assert.equal(fresh.land.bottom(x,top)-top,4);fresh.crater(x,top,30,20);assert.equal(fresh.ground(x,750),TERRAIN_H);
});
test('small real movements over every mushroom change angle smoothly and remain supported after excavation',()=>{
 for(const node of TEMPLE_NODES){const g=ready('temple');g.enemy.x=node<900?1200:95;g.enemy.y=300;const distance=templeNode(node).radius*.35,t=place(g,node-distance,templeCap(node-distance,node));g.crater(node,templeRail(node),130,140);let min=99,max=-99,last=g.tankSlope(t),maxDelta=0;
  for(let i=0;i<Math.floor(distance*2/(t.moveSpeed/120));i++){assert.ok(g.move(1,1/120));g.update(1/120);assert.equal(t.fallVelocity,0);assert.equal(t.hp,t.maxHP);const deg=g.tankSlope(t)*180/Math.PI;min=Math.min(min,deg);max=Math.max(max,deg);maxDelta=Math.max(maxDelta,Math.abs(g.tankSlope(t)-last)*180/Math.PI);last=g.tankSlope(t);assert.ok(Math.abs(g.aim(t,35).absolute-(35-deg))<1e-8);}
  assert.ok(min< -8&&max>8,`${node}: ${min}/${max}`);assert.ok(maxDelta<4);assert.equal(t.outOfBounds,false);
 }
});
test('AI candidate movement and actual low shots agree with permanent slopes/caps without using another layer',()=>{
 for(const map of ['factory','temple'] as const){const g=ready(map);if(map==='factory')permanentOnly(g);const t=place(g,map==='factory'?40:493,map==='factory'?factoryFloor(40):templeCap(493,525));const e=g.enemy;e.x=map==='factory'?270:557;e.y=g.support(e.x,map==='factory'?factoryFloor(e.x)+1:templeCap(e.x,525)+1)-18;g.wind=0;
  for(const p of safeAIPositions(g,t))assert.ok(g.traversable(t,p.x)!==null&&Math.abs(p.y-t.y)<70);const shot=solveAIShot(g,t,['cannon-normal','cannon-special'],g.opponents(t));assert.ok(shot.effective,map);Object.assign(t,{angle:shot.angle,power:shot.power,direction:shot.direction});const prediction=predictAIImpact(g,t,shot.weapon);let impact:any;const old=(g as any).explode.bind(g);(g as any).explode=(p:any,id:any)=>{impact??={x:p.x,y:p.y};old(p,id);};g.selected=shot.weapon;g.fire(true);for(let i=0;i<2000&&!impact;i++)g.update(1/120);assert.ok(impact);assert.ok(Math.hypot(prediction.x-impact.x,prediction.y-impact.y)<4);assert.ok(e.hp<e.maxHP);
 }
});
test('seeded deployments on both revised maps start safely without slipping or overlap',()=>{
 for(const map of ['factory','temple'] as const)for(let seed=1;seed<=24;seed++){const g=ready(map,seed);for(const t of g.tanks){assert.ok(g.stablePlatform(t.x));assert.ok(g.traversable(t,t.x-30)!==null||g.traversable(t,t.x+30)!==null);}for(let i=0;i<30;i++)g.update(1/120);assert.ok(g.tanks.every(t=>t.hp===t.maxHP&&t.fallVelocity===0&&!t.outOfBounds));}
});
test('supply candidates match the reachable layer, never the roof over a bottom-floor player',()=>{
 let spawned=0;for(const map of ['factory','temple'] as const)for(let seed=1;seed<=20;seed++)for(const breach of [false,true]){const g=ready(map,seed),t=place(g,map==='factory'?500:525,map==='factory'?factoryFloor(500):templeCap(525,525));if(breach)g.crater(t.x,450,110,600);g.turn=4;g.nextTurn();if(!breach)assert.equal(g.crates.length,0,'covered lower layers have no reachable parachute landing');for(const c of g.crates){const p=g.predictSupply(c.x)!;const foot=g.traversable(t,p.x);assert.ok(foot!==null&&Math.abs(p.y+14-foot)<=12);spawned++;}}
 assert.ok(spawned>=20,'after a roof breach genuine reachable supplies are still deployed');
});
