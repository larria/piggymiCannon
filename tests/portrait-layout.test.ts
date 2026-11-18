import test from 'node:test';import assert from 'node:assert/strict';
import {placeTankPortrait,type PortraitRect} from '../src/portrait-layout';
const collision=(a:PortraitRect,b:PortraitRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
test('the supplied temple spawn needs only horizontal clearance, never two raised portrait rows',()=>{
 const fox=placeTankPortrait(2,1292,242,1.4,false,[]),fish=placeTankPortrait(3,1196,242,1.4,false,[fox.rect]);
 assert.equal(fish.y,242);assert.ok(Math.abs(fish.x-1196)<4);assert.equal(collision(fox.rect,fish.rect),false);
});
test('four coincident, poisoned or staggered tanks retain portrait height and distinct hit centres',()=>{
 for(const scale of [1,1.4])for(const poisoned of [false,true]){
  const rects:PortraitRect[]=[],centres:number[]=[];
  for(let id=0;id<4;id++){const p=placeTankPortrait(id,800,400,scale,poisoned,rects);assert.equal(p.y,400);for(const r of rects)assert.equal(collision(p.rect,r),false);rects.push(p.rect);centres.push(p.x);}
  assert.equal(new Set(centres).size,4);
 }
 const a=placeTankPortrait(0,100,200,1.4,false,[]),b=placeTankPortrait(1,100,400,1.4,false,[a.rect]);assert.equal(b.x,100);assert.equal(b.y,400);
});
test('edge portraits and medals stay within view, without raising or affecting isolated tanks',()=>{
 const viewport={left:0,right:700};const first=placeTankPortrait(0,5,300,1.4,true,[],viewport),next=placeTankPortrait(1,10,300,1.4,false,[first.rect],viewport);
 for(const p of [first,next]){assert.equal(p.y,300);assert.ok(p.rect.left>=0);assert.ok(p.rect.right<=700);}
 assert.equal(collision(first.rect,next.rect),false);
 const alone=placeTankPortrait(2,500,300,1.4,false,[first.rect,next.rect],viewport);assert.equal(alone.x,500);
});
