export const RELEASE_NOTES=[
 '收窄满伤与免挖土判定，海怪双电环判定更窄；雷霆、甲壳虫普通弹正中保留浅坑。',
 '流星与暴龙普通三发飞弹更分散；小妖两种武器正中仍保留挖土。',
 '雷霆每颗地雷伤害翻倍，爆炸挖土，可连锁引爆；敌方看不到埋雷；永久地形上的箱子不受炮击破坏。',
 '鼠标停留或按住战场边缘可移动镜头；力度记号移至上沿，蓄力显示上次力度浅色填充。',
 'AI 用最小力度自疗，合适时向队友投送恢复弹；AI 随机上阵不再抽中暴龙。',
 '对方为纯AI队伍时，从第二完整回合起退出按己方败局计分。',
 '不可用操作改用独立提示音，移除多余暴龙说明，美化结算奖杯与连续圆角战斗界面。',
 '更新前展示改动列表，更新完成后给出轻提示。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
