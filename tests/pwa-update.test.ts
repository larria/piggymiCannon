import {test} from 'node:test';import assert from 'node:assert/strict';import {applyWaitingUpdate} from '../src/pwa-update';
const setup=()=>{const worker=Object.assign(new EventTarget(),{state:'installed'}),registration={waiting:worker} as unknown as ServiceWorkerRegistration;return {worker,registration};};
test('first-page worker update reloads only after the requested worker activates, independently of isUpdate heuristics',async()=>{
 const {worker,registration}=setup();let reloads=0;const done=applyWaitingUpdate(registration,async()=>{worker.state='activating';},()=>{reloads++;});await Promise.resolve();assert.equal(reloads,0);worker.state='activated';worker.dispatchEvent(new Event('statechange'));assert.equal(await done,true);assert.equal(reloads,1);worker.dispatchEvent(new Event('statechange'));assert.equal(reloads,1);
});
test('already activated race reloads once while failed activation never reloads later',async()=>{
 const {worker,registration}=setup();worker.state='activated';let reloads=0;await applyWaitingUpdate(registration,async()=>{},()=>reloads++);assert.equal(reloads,1);
 const next=setup();await assert.rejects(applyWaitingUpdate(next.registration,async()=>{throw new Error('failed');},()=>reloads++));next.worker.state='activated';next.worker.dispatchEvent(new Event('statechange'));assert.equal(reloads,1);
});
test('absent waiting update is reported without activating or reloading the old cached page',async()=>{let calls=0;assert.equal(await applyWaitingUpdate(undefined,async()=>{calls++;},()=>calls++),false);assert.equal(calls,0);});

test('release notes metadata is bounded; completion receipt is consumed exactly once for the installed version',async()=>{const {readRelease,consumeUpdateReceipt,UPDATE_RECEIPT}=await import('../src/release-notes');assert.equal(readRelease({version:'wrong',notes:[]}),null);assert.deepEqual(readRelease({version:'4.0.3',notes:['good',null,'x'.repeat(241)]}),{version:'4.0.3',notes:['good']});const values=new Map([[UPDATE_RECEIPT,'4.0.3']]),storage={getItem:(key:string)=>values.get(key)??null,removeItem:(key:string)=>{values.delete(key);}};assert.equal(consumeUpdateReceipt(storage,'4.0.3'),true);assert.equal(consumeUpdateReceipt(storage,'4.0.3'),false);values.set(UPDATE_RECEIPT,'4.0.2');assert.equal(consumeUpdateReceipt(storage,'4.0.3'),false);assert.equal(values.size,0);});
