import {weaponById,type WeaponId} from './catalog';
/** Short gameplay features for hover/hold help. Full numbers remain in the weapon guide. */
export function weaponHint(id:WeaponId){
 const w=weaponById(id);
 const specific:Record<string,string>={
  'cannon-normal':'范围爆破、挖土强，可连续打穿桥面。','cannon-special':'伤害集中，爆炸与挖土范围较小。',
  'water-normal':'抛射水团，命中后范围爆破。','dragon-special':'九枚导弹分别追踪，落点略分散。',
  'multi-normal':'三枚分散落地；逆风高抛时更集中。','multi-special':'九枚交织飞行，落点通常较分散。',
 };
 if(specific[id])return specific[id];
 const features:Record<string,string>={fire:'落地留下火焰，沿地面扩散并持续灼烧。',poison:'命中后中毒，每次行动结束扣血，降至红血后停止。',gas:'落地形成毒气，随风漂移，接触时持续受伤。',mine:'双地雷落地埋设，踩中比直接砸中伤害更高。',pierce:'四段连续爆破，伤害逐段递减。',homing:'下降末段锁定附近目标，地形仍可阻挡。',orbital:'定位弹落地后，由上方卫星轰击。',freeze:'紫水命中或波及后，限制目标一个回合移动。',beam:'能量弹抛射，命中后范围爆破。',helix:'多枚能量弹交织旋转前进。'};
 if(w.effect&&features[w.effect])return features[w.effect];
 if(w.effect==='shell')return `${w.shots&&w.shots>1?`${w.shots}枚齐射，`:''}抛物线爆破。`;
 return w.description;
}
