import {test} from 'node:test';import assert from 'node:assert/strict';import {Game,FLIGHT_SPEED} from '../src/engine';import {defaultSlots} from '../src/crew';import {landings} from './salvo-fixture';import {impactDamageScale} from '../src/impact-damage';import {DOUBLE_SHOT_INTERVAL,salvoProfile} from '../src/salvo';import {weaponById} from '../src/catalog';
function ready(){const slots=defaultSlots().map(s=>({...s,controller:'human' as const,vehicle:'cannon' as const}));const g=new Game({slots,seed:52,timer:0,fog:false,fireLine:false});g.start();g.wind=0;return g;}
test('Multi normal/special spread at ordinary angles and only headwind high arcs focus, mirrored for left aim',()=>{
 for(const w of ['multi-normal','multi-special'] as const)for(const direction of [-1,1]){
  for(const angle of [30,45,50])for(const wind of [0,11*direction]){const row=landings(w,angle,30,wind,0,direction);assert.equal(row.n,w==='multi-normal'?3:9);assert.ok(row.span>90,`${w}/${angle}/${wind} ${row.span}`);}
  const slope=-28.5*Math.PI/180*direction,focus=landings(w,50,30,-11*direction,slope,direction),calm=landings(w,50,30,0,slope,direction),tail=landings(w,50,30,11*direction,slope,direction);
  assert.equal(focus.n,w==='multi-normal'?3:9);assert.ok(focus.span<8,`${w}: ${focus.span}`);assert.ok(calm.span>50);assert.ok(tail.span>calm.span);assert.deepEqual(focus,landings(w,50,30,-11*direction,slope,direction));
 }
});
test('narrow full-hit core preserves centre damage; edge hits and 20px splash attenuate on either facing/slope',()=>{
 const g=ready(),t=g.tanks[1];for(const slope of [-.5,0,.5])for(const direction of [-1,1]){t.direction=direction;const world=(x:number,y:number)=>({x:t.x+x*direction*Math.cos(slope)-y*Math.sin(slope),y:t.y+x*direction*Math.sin(slope)+y*Math.cos(slope)});
 for(const [x,y] of [[0,0],[-10,-27]]){const p=world(x,y);assert.equal(impactDamageScale(t,p.x,p.y,slope,50,true),1);}
 const p=world(-30,-27),factor=impactDamageScale(t,p.x,p.y,slope,50,true);assert.ok(factor>=.65&&factor<.95);
 }
 assert.equal(impactDamageScale(t,t.x+18,t.y,0,50,false),1);assert.ok(impactDamageScale(t,t.x+20,t.y,0,50,false)<1);
});
test('edge attenuation is recorded once and stacks with boost/era/shield; centre remains full and corpse is untouched',()=>{
 const g=ready(),t=g.tanks[1];t.shield=10;g.active.boost=true;const p=g.launch(g.active,'cannon-normal');Object.assign(p,{x:t.x-30*t.direction,y:t.y-27});const before=t.hp;(g as any).explode(p,1);const e=g.battleSnapshot().events.filter(e=>e.type==='damage'&&e.data.target===1).at(-1)!.data;
 assert.ok(e.requested<weaponById(p.weapon).damage*1.5);assert.equal(e.factors.filter((f:any)=>f.source==='距离衰减').length,1);assert.equal(e.requested,Math.round(e.base*e.factors.reduce((n:number,f:any)=>n*f.value,1)));assert.equal(before-t.hp,e.requested-10);assert.match(g.battleSnapshotText(),/距离衰减/);
});
test('double salvo waits .75 real simulation seconds, stays in one action and pauses its pending launch',()=>{
 const g=ready();g.active.power=10;g.active.doubleShot=true;assert.ok(g.fire());const echo=g.projectiles.find(p=>p.echo)!;assert.equal(echo.delay,DOUBLE_SHOT_INTERVAL*FLIGHT_SPEED);g.drainEvents();let gap=0;for(let i=0;i<89;i++){g.update(1/120);gap+=1/120;}assert.ok(echo.delay>0);assert.equal(g.phase,'flying');assert.equal(g.drainEvents().filter(e=>e.type==='shot').length,0);
 g.paused=true;const remaining=echo.delay;g.update(.05);assert.equal(echo.delay,remaining);g.paused=false;for(let i=0;i<3;i++)g.update(1/120);assert.equal(g.drainEvents().filter(e=>e.type==='shot').length,1);assert.equal(g.turn,0);assert.equal(g.active.shots,1);assert.ok(gap>.7);
});

test('legacy carrier salvos and Dragon retain their existing spread profile',()=>{for(const id of ['multi','dragon'] as const){assert.equal(salvoProfile(id,'triple',0,3).vx,.975);assert.equal(salvoProfile(id,'triple',2,3).vy,1.025);}assert.equal(salvoProfile('dragon','dragon-special',0,9).aimX,-20);});
