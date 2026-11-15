import type {Weapon,WeaponId} from './catalog';
export type VehicleId='bowl'|'crossbow'|'cannon'|'beetle'|'duke'|'mine'|'missile'|'multi'|'laser'|'water'|'ion'|'sea'|'dragon';
export type VehicleChoice=VehicleId|'random';
export type WeaponEffect='shell'|'fire'|'poison'|'gas'|'mine'|'pierce'|'homing'|'orbital'|'freeze'|'beam'|'helix';
export interface Vehicle {
  id:VehicleId;name:string;era:string;hp:number;minAngle:number;maxAngle:number;movement:number;waiting:number;range:number;
  color:string;body:string;trait:string;hidden:boolean;normal:WeaponId;special:WeaponId;
}
type Gun=[string,number,number,number,number,WeaponEffect,number?];
const weaponList:Weapon[]=[];
function vehicle(id:VehicleId,name:string,era:string,hp:number,angles:[number,number],movement:number,waiting:number,range:number,color:string,body:string,trait:string,normal:Gun,special:Gun) :Vehicle {
  for(const [slot,gun] of [['normal',normal],['special',special]] as const) {
    const [gunName,damage,radius,digRadius,digDepth,effect,shots=1]=gun;
    const effects:Record<WeaponEffect,string>={shell:'抛物线爆破。',fire:'火石落地留下沿地面扩散的火焰，接触时持续受伤。',poison:'毒箭命中未红血目标（含造成伤害的擦中、爆炸波及）后中毒；每次自己的行动结束扣最大生命20%，最多扣到30%红血临界线，补给不会解毒。',gas:'落地形成毒气，随风漂移，接触时持续受伤。',mine:'发射两枚地雷。落地埋设；踩雷伤害高于直接砸中。小妖、水鬼悬浮，不会踩响。',pierce:'一枚四节飞火弹，撞击后剩余弹节继续前进，最多爆破四次。',homing:'下降末段追踪附近允许受伤的存活机体；默认自伤、友伤关闭，设置开启后也可能锁定自己或队友。',orbital:'定位弹落地后由上方卫星轰击，上层地形会挡住射线。正中同样满额挖土，范围略小于大铅弹、坑更浅。',freeze:'紫水命中敌人后（含爆炸波及）限制其一个自己的回合无法移动。这是按用户要求设定的本作规则。',beam:'能量弹抛射。',helix:'多枚能量弹沿同一弹道交织、旋转前进。'};
    weaponList.push({id:`${id}-${slot}`,name:gunName,english:`${name} ${slot}`,description:`${shots>1?`${shots} 枚${effect==='helix'?'交织发射':'齐射'}。`:''}${id==='water'&&slot==='normal'?'抛射一团水，蓝色水团带有水滴与泡沫。':effects[effect]}${id==='cannon'?'标准球体，无拖尾。':''}${id==='dragon'&&slot==='special'?'九枚分别持续追踪，落点略分散，自伤或友伤开启时，近距离慎用。':''}${slot==='special'?'特殊攻击在纯人类热座中增加等待；AI 在场时按存活槽位轮转。':''}`,damage,radius,digRadius,digDepth,ammo:Infinity,color:PROJECTILE_COLORS[id][slot==='normal'?0:1],icon:effect==='mine'?'bomb':effect==='homing'?'target':effect==='poison'||effect==='gas'?'fire':effect==='beam'||effect==='orbital'||effect==='helix'?'bolt':shots>1?'triple':'shell',tag:slot==='normal'?'普通武器':'特殊武器',effect,shots,spread:effect==='helix'?0:(id==='multi'||id==='dragon')?(shots>=9?1.2:2.2):shots>=9?2.2:shots>1?3:0,speed:range,gravity:effect==='beam'||effect==='helix'?0.52:1,sound:weaponList.length+1,shape:`${id}-${slot}`,extraDelay:slot==='special'?100:0,...(effect==='homing'?{homingMode:id==='dragon'?'volley' as const:'nearest' as const,homingRadius:140}:{})});
  }
  return {id,name,era,hp,minAngle:angles[0],maxAngle:angles[1],movement,waiting,range,color,body,trait,hidden:id==='dragon',normal:`${id}-normal`,special:`${id}-special`};
}
// Projectile colors stay intentionally distinct. Vehicle main colors below follow downloaded references.
export const PROJECTILE_COLORS:Record<VehicleId,[string,string]>={
  bowl:['#8b7863','#ed6f36'],crossbow:['#346f72','#60b347'],cannon:['#48566a','#eb4252'],beetle:['#d2cbb0','#df8582'],
  duke:['#bb8d38','#b2bd29'],mine:['#777c32','#533e35'],missile:['#b4569e','#27b97d'],multi:['#6672cd','#ebb737'],
  laser:['#32c9d8','#a771e6'],water:['#42a4e5','#b096ef'],ion:['#e878c9','#a7d2e7'],sea:['#c83198','#427fe3'],dragon:['#d58a18','#e6d63a'],
};
export const VEHICLES:Vehicle[]=[
  vehicle('bowl','大腕','古代系',950,[0,90],50,560,1,'#cda14a','catapult','宽仰角投石，火石封锁地面。',['巨石',350,45,43,40,'shell'],['火石',150,40,25,20,'fire']),
  vehicle('crossbow','叉叉','古代系',940,[15,80],57,570,1.03,'#bd9254','crossbow','穿心箭高伤小范围，毒箭持续消耗。',['穿心箭',390,31,16,14,'shell',1],['毒箭',100,28,12,10,'poison']),
  vehicle('cannon','老土','古代系',920,[25,45],48,580,1,'#555d60','cannon','大铅弹挖土，小红豆精准重击。',['大铅弹',140,78,74,65,'shell'],['小红豆',420,35,10,9,'shell']),
  vehicle('beetle','甲壳虫','近代系',1000,[0,40],60,560,1.05,'#c5923e','beetle','厚甲稳定，趴趴弹适合近距三发集中。',['骷髅弹',230,57,38,34,'shell'],['趴趴弹',150,38,21,20,'shell',3]),
  vehicle('duke','公爵','近代系',1000,[0,40],60,560,1.02,'#55713a','duke','弹簧弹正面作战，毒气跟着风走。',['弹簧弹',300,55,37,33,'shell',1],['毒气弹',153,43,24,18,'gas']),
  vehicle('mine','雷霆','近代系',1250,[5,40],55,590,1,'#678994','mine','高血量与伏雷，封锁敌人的移动路线。',['手榴弹',270,52,35,30,'shell',1],['地雷',320,30,12,10,'mine',2]),
  vehicle('missile','飞火','现代系',1100,[20,45],57,560,1.13,'#71933a','missile','红头导弹机体，四节飞火弹主攻，低伤追魂弹收尾，索敌遵循伤害开关。',['飞火弹',120,45,31,26,'pierce'],['追魂弹',90,32,18,14,'homing']),
  vehicle('multi','流星','现代系',1100,[25,50],52,590,1.12,'#8b9250','multi','三发与九发齐射，落点略分散。',['三叉戟',135,40,22,19,'shell',3],['流星雨',55,28,16,14,'shell',9]),
  vehicle('laser','小妖','未来系',850,[5,36],78,540,1.08,'#c85437','laser','单雷炮开挖地形，三雷炮螺旋前进。',['单雷炮',250,70,64,52,'beam',1],['三雷炮',99,40,25,22,'helix',3]),
  vehicle('water','水鬼','未来系',930,[15,50],72,550,1.05,'#6e933f','water','悬浮避开地雷，紫冻水命中后限制移动一回合。',['水水弹',300,54,37,30,'shell',1],['紫冻水',190,43,20,15,'freeze']),
  vehicle('ion','闪灵','未来系',970,[20,55],70,550,1.06,'#cd9d39','ion','离子弹单发，离子光波从落点上空轰击。',['离子弹',260,48,34,28,'beam',1],['离子光波',310,66,68,28,'orbital',1]),
  vehicle('sea','海怪','未来系',880,[0,40],74,530,1.07,'#b68a45','sea','半血以下激活火墙，炮弹威力提升 50%。',['大电环',220,65,47,37,'beam'],['双发小电环',166,42,28,23,'helix',2]),
  vehicle('dragon','暴龙','超代系',1600,[20,45],90,510,1.15,'#497d9e','dragon','随机抽取的隐藏超级坦克，黄金弹药与强力齐射。',['黄金飞弹',420,55,43,39,'shell',3],['黄金导弹',130,38,29,26,'homing',9]),
];
export const VEHICLE_WEAPONS=weaponList;
export const vehicleById=(id:VehicleId)=>VEHICLES.find(v=>v.id===id)!;
export function resolveVehicle(choice:VehicleChoice,rng:()=>number):VehicleId {
  if(choice!=='random') return choice;
  if(rng()<0.1) return 'dragon';
  const regular=VEHICLES.filter(v=>!v.hidden);return regular[Math.min(regular.length-1,Math.floor(rng()*regular.length))].id;
}
export const validChoice=(value:unknown,allowDragon=false):value is VehicleChoice=>value==='random'||VEHICLES.some(v=>v.id===value&&(!v.hidden||allowDragon));
