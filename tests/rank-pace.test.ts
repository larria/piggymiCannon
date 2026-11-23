import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCombat,individualScore,rankIndex,scoreChange} from '../src/progression';

// Synthetic paired seasons, not production telemetry. Use the same seeded
// wins and contributions under both score rules and comparable opponents.
const cohorts=[
 {name:'steady',winRate:.64,experience:0,healShare:.10},
 {name:'balanced',winRate:.70,experience:1,healShare:.18},
 {name:'strong',winRate:.80,experience:2,healShare:.08},
 {name:'support',winRate:.68,experience:3,healShare:.62},
];
function season(seed:number,cohort:typeof cohorts[number],legacy:boolean){
 let state=seed,points=0;
 const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const milestones=[0,0,0],version=legacy?'5.1.5':'5.1.6',role=cohort.experience;
 for(let game=1;game<=1500&&!milestones[2];game++){
  const own=rankIndex(points,version),other=Math.min(3,own+(rnd()<.35?1:0));
  const win=rnd()<cohort.winRate;
  const contribution=Math.round(win?380+role*75+rnd()*800:120+role*55+rnd()*850);
  const kills=Number(rnd()<(win?(role===3?.52:.65+role*.1):.12+role*.06));
  const healed=Math.round(contribution*cohort.healShare);
  const base=scoreChange(win,own,[other]);
  const delta=legacy?base:individualScore(base,{...emptyCombat(),damage:contribution-healed,healed,kills});
  points=Math.max(0,points+delta);
  const tier=rankIndex(points,version);
  for(let i=0;i<tier;i++)milestones[i]||=game;
 }
 assert.ok(milestones.every(Boolean));
 return milestones;
}

test('paired match histories reach Silver, Gold and King in approximately ten times as many games on average',t=>{
 const old=[0,0,0],current=[0,0,0],sampleSize=150;
 for(const cohort of cohorts)for(let seed=1;seed<=sampleSize;seed++){
  season(seed,cohort,true).forEach((n,i)=>old[i]+=n);
  season(seed,cohort,false).forEach((n,i)=>current[i]+=n);
 }
 const games=(n:number)=>n/(sampleSize*cohorts.length);
 const ratios=current.map((n,i)=>n/old[i]);
 t.diagnostic(JSON.stringify(ratios.map((ratio,i)=>({legacy:games(old[i]),current:games(current[i]),ratio}))));
 for(const ratio of ratios)assert.ok(ratio>=9.5&&ratio<=10.5,`climb ratio ${ratio}`);
});
