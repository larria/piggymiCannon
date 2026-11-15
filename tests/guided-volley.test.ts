import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';

function volley(double=false){
 const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,controller:'human',team:i%2,vehicle:i===0?'dragon':'cannon'}));
 const g=new Game({slots,map:'valley',seed:52,timer:0,fog:false,fireLine:false,selfDamage:false,friendlyFire:false});g.start();
 g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.wind=0;
 g.tanks.forEach((t,i)=>Object.assign(t,{x:[200,650,70,1150][i],y:432,fallVelocity:0,shield:0}));
 const target=g.tanks[1];g.selectWeapon('dragon-special');g.active.angle=45;
 let best=Infinity;for(let power=10;power<=100;power+=.5){const d=Math.abs(g.predict(45,power,'dragon-special',12,g.active).x-target.x);if(d<best){best=d;g.active.power=power;}}
 assert.ok(best<15);g.active.doubleShot=double;assert.ok(g.fire());
 g.projectiles.forEach((p,i)=>Object.assign(p,{x:target.x-150+(i%9)*10,y:target.y-95,vx:100,vy:100,age:.5}));
 return g;
}
function acquire(g:Game){g.update(.001);assert.equal(g.projectiles.filter(p=>p.delay===0&&p.homing&&p.lockTarget===1).length,9);}
const cached=(g:Game)=>(g as any).volleyTargets as Map<number,{target:number|null}>;

test('dead target clears the nine missiles and cache in the next update, entering resolving',()=>{
 const g=volley();acquire(g);const missiles=[...g.projectiles];g.tanks[1].hp=0;g.update(.001);
 assert.equal(g.projectiles.length,0);assert.equal(cached(g).size,0);assert.equal(g.phase,'resolving');
 assert.ok(missiles.every(p=>p.lockTarget===null&&!p.homing&&p.trail.length===0));
});
test('damage killing a target immediately cancels unlocked and delayed double-shot siblings',()=>{
 const g=volley(true);acquire(g);assert.equal(g.projectiles.length,18);assert.equal(g.projectiles.filter(p=>p.delay>0).length,9);
 g.damage(g.tanks[1],99999,0);assert.equal(g.projectiles.length,0);assert.equal(cached(g).size,0);
 g.update(.001);assert.equal(g.phase,'resolving');assert.equal(g.drainEvents().filter(e=>e.message.includes('双发装填')).length,0);
});
test('ineligible target cancels a whole group before even its delayed members fly',()=>{
 for(const policy of ['team','friendlyFire','selfDamage'] as const){
  const g=volley(true);acquire(g);
  if(policy==='team')g.tanks[1].team=g.active.team;
  else {const target=policy==='selfDamage'?g.active:g.tanks[2];g.config[policy]=true;cached(g).values().next().value!.target=target.id;g.projectiles.forEach(p=>p.lockTarget=target.id);g.update(.001);assert.equal(g.projectiles.length,18);g.config[policy]=false;}
  // Put a delayed member first so validation cannot rely on another missile moving.
  g.projectiles.reverse();g.update(.001);assert.equal(g.projectiles.length,0,policy);assert.equal(cached(g).size,0);assert.equal(g.phase,'resolving');
 }
});
test('killing impact completes damage, excavation and effects but cancels siblings in the same substep',()=>{
 const g=volley(true);acquire(g);const target=g.tanks[1];target.hp=1;
 const before=g.land.mask.reduce((a,b)=>a+b,0),missiles=[...g.projectiles],ages=missiles.map(p=>p.age);
 Object.assign(missiles[0],{x:target.x,y:target.y-10,vx:0,vy:1});
 g.drainEvents();g.update(.001);
 assert.equal(target.hp,0);assert.equal(g.projectiles.length,0);assert.equal(cached(g).size,0);assert.equal(g.phase,'resolving');
 assert.equal(g.drainEvents().filter(e=>e.type==='explosion'&&e.weapon==='dragon-special').length,1);
 assert.equal(g.blasts.length,1);assert.ok(g.particles.length>12);assert.ok(g.land.mask.reduce((a,b)=>a+b,0)<before);
 assert.ok(missiles.slice(1).every((p,i)=>p.age===ages[i+1]),'canceled snapshot entries must not advance or explode');
 assert.equal(g.tanks[0].hp,g.tanks[0].maxHP);assert.equal(g.tanks[2].hp,g.tanks[2].maxHP);
 for(let i=0;i<120&&g.phase==='resolving';i++)g.update(1/120);
 assert.notEqual(g.phase,'flying');assert.notEqual(g.phase,'ended');assert.notEqual(g.current,1);
});
test('very close direct kill before acquisition also disposes the unacquired volley',()=>{
 const g=volley(true),target=g.tanks[1];target.hp=1;assert.equal(cached(g).values().next().value!.target,null);
 Object.assign(g.projectiles[0],{x:target.x,y:target.y-10,vx:0,vy:1,age:.1});g.update(.001);
 assert.equal(target.hp,0);assert.equal(g.projectiles.length,0);assert.equal(cached(g).size,0);assert.equal(g.phase,'resolving');assert.equal(g.blasts.length,1);
});
test('collateral death leaves a volley tracking its living primary target',()=>{
 const g=volley();acquire(g);g.tanks[3].hp=1;g.damage(g.tanks[3],99999,0);assert.equal(g.projectiles.length,9);
 g.update(.001);assert.ok(g.projectiles.every(p=>p.homing&&p.lockTarget===1));assert.equal(cached(g).size,1);
});
test('canceling one group preserves a separate living-target group and ordinary double-shot volleys',()=>{
 const g=volley();acquire(g);const id=g.projectiles[0].volley;
 const other=g.projectiles.map(p=>({...p,volley:id+1,lockTarget:3,trail:[]}));cached(g).set(id+1,{target:3});
 const normal=[0,.35].flatMap(delay=>[-3,0,3].map(a=>({...g.launch(g.active,'dragon-normal',45+a),delay})));
 g.projectiles.push(...other,...normal);g.damage(g.tanks[1],99999,0);
 assert.deepEqual(g.projectiles,[...other,...normal]);assert.equal(cached(g).has(id),false);assert.equal(cached(g).get(id+1)?.target,3);
});
test('last enemy kill retains the blast, completes resolving and declares the team winner once',()=>{
 const g=volley();acquire(g);g.tanks[3].hp=0;const target=g.tanks[1];target.hp=1;
 Object.assign(g.projectiles[0],{x:target.x,y:target.y-10,vx:0,vy:1});g.update(.001);
 assert.equal(g.phase,'resolving');assert.equal(g.blasts.length,1);assert.equal(g.projectiles.length,0);
 for(let i=0;i<500&&g.phase!=='ended';i++)g.update(1/120);
 assert.equal(g.phase,'ended');assert.equal(g.winner,0);assert.equal(g.drainEvents().filter(e=>e.type==='win').length,1);
});
