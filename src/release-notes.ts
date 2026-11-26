export const RELEASE_NOTES=[
 '咪猪头扶正了护目镜，补齐了两只小耳朵。',
 '四人开局的出生点更分散，仍有机会三人靠近、一人在远处。',
 '道具栏增加醒目的待发印记，直到发射或取消装填。',
 '甲壳虫的趴趴弹从同一炮口发射，远射落点更容易拉开。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
