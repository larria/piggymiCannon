import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
import {BGM_TRACKS,COMMON_CLIPS,vehicleClips,weaponSoundClip} from '../src/audio-catalog';import {VEHICLES} from '../src/vehicles';import {ALL_WEAPONS} from '../src/catalog';
test('all routed FT2 audio has bounded runtime files and reproducible source provenance',()=>{
 const manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8')),required=new Set([...Object.values(BGM_TRACKS),...COMMON_CLIPS,...VEHICLES.flatMap(v=>vehicleClips(v.id)),...ALL_WEAPONS.flatMap(w=>[weaponSoundClip('shot',w.id),weaponSoundClip('explosion',w.id)])]);
 assert.equal(required.size,99);assert.equal(manifest.files.length,99);
 for(const name of required){const record=manifest.files.find((e:any)=>e.runtime===name);assert.ok(record,name);const bytes=readFileSync('public/audio/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.runtimeSHA256);assert.equal(bytes.length,record.bytes);assert.ok(record.seconds>0&&record.seconds<=48);assert.ok(bytes.length<3*1024*1024);}
 const total=readdirSync('public/audio').reduce((n,f)=>n+statSync('public/audio/'+f).size,0);assert.ok(total<5*1024*1024);assert.equal(total,manifest.totalBytes);
 for(const v of VEHICLES){assert.notEqual(weaponSoundClip('shot',v.normal),weaponSoundClip('shot',v.special));assert.notEqual(weaponSoundClip('explosion',v.normal),weaponSoundClip('explosion',v.special));}
});
