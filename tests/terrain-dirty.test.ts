import test from 'node:test';import assert from 'node:assert/strict';
import {Terrain,WORLD_W,TERRAIN_H} from '../src/terrain';import {Terrain as Reference} from './fixtures/terrain-3.2.2';
import {makeRng} from '../src/engine';
test('local thin-remnant scanning matches 3.2.2 masks, permanent cells, surfaces and removed counts',()=>{
 for(let seed=1;seed<=12;seed++){
  const g=new Terrain(),old=new Reference(),rng=makeRng(seed);
  for(let layer=0;layer<8;layer++)for(let x=0;x<=WORLD_W;x++){const top=40+layer*112+Math.round(Math.sin(x/(20+layer*7))*9),height=[1,4,5,6,25,100][layer%6],permanent=layer===6&&x%75<9;g.column(x,top,top+height,permanent);old.column(x,top,top+height,permanent);}g.rebuild();old.rebuild();
  for(let i=0;i<18;i++){const x=Math.floor(rng()*WORLD_W),y=Math.floor(rng()*TERRAIN_H),rx=5+rng()*95,ry=3+rng()*100;assert.equal(g.removeEllipse(x,y,rx,ry),old.removeEllipse(x,y,rx,ry),`${seed}/${i}`);assert.deepEqual(g.mask,old.mask);assert.deepEqual(g.protectedMask,old.protectedMask);assert.deepEqual(g.surface,old.surface);assert.equal(g.revision,old.revision);}
 }
});
test('dirty bounds include removed pixels and old/new support, but do not mark intact distant columns',()=>{
 const land=new Terrain();for(let x=0;x<=WORLD_W;x++){land.column(x,300,310);land.column(x,750,960);}land.rebuild();const before=land.revision;land.removeEllipse(600,302,24,25);const changed=land.changedSince(before)!;
 assert.equal(changed.from,576);assert.equal(changed.to,624);assert.ok(changed.top<=300);assert.ok(changed.bottom>=750);assert.equal(land.changedSince(land.revision),null);assert.equal(land.surface[200],300);
 const saved=land.revision;land.removeEllipse(1000,800,15,10);land.removeEllipse(1200,850,12,15);const union=land.changedSince(saved)!;assert.ok(union.from<=985&&union.to>=1212&&union.top<=790&&union.bottom>=865);
});
test('bounded dirty history safely requests a full redraw after missed updates or restoring an old revision',()=>{
 const land=new Terrain();for(let i=0;i<80;i++)land.rebuild(i,i,100,110);assert.equal(land.changes.length,64);assert.deepEqual(land.changedSince(0),{from:0,to:WORLD_W,top:0,bottom:TERRAIN_H-1});assert.deepEqual(land.changedSince(90),{from:0,to:WORLD_W,top:0,bottom:TERRAIN_H-1});
});
