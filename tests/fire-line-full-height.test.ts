import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {makeFireLine} from '../src/weather';

const ready=(version='5.1.5')=>{const g=new Game({map:'coast',seed:52,slots:defaultSlots().map((s,i)=>({...s,enabled:true,team:i%2,controller:'human',vehicle:i===0?'ion':'cannon'})),fog:false,fireLine:false},version);g.start();g.wind=0;return g;};
const settle=(g:Game)=>{for(let n=0;n<500&&g.weatherObservation;n++)g.update(.01);assert.equal(g.weatherObservation,null);};
test('queued delivery waits through a complete fire-line round and its exit animation',()=>{
 const g=ready();const privileged=g as any;(g as any).config.fireLine=true;privileged.windChangeRound=999;privileged.weatherNextRound=2;
 const draws=[.5,.9,.02,.2,.4,.1];privileged.rng=()=>draws.shift()??.74;
 while(g.round===1)g.nextTurn();assert.equal(g.fireLineTurnsRemaining,1);assert.equal(g.weatherObservation?.kind,'appear');
 const target=g.active.id;privileged.pendingSupply={target,candidates:g.tanks.map(t=>t.id),queuedAction:g.turn-1};
 const scheduled=g.battleSnapshot().current.pendingSupply;assert.ok(scheduled);
 privileged.prepareHumanSupply();assert.equal(g.crates.length,0);settle(g);
 privileged.prepareHumanSupply();assert.equal(g.crates.length,0);
 while(g.round===2){g.nextTurn();assert.equal(g.crates.length,0);}
 assert.equal(g.weatherObservation?.kind,'disappear');assert.deepEqual(g.battleSnapshot().current.pendingSupply,scheduled);
 assert.equal(g.battleSnapshot().current.lastSupplyDelivery,null);settle(g);
 privileged.rng=(()=>{let n=0;return ()=>((n++*73)%101)/101;})();
 for(let i=0;i<5&&g.phase!=='supply';i++)g.nextTurn();
 assert.equal(g.phase,'supply');assert.equal(g.crates[0].recipient,target);assert.equal(g.fireLine,null);
});
test('ion marker crossing far above the battlefield delivers the same 50% orbital bonus as an item',()=>{
 for(const version of ['5.1.4','5.1.5']){
   const damage=(item:boolean,line:boolean)=>{
     const g=ready(version),t=g.tanks[1],x=g.worldWidth/2+180;
     Object.assign(t,{x,y:g.ground(x)-18});Object.assign(g.tanks[2],{x:160,y:g.ground(160)-18});Object.assign(g.tanks[3],{x:240,y:g.ground(240)-18});
     if(line)g.fireLine=makeFireLine(x-20,g.worldHeight,version);g.active.boost=item;
     const p={...g.launch(g.active,'ion-special'),x:x-25,y:-g.worldHeight*2,vx:600,vy:10};
     assert.equal((g as any).stepProjectile(p,1/60),false);
     const crossed=line&&version==='5.1.5';assert.equal(p.fireBoosted,item||crossed);assert.equal(p.boost,item||crossed?1.5:1);
     Object.assign(p,{x,y:g.ground(x)-6,vx:0,vy:720,age:1});assert.equal((g as any).stepProjectile(p,1/60),true);
     const strike=g.projectiles.at(-1)!;assert.equal(strike.sub,true);assert.equal(strike.fireBoosted,item||crossed);assert.equal(strike.boost,p.boost);
     const before=t.hp;g.projectiles=[];Object.assign(strike,{x,y:g.ground(x)-6,delay:0,age:1});assert.equal((g as any).stepProjectile(strike,1/60),true);return before-t.hp;
   };
   const base=damage(false,false),boosted=damage(true,false);
   assert.ok(base>0);assert.ok(Math.abs(boosted-base*1.5)<=2);assert.equal(damage(false,true),version==='5.1.5'?boosted:base);assert.equal(damage(true,true),boosted);
 }
});
