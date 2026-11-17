import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {Terrain,BOTTOM_Y} from '../src/terrain';import {defaultSlots} from '../src/crew';
import {TURN_ITEMS} from '../src/catalog';import {putBackpackItem,SUPPLY_INTERVAL_ACTIONS} from '../src/backpack';
import {ReplayRecorder,ReplayPlayer} from '../src/replay';
function game(seed=52){const g=new Game({slots:defaultSlots().map((s,i)=>({...s,enabled:true,team:i,controller:'human',vehicle:'cannon'})),seed,timer:0,fog:false,fireLine:false,fallDamage:true},'3.2.8');g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:[220,1540,1200,1800][i],y:432,fallVelocity:0}));g.wind=0;return g;}
function settle(g:Game){for(let i=0;i<2400&&(g.phase==='flying'||g.tanks.some(t=>t.parachute||t.hp<=0&&t.fallVelocity>0));i++)g.update(1/120);}
test('four physical slots empty in place; duplicate supplies fill different slots and cannot exceed four',()=>{
 const g=game(),t=g.active;assert.deepEqual(g.backpack(),TURN_ITEMS);g.useItem('double',false,0);assert.deepEqual(g.backpack(),[null,'teleport','boost','repair']);
 g.crates=[{x:t.x,y:t.y,type:'boost'}];(g as any).collectCrates();assert.deepEqual(g.backpack(),['boost','teleport','boost','repair']);assert.equal(t.items.boost,2);assert.equal(g.crates.length,0);
 const before=g.backpack().slice();g.crates=[{x:t.x,y:t.y,type:'double'}];(g as any).collectCrates();assert.deepEqual(g.backpack(),before);assert.equal(g.crates.length,1);
 t.items=Object.fromEntries(Object.keys(t.items).map(id=>[id,0])) as any;assert.deepEqual(g.backpack(),[null,null,null,null]);
 for(const id of ['double','double','boost','boost'] as const)assert.ok(putBackpackItem(t,id)>=0);assert.deepEqual(g.backpack(),['double','double','boost','boost']);assert.equal(putBackpackItem(t,'repair'),-1);
});
test('using a chosen duplicate consumes only that slot; F-key/API slot mismatch cannot use another item',()=>{
 const g=game(),t=g.active;t.items.teleport=0;t.items.repair=0;t.items.double=2;t.items.boost=2;g.backpack();const slot=g.backpack().lastIndexOf('double');assert.ok(g.useItem('double',false,slot));assert.equal(g.backpack()[slot],null);assert.equal(t.items.double,1);assert.equal(g.useItem('double',false,2),false);assert.equal(g.useItem('double'),false);
});
test('transfer, restoration and power conflict explicitly; cancellation is free and valid combinations still work',()=>{
 const g=game();g.useItem('teleport',false,1);assert.match(g.itemUnavailable('repair')!,/不能同时/);assert.equal(g.useItem('repair'),false);assert.equal(g.restoring,false);assert.equal(g.teleporting,true);assert.equal(g.useItem('boost'),false);assert.equal(g.active.items.repair,1);assert.ok(g.useItem('double'));assert.ok(g.useItem('teleport',false,1));assert.equal(g.teleporting,false);assert.equal(g.active.items.teleport,1);assert.ok(g.useItem('repair'));assert.equal(g.useItem('teleport'),false);assert.ok(g.useItem('boost'));g.setAim(35,10);g.fire();assert.equal(g.projectiles.length,2);assert.ok(g.projectiles.every(p=>p.healing&&p.boost===1.5));
});
test('steep/crater terrain and occupied impact points always transfer, descend vertically and never cause fall damage',()=>{
 for(const occupied of [false,true]){const g=game(),t=g.active;g.land.mask.fill(0);for(let x=0;x<=1920;x++)g.land.column(x,x<810?450:760,960);g.land.rebuild();if(occupied){g.tanks[1].x=810;g.tanks[1].y=742;}const hp=t.hp;(g as any).transferTo(t,810,760,41);assert.equal(t.x,810);assert.ok(t.parachute);assert.equal(t.y,708);g.phase='resolving';g.resolveTime=20;for(let i=0;i<200&&t.parachute;i++)g.update(1/120);assert.equal(t.x,810);assert.equal(t.fallVelocity,0);assert.equal(t.parachute,null);assert.equal(t.hp,hp);assert.ok(g.battleSnapshot().events.some(e=>e.type==='landing'&&e.data.parachute&&e.data.fallDamage===false));}
});
test('transfer descent can land on a lower platform with immunity; ordinary fall damage remains enabled',()=>{
 const g=game(),t=g.active;g.land.mask.fill(0);for(let x=0;x<=1920;x++)if(x<650||x>850)g.land.column(x,450,960);else g.land.column(x,820,960);g.land.rebuild();const hp=t.hp;(g as any).transferTo(t,750,450,41);g.phase='resolving';g.resolveTime=20;settle(g);assert.equal(t.y,802);assert.equal(t.hp,hp);assert.equal(t.parachute,null);t.x=760;t.y=200;t.fallVelocity=1;t.fallStart=200;for(let i=0;i<400&&t.fallVelocity;i++)g.update(1/120);assert.ok(t.hp<hp);
});
test('map-exit transfer kills the caster through shields; falling into a bottomless gap leaves no corpse',()=>{
 for(const outside of [false,true]){const g=game(),t=g.active;t.shield=1000;if(!outside){g.land.mask.fill(0);g.land.rebuild();}(g as any).transferTo(t,outside?1950:800,450,41);g.phase='resolving';g.resolveTime=20;settle(g);assert.equal(t.hp,0);assert.equal(t.outOfBounds,true);assert.equal(t.defeat,null);assert.equal(t.parachute,null);assert.ok(g.battleSnapshot().critical.some(e=>e.type==='death'&&e.data.cause==='out'));}
});
test('double transfer waits for descent and then delay; caster death cancels the remaining shot',()=>{
 const g=game(),t=g.active;g.useItem('double');g.useItem('teleport');g.setAim(35,35);g.fire();let descent=false;for(let i=0;i<1200&&!descent;i++){g.update(1/120);descent=!!t.parachute;}assert.ok(descent);const second=g.projectiles[0],delay=second.delay;assert.ok(second.awaitTransfer);for(let i=0;i<5;i++)g.update(1/120);assert.equal(second.delay,delay);for(let i=0;i<1200&&!g.battleSnapshot().events.some(e=>e.type==='transfer-relaunch');i++)g.update(1/120);assert.ok(g.battleSnapshot().events.some(e=>e.type==='transfer-relaunch'));t.hp=0;g.update(.01);assert.equal(g.projectiles.length,0);
});
test('descent and duplicate slot state survive snapshot restoration and exact replay',()=>{
 const g=game(),t=g.active;t.items.repair=0;t.items.teleport=2;g.backpack();const recorder=new ReplayRecorder(g);const slot=g.backpack().lastIndexOf('teleport');g.useItem('teleport',false,slot);g.setAim(35,35);g.fire();for(let i=0;i<300&&!t.parachute;i++)g.update(1/120);assert.ok(t.parachute);const restored=Game.fromBattleSnapshot(g.battleSnapshot());assert.deepEqual(restored.active.parachute,t.parachute);assert.deepEqual(restored.backpack(),g.backpack());for(let i=0;i<60;i++){g.update(1/120);restored.update(1/120);}assert.deepEqual(restored.tanks,g.tanks);const player=new ReplayPlayer(recorder.export());while(!player.done)player.advance(.1);assert.equal(player.verified,true);recorder.detach();
});
test('crate excavation destroys overlapping/support-lost crates, leaves distant and airborne crates alone; healing does not destroy',()=>{
 const g=game();g.crates=[{x:750,y:436,type:'double'},{x:820,y:436,type:'boost'},{x:1000,y:436,type:'medical'},{x:1100,y:100,type:'transfer',falling:true}];g.crater(750,450,30,40,{owner:0,weapon:'cannon-normal'});assert.deepEqual(g.crates.map(c=>c.x),[820,1000,1100]);assert.equal(g.crates[2].y,100);assert.ok(g.battleSnapshot().events.some(e=>e.type==='crate-destroy'));const before=g.crates.length;const p={...g.launch(g.active,'cannon-normal'),healing:true,x:820,y:436};(g as any).explode(p);assert.equal(g.crates.length,before);
 // Blast below the box excavates its supporting surface without touching the box itself.
 g.crater(820,460,12,14,{owner:0,weapon:'cannon-normal'});assert.equal(g.crates.some(c=>c.x===820),false);
});
test('crying corpse falls with terrain, remains un-hittable, can fall out even after victory; no second death',()=>{
 const g=game(),t=g.tanks[1];t.hp=0;g.update(.01);assert.ok(t.defeat);const y=t.defeat!.y;g.crater(t.x,450,60,100);g.update(.05);assert.ok(t.defeat!.y>y);assert.equal((g as any).projectileHit({...g.launch(g.active,'cannon-normal'),x:t.x,y:t.y,age:1}),undefined);for(let i=0;i<300&&t.fallVelocity;i++)g.update(1/120);assert.ok(t.defeat);assert.ok(t.y>y+60);assert.equal(t.hp,0);g.land.mask.fill(0);g.land.rebuild();g.phase='ended';for(let i=0;i<600&&!t.outOfBounds;i++)g.update(1/120);assert.equal(t.outOfBounds,true);assert.equal(t.defeat,null);assert.equal(g.battleSnapshot().events.filter(e=>e.type==='defeat-state'&&e.data.target===t.id).length,1);
});
test('supply checks restore the original five-action rhythm; seeded human target order covers all seats evenly',()=>{
 assert.equal(SUPPLY_INTERVAL_ACTIONS,5);const counts=[0,0,0,0];for(let seed=1;seed<=160;seed++){const g=game(seed);for(let i=0;i<5;i++)g.nextTurn();assert.equal(g.turn,5);const events=g.battleSnapshot().events.filter(e=>e.type==='supply-selection');assert.equal(events.length,1);counts[events[0].data.target]++;assert.deepEqual(events[0].data.candidates,[0,1,2,3]);assert.equal(events[0].data.nextAction,10);g.crates=[];for(let i=0;i<4;i++){g.nextTurn();assert.equal(g.crates.length,0);}g.nextTurn();assert.ok(g.crates.length);}console.log('3.2.8 human supply distribution',counts);assert.ok(counts.every(n=>n>22&&n<60));
 const a=game(99),b=game(99);for(let i=0;i<5;i++){a.nextTurn();b.nextTurn();}assert.deepEqual(a.crates,b.crates);
});

test('side-wall transfer opens above the connected surface rather than embedding or snapping upward',()=>{
 const g=game(),t=g.active;(g as any).transferTo(t,800,600,41);const start=t.y;assert.ok(start<432);g.phase='resolving';g.resolveTime=20;g.update(.01);assert.ok(t.y>start);assert.ok(t.parachute);settle(g);assert.equal(t.y,432);assert.equal(t.hp,t.maxHP);
});
