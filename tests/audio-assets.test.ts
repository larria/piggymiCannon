import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
import {BGM_TRACKS,COMMON_CLIPS,vehicleClips,weaponSoundClip} from '../src/audio-catalog';import {VEHICLES} from '../src/vehicles';import {ALL_WEAPONS} from '../src/catalog';
test('all routed FT2 audio has bounded runtime files and reproducible source provenance',()=>{
 const manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8')),required=new Set([...Object.values(BGM_TRACKS),...COMMON_CLIPS,...VEHICLES.flatMap(v=>vehicleClips(v.id)),...ALL_WEAPONS.flatMap(w=>[weaponSoundClip('shot',w.id),weaponSoundClip('explosion',w.id)])]);
 assert.equal(required.size,100);assert.equal(manifest.files.length,100);
 for(const name of required){const record=manifest.files.find((e:any)=>e.runtime===name);assert.ok(record,name);const bytes=readFileSync('public/audio/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.runtimeSHA256);assert.equal(bytes.length,record.bytes);assert.ok(record.seconds>0);if(name.startsWith('bgm-')){assert.equal(record.durationMode,'full');assert.equal(record.seconds,record.sourceSeconds);assert.ok(Math.abs(record.runtimeSeconds-record.sourceSeconds)<.06);assert.ok(record.encodingArguments.includes('128k'));for(const flag of ['-t','-ss','-to'])assert.ok(!record.encodingArguments.includes(flag));}else{assert.equal(record.durationMode,'bounded-effect');assert.ok(record.seconds<=4);}assert.ok(bytes.length<8*1024*1024);}
 const total=readdirSync('public/audio').reduce((n,f)=>n+statSync('public/audio/'+f).size,0);assert.ok(total<40*1024*1024);assert.equal(total,manifest.totalBytes);
 for(const v of VEHICLES){assert.notEqual(weaponSoundClip('shot',v.normal),weaponSoundClip('shot',v.special));assert.notEqual(weaponSoundClip('explosion',v.normal),weaponSoundClip('explosion',v.special));}
});

test('all six selected map BGM describe the full original duration consistently',()=>{
 const choices=JSON.parse(readFileSync('research/FT2_MAP_BGM_SELECTION.json','utf8')),manifest=JSON.parse(readFileSync('research/FT2_AUDIO_SOURCES.json','utf8'));
 for(const [scene,choice] of Object.entries(choices.maps) as [string,any][]){const r=manifest.files.find((r:any)=>r.runtime===`bgm-${scene}.mp3`);assert.equal(choice.durationMode,'full');assert.equal(choice.seconds,r.sourceSeconds);}
});
