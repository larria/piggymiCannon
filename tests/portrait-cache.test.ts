import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {PORTRAIT_ASSETS} from '../src/portrait-assets';import {checkedPNG} from '../src/portrait-cache';import {crewAvatar,CREW_ORDER} from '../src/crew';
test('portrait hashes, lengths, dimensions and Workbox revisions match all four supplied full PNGs',async()=>{
 for(const id of CREW_ORDER){const spec=PORTRAIT_ASSETS[id],bytes=readFileSync('public/'+spec.file);assert.equal(createHash('md5').update(bytes).digest('hex'),spec.revision);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.sha256);assert.deepEqual(await checkedPNG(new Response(bytes),spec),new Uint8Array(bytes));}
});
test('corrupt, truncated, wrong-sized and wrong-content cached 200 responses fail before decoding or display',async()=>{
 const spec=PORTRAIT_ASSETS.mimi,good=readFileSync('public/'+spec.file);
 await assert.rejects(checkedPNG(new Response('upstream error',{headers:{'Content-Type':'image/png'}}),spec),/格式/);
 await assert.rejects(checkedPNG(new Response(good.subarray(0,100)),spec),/长度/);
 const sameSize=Buffer.from(good);sameSize[sameSize.length-100]^=255;await assert.rejects(checkedPNG(new Response(sameSize),spec),/校验/);
 await assert.rejects(checkedPNG(new Response(readFileSync('public/portraits/fox.png')),spec),/尺寸/);
 await assert.rejects(checkedPNG(new Response('missing',{status:404}),spec),/HTTP/);
});
test('embedded fallback portraits have distinct identity and never require a network URL',()=>{
 const markup=CREW_ORDER.map(id=>crewAvatar(id,'/game/'));assert.equal(new Set(markup.map(m=>m.match(/src="([^"]+)/)![1])).size,4);
 for(const [i,m] of markup.entries()){assert.ok(m.includes('src="data:image/svg+xml,'));assert.ok(m.includes(`data-crew-portrait="${CREW_ORDER[i]}"`));assert.ok(m.includes(`/game/${PORTRAIT_ASSETS[CREW_ORDER[i]].file}`));}
});
