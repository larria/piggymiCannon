import test from 'node:test';import assert from 'node:assert/strict';import {ALL_WEAPONS} from '../src/catalog';import {projectileBattleScale,projectileDrawScale} from '../src/projectile-art';import {tankArtScale} from '../src/reference-calibration';
test('every battle projectile preserves its former ratio to tank artwork, including healing and transfer, without using damage scale',()=>{for(const shape of [...ALL_WEAPONS.map(w=>w.shape??w.id),'transfer','cannon-normal']){const old=projectileBattleScale(shape,'4.0.5')/tankArtScale('4.0.5'),now=projectileBattleScale(shape,'4.0.6')/tankArtScale('4.0.6');assert.ok(Math.abs(now-old)<1e-12,shape);assert.equal(old,projectileDrawScale(shape));}});

test('new flight artwork scales up every shape except the red bean while old versions retain their size',()=>{
 for(const shape of [...new Set([...ALL_WEAPONS.map(w=>w.shape??w.id),'transfer','medical'])]){
  const old=projectileBattleScale(shape,'5.0.10'),now=projectileBattleScale(shape,'5.0.11');
  assert.ok(Math.abs(now/old-(shape==='cannon-special'?1:1.24))<1e-12,shape);
 }
});
