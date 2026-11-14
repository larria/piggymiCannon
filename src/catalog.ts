import {VEHICLE_WEAPONS,type VehicleId,type WeaponEffect} from './vehicles';
export type WeaponId = 'shell' | 'heavy' | 'triple' | 'cluster' | 'drill' | 'bounce' | 'napalm' | 'ice' | 'emp' | 'airstrike' | 'quake' | 'sniper' | 'homing' | `${VehicleId}-${'normal'|'special'}`;
export type ItemId = 'repair' | 'shield' | 'fuel' | 'boost' | 'teleport' | 'wind' | 'double';
export type MapId = 'valley' | 'coast' | 'moon' | 'factory' | 'temple' | 'egypt';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export interface Weapon { id: WeaponId; name: string; english: string; description: string; damage: number; radius: number; digRadius:number; digDepth:number; ammo: number; color: string; icon: string; tag: string;effect?:WeaponEffect;shots?:number;spread?:number;speed?:number;gravity?:number;sound?:number;shape?:string;extraDelay?:number;homingMode?:'nearest'|'volley';homingRadius?:number }
export const WEAPONS: Weapon[] = [
  { id:'shell', name:'标准榴弹', english:'Classic shell', description:'可靠的抛物线弹道。无限弹药，爆炸会留下弹坑。', damage:42, radius:40, digRadius:32, digDepth:30, ammo:Infinity, color:'#72866d', icon:'shell', tag:'无限弹药' },
  { id:'heavy', name:'重磅炸弹', english:'Heavy bomb', description:'更大的爆炸范围和伤害。也要小心自己的脚下。', damage:68, radius:65, digRadius:57, digDepth:55, ammo:3, color:'#ce8051', icon:'bomb', tag:'大范围' },
  { id:'triple', name:'三连齐射', english:'Triple shot', description:'以相邻角度同时发射三枚炮弹，每枚造成 25 点伤害。', damage:25, radius:29, digRadius:21, digDepth:19, ammo:3, color:'#8b9e66', icon:'triple', tag:'三发齐射' },
  { id:'cluster', name:'散花弹', english:'Cluster bomb', description:'到达最高点后分裂为五枚子弹药，覆盖整片区域。', damage:22, radius:30, digRadius:25, digDepth:22, ammo:2, color:'#b4a164', icon:'cluster', tag:'五枚子弹' },
  { id:'drill', name:'钻地弹', english:'Bunker buster', description:'穿入地表 58 米后引爆，纵向挖地极深。专门破坏浮岛和桥面的支撑。', damage:58, radius:57, digRadius:46, digDepth:85, ammo:2, color:'#729498', icon:'drill', tag:'穿透地形' },
  { id:'bounce', name:'跳跳弹', english:'Bouncing bomb', description:'在地面上弹跳两次后爆炸。擅长绕过山脊。', damage:54, radius:48, digRadius:37, digDepth:32, ammo:2, color:'#9791ac', icon:'bounce', tag:'两次弹跳' },
  { id:'napalm', name:'火焰南瓜', english:'Fire pumpkin', description:'爆炸后留下持续 3 回合的火区，每次造成 14 点灼烧伤害。', damage:30, radius:55, digRadius:22, digDepth:12, ammo:2, color:'#d97743', icon:'fire', tag:'持续灼烧' },
  { id:'ice', name:'冰霜炮弹', english:'Frost shell', description:'造成伤害并冻结目标 2 回合，移动耗油加倍。', damage:34, radius:46, digRadius:16, digDepth:12, ammo:2, color:'#71a8bb', icon:'ice', tag:'冻结移动' },
  { id:'emp', name:'电磁脉冲', english:'EMP pulse', description:'清空目标护盾和 35 点燃料，并造成范围伤害。', damage:30, radius:58, digRadius:8, digDepth:6, ammo:2, color:'#aa91b3', icon:'bolt', tag:'破盾耗油' },
  { id:'airstrike', name:'空中支援', english:'Air strike', description:'点击战场选择落点，三枚炸弹从上方垂直落下。', damage:25, radius:34, digRadius:29, digDepth:26, ammo:1, color:'#7597a7', icon:'plane', tag:'指定落点' },
  { id:'quake', name:'大地震', english:'Earth shaker', description:'最强的地形破坏；落地时可挖开宽约 238 米、深约 135 米的区域。', damage:32, radius:90, digRadius:88, digDepth:90, ammo:1, color:'#a7906f', icon:'quake', tag:'地形破坏' },
  { id:'sniper', name:'穿甲飞镖', english:'Armor dart', description:'两倍初速、低重力的直射弹。高直接伤害，几乎不挖地。', damage:72, radius:16, digRadius:8, digDepth:8, ammo:2, color:'#bc7a73', icon:'dart', tag:'高速直射' },
  { id:'homing', name:'猎星追踪弹', english:'Homing shell', description:'仅从空投获得。下降到地面附近后，会追踪 140 米内的敌人；地形仍可阻挡它。', damage:62,radius:29,digRadius:20,digDepth:20,ammo:0,color:'#be9159',icon:'target',tag:'稀有空投' },
];
WEAPONS.forEach((w,i)=>{w.shape=w.id;w.sound=27+i;});
export const TURN_ITEMS:ItemId[]=['double','teleport','boost','repair'];
export const ITEMS: { id:ItemId; name:string; description:string; count:number; icon:string;cost:number;cooldown:number;unlock:number }[] = [
  { id:'repair', name:'补给', description:'恢复约 23% 最大生命，不超过生命上限；回血不会解除毒箭状态，毒伤直到 30% 红血临界线才停止。每个自己的回合补齐一件，每回合最多使用一件道具。', count:1, icon:'plus',cost:0,cooldown:0,unlock:1 },
  { id:'shield', name:'能量护盾', description:'没有护盾时增加最大生命约 27% 的护盾。消耗 2 战术点，冷却 3 回合；初始仅 1 件。', count:1, icon:'shield',cost:2,cooldown:3,unlock:1 },
  { id:'fuel', name:'燃料补给', description:'燃料不高于 45 时恢复 55。消耗 1 战术点，冷却 2 回合。', count:2, icon:'fuel',cost:1,cooldown:2,unlock:1 },
  { id:'boost', name:'威力加强', description:'本次攻击伤害 +50%，跳过后失效。每个自己的回合补齐一件，每回合最多使用一件道具。', count:1, icon:'bolt',cost:0,cooldown:0,unlock:1 },
  { id:'teleport', name:'转移弹', description:'装填后按角度与力度发射，坦克传送到炮弹实际落点，不造成伤害。落点在场外、水中或敌人身上则转移失败。每回合一件。', count:1, icon:'transfer',cost:0,cooldown:0,unlock:1 },
  { id:'wind', name:'定风装置', description:'风速至少 1.5 m/s 时将本回合风力归零。消耗 2 战术点，冷却 2 回合。', count:1, icon:'wind',cost:2,cooldown:2,unlock:1 },
  {id:'double',name:'双发',description:'本次攻击追加一轮齐射，只算一次行动。每个自己的回合补齐一件，每回合最多使用一件道具。',count:1,icon:'triple',cost:0,cooldown:0,unlock:1},
];
export const MAPS: { id:MapId; name:string; sub:string; color:string;description:string }[] = [
  { id:'valley', name:'青苔峡谷', sub:'高地掩护 · 中央断崖', color:'#809b75',description:'本作原创峡谷，高地与断崖构成攻防。' },
  { id:'coast', name:'独木桥', sub:'厚桥争夺 · 多次挖穿', color:'#c58b6c',description:'经典独木桥主题。游侠攻略确认地形简单、容易激战；本作加厚桥面，老土单发普通弹落地不能直接挖穿，连续挖掘仍可击落。桥宽、厚度与比例为本作配置。' },
  { id:'moon', name:'天空之城', sub:'厚雪浮岛 · 多次挖穿', color:'#91aab6',description:'2003 年游侠攻略描述厚雪平台难以打穿。本作采用厚雪多层浮岛；布局、坐标及低重力是 Web 配置。' },
  { id:'factory', name:'钢铁工厂', sub:'永久底板 · Z 形钢梁',color:'#8f9998',description:'依据游侠《疯狂坦克II制胜宝典》：不会被打掉下去，Z 形地形提供直射机会。底板永久不破，钢梁可破；尺寸与连接布局为本作重绘，仍可能摔伤。' },
  { id:'temple', name:'神圣殿堂', sub:'薄轨与安全节点 · 易碎',color:'#bba883',description:'依据用户确认的薄轨道及不可破节点，并参照游侠攻略“中央殿堂和下方永久半圆，其余地面很薄”。下层薄轨间隔设永久节点，中央节点带半圆承托；其余平台易碎。节点位置和比例为本作重绘。' },
  { id:'egypt', name:'古老埃及', sub:'金字塔高地 · 主题重绘',color:'#c4a274',description:'月光 2003 年赛事记录确认古老埃及场景名；未取得原版地形细节。金字塔、方尖碑和薄桥是本作战术主题重绘，不能称为原图复原。' },
];
export const DIFFICULTIES: { id:Difficulty; name:string; sub:string; error:number;missChance:number }[] = [
  { id:'easy', name:'新兵', sub:'默认推荐 · 瞄准误差较大，适合练习', error:115,missChance:0.5 },
  { id:'normal', name:'老兵', sub:'温和挑战 · 偶尔使用特殊武器', error:75,missChance:0.32 },
  { id:'hard', name:'精英', sub:'懂得移动与道具，仍有明显射击误差', error:42,missChance:0.22 },
  { id:'expert', name:'王牌', sub:'擅长破坏地形，也会失手，绝非发发必中', error:26,missChance:0.16 },
];
export const ALL_WEAPONS=[...WEAPONS,...VEHICLE_WEAPONS];
const weaponTable=Object.fromEntries(ALL_WEAPONS.map(w=>[w.id,w])) as Record<WeaponId,Weapon>;
export const weaponById = (id:WeaponId) => weaponTable[id];
export const itemById = (id:ItemId) => ITEMS.find(i=>i.id===id)!;
export const excavation = (id:WeaponId,direct:boolean) => {
  const w=weaponById(id);return {radius:w.digRadius*(direct?0.6:1.35),depth:w.digDepth*(direct?0.65:1.5)};
};
export function aiAimOffset(difficulty:Difficulty,weapon:WeaponId,rng:()=>number) {
  const d=DIFFICULTIES.find(d=>d.id===difficulty)!,w=weaponById(weapon);
  const miss=rng()<d.missChance;
  const offset=miss?(rng()<0.5?-1:1)*(Math.max(w.radius+45,w.digRadius*1.35+40,w.effect==='homing'||weapon==='homing'?(w.homingRadius??140)+45:0)+rng()*65):(rng()-0.5)*d.error*2;
  return {miss,offset};
}
