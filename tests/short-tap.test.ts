import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/engine';import {Terrain} from '../src/terrain';import {defaultSlots} from '../src/crew';import {projectileSpeed,minimumPower} from '../src/ballistics';import {predictAIImpact} from '../src/ai-planner';import {impactDamageScale} from '../src/impact-damage';
function game(friendlyFire=false,selfDamage=false,version='3.2.9'){const g=new Game({slots:defaultSlots().map((s,i)=>({...s,enabled:i<2,team:i,controller:'human',vehicle:'cannon'})),map:'factory',seed:52,timer:0,fog:false,fireLine:false,friendlyFire,selfDamage},version);g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960,true);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:220+i*1200,y:432,fallVelocity:0,direction:1}));g.wind=0;return g;}
test('1–9 extends the physical speed smoothly; 10 retains its exact old speed and low-gravity derivative',()=>{
 assert.equal(minimumPower('3.2.8'),10);assert.equal(minimumPower('3.2.9'),1);assert.equal(projectileSpeed(1),28.5);
 for(const gravity of [230,145,230*.27]){let previous=projectileSpeed(1,1,gravity);for(let p=1.01;p<=10;p+=.01){const speed=projectileSpeed(p,1,gravity);assert.ok(speed>previous);previous=speed;}const h=.0001,left=(projectileSpeed(10,1,gravity)-projectileSpeed(10-h,1,gravity))/h,right=(projectileSpeed(10+h,1,gravity)-projectileSpeed(10,1,gravity))/h;assert.ok(Math.abs(left-right)<.02);}
 const g=game();g.setAim(35,1);assert.equal(g.active.power,1);const p=g.launch(g.active,'cannon-normal');assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-28.5)<1e-8);const old=game(false,false,'3.2.8');old.setAim(35,1);assert.equal(old.active.power,10);
});
test('shooter collision is ignored, while friendly-fire or explicit self-damage permits explosion self harm',()=>{
 for(const friendlyFire of [false,true])for(const selfDamage of [false,true]){const g=game(friendlyFire,selfDamage),t=g.active;const p=g.launch(t,'cannon-normal');Object.assign(p,{x:t.x,y:t.y,age:1});assert.equal((g as any).projectileHit(p),undefined);Object.assign(p,{x:t.x+15,y:450});(g as any).explode(p);assert.equal(t.hp<t.maxHP,friendlyFire||selfDamage);}
 const old=game(true,false,'3.2.8');assert.equal(old.canDamage(old.active,old.active.id),false);
});
test('minimum 1 shot still reaches a touching enemy without self harm by default',()=>{
 const g=game();g.tanks[1].x=g.active.x+56;g.tanks[1].direction=-1;g.setAim(35,1);g.fire();for(let i=0;i<500&&g.phase==='flying';i++)g.update(1/120);assert.ok(g.tanks[1].hp<g.tanks[1].maxHP);assert.equal(g.tanks[0].hp,g.tanks[0].maxHP);
});
test('new low-force AI prediction and real flight share speed and ignore the shooter',()=>{
 for(const power of [1,5,9])for(const wind of [-9,0,9]){const g=game();g.wind=wind;g.setAim(35,power);const predicted=predictAIImpact(g,g.active,'cannon-normal');let hit:any;const explode=(g as any).explode.bind(g);(g as any).explode=(p:any,id:any)=>{hit??={x:p.x,y:p.y};return explode(p,id);};g.fire();for(let i=0;i<1200&&!hit;i++)g.update(1/120);assert.ok(hit);assert.ok(Math.hypot(hit.x-predicted.x,hit.y-predicted.y)<4);}
});
test('restore amount falls off like damage, including strength, direct rim hits and out-of-range rejection',()=>{
 for(const offset of [0,40,85,120]){const g=game(),t=g.active;t.hp=10;const p={...g.launch(t,'cannon-normal'),healing:true,boost:1.5,fireBoosted:true,boostSources:{fire:'item',rage:1,snow:1},x:t.x+offset,y:t.y};(g as any).explode(p);const scale=impactDamageScale(t,p.x,p.y,0,78,false);const expected=offset>104?0:Math.round(t.maxHP*.4*1.5*scale);assert.equal(t.hp-10,expected);if(expected){const e=g.battleSnapshot().events.filter(e=>e.type==='heal'&&e.data.factors).at(-1)!;assert.equal(e.data.requested,Math.round(e.data.base*e.data.factors.reduce((n:number,f:any)=>n*f.value,1)));assert.ok(e.data.factors.some((f:any)=>f.source.includes('距离衰减')));}}
 const rim=game(true),ally=rim.tanks[1];ally.hp=10;const edge={...rim.launch(rim.active,'cannon-normal'),healing:true,x:ally.x+30,y:ally.y-9};(rim as any).restoreImpact(edge,ally.id);assert.ok(ally.hp-10<Math.round(ally.maxHP*.4));
 const g=game(),t=g.active;t.hp=10;g.useItem('repair');g.setAim(35,1);g.fire();for(let i=0;i<500&&g.phase==='flying';i++)g.update(1/120);assert.equal(t.hp,10+Math.round(t.maxHP*.4));
});
test('destroyed crates have fragments and diagnostic events but no destroyed-label floating text',()=>{
 const g=game();g.crates=[{x:700,y:436,type:'double'}];g.crater(700,450,40,40,{owner:0,weapon:'cannon-normal'});assert.equal(g.crates.length,0);assert.ok(g.particles.length);assert.ok(g.battleSnapshot().events.some(e=>e.type==='crate-destroy'));assert.ok(g.texts.every(t=>!t.text.includes('箱子摧毁')));
});
