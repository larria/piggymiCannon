export const RELEASE_NOTES=[
 '按参考帧重绘13台坦克的26种弹体，修正公爵、流星、闪灵等武器轮廓和配色。',
 '尾焰按参考图表现，不再按系别排除；威力加强仍有星星环绕尾焰，齐射和追踪机制保持。',
 '闪灵卫星射线穿过坦克后垂直命中地面，上层地形仍可遮挡；小妖普通弹的挖土范围大于卫星弹。',
 '选坦克的角色标签更紧凑，保留触屏点击大小；主界面角色栏的坦克图适度放大。',
 '新增炮弹绘图室，可查看全部弹体动画、单枚细节、齐射和强化星星。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
