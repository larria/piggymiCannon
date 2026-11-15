import {vehicleById,type VehicleId,type Era} from './vehicles';
export const ERA_DAMAGE_VERSION='normalised-era-cycle-v1';
/** Original RED qualitative cycle, normalised for this game. Exact 25-cell values are our adaptation. */
export const ERA_DAMAGE:Record<Era,Record<Era,number>>={
 '古代系':{'古代系':.8,'近代系':.8,'现代系':.8,'未来系':1,'超代系':.8},
 '近代系':{'古代系':1,'近代系':.8,'现代系':.8,'未来系':.8,'超代系':.8},
 '现代系':{'古代系':.8,'近代系':1,'现代系':.8,'未来系':.8,'超代系':.8},
 '未来系':{'古代系':.8,'近代系':.8,'现代系':1,'未来系':.8,'超代系':.8},
 '超代系':{'古代系':1,'近代系':1,'现代系':1,'未来系':1,'超代系':.8},
};
export function eraDamageFactor(attacker:VehicleId|null|undefined,defender:VehicleId|null|undefined){
 const from=attacker?vehicleById(attacker)?.era:undefined,to=defender?vehicleById(defender)?.era:undefined;
 return {source:`系别相克（本作规则）${from??'无系别'}→${to??'无系别'}`,value:from&&to?ERA_DAMAGE[from]?.[to]??1:1};
}
