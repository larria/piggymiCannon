import {aiScenario,AI_SAMPLE_MAPS,AI_SAMPLE_VEHICLES} from './ai-scenarios';
import type {Difficulty} from '../src/catalog';
export function benchmarkAIBattles(difficulty:Difficulty='expert',seedsPerMap=6){
 const result={games:0,shots:0,hits:0,direct:0,intentional:0,intentionalHits:0,moves:0,unfinished:0,rate:0,maps:{} as Record<string,{games:number;shots:number;hits:number}>};
 for(const map of AI_SAMPLE_MAPS)for(let seed=1;seed<=seedsPerMap;seed++){
  const g=aiScenario(difficulty,(result.games+1)*104729,map,undefined,AI_SAMPLE_VEHICLES[(seed-1)%13]);
  g.tanks.forEach(t=>{t.controller='ai';t.difficulty=difficulty;});g.config.slots.forEach(s=>{s.controller='ai';s.difficulty=difficulty;});
  const records:{owner:number;intentional:boolean;moved:number;direct:boolean;damage:Record<number,number>;victims:{id:number;maxHP:number}[]}[]=[];let record:typeof records[number]|null=null;
  const fire=g.fire.bind(g),next=g.nextTurn.bind(g),damage=g.damage.bind(g);
  g.fire=(ai=false)=>{const ok=fire(ai);if(ok){record={owner:g.current,intentional:g.aiDecision?.intentionalMiss??false,moved:g.active.movedThisTurn,direct:false,damage:{},victims:g.opponents(g.active).map(t=>({id:t.id,maxHP:t.maxHP}))};records.push(record);}return ok;};
  g.nextTurn=()=>{record=null;next();};
  g.damage=(t,amount,owner,ignoreShield,reaction,status)=>{const hp=t.hp+t.shield;damage(t,amount,owner,ignoreShield,reaction,status);if(record&&owner===record.owner&&t.team!==g.tanks[owner].team){const d=hp-t.hp-t.shield;record.damage[t.id]=(record.damage[t.id]??0)+d;if(d>0&&reaction==='direct')record.direct=true;}};
  for(let i=0;i<30000&&g.phase!=='ended';i++)g.update(1/30);
  result.games++;result.unfinished+=+(g.phase!=='ended');const b=result.maps[map]??={games:0,shots:0,hits:0};b.games++;
  for(const r of records){const hit=r.direct||r.victims.some(t=>(r.damage[t.id]??0)>=Math.max(30,t.maxHP*.05));result.shots++;result.hits+=+hit;result.direct+=+r.direct;result.intentional+=+r.intentional;result.intentionalHits+=+(r.intentional&&hit);result.moves+=+(r.moved>2);b.shots++;b.hits+=+hit;}
 }
 result.rate=result.hits/result.shots;return result;
}
