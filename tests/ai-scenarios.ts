import {Game,type Config} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {Terrain} from '../src/terrain';
import {vehicleById,type VehicleId} from '../src/vehicles';
import type {Difficulty,MapId} from '../src/catalog';
export const AI_SAMPLE_MAPS:MapId[]=['valley','coast','moon','factory','temple','egypt'];
export const AI_SAMPLE_VEHICLES:VehicleId[]=['cannon','bowl','missile','laser','water','multi','ion','duke','beetle','crossbow','mine','sea','dragon'];
export function aiScenario(difficulty:Difficulty,seed:number,map:MapId='valley',distance?:number,vehicle:VehicleId='cannon',version='development'){
 const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,team:i%2,controller:i===0?'ai':'human',difficulty,vehicle:i===0?vehicle:AI_SAMPLE_VEHICLES[(seed+i*3)%AI_SAMPLE_VEHICLES.length]}));
 const g=new Game({slots,seed,map,timer:0,fog:false,fireLine:false,selfDamage:false,friendlyFire:false},version);g.start();
 if(distance!==undefined){g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450,640,true);g.land.rebuild();g.tanks.forEach((t,i)=>{t.x=[220,220+distance,70,1180][i];t.y=432;t.fallVelocity=0;});g.wind=[-9,0,9][seed%3];}
 return g;
}
export function measureAIShot(g:Game){
 const shooter=g.active,from=shooter.x,nearest=g.enemy.id,before=g.opponents(shooter).map(t=>({id:t.id,hp:t.hp,maxHP:t.maxHP,shield:t.shield}));
 const own=g.damage.bind(g);let direct=false,damage=0;const damageById:Record<number,number>={};const directById=new Set<number>();let decision:Game['aiDecision']=null;
 g.damage=(t,amount,owner,ignoreShield,reaction,status,context)=>{const hp=t.hp,shield=t.shield;own(t,amount,owner,ignoreShield,reaction,status,context);if(owner===shooter.id&&t.team!==shooter.team){const loss=hp-t.hp+shield-t.shield;damage+=loss;damageById[t.id]=(damageById[t.id]??0)+loss;if(loss>0&&reaction==='direct'){direct=true;directById.add(t.id);}}};
 let planned=false,angle=shooter.angle,power=shooter.power,weapon=g.selected;
 for(let step=0;step<3600;step++){
  if(g.current!==shooter.id||g.phase==='ended')break;
  if(g.phase==='aiming'&&!planned){g.planAI();decision=g.aiDecision;planned=true;angle=shooter.angle;power=shooter.power;weapon=g.selected;g.aiTime=.8;}
  g.update(1/60);
  if(g.phase==='flying'){angle=shooter.angle;power=shooter.power;weapon=g.selected;}
 }
 const effective=direct||before.some(b=>{const t=g.tanks[b.id];return b.hp-t.hp+b.shield-t.shield>=Math.max(30,b.maxHP*.05);});
 const nearestBefore=before.find(t=>t.id===nearest)!;
 return {effective,direct,damage,damageById,decision,nearestHit:directById.has(nearest)||(damageById[nearest]??0)>=Math.max(30,nearestBefore.maxHP*.05),moved:Math.abs(shooter.x-from),angle,power,weapon};
}
export function aiSampleCases(){
 const cases:{seed:number;map:MapId;distance?:number;vehicle:VehicleId}[]=[];
 for(const map of AI_SAMPLE_MAPS)for(let seed=1;seed<=24;seed++)cases.push({seed:(cases.length+1)*104729,map,vehicle:AI_SAMPLE_VEHICLES[(seed-1)%AI_SAMPLE_VEHICLES.length]});
 for(const distance of [90,130,220,600])for(const vehicle of ['cannon','bowl','missile','laser'] as VehicleId[])for(let seed=1;seed<=6;seed++)cases.push({seed:(cases.length+1)*104729,map:'valley',distance,vehicle});
 return cases;
}
