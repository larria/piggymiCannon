import type {Weapon,WeaponId} from './catalog';
export type VehicleId='bowl'|'crossbow'|'cannon'|'beetle'|'duke'|'mine'|'missile'|'multi'|'laser'|'water'|'ion'|'sea'|'dragon';
export type VehicleChoice=VehicleId|'random';
export type WeaponEffect='shell'|'fire'|'poison'|'gas'|'mine'|'pierce'|'homing'|'orbital'|'freeze'|'beam'|'helix';
export interface Vehicle {
  id:VehicleId;name:string;era:string;hp:number;minAngle:number;maxAngle:number;movement:number;waiting:number;range:number;
  color:string;body:string;trait:string;hidden:boolean;verifiedStats:boolean;normal:WeaponId;special:WeaponId;
}
type Gun=[string,number,number,number,number,WeaponEffect,number?,number?];
const weaponList:Weapon[]=[];
function vehicle(id:VehicleId,name:string,era:string,hp:number,angles:[number,number],movement:number,waiting:number,range:number,color:string,body:string,trait:string,normal:Gun,special:Gun,verifiedStats=true):Vehicle {
  for(const [slot,gun] of [['normal',normal],['special',special]] as const) {
    const [gunName,damage,radius,digRadius,digDepth,effect,shots=1,referenceDamage=damage]=gun;
    const effects:Record<WeaponEffect,string>={shell:'单发抛物线爆破。',fire:'落地留下持续燃烧区域。',poison:'直接命中后持续中毒，红血时毒性停止。',gas:'落地留下随风漂移的毒气。',mine:'落地埋设两枚敌方不可见的地雷，靠近时引爆。',pierce:'穿入地形，最多连续爆破四次。',homing:'末段在 140 米范围内索敌，带锁定轨迹与提示音。',orbital:'落点上方召唤卫星，以离子光波垂直打击。',freeze:'命中后冻结移动三个自己的回合。',beam:'低重力能量弹，擅长破坏地形。',helix:'能量弹以螺旋轨迹前进。'};
    weaponList.push({id:`${id}-${slot}`,name:gunName,english:`${name} ${slot}`,description:`${shots>1?`${shots} 发齐射。`:''}${effects[effect]}${slot==='special'?'特殊攻击会增加下次行动等待。':''}`,damage,radius,digRadius,digDepth,ammo:Infinity,color:slot==='normal'?color:'#d5a56a',icon:effect==='mine'?'bomb':effect==='homing'?'target':effect==='poison'||effect==='gas'?'fire':effect==='beam'||effect==='orbital'||effect==='helix'?'bolt':shots>1?'triple':'shell',tag:slot==='normal'?'普通武器':'特殊武器',effect,shots,spread:shots>=9?2.2:shots>1?3:0,speed:range,gravity:effect==='beam'||effect==='helix'?0.52:1,sound:weaponList.length+1,shape:`${id}-${slot}`,extraDelay:slot==='special'?(shots>=9?240:effect==='mine'?190:effect==='homing'?160:140):0,referenceDamage});
  }
  return {id,name,era,hp,minAngle:angles[0],maxAngle:angles[1],movement,waiting,range,color,body,trait,hidden:id==='dragon',verifiedStats,normal:`${id}-normal`,special:`${id}-special`};
}
export const VEHICLES:Vehicle[]=[
  vehicle('bowl','大碗','古代系',950,[0,90],50,560,1,'#998160','catapult','宽仰角投石，火石封锁地面。',['巨石',350,45,43,40,'shell'],['火石',150,40,25,20,'fire']),
  vehicle('crossbow','叉叉','古代系',940,[15,80],57,570,1.03,'#738a60','crossbow','穿心箭高伤小范围，毒箭持续消耗。',['穿心箭',390,31,16,14,'shell',1,330],['毒箭',100,28,12,10,'poison']),
  vehicle('cannon','老土','古代系',920,[25,45],48,580,1,'#a17e59','cannon','大铅弹挖土，小红豆精准重击。',['大铅弹',140,78,74,65,'shell'],['小红豆',420,35,10,9,'shell']),
  vehicle('beetle','甲壳虫','近代系',1000,[0,40],60,560,1.05,'#ab6659','beetle','厚甲稳定，趴趴弹适合近距三发集中。',['骷髅弹',230,57,38,34,'shell'],['趴趴弹',150,38,21,20,'shell',3]),
  vehicle('duke','公爵','近代系',1000,[0,40],60,560,1.02,'#799063','duke','弹簧弹正面作战，毒气跟着风走。',['弹簧弹',300,55,37,33,'shell',1,240],['毒气弹',153,43,24,18,'gas']),
  vehicle('mine','雷霆','近代系',1250,[15,60],55,590,1,'#758da0','mine','高血量与伏雷，封锁敌人的移动路线。',['手榴弹',270,52,35,30,'shell',1,220],['地雷',320,30,12,10,'mine',2],false),
  vehicle('missile','飞火','现代系',1100,[20,45],57,560,1.13,'#9979a5','missile','飞火弹四段穿甲，追魂弹末段追踪。',['飞火弹',120,45,31,26,'pierce'],['追魂弹',260,32,18,14,'homing',1,90]),
  vehicle('multi','流星','现代系',1100,[15,40],52,590,1.12,'#a58c58','multi','三叉戟集中三发，流星雨覆盖九发。',['三叉戟',135,40,22,19,'shell',3,175],['流星雨',55,28,16,14,'shell',9,60],false),
  vehicle('laser','小妖','未来系',850,[0,45],78,540,1.08,'#70a7a8','laser','单雷炮开挖地形，三雷炮螺旋前进。',['单雷炮',250,70,64,52,'beam',1,220],['三雷炮',99,40,25,22,'helix',3],false),
  vehicle('water','水鬼','未来系',930,[5,50],72,550,1.05,'#729cb7','water','水水弹稳健，紫冻水冻结敌人移动。',['水水弹',300,54,37,30,'shell',1,230],['紫冻水',190,43,20,15,'freeze'],false),
  vehicle('ion','闪灵','未来系',970,[20,55],70,550,1.06,'#9691bc','ion','离子弹单发，离子光波从落点上空轰击。',['离子弹',260,48,34,28,'beam',1,220],['离子光波',310,66,36,55,'orbital',1,270]),
  vehicle('sea','海怪','未来系',880,[0,40],74,530,1.07,'#a683a8','sea','半血以下激活火墙，炮弹威力提升 50%。',['大电环',220,65,47,37,'beam'],['双发小电环',166,42,28,23,'helix',2],false),
  vehicle('dragon','暴龙','超代系',1600,[0,85],90,510,1.15,'#c7a150','dragon','随机抽取的隐藏超级坦克，黄金弹药与强力齐射。',['黄金飞弹',190,55,43,39,'shell',3],['黄金导弹',90,38,29,26,'homing',9],false),
];
export const VEHICLE_WEAPONS=weaponList;
export const vehicleById=(id:VehicleId)=>VEHICLES.find(v=>v.id===id)!;
export function resolveVehicle(choice:VehicleChoice,rng:()=>number):VehicleId {
  if(choice!=='random') return choice;
  if(rng()<0.1) return 'dragon';
  const regular=VEHICLES.filter(v=>!v.hidden);return regular[Math.min(regular.length-1,Math.floor(rng()*regular.length))].id;
}
export const validChoice=(value:unknown):value is VehicleChoice=>value==='random'||VEHICLES.some(v=>v.id===value&&!v.hidden);
