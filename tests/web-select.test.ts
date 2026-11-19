import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectMenuPlacement} from '../src/web-select';
test('select menu stays inside PC, iPad and phone viewports even near the right edge',()=>{
 for(const [width,height] of [[1512,982],[1194,834],[390,844],[844,390],[568,320]]){
  const p=selectMenuPlacement({left:width-65,right:width-10,top:height/2,bottom:height/2+40,width:55},{left:0,top:0,width,height},220,190);
  assert.ok(p.left>=8);assert.ok(p.left+p.width<=width-8);assert.ok(p.top>=8);assert.ok(p.top+p.height<=height-8);
 }
});
test('low controls flip upward and tall lists keep a scrollable height without shrinking options',()=>{
 const p=selectMenuPlacement({left:180,right:240,top:300,bottom:340,width:60},{left:0,top:0,width:844,height:390},336,180);
 assert.equal(p.up,true);assert.equal(p.height,286);assert.equal(p.top,8);assert.equal(p.width,180);
});
test('visual viewport offsets and very narrow screens are respected',()=>{
 const p=selectMenuPlacement({left:350,right:395,top:250,bottom:290,width:45},{left:200,top:100,width:200,height:250},336,300);
 assert.ok(p.left>=208&&p.left+p.width<=392);assert.ok(p.top>=108&&p.top+p.height<=342);assert.equal(p.width,184);
});
test('a short menu opens below when enough room exists',()=>{
 const p=selectMenuPlacement({left:40,right:150,top:80,bottom:124,width:110},{left:0,top:0,width:390,height:844},100,148);
 assert.equal(p.up,false);assert.equal(p.top,130);assert.equal(p.height,100);
});
