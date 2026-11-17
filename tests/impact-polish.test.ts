import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {Terrain} from '../src/terrain';
import {ALL_WEAPONS,excavation,DIRECT_DIG_DEPTH_REDUCTION,weaponDamage} from '../src/catalog';
import {vehicleById,type VehicleId} from '../src/vehicles';import {PIERCING_DAMAGE} from '../src/piercing';
import {eraDamageFactor} from '../src/era-damage';import {predictAIImpact} from '../src/ai-planner';import {ReplayRecorder,ReplayPlayer} from '../src/replay';
function ready(target:VehicleId='missile',version='4.0.2',permanent=false){const slots=defaultSlots();slots[0].vehicle='missile';slots[1].vehicle=target;slots[1].controller='human';const g=new Game({slots,map:'factory',seed:52,timer:0,fallDamage:false,fog:false,fireLine:false},version);g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960,permanent);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:i?700:150,y:432,fallVelocity:0}));g.wind=0;return g;}
const ev=(g:Game,type:string)=>g.battleSnapshot().events.filter(e=>e.type===type);
const finish=(g:Game)=>{for(let i=0;i<1600&&g.projectiles.length;i++)g.update(.005);assert.equal(g.projectiles.length,0);};
function hit(g:Game,double=false){g.active.doubleShot=double;assert.ok(g.fire());g.projectiles.forEach(p=>Object.assign(p,{x:700,y:408,vx:0,vy:500,age:2}));}
test('every direct crater keeps full width and subtracts the same 65 depth after dig boost, except satellite',()=>{
 for(const w of ALL_WEAPONS)for(const boost of [1,1.15]){const full=excavation(w.id,false,'4.0.2',boost),direct=excavation(w.id,true,'4.0.2',boost);assert.equal(direct.radius,full.radius,w.id);assert.equal(direct.depth,w.id==='ion-special'?full.depth:Math.max(0,full.depth-DIRECT_DIG_DEPTH_REDUCTION),w.id);}
 const full=excavation('cannon-normal',false),direct=excavation('cannon-normal',true);assert.equal(direct.depth,full.depth/3);assert.equal(excavation('cannon-special',true).depth,0);assert.equal(excavation('missile-normal',true).depth,0);
});
test('actual head contact digs a same-width one-third shallow cannon crater and red bean removes no terrain',()=>{
 for(const id of ['cannon-normal','cannon-special'] as const){const g=ready(),e=g.tanks[1],mask=g.land.mask.slice();const p={...g.launch(g.active,id),x:e.x,y:e.y-20};(g as any).explode(p,e.id);
  if(id==='cannon-special'){assert.deepEqual(g.land.mask,mask);assert.equal(ev(g,'terrain').length,0);}
  else{const terrain=ev(g,'terrain')[0].data;assert.equal(terrain.radius,99.9);assert.equal(terrain.depth,32.5);assert.ok(g.ground(700)>=482&&g.ground(700)<=485);assert.equal(g.land.solid(795,453),false);assert.equal(g.land.solid(795,466),true);}
  assert.ok(e.hp<e.maxHP);assert.equal(ev(g,'excavation-profile')[0].data.depthReduction,65);
 }
});
test('Flyfire actual direct chains stay at the body, deliver four descending rounds and leave no pit for all defender eras',()=>{
 for(const id of ['bowl','beetle','missile','water','dragon'] as VehicleId[])for(const permanent of [false,true]){const g=ready(id,'4.0.2',permanent),e=g.tanks[1],mask=g.land.mask.slice();hit(g);finish(g);const ds=ev(g,'damage').filter(e=>e.data.target===1).map(e=>e.data);const expected=PIERCING_DAMAGE.map(f=>Math.round(210*f*eraDamageFactor('missile',id).value));assert.deepEqual(ds.map(d=>d.requested),expected,id);assert.equal(e.maxHP-e.hp,expected.reduce((n,d)=>n+d,0));assert.equal(ds.length,4);assert.deepEqual(g.land.mask,mask);assert.equal(ev(g,'terrain').length,0);assert.equal(new Set(ev(g,'impact').map(e=>JSON.stringify([e.data.x,e.data.y]))).size,1);assert.ok(ds.every(d=>d.base===210));
  for(const d of ds)assert.equal(d.requested,Math.round(d.base*d.factors.reduce((n:number,f:any)=>n*f.value,1)));
 }
});
test('Flyfire tuning is approximately half HP on common defenders, preserves era discount and does not amplify splash to full damage',()=>{
 for(const id of ['bowl','missile','water','sea'] as VehicleId[]){const max=vehicleById(id).hp,total=PIERCING_DAMAGE.reduce((n,f)=>n+Math.round(210*f*eraDamageFactor('missile',id).value),0);assert.ok(total/max>=.4&&total/max<=.6,`${id}: ${total}/${max}`);}
 const g=ready(),e=g.tanks[1];const p={...g.launch(g.active,'missile-normal'),x:e.x+60,y:e.y};(g as any).explode(p);assert.ok(ev(g,'damage')[0].data.requested<80);assert.equal(ev(g,'pierce-contact').length,0);
});
test('boost and double restart the four section taper, fire line does not double boost, shields absorb once',()=>{
 const g=ready('dragon');g.active.boost=true;g.tanks[1].shield=45;g.fireLine={x:699,top:0,bottom:950};hit(g,true);finish(g);const ds=ev(g,'damage').filter(e=>e.data.target===1).map(e=>e.data);assert.equal(ds.length,8);assert.deepEqual(ds.map(d=>d.origin.section),[1,2,3,4,1,2,3,4]);assert.equal(ds.reduce((n,d)=>n+d.absorbed,0),45);for(const d of ds){assert.equal(d.origin.boost,1.5);assert.equal(d.requested,Math.round(d.base*d.factors.reduce((n:number,f:any)=>n*f.value,1)));}
});
test('self/friendly protection and first-section kill remain authoritative; no corpse hits or following a moved victim',()=>{
 const g=ready();g.tanks[1].hp=1;hit(g);finish(g);assert.equal(ev(g,'impact').length,4);assert.equal(ev(g,'death').length,1);assert.equal(ev(g,'damage').filter(e=>e.data.target===1).length,1);assert.equal(ev(g,'terrain').length,0);
 const h=ready();hit(h);h.update(.005);const contact={...h.projectiles[0].pierceContact!};h.tanks[1].x+=300;const hp=h.tanks[1].hp;finish(h);assert.equal(h.tanks[1].hp,hp);assert.ok(ev(h,'impact').every(e=>e.data.x===contact.x));
 const k=ready();k.tanks[1].team=k.active.team;const hp2=k.tanks[1].hp;(k as any).explode({...k.launch(k.active,'missile-normal'),x:700,y:432},1);assert.equal(k.tanks[1].hp,hp2);
});
test('terrain-only Flyfire still penetrates forward with full depth and tapered width',()=>{const g=ready();g.tanks[1].x=1750;assert.ok(g.fire());Object.assign(g.projectiles[0],{x:960,y:449,vx:0,vy:500,age:2});finish(g);assert.equal(ev(g,'impact').length,4);assert.equal(ev(g,'pierce-contact').length,0);const digs=ev(g,'terrain');assert.deepEqual(digs.map(e=>e.data.depth),[39,39,39,39]);assert.ok(digs[3].data.y>digs[0].data.y+70);});
test('bowl normal crater is modestly smaller; satellite full curved crater lies between cannon and laser even on direct hit',()=>{
 const before=excavation('bowl-normal',false,'4.0.1'),after=excavation('bowl-normal',false,'4.0.2');assert.ok(after.radius<before.radius&&after.radius>before.radius*.85);assert.ok(after.depth<before.depth&&after.depth>before.depth*.85);
 const cannon=excavation('cannon-normal',false),ion=excavation('ion-special',true),laser=excavation('laser-normal',false);assert.ok(cannon.radius>ion.radius&&ion.radius>laser.radius);assert.ok(cannon.depth>ion.depth&&ion.depth>laser.depth);assert.ok(Math.abs(cannon.radius/cannon.depth-ion.radius/ion.depth)<.03);
 const a=ready(),b=ready();for(const [g,direct] of [[a,true],[b,false]] as const){const e=g.tanks[1];(g as any).explode({...g.launch(g.active,'ion-special'),x:e.x,y:450,sub:true},direct?1:undefined);}assert.deepEqual(a.land.mask,b.land.mask);assert.deepEqual(ev(a,'terrain').map(e=>[e.data.radius,e.data.depth]),[[91.80000000000001,90]]);assert.equal(ev(a,'excavation-profile')[0].data.depthReduction,0);
});
test('AI direct estimate shares all four section bases and rounding without mutating RNG or terrain',()=>{
 const g=ready();g.tanks[1].x=330;const before=g.battleSnapshot();const plan=predictAIImpact(g,g.active,'missile-normal',35,14);assert.equal(plan.hits.find(h=>h.body.tank.id===1)?.direct,true);assert.deepEqual(g.battleSnapshot(),before);g.setAim(35,14);assert.ok(g.fire());finish(g);const total=ev(g,'damage').filter(e=>e.data.target===1).reduce((n,e)=>n+e.data.requested,0);assert.ok(Math.abs(total-plan.hits.find(h=>h.body.tank.id===1)!.damage)<=3);
});
test('mid-chain snapshot and exact saved replay restore anchored sections, HP, terrain and RNG',()=>{
 const g=ready();hit(g);g.update(.005);assert.ok(g.projectiles[0].pierceContact);const snapshot=g.battleSnapshot(),h=Game.fromBattleSnapshot(JSON.parse(JSON.stringify(snapshot))),r=new ReplayRecorder(g);for(let i=0;i<80;i++){g.update(.007);h.update(.007);}assert.deepEqual(h.battleSnapshot().current,g.battleSnapshot().current);assert.deepEqual(h.battleSnapshot().rng,g.battleSnapshot().rng);const player=new ReplayPlayer(r.export());for(let i=0;i<100&&!player.done;i++)player.advance(.02);assert.equal(player.verified,true);r.detach();assert.match(g.battleSnapshotText(),/固定65/);assert.match(g.battleSnapshotText(),/飞火第4\/4段递减/);
});
test('4.0.0/4.0.1 recordings retain 120 base damage, body crater reduction and original satellite/bowl parameters',()=>{
 for(const v of ['3.2.2','4.0.0','4.0.1']){assert.equal(weaponDamage('missile-normal',v),120);assert.deepEqual(excavation('cannon-normal',true,v),{radius:44.4,depth:42.25});assert.equal(excavation('bowl-normal',false,v).depth,60);assert.equal(excavation('ion-special',true,v).depth,42);const g=ready('missile',v);hit(g);finish(g);assert.ok(ev(g,'terrain').length>0);assert.equal(ev(g,'pierce-contact').length,0);assert.ok(ev(g,'damage').every(e=>e.data.base===120));}
});
