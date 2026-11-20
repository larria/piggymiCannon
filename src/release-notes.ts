export const RELEASE_NOTES=[
 '大猪头卸下坦克帽，露出宽额和垂耳，与咪猪头更容易区分。',
 '四位炮手换成专注的侧身姿态，空闲 20 秒会做各自的小动作。大猪头更宽厚，肤色也更深。',
 '受击时哭得更久，坠落会一路哭，落地后再哭两秒。红血喘气和海怪发怒时的火焰更醒目。',
 '正在跟随的炮弹撞停后，镜头会接着跟随仍在空中飞行的炮弹。',
 '方向键与 A／D 短按可原地转身，按住 50 毫秒再开始移动。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
