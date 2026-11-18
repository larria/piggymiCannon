import type {VehicleId} from './vehicles';
import type {WeaponId} from './catalog';
import {referenceCalibration} from './reference-calibration';
import {eraDamageFactor} from './era-damage';
export const SOURCE_ATTRIBUTE_VERSION='source-projectile-bits-v1';
/** Character.txt values, checked against CBullet.CharacterDamage in the local client. */
export const SOURCE_ATTRIBUTES:Record<VehicleId,{character:number;normal:number;special:number}>={
 bowl:{character:0x84,normal:0x80,special:0x84},crossbow:{character:0x88,normal:0x80,special:0x88},cannon:{character:0x80,normal:0x80,special:0x80},
 beetle:{character:0x40,normal:0x40,special:0x40},duke:{character:0x48,normal:0x40,special:0x48},mine:{character:0x41,normal:0x40,special:0x41},
 missile:{character:0x20,normal:0x20,special:0x20},multi:{character:0x20,normal:0x20,special:0x20},laser:{character:0x12,normal:0x12,special:0x12},
 ion:{character:0x12,normal:0x12,special:0x12},water:{character:0x18,normal:0x10,special:0x18},sea:{character:0x12,normal:0x12,special:0x12},dragon:{character:0xff,normal:0x20,special:0x20},
};
type Factor={source:string;value:number};
export interface DamageAffinity {model:string;value:number;factors:Factor[];attrib?:number;character?:number;high:boolean;bonus:boolean;low:boolean}
const rules=new Map<string,DamageAffinity>();
const hex=(n:number)=>'0x'+n.toString(16).padStart(2,'0');
export function damageAffinity(weapon:WeaponId,attacker:VehicleId|null|undefined,defender:VehicleId|null|undefined,version:string):DamageAffinity{
 if(!referenceCalibration(version)){const f=eraDamageFactor(attacker,defender);return {model:'normalised-era-cycle-v1',value:f.value,factors:[f],high:false,bonus:false,low:false};}
 const key=weapon+'/'+defender;const cached=rules.get(key);if(cached)return cached;
 const [vehicle,slot]=weapon.split('-') as [VehicleId,'normal'|'special'];
 const source=SOURCE_ATTRIBUTES[vehicle],target=defender?SOURCE_ATTRIBUTES[defender]:null;
 const attrib=source&&(slot==='normal'||slot==='special')?source[slot]:undefined,character=target?.character;
 const high=attrib!==undefined&&character!==undefined&&!!(attrib&character&0xf0),bonus=attrib!==undefined&&character!==undefined&&!!(attrib&0x80)&&!!(character&0x10),low=attrib!==undefined&&character!==undefined&&!!(attrib&character&0x0f);
 const bits=attrib!==undefined&&character!==undefined?`${hex(attrib)}→${hex(character)}`:'无原始属性';
 const factors:Factor[]=[];
 if(high)factors.push({source:`原属性高位相交（${bits}）`,value:.8});
 if(bonus)factors.push({source:`原属性古代弹→未来目标增伤（${bits}）`,value:1.1});
 if(low)factors.push({source:`原属性低位相交（${bits}）`,value:.9});
 if(!factors.length)factors.push({source:attrib===undefined?'扩展弹无原始属性修正':`原属性无修正（${bits}）`,value:1});
 const rule={model:SOURCE_ATTRIBUTE_VERSION,value:factors.reduce((n,f)=>n*f.value,1),factors,attrib,character,high,bonus,low};
 if(rules.size>=1024)rules.clear();rules.set(key,rule);return rule;
}
/** CBullet's exact order: high x8/10, +trunc(d/10), then low x9/10. */
export function applyDamageAffinity(amount:number,rule:DamageAffinity){
 if(rule.model!==SOURCE_ATTRIBUTE_VERSION)return amount*rule.value;
 let n=Math.trunc(amount);if(rule.high)n=Math.trunc(n*8/10);if(rule.bonus)n+=Math.trunc(n/10);if(rule.low)n=Math.trunc(n*9/10);return n;
}
export function affinityTrace(amount:number,rule:DamageAffinity){
 const steps:{source:string;before:number;after:number}[]=[];let n=Math.trunc(amount);
 for(const [enabled,source,apply] of [[rule.high,'高位×8/10',(v:number)=>Math.trunc(v*8/10)],[rule.bonus,'加trunc(d/10)',(v:number)=>v+Math.trunc(v/10)],[rule.low,'低位×9/10',(v:number)=>Math.trunc(v*9/10)]] as const)if(enabled){const before=n;n=apply(n);steps.push({source,before,after:n});}
 return {model:rule.model,attackerAttrib:rule.attrib,defenderCharacter:rule.character,before:Math.trunc(amount),after:n,steps};
}
