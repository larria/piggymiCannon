import test from 'node:test';import assert from 'node:assert/strict';
import {build} from 'esbuild';

test('a pending old audio decode finishes before repair invalidates it and loads the corrected sample',async()=>{
 const OriginalAudio=(globalThis as any).Audio,originalFetch=globalThis.fetch;
 class FakeAudio {src:string;error=null;currentTime=0;duration=10;volume=1;loop=false;preload='';constructor(src:string){this.src=src;}pause(){}load(){}addEventListener(){}play(){return Promise.resolve();}}
 (globalThis as any).Audio=FakeAudio;let release!:()=>void;const gate=new Promise<void>(r=>release=r);let count=0;
 globalThis.fetch=(async(input:any)=>new Response(String(input).endsWith('sfx-click.mp3')?++count===1?'old':'good':'other')) as typeof fetch;
 try{const built=await build({entryPoints:['src/audio.ts'],bundle:true,write:false,format:'esm',define:{'import.meta.env.BASE_URL':'"/"'}});const {AudioManager}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));const manager=new AudioManager();manager.unlocked=true;(manager as any).graph=()=>({c:{decodeAudioData:async(bytes:ArrayBuffer)=>{const data=new TextDecoder().decode(bytes);if(data==='old')await gate;return data;}}});const old=(manager as any).loadClip('sfx-click.mp3');const repair=manager.retryAssets([],['audio/sfx-click.mp3']);await new Promise(r=>setTimeout(r,5));release();await Promise.all([old,repair]);assert.equal((manager as any).buffers.get('sfx-click.mp3'),'good');assert.equal(count,2);assert.equal((manager as any).loading.size,0);}
 finally{(globalThis as any).Audio=OriginalAudio;globalThis.fetch=originalFetch;}
});
