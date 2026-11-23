export const RELEASE_NOTES=[
 '十三台战车的车身比例重新校正，保持各自轮廓、炮口方向和碰撞体积。大腕改回木架、双轮和铜投石碗的古典造型。',
 '四位炮手在舱口露出衣领和少量肩部，咪猪头和小黄鱼的战场形象略微加大。',
 '四位炮手都有完整的倒地图形；咪猪头和阿狸哭泣时交替用小拳头捶地，小黄鱼以尾鳍和鱼鳍表现。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
