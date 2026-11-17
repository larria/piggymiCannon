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

test('all input devices use 200ms preparation before charging, and the button progress has its own timing',async()=>{
 const {heldChargePower,chargeDelayProgress,chargePreparationSeconds,CHARGE_DELAY_SECONDS}=await import('../src/interaction');assert.equal(CHARGE_DELAY_SECONDS,.2);
 for(const seconds of [0,.05,.1,.199,.2])assert.equal(heldChargePower(seconds),1);
 assert.ok(Math.abs(heldChargePower(.25)-2.8)<1e-9);assert.equal(heldChargePower(1.2),37);assert.equal(heldChargePower(2.95),100);assert.equal(heldChargePower(99),100);
 assert.equal(chargeDelayProgress(0),0);assert.equal(chargeDelayProgress(.1),.5);assert.equal(chargeDelayProgress(.2),1);assert.equal(chargeDelayProgress(1),1);
 assert.equal(chargePreparationSeconds('3.2.8'),.1);assert.equal(chargePreparationSeconds('v3.2.9'),.2);assert.equal(chargePreparationSeconds('3.2.7'),0);assert.equal(chargeDelayProgress(.05,.1),.5);
});
