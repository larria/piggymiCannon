export const RELEASE_NOTES=[
 '七套纸色主题每天轮换，连续两天不同；同一地图连玩会换一首可用的配乐。',
 '四位炮手在坦克里只露出脑袋，欢呼时举小拳头或鱼鳍；咪猪头的坦克帽戴正了。',
 '飞火普通弹的四段实爆分别播放音效，紧贴坦克或打在打不穿的地形上，也能听到每一段。',
 '流星特殊武器的九发导弹分三簇依次出膛；双发仍完整追加第二轮，镜头继续跟随最低的在飞弹。',
 '重绘单轮老土、水鬼、海怪和雷霆，去掉公爵的绿尾，校正流星配色；海怪的怒火贴着装甲每次只升起一圈，熄灭后再从底部点燃。',
 '战场血条空余部分和边框都是纯白，剩余血量填绿，喘气或发怒时填红。',
 '段位门槛提高十倍，按原积分重新定段。队伍胜负后单独结算每位炮手的表现；零贡献赢了不加分；负局至少击倒一名敌人，且敌方伤害与实际治疗合计满 1,000 点才免扣。',
];
export function readRelease(value:any):{version:string;notes:string[]}|null{
 if(typeof value?.version!=='string'||!/^v?\d+\.\d+\.\d+$/.test(value.version))return null;
 return {version:value.version.replace(/^v/,''),notes:Array.isArray(value.notes)?value.notes.filter((v:any)=>typeof v==='string'&&v.length>0&&v.length<=240).slice(0,12):[]};
}
export const UPDATE_RECEIPT='piggy-update-receipt';
export function consumeUpdateReceipt(storage:Pick<Storage,'getItem'|'removeItem'>,version:string){try{const target=storage.getItem(UPDATE_RECEIPT);storage.removeItem(UPDATE_RECEIPT);return target===version;}catch{return false;}}
