import type {WeaponId} from './catalog';

export const HISTORICAL_GUIDE='https://gamefaqs.gamespot.com/pc/934069-fortress-2-blue/faqs/43426';
export const JAPANESE_REFERENCE='https://ja.wikipedia.org/wiki/ポトリス2';
export interface WeaponReference {shots:number;effect:string;sources:string;uncertain:string}
// Descriptions corroborate behavior in historical/player sources, not all client builds or numeric parameters.
const reference=(shots:number,effect:string,sources='2006 Blue Forever 玩家攻略／日文玩家条目',uncertain='各服精确伤害、判定与物理参数未取得原客户端验证'):WeaponReference=>({shots,effect,sources,uncertain});
export const WEAPON_REFERENCE:Partial<Record<WeaponId,WeaponReference>>={
 'bowl-normal':reference(1,'一枚大石头，直接爆破'),
 'bowl-special':reference(1,'一枚火石，落地燃烧、火焰向地面扩散，按秒造成伤害；雪会灭火'),
 'crossbow-normal':reference(1,'一支高伤、小范围箭'),
 'crossbow-special':reference(1,'一支毒箭，行动交接时毒伤；耐毒机体减伤，海怪半血停止，其余红血停止'),
 'cannon-normal':reference(1,'大铅弹／铅球／黑玉，伤害低、地形破坏强'),
 'cannon-special':reference(1,'小红豆／红玉，直接伤害高、地形破坏小'),
 'beetle-normal':reference(1,'单发爆破弹'),
 'beetle-special':reference(3,'三发分散弹，近距离或背射可集中命中'),
 'duke-normal':reference(1,'单发普通弹；没有证据表明“弹簧弹”会弹跳'),
 'duke-special':reference(1,'一枚毒气弹，毒云受风、按秒伤害；雪会清除毒云'),
 'mine-normal':reference(1,'单枚手榴弹'),
 'mine-special':reference(2,'两枚伏雷，敌方平时不可见；踩踏比直接砸中伤害高；悬浮的小妖、水鬼不踩雷'),
 'missile-normal':reference(1,'一枚四节导弹，最多四次后续爆破','2006 Blue Forever 玩家攻略（四节）；续作 FAQ 仅作对照'),
 'missile-special':reference(1,'单发低伤绿色追踪弹，落点附近索敌，无敌我识别，也可误锁残骸'),
 'multi-normal':reference(3,'三枚分散导弹'),
 'multi-special':reference(9,'九枚分散导弹，不带追踪'),
 'laser-normal':reference(1,'单枚能量弹，擅长挖地'),
 'laser-special':reference(3,'三枚交织能量弹；沿同一主弹道旋转前进'),
 'water-normal':reference(1,'单枚水球；雪天增强但资料给出 +25%／+50% 两种说法',undefined,'雪天倍率冲突；各服伤害、碰撞半径未确证'),
 'water-special':reference(1,'紫水正中后定身；旧版两份资料为两回合，续作 FAQ 为三回合',undefined,'各服回合计数口径未确证；本作采用两个自己的回合'),
 'ion-normal':reference(1,'一枚离子能量弹'),
 'ion-special':reference(1,'一枚定位弹，引来一次从上方发出的卫星打击；上层地形会遮挡射线'),
 'sea-normal':reference(1,'一个大光环；半血怒气提高伤害'),
 'sea-special':reference(2,'两个交织旋转光环；半血怒气提高伤害'),
 'dragon-normal':reference(3,'三枚强力导弹，日文条目描述每枚与红豆同级','2006 Blue Forever 玩家攻略／日文条目／2020 日文回忆文章'),
 'dragon-special':reference(9,'九枚都能追踪，不识别敌我，可误锁自身或残骸','2006 Blue Forever 玩家攻略／日文条目／2020 日文回忆文章','追踪启动高度、索敌半径、转弯速率及每枚伤害未确证'),
};
