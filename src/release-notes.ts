export const RELEASE_NOTES=[
 '公爵两种武器按原版49/43比例恢复相对射程，轻点与旧录像保持。',
 '暴龙、飞火特殊弹和猎星追踪弹增加前瞻索敌，锁定后直接趋向目标；地形仍可阻挡。',
 '修复靠近出生的头像被抬得过高，优先横向避让，保留头像点击定位。',
 '恢复弹正中最高治疗提升到最大生命60%，距离衰减、强化与双发联动保持。',
 'AI预测与新的射程、追踪和恢复量同步，旧录像仍按录制版本播放。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
