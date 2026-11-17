import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
import {permanentPiercingContact,PIERCING_DAMAGE} from '../src/piercing';
const events=(g:Game,type:string)=>g.battleSnapshot().events.filter(e=>e.type===type);
function temple(doubled=false,boost=false){
 const slots=defaultSlots();slots[0].vehicle='missile';slots[1].vehicle='bowl';slots[1].controller='human';
 const g=new Game({slots,map:'temple',timer:0,fog:false,fireLine:false,seed:3827673668},'3.2.2');g.start();g.wind=0;g.crater(960,400,1400,300);
 Object.assign(g.tanks[0],{x:143,y:g.support(143,750)-18,fallVelocity:0,doubleShot:doubled,boost});Object.assign(g.tanks[1],{x:960,y:g.support(960,750)-18,fallVelocity:0});
 assert.ok(g.fire());g.projectiles.forEach(p=>Object.assign(p,{x:972,y:g.tanks[1].y+16,vx:100,vy:650,age:2}));return g;
}
function finish(g:Game){for(let i=0;i<2400&&g.projectiles.length;i++)g.update(1/120);assert.equal(g.projectiles.length,0);assert.equal(g.phase,'resolving');}
test('a descending late-body hit over the thin permanent mushroom preserves four real damage events instead of one',()=>{
 for(const dx of [0,12,22])for(const vx of [0,100,300]){
  const g=temple(),t=g.tanks[1];Object.assign(g.projectiles[0],{x:t.x+dx,vx});const before=g.land.protectedMask.slice();finish(g);
  const damage=events(g,'damage').filter(e=>e.data.target===1);assert.equal(damage.length,4,`${dx}/${vx}`);assert.deepEqual(events(g,'impact').map(e=>e.data.section),[1,2,3,4]);
  assert.deepEqual(g.land.protectedMask,before);assert.ok(events(g,'projectile-blocked').length===1);assert.ok(damage.every(e=>e.data.actual>0));
  for(let i=1;i<4;i++)assert.ok(damage[i].data.requested<damage[i-1].data.requested);
  assert.ok(events(g,'impact').every(e=>e.data.y<812),'no underground blasts or delayed out-of-bounds carrier');
 }
});
test('first damage is unchanged and each following section adds its own descending factor exactly once',()=>{
 const g=temple();Object.assign(g.projectiles[0],{x:960,y:790,vx:0});finish(g);const damage=events(g,'damage').filter(e=>e.data.target===1).map(e=>e.data);
 assert.deepEqual(damage.map(e=>e.requested),[96,77,58,38]);
 damage.forEach((e,i)=>{assert.equal(e.base,120);assert.equal(e.origin.section,i+1);assert.equal(e.factors.filter((f:any)=>f.source.includes('段递减')).length,1);assert.equal(e.factors.find((f:any)=>f.source.includes('段递减')).value,PIERCING_DAMAGE[i]);assert.equal(e.requested,Math.round(e.base*e.factors.reduce((n:number,f:any)=>n*f.value,1)));});
 assert.match(g.battleSnapshotText(),/飞火第4\/4段递减/);
});
test('remaining sections hit at a swept permanent surface even during cooldown; a four-pixel cap cannot be skipped',()=>{
 const g=temple();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1920;x++)g.land.column(x,800,804,true);g.land.rebuild();
 const hit=permanentPiercingContact(g.land,960,790,960,830);assert.ok(hit&&hit.y>=800&&hit.y<804);
 Object.assign(g.projectiles[0],{x:960,y:790,vx:0,vy:900,hitCooldown:.025});finish(g);assert.equal(events(g,'impact').length,4);assert.ok(events(g,'impact').every(e=>e.data.y>=800&&e.data.y<804));assert.ok(g.land.solid(960,802));
});
test('destructible terrain still excavates and continues forward without a permanent-surface stop',()=>{
 const g=temple();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:i?1700:200,y:432,fallVelocity:0}));
 Object.assign(g.projectiles[0],{x:960,y:449,vx:0,vy:500});finish(g);const impacts=events(g,'impact');assert.equal(impacts.length,4);assert.ok(impacts[3].data.y>impacts[0].data.y+70);assert.equal(events(g,'projectile-blocked').length,0);assert.ok(g.ground(960)>550);
});
test('boost, one fire-line multiplier, shields and double-shot do not reset or compound the four-section profile',()=>{
 const g=temple(true,true);g.fireLine={x:971,top:0,bottom:900};g.tanks[1].shield=45;
 g.projectiles.forEach(p=>p.x=970);finish(g);const impacts=events(g,'impact'),damage=events(g,'damage').filter(e=>e.data.target===1).map(e=>e.data);
 assert.equal(impacts.length,8);assert.deepEqual(impacts.map(e=>e.data.section),[1,2,3,4,1,2,3,4]);assert.equal(damage.length,8);
 damage.forEach((e,i)=>{assert.equal(e.origin.boost,1.5);assert.equal(e.factors.find((f:any)=>f.source.includes('段递减')).value,PIERCING_DAMAGE[i%4]);assert.equal(e.factors.filter((f:any)=>f.source.includes('fireBoosted')).length,1);assert.equal(e.requested,Math.round(e.base*e.factors.reduce((n:number,f:any)=>n*f.value,1)));});assert.equal(damage.reduce((n,e)=>n+e.absorbed,0),45);
});
test('a first-section kill preserves the corpse, concludes remaining terrain explosions, and records only one death',()=>{
 const g=temple();g.tanks[1].hp=1;finish(g);assert.equal(events(g,'impact').length,4);assert.equal(events(g,'damage').filter(e=>e.data.target===1).length,1);assert.equal(events(g,'death').length,1);assert.ok(g.tanks[1].defeat);assert.equal(g.tanks[1].outOfBounds,false);assert.equal(g.resolveTime,2.4);assert.equal(g.phase,'resolving');
});
test('a current-state snapshot during a stopped carrier restores the same remaining sections and RNG',()=>{
 const g=temple();g.update(.005);const snapshot=g.battleSnapshot(),h=Game.fromBattleSnapshot(snapshot);assert.ok(g.projectiles[0].penetrations>0);
 for(let i=0;i<60;i++){g.update(.007);h.update(.007);}assert.deepEqual(h.tanks,g.tanks);assert.deepEqual(h.battleSnapshot().rng,g.battleSnapshot().rng);assert.deepEqual(events(h,'impact'),events(g,'impact'));
});
