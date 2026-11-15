import {Game} from './legacy-fixture';
import test from 'node:test';import assert from 'node:assert/strict';
import {} from '../src/engine.ts';
import {Terrain} from '../src/terrain.ts';
const ready=()=>{const g=new Game({mode:'ai',vehicle0:'crossbow',vehicle1:'cannon',map:'valley',seed:52,timer:0,fog:false,fireLine:false});g.start();g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.tanks.forEach((t,i)=>{t.x=905+i*200;t.y=432;});g.wind=0;g.crates=[40,80,120].map(x=>({x,y:436,type:'ammo'}));return g;};
const run=(g:Game,until:(g:Game)=>boolean)=>{for(let i=0;i<2200&&!until(g);i++)g.update(1/120);};
test('a real fired poison arrow striking the visible head attaches poison and ticks after victim actions',()=>{
 const g=ready(),e=g.enemy;g.selectWeapon('crossbow-special');g.setAim(15,35);assert.ok(g.fire());run(g,x=>x.current===1);
 assert.equal(e.hp,840);assert.equal(e.poisoned,true);
 assert.equal(e.poisonOwner,0);assert.equal(g.active.id,1);
 for(const expected of [656,472,288,276]){
  g.skipTurn();assert.equal(e.hp,expected);if(g.current===0)g.skipTurn();
  const labels=g.texts.filter(text=>text.tankId===e.id);assert.equal(labels.length,1);assert.match(labels[0].text,/^毒伤 −(184|12)$/);
 }
 assert.equal(e.poisoned,false);assert.equal(e.hp,276);g.skipTurn();assert.equal(e.hp,276);
});
test('a poison arrow ground blast that damages an unred target attaches poison without a direct center hit',()=>{
 const g=ready(),e=g.enemy;g.selectWeapon('crossbow-special');g.setAim(15,35);g.fire();
 const p=g.projectiles[0];Object.assign(p,{x:e.x+36,y:449,vx:0,vy:120,age:.5});
 run(g,x=>x.current===1);assert.ok(e.hp<920&&e.hp>276);assert.equal(e.poisoned,true);
});
test('a true miss does not poison; damage reaching red immediately clears an existing poison state',()=>{
 const g=ready(),e=g.enemy;g.selectWeapon('crossbow-special');g.setAim(15,35);g.fire();
 Object.assign(g.projectiles[0],{x:e.x+100,y:449,vx:0,vy:120,age:.5});run(g,x=>x.current===1);assert.equal(e.hp,920);assert.equal(e.poisoned,false);
 e.poisoned=true;g.damage(e,700,0);assert.equal(e.hp,220);assert.equal(e.poisoned,false);
});
test('healing and expert AI planning cannot silently remove an arrow poison before its first tick',()=>{
 for(const heal of [false,true]){
  const g=ready(),e=g.enemy;g.config.difficulty='expert';g.selectWeapon('crossbow-special');g.setAim(15,35);g.fire();run(g,x=>x.current===1);
  if(heal){assert.ok(g.useItem('repair',true));assert.equal(e.hp,920);}else g.planAI();
  assert.equal(e.poisoned,true);const before=e.hp;g.skipTurn();assert.equal(e.hp,before-184);assert.equal(e.poisoned,true);
 }
});
