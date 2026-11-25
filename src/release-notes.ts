export const RELEASE_NOTES=[
 '长按跳过键 1 秒才跳过回合，角色头顶显示进度环。',
 '道具提示多停 0.3 秒，图标轻弹；提示和进度环显示时隐藏倒三角。AI 用道具后多等 0.6 秒再开炮。',
 '双发和威力加强需分回合装填，留到下一次行动仍可叠加。',
 '四位炮手欢呼时衣领随头部轻动，移动端长按不会弹出浏览器菜单。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
