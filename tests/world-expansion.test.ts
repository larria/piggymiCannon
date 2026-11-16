import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,WORLD_W,BOTTOM_Y,BRIDGE_THICKNESS,MAX_STEP_HEIGHT,MAX_CLIMB_ANGLE} from '../src/engine';
import {Terrain,TERRAIN_H} from '../src/terrain';import {defaultSlots} from '../src/crew';
import {MAPS} from '../src/catalog';import {TEMPLE_NODES,templeNode,templeRail,factoryFloor} from '../src/classic-maps';
const ready=(map:any='coast')=>{const g=new Game({map,seed:52,timer:0,fog:false,fireLine:false,slots:defaultSlots().map(s=>({...s,controller:'human',vehicle:'missile'}))});g.start();g.wind=0;return g;};
test('expanded 1920 × 960 maps keep key cap, thin rail, ramp pitch and living body sizes',()=>{
 assert.equal(WORLD_W,1920);assert.equal(TERRAIN_H,960);assert.equal(BOTTOM_Y,960);assert.equal(MAX_STEP_HEIGHT,12);assert.equal(MAX_CLIMB_ANGLE,60);
 const temple=ready('temple');assert.deepEqual(TEMPLE_NODES.map(n=>templeNode(n).radius),[32,24,104/3,24,32]);TEMPLE_NODES.forEach((n,i)=>assert.ok(Math.abs(templeNode(n).rise-(i===2?32:28)/3)<1e-9));
 for(const x of [300,700,1200,1610]){const rail=Math.ceil(templeRail(x));assert.equal(temple.land.bottom(x,rail)-rail,4);temple.crater(x,rail,15,15);assert.equal(temple.ground(x,rail),BOTTOM_Y);}
 assert.ok(Math.abs(factoryFloor(224)-factoryFloor(0))<1e-8);
 for(const map of MAPS){const g=ready(map.id),same=ready(map.id);assert.deepEqual(g.terrain,same.terrain);for(const t of g.tanks){assert.ok(t.hp===t.maxHP&&t.y+18<BOTTOM_Y-30);assert.ok(g.stablePlatform(t.x));}}
});
test('full flying fire penetration chain leaves thick bridge support; repeated excavation can still breach',()=>{
 for(const weapon of ['missile-normal','missile-special'] as const){const g=ready(),x=960,top=g.ground(x),bottom=g.land.bottom(x);assert.equal(bottom-top,BRIDGE_THICKNESS);
 g.tanks.forEach((t,i)=>Object.assign(t,{x:i?1750:170,y:g.ground(i?1750:170)-18}));g.selectWeapon(weapon);assert.ok(g.fire());g.projectiles.forEach(p=>Object.assign(p,{x,y:top-3,vx:0,vy:260,age:1}));
 for(let i=0;i<1500&&g.projectiles.length;i++)g.update(1/120);assert.equal(g.projectiles.length,0);assert.ok(g.ground(x)<bottom-60,weapon);assert.ok(g.land.solid(x,bottom-8));
 for(let i=0;i<12&&g.ground(x)<BOTTOM_Y;i++)g.crater(x,g.ground(x),50,40);assert.equal(g.ground(x),BOTTOM_Y);
 }
});
test('passing the former water height is safe; lower land catches tanks; only full bottom crossing is out',()=>{
 for(const lower of [true,false]){const g=ready('valley');g.land=new Terrain();for(let x=1730;x<=1770;x++)g.land.column(x,850,TERRAIN_H);if(lower)for(let x=0;x<=WORLD_W;x++)g.land.column(x,850,TERRAIN_H);g.land.rebuild();const t=g.active;Object.assign(t,{x:960,y:580,hp:1000,maxHP:1000,shield:200,fallStart:580,fallVelocity:1});g.enemy.x=1750;g.enemy.y=832;
 for(let i=0;i<90;i++)g.update(1/120);assert.ok(t.hp>0&&!t.outOfBounds);assert.ok(t.y>579);
 for(let i=0;i<500&&t.hp>0;i++)g.update(1/120);
 if(lower){assert.equal(t.y,832);assert.ok(t.hp>0&&!t.outOfBounds);assert.ok(t.hp<1000,'fall damage is preserved');}
 else{assert.equal(t.hp,0);assert.ok(t.outOfBounds&&t.y+18>=BOTTOM_Y);const d=g.battleSnapshot().events.find(e=>e.type==='death'&&e.data.target===t.id);assert.ok(d,JSON.stringify(g.battleSnapshot().events.filter(e=>e.type==='death')));assert.ok(g.battleSnapshotText().includes('掉穿地图底边'));assert.equal(t.defeat,null);}
 }
});
