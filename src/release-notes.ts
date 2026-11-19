export const RELEASE_NOTES=[
 '战场支持滚轮、触摸板和双指缩放，双指还可平移视野。',
 '倍率约70%–180%，以手势中心缩放；跟随与换人保留倍率，新对局恢复原视野。',
 '缩放复用地形与贴图，保持物理、武器和AI规则，避免整图反复重绘。',
 '修正缩放时地形分块间偶尔出现的细线。',
 '钢铁工厂平台端部改为短斜坡与斜切侧面，中心厚度和永久Z形底板保持。',
 '手机横竖屏、iPad与PC共用手势，旧录像保留原地形。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
