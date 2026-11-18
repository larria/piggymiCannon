import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';import {createHash} from 'node:crypto';
import {BATTLE_SPRITES,spriteFrame,loadBattleSprites} from '../src/battle-sprites';
import {Game} from '../src/engine';import {defaultSlots} from '../src/crew';
const manifest=JSON.parse(readFileSync('research/FT2_VISUAL_SOURCES.json','utf8'));
test('selected visual assets are bounded, reproducible and contain whole decoded frames',()=>{
 assert.equal(manifest.assets.length,5);assert.ok(manifest.runtimeBytes<300*1024);assert.ok(manifest.runtimeBytes<manifest.totalSourceBytes*.006);
 let bytes=0;for(const a of manifest.assets){const s=BATTLE_SPRITES[a.id as keyof typeof BATTLE_SPRITES],buf=readFileSync('public/'+s.file);assert.equal(buf.readUInt32BE(16),s.width*s.frames);assert.equal(buf.readUInt32BE(20),s.height);assert.equal(createHash('sha256').update(buf).digest('hex'),a.sha256);bytes+=statSync('public/'+s.file).size;assert.equal(a.selected.length,s.frames);for(const f of a.selected)assert.ok(f.rect[2]>f.rect[0]&&f.rect[3]>f.rect[1]);}assert.equal(bytes,manifest.runtimeBytes);
});
test('animation uses simulation progress, saturates bursts and wraps persistent fields',async()=>{
 for(const id of Object.keys(BATTLE_SPRITES) as (keyof typeof BATTLE_SPRITES)[]){assert.equal(spriteFrame(id,0),0);assert.equal(spriteFrame(id,1),BATTLE_SPRITES[id].frames-1);assert.equal(spriteFrame(id,-1),0);assert.equal(spriteFrame(id,2.25,true),spriteFrame(id,.25,true));assert.equal(spriteFrame(id,NaN),0);}assert.deepEqual(await loadBattleSprites(),[]);
});
test('sprite routing metadata preserves actual hit, digging, damage and resolving clock',()=>{
 const g=new Game({seed:52,map:'factory',fog:false,fireLine:false,slots:defaultSlots().map((s,i)=>({...s,enabled:i<2,controller:'human',vehicle:'cannon'}))});g.start();const before=g.tanks[1].hp;const p=g.launch(g.tanks[0],'cannon-normal');Object.assign(p,{x:g.tanks[1].x,y:g.tanks[1].y});(g as any).explode(p,1);assert.equal(g.blasts.at(-1)?.weapon,'cannon-normal');assert.equal(g.blasts.at(-1)?.life,.65);assert.ok(g.tanks[1].hp<before);assert.ok(g.battleSnapshot().events.some(e=>e.type==='terrain'));g.projectiles=[];g.phase='flying';g.update(.01);assert.equal(g.phase,'resolving');
});
