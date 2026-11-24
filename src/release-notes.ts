export const RELEASE_NOTES=[
 '四位炮手倒地时保持贴地姿势，身体和脚向画面深处收短，保留各自的表情和动作。',
 '小黄鱼倒地时不穿军装，鱼身和尾鳍相连，甩尾时更贴近地面。',
 '战场血槽按最大血量微调长度，暴龙最多比老土长约两成。',
 '统一战报和图鉴里的「倒地」与「倒地后的身体」用语。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
