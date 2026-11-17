import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';import {Terrain} from '../src/terrain';
import {FIRST_SUPPLY_ROUND,FIRST_SUPPLY_CHANCE,SUPPLY_ACTION_GAP} from '../src/item-combos';
function game(seed=52,version='3.2.7'){const g=new Game({slots:defaultSlots().map((s,i)=>({...s,enabled:true,team:i%2,controller:'human',vehicle:'cannon'})),map:'factory',seed,timer:45,fog:false,fireLine:false},version);g.start();g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960,true);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:220+i*420,y:432,fallVelocity:0}));g.wind=0;return g;}
function nextRound(g:Game){const r=g.round;for(let i=0;i<20&&g.round===r;i++)g.nextTurn();assert.equal(g.round,r+1);}
test('first drop can happen in complete round 3; seeded checks fairly cover all living humans',()=>{
 const counts=[0,0,0,0];let drops=0;for(let seed=1;seed<=120;seed++){const g=game(seed);nextRound(g);assert.equal(g.crates.length,0);nextRound(g);assert.equal(g.round,FIRST_SUPPLY_ROUND);assert.equal((g as any).firstSupplyChecked,true);if(g.crates.length){drops++;const e=g.battleSnapshot().events.filter(e=>e.type==='supply-selection').at(-1)!;counts[e.data.target]++;assert.deepEqual(e.data.candidates,[0,1,2,3]);assert.equal((g as any).nextSupplyAction,g.turn+SUPPLY_ACTION_GAP);}}
 console.log('Supply first-drop report',JSON.stringify({seeds:120,chance:FIRST_SUPPLY_CHANCE,round:FIRST_SUPPLY_ROUND,drops,byHuman:counts}));assert.ok(drops>50&&drops<90);assert.ok(counts.every(n=>n>=10));
});
test('later deliveries wait 8 actions; dead/AI seats do not take a human drop probability',()=>{
 const g=game();g.tanks[1].controller='ai';g.tanks[2].hp=0;(g as any).firstSupplyChecked=true;(g as any).nextSupplyAction=g.turn+8;
 for(let i=0;i<7;i++){g.nextTurn();assert.equal(g.crates.length,0);}g.nextTurn();assert.ok(g.crates.length);const e=g.battleSnapshot().events.filter(e=>e.type==='supply-selection').at(-1)!;assert.deepEqual(e.data.candidates,[0,3]);assert.ok([0,3].includes(e.data.target));
});
test('new supply fall is 15% faster with identical physical landing and unchanged approach/settle holds',()=>{
 const rows=[];for(const version of ['3.2.6','3.2.7']){const g=game(52,version);g.phase='supply';g.crates=[{x:800,y:-50,type:'medical',falling:true,vx:0,vy:80}];g.supplyObservation={approach:.55,crates:[0]};(g as any).supplySettling=.95;(g as any).afterSupply='aiming';let landed=0;for(let i=0;i<1200&&g.phase==='supply';i++){g.update(1/120);if(!g.crates[0].falling&&!landed)landed=g.elapsed;}rows.push({version,landed,end:g.elapsed,x:g.crates[0].x,y:g.crates[0].y,clock:g.clock});}
 const [old,next]=rows;assert.ok(next.landed<old.landed-.2);assert.ok(Math.abs((next.landed-.55)/(old.landed-.55)-1/1.15)<.015);assert.equal(next.x,old.x);assert.equal(next.y,old.y);assert.ok(next.end-next.landed>=.93);assert.equal(next.clock,45);
});
