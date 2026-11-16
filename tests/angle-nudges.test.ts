import test from 'node:test';import assert from 'node:assert/strict';import {AngleRepeat} from '../src/angle-nudges';
test('short presses have no repeats; delay then discrete one-degree repeats',()=>{
 const r=new AngleRepeat(1000);assert.equal(r.take(1000),0);assert.equal(r.take(1349),0);assert.equal(r.take(1350),1);assert.equal(r.take(1449),0);assert.equal(r.take(1450),1);assert.equal(r.take(1450),0);
});
test('long holds accelerate from 100ms to 60ms without a jump at the threshold',()=>{
 const r=new AngleRepeat(0);const due:number[]=[];for(let ms=0;ms<=1800;ms+=10)if(r.take(ms))due.push(ms);
 assert.deepEqual(due.slice(0,9),[350,450,550,650,750,850,950,1050,1150]);assert.deepEqual(due.slice(9),[1260,1320,1380,1440,1500,1560,1620,1680,1740,1800]);
});
test('delayed frames cap the catch-up and never replay a backlog on later frames',()=>{
 const r=new AngleRepeat(0);assert.equal(r.take(10000),4);assert.equal(r.take(10000),0);assert.ok(r.take(10060)<=1);assert.equal(new AngleRepeat(10000).take(10),0);
});
