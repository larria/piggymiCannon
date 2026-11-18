import {referenceCalibration} from './reference-calibration';
import {vectorProjectiles} from './weapon-presentation';
import {originalBallistics,originalWeapon,originalCraterAxes,sourceRadius,sourceMaximum} from './original-ballistics';
import {ellipseExcavation,precisionPolish,impactPolish} from './match-polish';
import {VEHICLE_WEAPONS,VEHICLES,type VehicleId,type WeaponEffect} from './vehicles';
export type WeaponId = 'shell' | 'heavy' | 'triple' | 'cluster' | 'drill' | 'bounce' | 'napalm' | 'ice' | 'emp' | 'airstrike' | 'quake' | 'sniper' | 'homing' | `${VehicleId}-${'normal'|'special'}`;
export type ItemId = 'repair' | 'shield' | 'fuel' | 'boost' | 'teleport' | 'wind' | 'double';
export type MapId = 'valley' | 'coast' | 'moon' | 'sky' | 'factory' | 'temple' | 'egypt';
export type MapChoice = MapId | 'random';
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
  { id:'repair', name:'恢复弹', description:'装填后蓄力发射，不挖土；轻点原地治疗。正中最高恢复目标最大生命40%，偏离时按距离衰减，受威力加强与火线影响。友伤关闭时只治疗自己与队友，开启时也会治疗敌人；不复活，也不解除中毒。可与双发、强化联动。', count:1, icon:'plus',cost:0,cooldown:0,unlock:1 },
  { id:'shield', name:'能量护盾', description:'没有护盾时增加最大生命约 27% 的护盾。消耗 2 战术点，冷却 3 回合；初始仅 1 件。', count:1, icon:'shield',cost:2,cooldown:3,unlock:1 },
  { id:'fuel', name:'燃料补给', description:'燃料不高于 45 时恢复 55。消耗 1 战术点，冷却 2 回合。', count:2, icon:'fuel',cost:1,cooldown:2,unlock:1 },
  { id:'boost', name:'威力加强', description:'本次攻击伤害 +50%，跳过后失效。每局开局携带一件，用掉不会自动恢复；任意空槽可拾取重复道具；可与双发、恢复弹联动，不能与转移弹同时使用。', count:1, icon:'bolt',cost:0,cooldown:0,unlock:1 },
  { id:'teleport', name:'转移弹', description:'装填后按角度与力度发射；命中后移至落点上方，带降落伞垂直落位，不挖土、不造成伤害且免坠落伤害。落出地图会死亡。可与双发联动，不能与恢复弹或威力加强同时使用。使用后空槽可拾取任意道具。', count:1, icon:'transfer',cost:0,cooldown:0,unlock:1 },
  { id:'wind', name:'定风装置', description:'风速至少 1.5 m/s 时将本回合风力归零。消耗 2 战术点，冷却 2 回合。', count:1, icon:'wind',cost:2,cooldown:2,unlock:1 },
  {id:'double',name:'双发',description:'本次攻击追加一轮齐射，只算一次行动。每局开局携带一件，用掉不会自动恢复；任意空槽可拾取重复道具；可与转移弹、威力加强、恢复弹联动。',count:1,icon:'triple',cost:0,cooldown:0,unlock:1},
];
export const MAPS: { id:MapId; name:string; sub:string; color:string;description:string }[] = [
  { id:'valley', name:'青苔峡谷', sub:'高地掩护 · 中央断崖', color:'#809b75',description:'本作原创峡谷，高地与断崖构成攻防。' },
  { id:'coast', name:'独木桥', sub:'厚桥争夺 · 多次挖穿', color:'#c58b6c',description:'完整桥面需要持续开挖。老土普通弹垂直正中同一坦克两次，中段仍会保留支撑；命中高处留下浅坑，继续轰击地面可削弱桥面、击落对手。' },
  { id:'moon', name:'冰封溪谷', sub:'起伏冰脊 · 独立S形细枝', color:'#91aab6',description:'连绵起伏的冰层贯穿战场，右侧冰峰更高；下方独立的S形细枝可接住掉落的炮手。冰层58像素、细枝4像素，均可破坏，保留轻盈弹道。' },
  { id:'sky', name:'天空之城', sub:'连绵雪丘 · 厚云台', color:'#aac4ce',description:'连绵的厚雪地与云台贯穿战场，中央雪丘更高，需要持续轰击才能挖穿；没有冰封溪谷的下层S枝。沿用暖纸色画风，自绘平台厚度与细节。' },
  { id:'factory', name:'钢铁工厂', sub:'永久 Z 形底板 · 钢梁',color:'#8f9998',description:'用户确认底层是永久Z形连续斜面，圆滑折点可移位调角；上层90像素钢梁，按统一Round小红豆连续两发可穿；中层钢梁仍可破。坠落伤害可开关且默认关闭。参照游侠攻略“不会被打掉下去”，坐标与坡面为本作重绘。' },
  { id:'temple', name:'神圣殿堂', sub:'小蘑菇永久节点 · 易碎薄轨',color:'#bba883',description:'用户确认永久蘑菇节点缩至原尺寸约1/3：圆顶伞盖、窄柄／小基座，可微移调角。非节点薄轨保持4像素且易碎，上层殿堂可破。参照游侠攻略，五节点坐标／弧度为本作重绘，不宣称逐像素复刻。' },
  { id:'egypt', name:'古老埃及', sub:'金字塔高地 · 主题重绘',color:'#c4a274',description:'月光 2003 年赛事记录确认古老埃及场景名；未取得原版地形细节。金字塔、方尖碑和薄桥是本作战术主题重绘，不能称为原图复原。' },
];
export const mapsForVersion=(version:string)=>referenceCalibration(version)?MAPS:MAPS.filter(m=>m.id!=='sky');
export const DIFFICULTIES: { id:Difficulty; name:string; sub:string; error:number;missChance:number }[] = [
  { id:'easy', name:'新兵', sub:'默认推荐 · 瞄准误差较大，适合练习', error:115,missChance:0.65 },
  { id:'normal', name:'老兵', sub:'温和挑战 · 偶尔使用特殊武器', error:75,missChance:0.48 },
  { id:'hard', name:'精英', sub:'会使用道具与避险，仍有明显射击误差', error:34,missChance:0.36 },
  { id:'expert', name:'王牌', sub:'会选择射击位置与目标，仍会失手', error:10,missChance:0.16 },
];
export const ALL_WEAPONS=[...WEAPONS,...VEHICLE_WEAPONS];
const weaponTable=Object.fromEntries(ALL_WEAPONS.map(w=>[w.id,w])) as Record<WeaponId,Weapon>;
export const weaponById = (id:WeaponId) => weaponTable[id];
/** Existing native-carrier amplification of legacy bonus shells; shared with AI. */
export const launchDamageScale=(hasVehicle:boolean,id:WeaponId)=>hasVehicle&&!weaponById(id).effect?6:1;
/** Pictured exhaust is now part of each animated body, without a history line.
 * Explicit old versions retain the previous modern-era history policy. */
