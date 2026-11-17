export const RELEASE_NOTES=[
 '按统一坐标重建炮弹挖土范围，头部命中自然留浅坑；雷霆普通弹恢复正常开挖。',
 '公爵满伤判定更严格，低位命中会挖得更深；水鬼普通弹恢复应有的开挖范围。',
 '雷霆地雷伤害加强保留，小妖三雷炮会挖土；海怪小电环仍需极精准命中才能满伤。',
 '保留流星与暴龙已确认的多弹分布，避免近距离两枚飞弹同时造成满额伤害。',
 '飞火保留连续四段递减伤害，挖土随弹段逐渐收尖；独木桥与工厂厚度配合新范围校准。',
 '深色提示中的玩家名字改用清晰的浅色队伍色与细描边；旧录像继续按原版本规则播放。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
