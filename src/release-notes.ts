export const RELEASE_NOTES=[
 '伤害按具体炮弹与目标的属性计算，修正小红豆打雷霆时额外减伤的问题。',
 '命中盒与伤害参照点采用固定矩形坐标，碰到机体边缘仍按距离衰减。',
 '独木桥中段按实测厚度调整，老土普通弹垂直正中两次仍不会打穿。',
 '地图扩展空间、扩大可视范围，坦克恢复原来屏幕大小，操作按钮保持原尺寸。',
 '新增独立天空之城，冰封溪谷、工厂、殿堂及桥头支撑按参考重绘。',
 '炮弹恢复原来相对坦克的显示大小，弹道和伤害范围保持。',
 '配乐按实际地图随机选择完整候选曲；快照和录像保留选曲。',
 '流星与暴龙分散齐射、飞火四段递减、小妖挖土和海怪极窄正中规则保留。',
 '伤害记录补充具体属性与整数结算步骤，旧录像继续按录制版本播放。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
