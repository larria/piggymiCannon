export const RELEASE_NOTES=[
 '大猪头恢复浅暖粉肤色，阿狸的毛更红、耳尖更利落。回血会露出笑容，安全短落差不哭，长坠落地后再哭 1 秒。',
 '重伤或长坠会触发队友喝彩与错愕；重新调整了举手动作，手臂与侧身肩线对齐。',
 '大雾中仍能隐约看见地形和飞弹，敌方炮手与小地图标记继续隐藏。',
 '双发、威力加强与装填的道具弹可跨回合保留，直至发射；待发的双发不能重复装填。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
