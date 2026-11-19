import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitViewWidth,PORTRAIT_TANK_ENVELOPE_WIDTH,PORTRAIT_VIEW_DIVISOR} from '../src/portrait-viewport';
import {tankArtScale} from '../src/reference-calibration';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';

test('portrait x retains the accepted view exactly and corresponds to about one eighth at maximum art width',()=>{
 const width=portraitViewWidth('5.0.7');assert.ok(Math.abs(width-1056.9103090241836)<1e-9);
 assert.ok(Math.abs(PORTRAIT_VIEW_DIVISOR-7.9)<.02);assert.ok(Math.abs(PORTRAIT_TANK_ENVELOPE_WIDTH/width-1/PORTRAIT_VIEW_DIVISOR)<1e-12);
});
test('older recording artwork keeps the same visual fraction without changing its simulation size',()=>{
 for(const version of ['3.1.0','4.0.5','4.0.6','5.0.7','5.1.0']){
  const art=PORTRAIT_TANK_ENVELOPE_WIDTH*tankArtScale(version)/1.4;
  assert.ok(Math.abs(art/portraitViewWidth(version)-1/PORTRAIT_VIEW_DIVISOR)<1e-12);
 }
});
test('portrait measurement never depends on map gravity, a weapon, or match RNG/state',()=>{
 for(const map of ['factory','moon'] as const){
  const g=new Game({seed:52,map,slots:defaultSlots()},'5.0.7'),before=g.battleSnapshot();
  for(let i=0;i<100;i++)assert.equal(portraitViewWidth(g.gameVersion),portraitViewWidth('5.0.7'));
  assert.deepEqual(g.battleSnapshot(),before);assert.equal(g.motionScale,1.4);
 }
});
