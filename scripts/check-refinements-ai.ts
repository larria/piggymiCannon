import {Game} from '../src/engine';import {VEHICLES} from '../src/vehicles';import {defaultSlots} from '../src/crew';import {writeFileSync,readFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version,rows=[];
for(const [i,v] of VEHICLES.entries()){
 const map=(['moon','coast','factory'] as const)[i%3],g=new Game({map,seed:52+i*104729,timer:0,fog:false,fireLine:false,slots:defaultSlots().map((s,j)=>({...s,enabled:j<2,controller:'ai' as const,difficulty:'expert' as const,vehicle:j===0?v.id:VEHICLES[(i+5)%VEHICLES.length].id}))},version);g.start();
 for(let step=0;step<24000&&g.phase!=='ended';step++)g.update(1/30);
 const events=g.battleSnapshot().events,row={vehicle:v.id,opponent:g.tanks[1].vehicleId,map,seed:g.config.seed,ended:g.phase==='ended',seconds:g.elapsed,turns:g.turn,shots:g.tanks.reduce((n,t)=>n+t.shots,0),finite:g.tanks.every(t=>[t.x,t.y,t.hp,t.angle,t.power].every(Number.isFinite)),heals:events.filter(e=>e.type==='heal').length,winner:g.winner};rows.push(row);console.log(row);if(!row.ended||!row.finite||row.shots===0)throw Error('AI match did not finish safely');
}
writeFileSync(`QA/v${version}-all-vehicle-ai.json`,JSON.stringify({protocol:'13 whole expert-AI matches, each roster vehicle once, opponents rotate, new ice/bridge/factory, full default items and health,1/30s, cap800s. Regression rather than population hit-rate estimate.',version,rows},null,2)+'\n');
