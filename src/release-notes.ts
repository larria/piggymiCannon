export const RELEASE_NOTES=[
 '挖土改为实际爆点的完整椭圆，正中不再固定扣深度；高处命中自然形成浅坑，低处命中仍会挖土。',
 '飞火保留四段递减伤害与逐段收窄的挖掘；擦中仍有伤害衰减，旧录像使用原有规则。',
 '对局录像支持JSON导入、导出与跨设备播放，导入后保存在本机；存储不足时仍可直接观看。',
 '流星等多发炮弹的镜头跟随最低的一发，兼顾水平位置；手动定位与其它跟随行为继续可用。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
