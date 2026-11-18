export const RELEASE_NOTES=[
 '蓄力辅助只在当前人类自己的行动回合显示和计算；离开回合立即隐藏，空闲预设角度与镜头切换不再触发，停稳等待降至30ms。',
 'AI越近越准、越远越容易偏离；约1/5屏内明显减少误瞄和角度偏差，四档上限、首炮／地形扰动惩罚与稳定射击校准保留。',
 'AI增加挖土后自身和队友支撑、致命自伤及友伤评估，危险时尝试安全角度、武器或走位；没有安全有效方案时等待3秒后跳过，发射前再核查最终姿态。',
 '永久地形、四段飞火、多人齐射／双发及较低平台纳入防自杀检查；不更改炮弹伤害、挖土或命中机制，旧录像保留原AI行为。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
