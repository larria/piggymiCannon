export const RELEASE_NOTES=[
 '修复AI因队友站在地图底边附近而无故跳过行动的问题。',
 'AI只评估本次炮击新增的风险；队友原有的下落不会阻止无关方向的射击，真正的误伤与挖落队友仍会避让。',
 '被困的AI等待一回合后会尝试安全挖土自救；王牌在首次准备等待时就会优先考虑转移弹脱困。',
 '神圣殿堂与冰封溪谷的老兵以上AI，会优先寻找下方有承接的平台，再移动、瞄准和开火。',
 '游戏下拉选择框统一为暖纸色菜单，支持键盘、触屏和自动翻转，手机横竖屏也能完整点选。',
 '旧录像保留原有回放规则，武器数值和AI命中率保持。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
