// Migration of old mechanic TEST RIGS only. Production has no mode/formation generation.
import {Game as EngineGame} from '../src/engine';import {Terrain} from '../src/terrain';import {legacyTerrain} from './legacy-terrain';
import {defaultSlots} from '../src/crew';
export function regressionConfig(input:any={}){
 const {mode,formation,seats,vehicle0,vehicle1,difficulty,...rest}=input;
 if(rest.slots)return {fallDamage:true,...rest};
 const slots=defaultSlots();const sizes=(formation??'1v1').split('v').map(Number);
 slots.forEach((s,i)=>{s.enabled=i<2||i===2&&sizes[0]===2||i===3&&sizes[1]===2;s.team=i%2;s.controller=mode==='hotseat'?'human':i===0?'human':'ai';s.difficulty=difficulty??'easy';s.vehicle=i===0?vehicle0??null:i===1?vehicle1??null:null;});
 if(formation==='1v2'){slots[2].enabled=true;slots[2].team=1;slots[3].enabled=false;}
 if(seats){slots.forEach((s,i)=>{s.enabled=i<seats.length;if(seats[i])Object.assign(s,seats[i]);});}
 return {fallDamage:true,...rest,slots};
}
export class Game extends EngineGame{constructor(input:any={},version='test'){super(regressionConfig(input),version);this.land=new Terrain();this.terrain=this.land.surface;legacyTerrain(this);this.tanks.forEach(t=>t.bodyScale=1);(this as any).placeStartingTanks();if(this.tanks.some((t,i)=>this.tanks.slice(0,i).some(e=>Math.abs(e.x-t.x)<90))){const pool=[];for(let x=60;x<this.worldWidth-60;x+=8)if(this.stablePlatform(x))pool.push(x);const chosen:number[]=[];for(const t of this.tanks){const x=pool.find(x=>chosen.every(at=>Math.abs(at-x)>=90));if(x!==undefined){t.x=x;t.y=this.ground(x)-18;chosen.push(x);}}}}}

export * from '../src/engine';
