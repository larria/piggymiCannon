export type WeaponId = 'shell' | 'heavy' | 'triple' | 'cluster' | 'drill' | 'bounce' | 'napalm' | 'ice' | 'emp' | 'airstrike' | 'quake' | 'sniper';
export type ItemId = 'repair' | 'shield' | 'fuel' | 'boost' | 'teleport' | 'wind';
export type MapId = 'valley' | 'coast' | 'moon';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export interface Weapon { id: WeaponId; name: string; english: string; description: string; damage: number; radius: number; ammo: number; color: string; icon: string; tag: string }
export const WEAPONS: Weapon[] = [
  { id:'shell', name:'标准榴弹', english:'Classic shell', description:'可靠的抛物线弹道。无限弹药，爆炸会留下弹坑。', damage:42, radius:40, ammo:Infinity, color:'#72866d', icon:'shell', tag:'无限弹药' },
  { id:'heavy', name:'重磅炸弹', english:'Heavy bomb', description:'更大的爆炸范围和伤害。也要小心自己的脚下。', damage:68, radius:65, ammo:3, color:'#ce8051', icon:'bomb', tag:'大范围' },
  { id:'triple', name:'三连齐射', english:'Triple shot', description:'以相邻角度同时发射三枚炮弹，每枚造成 25 点伤害。', damage:25, radius:29, ammo:3, color:'#8b9e66', icon:'triple', tag:'三发齐射' },
  { id:'cluster', name:'散花弹', english:'Cluster bomb', description:'到达最高点后分裂为五枚子弹药，覆盖整片区域。', damage:22, radius:30, ammo:2, color:'#b4a164', icon:'cluster', tag:'五枚子弹' },
  { id:'drill', name:'钻地弹', english:'Bunker buster', description:'穿入地表 58 米再引爆。挖掉脚下的地形，制造坠落伤害。', damage:58, radius:57, ammo:2, color:'#729498', icon:'drill', tag:'穿透地形' },
  { id:'bounce', name:'跳跳弹', english:'Bouncing bomb', description:'在地面上弹跳两次后爆炸。擅长绕过山脊。', damage:54, radius:48, ammo:2, color:'#9791ac', icon:'bounce', tag:'两次弹跳' },
  { id:'napalm', name:'火焰南瓜', english:'Fire pumpkin', description:'爆炸后留下持续 3 回合的火区，每次造成 14 点灼烧伤害。', damage:30, radius:55, ammo:2, color:'#d97743', icon:'fire', tag:'持续灼烧' },
  { id:'ice', name:'冰霜炮弹', english:'Frost shell', description:'造成伤害并冻结目标 2 回合，移动耗油加倍。', damage:34, radius:46, ammo:2, color:'#71a8bb', icon:'ice', tag:'冻结移动' },
  { id:'emp', name:'电磁脉冲', english:'EMP pulse', description:'清空目标护盾和 35 点燃料，并造成范围伤害。', damage:30, radius:58, ammo:2, color:'#aa91b3', icon:'bolt', tag:'破盾耗油' },
  { id:'airstrike', name:'空中支援', english:'Air strike', description:'点击战场选择落点，三枚炸弹从上方垂直落下。', damage:25, radius:34, ammo:1, color:'#7597a7', icon:'plane', tag:'指定落点' },
  { id:'quake', name:'大地震', english:'Earth shaker', description:'宽达 180 米的弹坑。直接伤害较低，地形破坏极强。', damage:32, radius:90, ammo:1, color:'#a7906f', icon:'quake', tag:'地形破坏' },
  { id:'sniper', name:'穿甲飞镖', english:'Armor dart', description:'两倍初速、低重力的直射弹。小范围，高额直接伤害。', damage:72, radius:16, ammo:2, color:'#bc7a73', icon:'dart', tag:'高速直射' },
];
export const ITEMS: { id:ItemId; name:string; description:string; count:number; icon:string }[] = [
  { id:'repair', name:'维修包', description:'恢复 35 点生命，最高不超过 150。每回合只能使用一件道具。', count:2, icon:'plus' },
  { id:'shield', name:'能量护盾', description:'增加 40 点护盾（上限 60），优先吸收爆炸和灼烧伤害。', count:2, icon:'shield' },
  { id:'fuel', name:'燃料补给', description:'恢复 55 点燃料，最高不超过 100。', count:2, icon:'fuel' },
  { id:'boost', name:'火力强化', description:'本次攻击伤害提升 50%，发射后消耗。', count:1, icon:'bolt' },
  { id:'teleport', name:'战术转移', description:'点击战场传送，最远 230 米。避开陡坡和火区，保留燃料。', count:1, icon:'transfer' },
  { id:'wind', name:'定风装置', description:'将本回合风力归零，下一回合恢复随机风。', count:1, icon:'wind' },
];
export const MAPS: { id:MapId; name:string; sub:string; color:string }[] = [
  { id:'valley', name:'青苔山谷', sub:'起伏山丘 · 温柔的午后', color:'#809b75' },
  { id:'coast', name:'落日海岸', sub:'崎岖海岛 · 橘色的晚风', color:'#c58b6c' },
  { id:'moon', name:'月光荒原', sub:'低重力 · 寂静的星夜', color:'#8584a6' },
];
export const DIFFICULTIES: { id:Difficulty; name:string; sub:string; error:number; preview:number }[] = [
  { id:'easy', name:'新兵', sub:'完整弹道辅助，AI 瞄准较宽松', error:95, preview:6 },
  { id:'normal', name:'老兵', sub:'部分弹道辅助，AI 会选择武器', error:36, preview:1.35 },
  { id:'hard', name:'精英', sub:'短弹道辅助，AI 会移动和使用道具', error:12, preview:0.65 },
  { id:'expert', name:'王牌', sub:'无弹道辅助，AI 精准计算并运用战术', error:3, preview:0 },
];
export const weaponById = (id:WeaponId) => WEAPONS.find(w=>w.id===id)!;
