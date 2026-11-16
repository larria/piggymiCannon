import {test} from 'node:test';import assert from 'node:assert/strict';
import {WORLD_W,TERRAIN_H} from '../src/terrain';
import {BattleCamera,BATTLE_ZOOM} from '../src/camera';
import {storedTurnTimer,TIMER_PREFERENCE_VERSION} from '../src/turn-timer';
import {Game} from '../src/engine';
test('expanded world with unchanged entity scale, panning and centering use presentation coordinates only',()=>{
 const c=new BattleCamera();c.configure(1280/BATTLE_ZOOM,400);c.center(700,400,false);assert.ok(Math.abs(c.x-(700-c.width/2))<1e-8);assert.equal(c.y,200);
 c.pan(10000,10000);assert.equal(c.x,WORLD_W-c.width);assert.equal(c.y,TERRAIN_H-400);c.pan(-10000,-10000);assert.equal(c.x,0);assert.equal(c.y,-TERRAIN_H);
 c.center(600,400);c.update(.15,{x:0,y:0});assert.ok(c.animating);c.update(.15,{x:0,y:0});assert.ok(!c.animating);assert.equal(c.y,200);
});
test('tour visits every player and completes once; reset prevents stale completion',()=>{
 const c=new BattleCamera();c.configure(1280,400);let completed=0;const ids=new Set<number>();c.startTour([0,1,2,3,0].map(id=>({id,x:150+id*270,y:430})),()=>completed++);
 for(let i=0;i<110;i++){if(c.tourPlayer!==null)ids.add(c.tourPlayer);c.update(.05,{x:0,y:0});}assert.deepEqual([...ids],[0,1,2,3]);assert.equal(completed,1);assert.ok(!c.touring);c.finishTour();assert.equal(completed,1);
 c.startTour([{id:1,x:600,y:400}],()=>completed++);c.reset();c.update(10,{x:0,y:0});assert.equal(completed,1);
});
test('default is unlimited; legacy automatic 45 seconds migrates once and new choices persist',()=>{
 assert.equal(new Game({seed:1}).config.timer,0);assert.equal(new Game({seed:1,timer:45}).config.timer,45);
 assert.equal(storedTurnTimer(undefined,undefined),0);assert.equal(storedTurnTimer(45,undefined),0);assert.equal(storedTurnTimer(45,TIMER_PREFERENCE_VERSION),45);assert.equal(storedTurnTimer(30,undefined),30);assert.equal(storedTurnTimer(60,undefined),60);
});
