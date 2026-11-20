export const RELEASE_NOTES=[
 '所有坦克的满蓄力上限提高 20%，轻点发射仍是原来的最小力度。',
 '键盘反向先转身，按住 200 毫秒才移动；同向按下就走。',
 '水鬼的普通和特殊弹体宽高减半，仍直立飞行；水花与伤害范围保持。',
 '四位炮手的欢呼改为更短的动作，小黄鱼用鱼鳍摆动，阿狸换上宽耳和更红的毛色。',
 '冰封溪谷的两条冰带向战场外缘逐渐增厚，保留中间空隙和下层细枝。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
