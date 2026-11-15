// Migration of old mechanic TEST RIGS only. Production has no mode/formation generation.
import {Game as EngineGame} from '../src/engine';import {defaultSlots} from '../src/crew';
export function regressionConfig(input:any={}){
 const {mode,formation,seats,vehicle0,vehicle1,difficulty,...rest}=input;
 if(rest.slots)return rest;
 const slots=defaultSlots();const sizes=(formation??'1v1').split('v').map(Number);
 slots.forEach((s,i)=>{s.enabled=i<2||i===2&&sizes[0]===2||i===3&&sizes[1]===2;s.team=i%2;s.controller=mode==='hotseat'?'human':i===0?'human':'ai';s.difficulty=difficulty??'easy';s.vehicle=i===0?vehicle0??null:i===1?vehicle1??null:null;});
 if(formation==='1v2'){slots[2].enabled=true;slots[2].team=1;slots[3].enabled=false;}
 if(seats){slots.forEach((s,i)=>{s.enabled=i<seats.length;if(seats[i])Object.assign(s,seats[i]);});}
 return {...rest,slots};
}
export class Game extends EngineGame{constructor(input:any={}){super(regressionConfig(input));}}
