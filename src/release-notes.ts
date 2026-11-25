export const RELEASE_NOTES=[
 '按钮、设置、指南、随机上阵图标和战场仪表统一跟随每日主题。',
 '主页、加载页和弹窗保持白底，队旗与战场状态仍用原色。',
 '咪猪头的右侧坦克帽带收窄并贴住脸颊，侧脸姿势保持原样。',
 'AI 只给血量低于 40% 的自己或队友选用恢复弹；恢复弹按难度有时会瞄偏，并尽量擦中。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
