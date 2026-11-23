export const RELEASE_NOTES=[
 '神圣殿堂的木轨随缓坡起伏；底层五个同样大小的伞盖可接住坦克，挖掉木轨后仍能开上斜面调角。小地图可见伞盖。',
 '火线贯穿整个战场，飞出屏幕的炮弹穿过它也会强化。火线期间暂停投放补给，保留已抽中的人类炮手。',
 '闪灵强化后的卫星激光变红、变粗，威力仍提升 50%。',
 '改善 iPad 横屏：独立窗口主页避开状态栏，战场用足底部空间，角度盘更大。',
 '左右方向键和触屏移动按钮：反向先转身，按住 100 毫秒再移动。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
