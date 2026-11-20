import assert from 'node:assert/strict';
import test from 'node:test';
import {KeyboardMove} from '../src/keyboard-move';

function input(){
 const k=new KeyboardMove(),faces:number[]=[],moves:[number,number][]=[];let facing=1;
 const face=(d:number)=>{faces.push(d);facing=d;};
 return {k,faces,moves,press:(key:string,now:number)=>k.press(key,now,facing,face),release:(key:string,now:number)=>k.release(key,now,facing,face),step:(now:number,dt=1/60)=>k.step(now,dt,(d,seconds)=>moves.push([d,seconds]))};
}

test('keyboard reverses immediately, moving only for the part of a frame after 200ms',()=>{
 const {faces,moves,press,step}=input();
 press('a',100);assert.deepEqual(faces,[-1]);
 press('a',230);step(299);step(300);assert.equal(moves.length,0);
 step(304);assert.deepEqual(moves,[[-1,.004]]);
 step(324);assert.deepEqual(moves,[[-1,.004],[-1,1/60]]);
});

test('same direction moves immediately; a short reverse only turns and a new press can drive that way',()=>{
 const {faces,moves,press,release,step}=input();
 press('d',100);step(104);assert.deepEqual(moves,[[1,.004]]);assert.deepEqual(faces,[]);
 release('d',115);press('arrowleft',150);step(250);release('arrowleft',275);step(350);
 assert.deepEqual(faces,[-1]);assert.equal(moves.length,1);
 press('a',400);step(408);assert.deepEqual(moves.at(-1),[-1,.008]);
});

test('last key wins, fallback reverses again, aliases do not restart a wait, and control loss cancels movement',()=>{
 const {k,faces,moves,press,release,step}=input();
 press('arrowleft',100);press('a',125);release('a',150);step(302);assert.deepEqual(moves,[[-1,.002]]);
 press('d',310);step(480);release('d',481);step(680);assert.deepEqual(faces,[-1,1,-1]);assert.equal(moves.length,1);
 k.reset();step(710);assert.equal(moves.length,1);
});
