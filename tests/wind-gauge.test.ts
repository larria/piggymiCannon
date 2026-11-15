import {test} from 'node:test';import assert from 'node:assert/strict';import {windGaugeGeometry} from '../src/wind-gauge';
import {Game} from '../src/engine';
test('wind meter is centered at calm and maps left/right magnitude to equal areas',()=>{
 assert.deepEqual(windGaugeGeometry(0),{value:0,start:50,width:0,end:50});
 for(const wind of [.1,1,3,8,11]){const a=windGaugeGeometry(wind),b=windGaugeGeometry(-wind);assert.equal(a.start,50);assert.equal(b.end+b.width,50);assert.ok(a.end>50&&b.end<50);assert.ok(Math.abs(a.width-b.width)<1e-12);}
 assert.ok(windGaugeGeometry(1).width<windGaugeGeometry(8).width);assert.equal(windGaugeGeometry(99).width,50);assert.equal(windGaugeGeometry(-99).start,0);assert.equal(windGaugeGeometry(NaN).width,0);
});
test('the same signed wind still pushes real projectiles right or left independently of the meter',()=>{
 const at=(wind:number)=>{const g=new Game({seed:52,fog:false,fireLine:false});g.start();g.wind=wind;const p=g.launch(g.active,'shell');Object.assign(p,{x:500,y:80,vx:200,vy:-10});g.projectiles=[p];g.phase='flying';for(let n=0;n<20;n++)g.update(.01);const value=g.wind;windGaugeGeometry(value);assert.equal(g.wind,value);return p.x;};
 assert.ok(at(-9)<at(0));assert.ok(at(9)>at(0));
});
