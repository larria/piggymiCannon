import {test} from 'node:test';import assert from 'node:assert/strict';
import {ITEM_GLYPHS,ITEM_CUE_LABELS,itemIcon} from '../src/item-art';import {itemCuePose,itemCueSeconds,ITEM_CUE_SECONDS} from '../src/item-feedback';import {TURN_ITEMS} from '../src/catalog';
test('four tactical icons use shared, genuinely distinct geometry and correct two-shell/portal/star/box meanings',()=>{
 assert.equal(new Set(TURN_ITEMS.map(itemIcon)).size,4);
 for(const id of TURN_ITEMS){const svg=itemIcon(id);assert.ok(svg.includes(`data-item-glyph="${id}"`));assert.ok(svg.includes('viewBox="0 0 32 32"'));assert.ok(svg.includes('aria-hidden="true"'));assert.ok(ITEM_CUE_LABELS[id]);for(const p of ITEM_GLYPHS[id])assert.ok(svg.includes(p.d));}
 assert.equal(ITEM_GLYPHS.double.filter(p=>p.part==='left'&&p.fill==='paper').length,1);assert.equal(ITEM_GLYPHS.double.filter(p=>p.part==='right'&&p.fill==='paper').length,1);assert.ok(ITEM_GLYPHS.teleport.some(p=>p.part==='shell'));assert.ok(ITEM_GLYPHS.boost.some(p=>p.part==='star'));assert.ok(ITEM_GLYPHS.repair.some(p=>p.part==='lid'));
});
test('silent use motion is finite, smooth, bounded and exactly shares the engine lifetime',()=>{
 assert.equal(ITEM_CUE_SECONDS,1.4);assert.equal(itemCueSeconds('5.1.9'),1.1);assert.equal(itemCuePose(0).alpha,0);assert.equal(itemCuePose(-5).alpha,0);assert.equal(itemCuePose(1.4).alpha,0);assert.equal(itemCuePose(100).alpha,0);
 let rise=0;for(let i=0;i<=140;i++){const p=itemCuePose(i/100);assert.ok(p.alpha>=0&&p.alpha<=1);assert.ok(p.rise>=rise&&p.rise<=10);assert.ok(p.scale>=.92&&p.scale<=1);assert.ok(p.progress>=0&&p.progress<=1);rise=p.rise;}
 assert.ok(itemCuePose(.2).beat>0);assert.equal(itemCuePose(.6).beat,0);
 assert.equal(itemCuePose(.4).scale,1);assert.equal(itemCuePose(.4).alpha,1);
});
