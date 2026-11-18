import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {VEHICLES} from '../src/vehicles';import {weaponById,weaponHasTrail,excavation} from '../src/catalog';
import {PROJECTILE_VECTORS,projectileSvg} from '../src/projectile-vector';
import {groundOrbital} from '../src/weapon-presentation';

test('all 26 native weapons have separate self-drawn SVG bodies, pictured exhaust and optional boost stars',()=>{
 assert.equal(Object.keys(PROJECTILE_VECTORS).length,26);const bodies=new Set<string>();for(const v of VEHICLES)for(const id of [v.normal,v.special]){const svg=projectileSvg(id,false),boost=projectileSvg(id,false,4,0,true);assert.ok(svg.includes('viewBox="-52 -32 104 64"'));assert.ok(svg.length>450,id);assert.ok(!svg.includes('<image'));assert.notEqual(boost,svg);assert.equal(boost.split('transform="translate(').length-1,3,id);assert.equal(weaponHasTrail(id),PROJECTILE_VECTORS[id].some(p=>p.motion==='flame'),id);bodies.add(svg);}assert.equal(bodies.size,26);
 for(const v of VEHICLES)for(const id of [v.normal,v.special])if(weaponHasTrail(id)){assert.ok(projectileSvg(id,true).includes('animateTransform'));assert.notEqual(projectileSvg(id,false,4,0),projectileSvg(id,false,4,.5));}
 assert.notEqual(projectileSvg('missile-normal',false,4),projectileSvg('missile-normal',false,1));
});
test('vector exhaust does not accumulate ordinary history points; boosted multi-shot histories remain independent',()=>{
 for(const v of VEHICLES)for(const id of [v.normal,v.special])for(const boosted of [false,true]){const g=new Game({seed:52},'5.0.2');g.start();const p=g.launch(g.active,id);Object.assign(p,{x:1000,y:30,vx:10,vy:0,fireBoosted:boosted,trail:[{x:999,y:30}]});g.projectiles=[p];g.phase='flying';g.update(.02);assert.equal(p.trail.length>0,boosted,id);assert.equal(p.scale,g.launch(g.active,id).scale);}
});
function groundGame(version:string){const g=new Game({seed:52,map:'factory'},version);g.start();g.wind=0;g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<g.worldWidth;x++)g.land.column(x,600,g.worldHeight);g.land.rebuild();const t=g.tanks[1];Object.assign(t,{x:1000,y:582,hp:t.maxHP});g.tanks[0].x=100;g.tanks[0].y=582;return g;}
test('satellite crosses tank volume, strikes terrain, excavates its full ellipse and damages the tank at its feet',()=>{
 const g=groundGame('5.0.2'),p=g.launch(g.active,'ion-special');Object.assign(p,{x:1000,y:540,vx:0,vy:680,age:1,sub:true});const hit=g.firstImpact(p,1000,520,1000,630)!;assert.ok(hit);assert.equal(hit.tank,undefined);assert.equal(hit.y,600);assert.equal(groundOrbital(p.weapon,p.sub,g.gameVersion),true);const hp=g.tanks[1].hp;g.projectiles=[p];g.phase='flying';for(let i=0;i<15;i++)g.update(.01);assert.ok(g.tanks[1].hp<hp);assert.equal(g.land.solid(1000,640),false);assert.ok(g.blasts.some(b=>b.weapon==='ion-special'&&b.y>=600));
 const marker={...p,sub:false},fresh=groundGame('5.0.2');assert.equal(fresh.firstImpact(marker,1000,520,1000,630)?.tank?.id,1);
 const old=groundGame('5.0.1');assert.equal(old.firstImpact({...p},1000,520,1000,630)?.tank?.id,1);
});
test('satellite still stops at upper terrain or permanent support and does not invent a smaller laser crater',()=>{
 const g=groundGame('5.0.2'),p=g.launch(g.active,'ion-special');Object.assign(p,{sub:true,age:1});g.land.column(1000,400,410,true);const hit=g.firstImpact(p,1000,350,1000,650)!;assert.equal(hit.y,400);assert.equal(hit.tank,undefined);
 const laser=excavation('laser-normal',false,'5.0.2'),ion=excavation('ion-special',false,'5.0.2');assert.ok(laser.radius>ion.radius);assert.ok(laser.depth>ion.depth);assert.deepEqual(laser,{radius:159,depth:105});assert.deepEqual(ion,{radius:150,depth:99});assert.equal(weaponById('multi-special').shots,9);assert.equal(weaponById('dragon-normal').shots,3);
});
