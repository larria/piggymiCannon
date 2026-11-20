import assert from 'node:assert/strict';
import test from 'node:test';
import {KeyboardMove} from '../src/keyboard-move';

test('keyboard turns immediately and can move only for the part of a frame after 50ms',()=>{
 const k=new KeyboardMove(),faces:number[]=[],moves:[number,number][]=[];
 const face=(d:number)=>faces.push(d),move=(d:number,dt:number)=>moves.push([d,dt]);
 k.press('a',100,face);assert.deepEqual(faces,[-1]);
 k.press('a',130,face);k.step(149,1/60,move);k.step(150,1/60,move);assert.equal(moves.length,0);
 k.step(154,1/60,move);assert.deepEqual(moves,[[-1,.004]]);
 k.step(174,1/60,move);assert.deepEqual(moves,[[-1,.004],[-1,1/60]]);
});

test('opposite key and fallback face immediately but wait again; quick tap and control loss never move',()=>{
 const k=new KeyboardMove(),faces:number[]=[],moves:number[]=[];
 const face=(d:number)=>faces.push(d),move=(d:number)=>moves.push(d);
 k.press('arrowleft',100,face);k.press('d',111,face);k.step(155,.016,move);
 assert.deepEqual(faces,[-1,1]);assert.deepEqual(moves,[]);
 k.release('d',156,face);k.step(200,.016,move);assert.deepEqual(faces,[-1,1,-1]);assert.deepEqual(moves,[]);
 k.release('arrowleft',203,face);k.step(300,.016,move);assert.deepEqual(moves,[]);
 k.press('arrowright',350,face);k.reset();k.step(500,.016,move);assert.deepEqual(moves,[]);
});