export const weaponHasTrail=(id:WeaponId,version='development')=>vectorProjectiles(version)?['beetle-normal','beetle-special','duke-normal','duke-special','missile-normal','missile-special','multi-normal','multi-special','ion-normal','ion-special','dragon-normal','dragon-special'].includes(id):VEHICLES.some(v=>v.era==='现代系'&&(v.normal===id||v.special===id));
export const MODERN_TRAIL_POINTS=6,MODERN_TRAIL_LENGTH=24,MODERN_TRAIL_ALPHA=.16,MODERN_TRAIL_WIDTH=1;
export const itemById = (id:ItemId) => ITEMS.find(i=>i.id===id)!;
/** Flat depth absorbed by a direct body contact, shared by every weapon. */
export const DIRECT_DIG_DEPTH_REDUCTION=65;
export const weaponDamage=(id:WeaponId,version='development')=>originalBallistics(version)&&id!=='missile-normal'&&originalWeapon(id)?sourceMaximum(originalWeapon(id)!.power,originalWeapon(id)!.round):id==='missile-normal'&&!impactPolish(version)?120:id==='mine-special'&&!precisionPolish(version)?320:weaponById(id).damage;
export function weaponDigProfile(id:WeaponId,version='development'){
  const w=weaponById(id),modern=impactPolish(version);
  return {radius:id==='bowl-normal'&&!modern?43:w.digRadius,depth:id==='bowl-normal'&&!modern?40:id==='ion-special'&&!modern?28:w.digDepth};
}
export const fullContactExcavation=(id:WeaponId,version='development')=>id==='ion-special'||precisionPolish(version)&&(id==='laser-normal'||id==='laser-special'||id==='mine-special');
export const contactDepthReduction=(id:WeaponId,version='development')=>fullContactExcavation(id,version)?0:precisionPolish(version)&&id==='mine-normal'?30:precisionPolish(version)&&id==='beetle-normal'?34:DIRECT_DIG_DEPTH_REDUCTION;
export const excavation = (id:WeaponId,direct:boolean,version='development',digBoost=1) => {
  const modern=impactPolish(version),{radius,depth}=weaponDigProfile(id,version);
  if(originalBallistics(version)&&originalWeapon(id))return originalCraterAxes(originalWeapon(id)!.round);
  // Native rounds share the reviewed 3:2 ellipse. Width remains calibrated
  // to our world/art scale; contact never shrinks the ellipse itself.
  if(ellipseExcavation(version)){const halfWidth=radius*1.35*digBoost;return {radius:halfWidth,depth:VEHICLE_WEAPONS.some(w=>w.id===id)?halfWidth/1.5:depth*1.5*digBoost};}
  if(!modern){const full=id==='ion-special'||!direct;return {radius:radius*(full?1.35:.6)*digBoost,depth:depth*(full?1.5:.65)*digBoost};}
  return {radius:radius*1.35*digBoost,depth:Math.max(0,depth*1.5*digBoost-(direct?contactDepthReduction(id,version):0))};
};
export function aiAimOffset(difficulty:Difficulty,weapon:WeaponId,rng:()=>number,profile?:{missChance:number;error:number},version='development') {
  const d=DIFFICULTIES.find(d=>d.id===difficulty)!,w=weaponById(weapon);
  const miss=rng()<(profile?.missChance??d.missChance);
  const offset=miss?(rng()<0.5?-1:1)*(Math.max(weaponBlastRadius(weapon,version)+45,excavation(weapon,false,version).radius+40,w.effect==='homing'||weapon==='homing'?(w.homingRadius??140)+45:0)+rng()*65):(rng()-0.5)*(profile?.error??d.error)*2;
  return {miss,offset};
}

export function weaponBlastRadius(id:WeaponId,version='4.0.4',section=0){const p=originalBallistics(version)&&id!=='missile-normal'?originalWeapon(id,section):null;return p?sourceRadius(p.round)*3:weaponById(id).radius;}
