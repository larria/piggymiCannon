import test from 'node:test';import assert from 'node:assert/strict';
import {Game,makeRng} from '../src/engine';import {defaultSlots} from '../src/crew';import {vehicleById} from '../src/vehicles';
import {snapshotText,packTerrain,unpackTerrain,TRACE_LIMIT,TRACE_BYTE_LIMIT} from '../src/battle-trace';
import {readFileSync} from 'node:fs';
function flat(vehicle:any='cannon',rules={}){
 const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,team:i%2,controller:'human',vehicle:i===0?vehicle:'cannon'}));
 const g=new Game({slots,seed:52,map:'valley',timer:0,fallDamage:true,fog:false,fireLine:false,...rules},'test-version');g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();
 g.wind=0;g.tanks.forEach((t,i)=>Object.assign(t,{x:[200,650,70,1150][i],y:432,fallVelocity:0}));return g;
}
const entries=(g:Game,type:string)=>g.battleSnapshot().events.filter(e=>e.type===type);
function impact(g:Game,id:any=g.selected){const t=g.tanks[1];(g as any).explode({...g.launch(g.active,id),x:t.x,y:t.y-10},t.id);}

test('match-local snapshots retain initial seed, four flags, version, resolved deployment and actual rules',()=>{
 const g=flat('water',{snow:true,selfDamage:true,friendlyFire:true,allowDragon:true});const s=g.battleSnapshot();
 assert.equal(s.formatVersion,1);assert.equal(s.gameVersion,'test-version');assert.equal(s.initial.config.seed,52);assert.equal(s.initial.slots.length,4);assert.equal(s.initial.slots[0].vehicleName,'水鬼');assert.equal(s.initial.slots[1].flag.letter,'B');assert.equal(s.initial.rules.雪,true);assert.equal(s.initial.rules.自伤,true);assert.ok(s.initial.deployed[0].ammo);
 g.tanks[1].hp=1;impact(g);const before=g.battleSnapshot();g.battleSnapshotText();assert.deepEqual(g.battleSnapshot(),before);
 const other=flat();assert.equal(entries(other,'death').length,0);assert.notDeepEqual(other.battleSnapshot().events,g.battleSnapshot().events);
 assert.equal(other.battleSnapshot().events[0].sequence,1);assert.equal(other.battleSnapshot().critical.length,0);
});
test('diagnostics do not consume random values; visual RNG is counted without per-particle events',()=>{
 const g=flat(),before=g.battleSnapshot().rng,n=entries(g,'rng').length;g.burst(200,200,7,'#fff');const after=g.battleSnapshot().rng;
 assert.equal(after.index-before.index,28);assert.equal(entries(g,'rng').length,n);
 const raw=makeRng(52);for(let i=0;i<after.index;i++)raw();assert.equal((g as any).rng(),raw());
 const resumed=makeRng(after.state);assert.equal(resumed(),makeRng(after.state)());
});
test('damage ledger reconstructs real multiplier paths, shield absorption and lethal HP changes',()=>{
 for(const vehicle of ['sea','water','dragon'] as const){
  const g=flat(vehicle,{snow:true});g.active.boost=true;if(vehicle==='sea')g.active.hp=200;
  const e=g.tanks[1];e.hp=100;e.shield=40;impact(g,vehicleById(vehicle).normal);
  const row=entries(g,'damage').find(e=>e.data.target===1)!.data;
  assert.equal(Math.round(row.base*row.factors.reduce((n:number,f:any)=>n*f.value,1)),row.requested);assert.equal(row.absorbed,40);assert.equal(row.actual,Math.min(100,row.requested-40));assert.equal(row.hpBefore,100);assert.equal(row.hpAfter,e.hp);
  assert.equal(row.factors.find((f:any)=>f.source.includes('fireBoosted')).value,1.5);assert.equal(row.factors.find((f:any)=>f.source==='海怪发怒').value,vehicle==='sea'?1.5:1);assert.equal(row.factors.find((f:any)=>f.source==='水鬼雪天').value,vehicle==='water'?1.25:1);
  assert.ok(row.origin);assert.ok(row.dig);if(vehicle==='dragon')assert.match(row.origin.dragon,/无额外暴龙倍率/);
 }
});
test('fire line observes an already boosted projectile without multiplying its damage a second time',()=>{
 const g=flat();g.active.boost=true;g.fireLine={x:600,top:0,bottom:500};g.fireLineTurnsRemaining=2;g.fire();
 const p=g.projectiles[0];Object.assign(p,{x:599,y:300,vx:250,vy:0,age:.2});g.update(.01);assert.equal(p.boost,1.5);
 assert.equal(entries(g,'fire-line').length,1);assert.match(entries(g,'fire-line')[0].summary,/不重复/);
 const target=g.tanks[1];Object.assign(p,{x:target.x,y:target.y});(g as any).explode(p,target.id);const row=entries(g,'damage').find(e=>e.data.target===1)!.data;
 assert.equal(row.origin.boost,1.5);assert.equal(row.factors.filter((f:any)=>f.source.includes('fireBoosted')).length,1);
});
test('real lethal paths name direct hits, mines, fire, gas, falls, out-of-bounds and sudden death separately',()=>{
 for(const cause of ['direct','mine','fire','gas','fall','out','sudden']){
  const g=flat(),e=g.tanks[1];e.hp=1;
  if(cause==='direct')impact(g);
  if(cause==='mine'){g.mines=[{x:e.x,y:e.y+16,owner:0,weapon:'mine-special',boost:1}];(g as any).triggerMines(e);}
  if(cause==='fire'){g.fires=[{x:e.x,y:450,radius:40,turns:6,owner:0,weapon:'bowl-special',clock:1}];g.update(.001);}
  if(cause==='gas'){g.gases=[{x:e.x,y:e.y,radius:40,turns:6,owner:0,clock:1}];g.update(.001);}
  if(cause==='fall'){e.y=300;e.fallStart=240;e.fallVelocity=600;for(let i=0;i<80&&e.hp>0;i++)g.update(.01);}
  if(cause==='out'){e.y=960;g.update(.001);}
  if(cause==='sudden'){g.turn=39;g.nextTurn();}
  assert.equal(e.hp,0,cause);const death=entries(g,'death').find(row=>row.data.target===1)!;assert.equal(death.data.cause,cause);assert.equal(death.data.lethal.hpBefore,1);assert.equal(death.data.lethal.hpAfter,0);assert.ok(death.data.damageEvent);assert.match(death.summary,/死亡/);
 }
});
test('poison records its red-health floor and cannot become an unexplained death',()=>{
 const g=flat(),e=g.tanks[1];g.current=1;e.poisoned=true;e.poisonOwner=0;e.hp=Math.ceil(e.maxHP*.3)+2;g.nextTurn();
 const poison=entries(g,'damage').find(e=>e.data.cause==='poison')!.data;assert.equal(poison.actual,2);assert.equal(poison.origin.redFloor,Math.ceil(e.maxHP*.3));assert.equal(entries(g,'death').length,0);
});
test('a lethal fall keeps the excavating weapon and terrain cause even after the timeline is truncated',()=>{
 const g=flat(),e=g.tanks[1];g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=1280;x++){g.land.column(x,450,460);g.land.column(x,550,554,true);}g.land.rebuild();e.hp=1;
 g.crater(e.x,450,45,60,{owner:0,weapon:'ion-special',traceId:12});for(let i=0;i<200&&e.hp>0;i++)g.update(.01);
 for(let i=0;i<2000;i++)(g as any).recordBattle('test','后续事件',{i});
 const death=g.battleSnapshot().critical.find(e=>e.type==='death')!;assert.equal(death.data.cause,'fall');assert.equal(death.data.lethal.weapon,'ion-special');assert.equal(death.data.fallOrigin.source.traceId,12);assert.ok(death.data.fallOrigin.terrain.removed>0);assert.match(death.summary,/挖土/);assert.ok(g.battleSnapshot().truncation.dropped>0);
});
test('default self/friendly damage blocks are explicit and do not alter HP',()=>{
 const g=flat();g.tanks[2].x=g.tanks[1].x-10;impact(g);const blocked=entries(g,'damage-blocked').find(e=>e.data.target===2)!;
 assert.ok(blocked);assert.equal(g.tanks[2].hp,g.tanks[2].maxHP);assert.equal(blocked.data.rules.友伤,false);
});
test('transfer action distinguishes the actual transfer carrier from the selected cannon weapon',()=>{
 const g=flat();assert.ok(g.useItem('teleport'));assert.ok(g.fire());const action=entries(g,'fire-action')[0];assert.equal(action.data.transfer,true);assert.equal(action.data.weapon,'shell');assert.equal(action.data.selectedWeapon,'cannon-normal');assert.equal(g.projectiles[0].transfer,true);
});
test('continuous movement and aim are coalesced into actions with accurate endpoints and fuel',()=>{
 const g=flat(),start=g.active.x,fuel=g.active.fuel;for(let i=0;i<100;i++)g.move(1,.005);for(let i=0;i<100;i++)g.setAim(20+i*.1,40+i*.1);
 const moves=entries(g,'move'),aims=entries(g,'aim');assert.equal(moves.length,1);assert.equal(aims.length,1);assert.equal(moves[0].data.from.x,start);assert.equal(moves[0].data.to.x,g.active.x);assert.equal(moves[0].data.fuelBefore,fuel);assert.equal(moves[0].data.fuelAfter,g.active.fuel);
 assert.ok(Math.abs(moves[0].data.distance-(g.active.x-start))<1e-8);assert.equal(aims[0].data.to.power,g.active.power);
});
test('simultaneous steering and aiming still records actions rather than two entries per frame',()=>{
 const g=flat();for(let i=0;i<100;i++){g.move(1,.005);g.setAim(20+i*.1,40+i*.1);g.elapsed+=.005;}
 assert.equal(entries(g,'move').length,1);assert.equal(entries(g,'aim').length,1);assert.ok(entries(g,'move')[0].data.endedAt>0);
 const s=g.battleSnapshot();assert.ok(s.events.every((e,i)=>i===0||e.time>=s.events[i-1].time));
});
test('golden volley snapshot restores terrain, delayed rounds, live locks and exact future random/physics state',()=>{
 const g=flat('dragon');g.active.doubleShot=true;g.selectWeapon('dragon-special');g.active.angle=45;g.active.power=35;g.fire();
 for(let i=0;i<40;i++)g.update(.01);const s=g.battleSnapshot(),restored=Game.fromBattleSnapshot(s);
 assert.deepEqual(restored.land.mask,g.land.mask);assert.deepEqual(restored.land.protectedMask,g.land.protectedMask);assert.equal(restored.active.ammo['dragon-special'],Infinity);
 for(let i=0;i<600;i++){g.update(.005);restored.update(.005);}
 assert.deepEqual(restored.tanks,g.tanks);assert.deepEqual(restored.land.mask,g.land.mask);assert.equal(restored.phase,g.phase);assert.equal(restored.current,g.current);assert.deepEqual(restored.battleSnapshot().rng,g.battleSnapshot().rng);
 assert.deepEqual(restored.projectiles.map(({trail,...p})=>p),g.projectiles.map(({trail,...p})=>p));
});
test('bounded buffer retains initial configuration and the complete lethal chain after history truncation',()=>{
 const g=flat();g.tanks[1].hp=1;impact(g);for(let i=0;i<5000;i++)(g as any).recordBattle('test','压力事件'+i,{text:'测'.repeat(300)});
 const s=g.battleSnapshot();assert.ok(s.events.length<=TRACE_LIMIT);assert.ok(new TextEncoder().encode(JSON.stringify(s.events)).length<TRACE_BYTE_LIMIT+TRACE_LIMIT);assert.ok(s.truncation.dropped>0);assert.equal(s.initial.config.seed,52);assert.equal(s.critical.filter(e=>e.type==='death').length,1);assert.ok(s.critical.find(e=>e.type==='death')!.data.lethal.factors.length);
 const text=snapshotText(s),json=JSON.parse(text.split('```json\n')[1].split('\n```')[0]);assert.deepEqual(json,s);assert.match(text,/死亡/);assert.match(text,/截断/);assert.ok(new TextEncoder().encode(text).length<1_500_000);
 const numbers=[...text.matchAll(/^#(\d+) /gm)].map(m=>+m[1]);assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));assert.equal(new Set(numbers).size,numbers.length);
});
test('terrain compression retains caves and permanent pixels and has a bounded fragmentation fallback',()=>{
 for(const fragmented of [false,true]){const a=new Uint8Array(1281*640);for(let i=0;i<a.length;i++)a[i]=fragmented?i%2:Number(i>300000&&i<750000);const p=packTerrain(a),b=new Uint8Array(a.length);unpackTerrain(p,b);assert.deepEqual(b,a);if(fragmented){assert.equal(p.encoding,'bits');assert.ok(JSON.stringify(p).length<140000);}}
});
test('diagnostic module has no storage or network API',()=>{const code=readFileSync(new URL('../src/battle-trace.ts',import.meta.url),'utf8');assert.doesNotMatch(code,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|indexedDB/);});
