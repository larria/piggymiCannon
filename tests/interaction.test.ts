import test from 'node:test';
import assert from 'node:assert/strict';
import { chargePower,dragAim } from '../src/interaction.ts';

test('hold-to-charge uses real duration, grows smoothly, and stops at maximum',()=>{
  assert.equal(chargePower(0),10);assert.equal(chargePower(1),46);
  assert.equal(chargePower(2.5),100);assert.equal(chargePower(20),100);
  assert.equal(chargePower(-2),10);
});
test('dragging upward raises aim and horizontal travel changes direction after the dead zone',()=>{
  assert.deepEqual(dragAim(48,1,10,-50),{angle:67,direction:1});
  assert.equal(dragAim(48,1,-31,0).direction,-1);
  assert.equal(dragAim(48,-1,31,0).direction,1);
  assert.equal(dragAim(48,1,0,-1000).angle,85);
  assert.equal(dragAim(48,1,0,1000).angle,5);
});

test('current input waits30ms, then fills the bar; old replay preparations remain200/100ms',async()=>{
 const {heldChargePower,chargeDelayProgress,chargePreparationSeconds,CHARGE_DELAY_SECONDS}=await import('../src/interaction');assert.equal(CHARGE_DELAY_SECONDS,.03);
 for(const seconds of [0,.01,.029,.03])assert.equal(heldChargePower(seconds),1);
 assert.ok(Math.abs(heldChargePower(.08)-2.8)<1e-9);assert.equal(heldChargePower(1.03),37);assert.equal(heldChargePower(2.78),100);
 assert.equal(chargeDelayProgress(.015),.5);assert.equal(chargeDelayProgress(.03),1);
 assert.equal(chargePreparationSeconds('5.0.4'),.03);assert.equal(chargePreparationSeconds('5.0.3'),.2);assert.equal(chargePreparationSeconds('v3.2.9'),.2);assert.equal(chargePreparationSeconds('3.2.8'),.1);assert.equal(chargePreparationSeconds('3.2.7'),0);
});
