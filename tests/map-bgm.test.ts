import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {BGM_TRACKS} from '../src/audio-catalog';
const read=(name:string)=>JSON.parse(readFileSync('research/'+name,'utf8')),evidence=read('FT2_MAP_BGM_EVIDENCE.json'),selection=read('FT2_MAP_BGM_SELECTION.json'),manifest=read('FT2_AUDIO_SOURCES.json');
test('classic map music is selected from original client MapUtil rows rather than sequential or same-number guesses',()=>{
 const expected={coast:[8,4],moon:[7,9],factory:[4,5],temple:[10,10],egypt:[9,15]};
 for(const [scene,[map,bgm]] of Object.entries(expected)){
  const chosen=selection.maps[scene],row=evidence.maps.find((m:any)=>m.mapNumber===map);assert.equal(chosen.mapNumber,map);assert.equal(chosen.bgmNumber,bgm);assert.ok(row.availableBgmNumbers.includes(bgm));assert.deepEqual(row.availableBgmNumbers,row.rawBgmNumbers.slice(0,Math.max(1,row.soundCount)));const file=BGM_TRACKS[scene as keyof typeof BGM_TRACKS],actual=manifest.files.find((m:any)=>m.runtime===file);assert.equal(actual.source,'assets/ft2-audio/bgm/'+chosen.source);assert.deepEqual(manifest.mapBgmSelection[scene],chosen);assert.equal(createHash('sha256').update(readFileSync('public/audio/'+file)).digest('hex'),actual.runtimeSHA256);
 }
 assert.equal(selection.maps.valley.mapNumber,null);assert.equal(selection.maps.valley.bgmNumber,0);assert.deepEqual(evidence.maps[10].availableBgmNumbers,[10,0,0,0]);assert.ok(!evidence.maps[10].availableBgmNumbers.includes(7));
});
test('archived primary RVA tables and original music call chain retain their evidence integrity',()=>{
 for(const [table,count] of [[evidence.matrix,104],[evidence.soundCounts,21]] as const){const bytes=Buffer.alloc(count*4);table.values.forEach((v:number,i:number)=>bytes.writeInt32LE(v,i*4));assert.equal(createHash('sha256').update(bytes).digest('hex'),table.sha256);assert.equal(table.field.toLowerCase(),table.sha256);}
 const callers=JSON.stringify(evidence.callers);for(const token of ['ChatStartAck.get_NStageNumber','ChatStartAck.get_NBgm','MapUtil.getStageBgm','GameRoomInfo.set_StartStageBgm','GameRoomInfo.get_StartStageBgm','11000','SoundManager.PlayBacksound'])assert.ok(callers.includes(token),token);
 assert.ok(evidence.methods['LuaFramework.SoundManager.InitSound'].instructions.some((s:string)=>s.includes('stage{0:D5}.mp3')));
});
