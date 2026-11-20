export const RELEASE_NOTES=[
 '咪猪头、大猪头、阿狸和小黄鱼以各自头像为基准重绘，动作各有特色。',
 '战场弹体更醒目，小红豆保持原样。水鬼两种弹体保持直立，大小对应弹坑，落地只溅水花。',
 '已用道具将在原槽显示半透明待发提示，小地图的当前炮手圆点会柔和闪烁。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
