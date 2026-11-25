export const RELEASE_NOTES=[
 '新增局域网对战：同一 Wi-Fi 下扫码或打开邀请链接加入，最多四人。单机和热座仍可照常开局。',
 '有人掉线时暂停，保留席位 60 秒。局域网对局可保存录像，不影响本机段位和成就。',
 '「战场已就位」卡片跟随每日主题，保持白字清晰。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
