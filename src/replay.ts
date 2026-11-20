import {modernAssistance} from './combat-preferences';
import {sourceRangeModel} from './source-range';
import {backgroundMarkers} from './background-markers';
import {CREW} from './crew';
import {recordedWorld} from './world-layout';
import {persistentShotItems} from './item-combos';
import {ALL_WEAPONS,ITEMS,MAPS,DIFFICULTIES} from './catalog';
import {VEHICLES} from './vehicles';
import {Game} from './engine';
import {traceClone,type BattleSnapshot} from './battle-trace';

export const REPLAY_FORMAT=1,REPLAY_STORAGE_KEY='piggy-replays-v1';
const METHODS=['update','setAim','face','selectWeapon','move','useItem','fire','skipTurn','acceptHandoff','setIntroLocked','setBattleRule','nextTurn','setPowerMarker','forfeitHumanSide','prepareAim'] as const;
type Command=[number,...any[]];
type UpdateBlock={steps:Float64Array;length:number};
type TapeEntry=Command|UpdateBlock;
type External={paused:boolean;targetX:number;aims:number[][]};
type ReplayCue={kind:'charge-wait'|'charge-start'|'charge-stop'|'charge-power';power?:number};
export interface BattleReplay {
 format:'piggy-battle-replay';formatVersion:1;gameVersion:string;id:string;createdAt:number;
 initial:BattleSnapshot;commands:Command[];duration:number;finalDigest:string;
}
const MAX_COMMANDS=160_000,MAX_STORAGE_CHARS=2_000_000,MAX_RECORDINGS=6;
const external=(g:Game):External=>({paused:g.paused,targetX:g.targetX,aims:g.tanks.map(t=>[t.id,t.angle,t.power,t.direction])});
/** Saved only on request. The diagnostic event buffer itself remains match-local.
 * Exact dt values and non-coalesced inputs complement the restorable snapshot;
 * nested AI/physics calls replay through update, not twice as player commands. */
export class ReplayRecorder {
 readonly initial:BattleSnapshot;readonly id:string;readonly createdAt=Date.now();
 private commands:TapeEntry[]=[];private commandCount=0;private depth=0;private lastExternal:External;
 private originals=new Map<string,Function>();private duration=0;private stopped=false;
 private finalDigest='';error='';
 constructor(readonly game:Game){
  this.initial=game.battleSnapshot();this.id=`${this.createdAt}-${game.config.seed>>>0}`;
  this.lastExternal=external(game);
  METHODS.forEach((name,index)=>{
   if(name==='prepareAim'&&!sourceRangeModel(game.gameVersion))return;
   const original=(game as any)[name] as Function;this.originals.set(name,original);
   const invoke=(args:any[])=>{
    const outer=this.depth===0,record=outer&&!this.stopped;
    if(record){this.sync();if(name!=='update'||!game.paused&&!game.introLocked){if(name==='update'){this.appendUpdate(args[0]);this.duration+=args[0];}else this.append([index,...args]);}}
    this.depth++;let result:any;
    try{result=original.apply(game,args);}finally{this.depth--;if(outer)this.lastExternal=external(game);}
    if(record&&game.phase==='ended'&&game.resultAge>=3){this.finalDigest=replayDigest(game);this.stopped=true;this.detach();}
    return result;
   };
   if(name==='update'){const updateArgs=[0];game.update=(dt:number)=>{updateArgs[0]=dt;return invoke(updateArgs);};}
   else (game as any)[name]=(...args:any[])=>invoke(args);
  });
 }
 private reserve(){if(this.commandCount>=MAX_COMMANDS){this.error='本局录像超过长度上限，无法完整保存。';this.stopped=true;this.detach();return false;}this.commandCount++;return true;}
 private append(command:Command){if(this.reserve())this.commands.push(command);}
 private appendUpdate(dt:number){
  if(!this.reserve())return;
  let block=this.commands.at(-1);if(!block||Array.isArray(block)||block.length===block.steps.length){block={steps:new Float64Array(1024),length:0};this.commands.push(block);}
  block.steps[block.length++]=dt;
 }
 private rememberExternal(){
  const state=this.lastExternal;state.paused=this.game.paused;state.targetX=this.game.targetX;
  for(let i=0;i<this.game.tanks.length;i++){const t=this.game.tanks[i],row=state.aims[i]??(state.aims[i]=[0,0,0,0]);row[0]=t.id;row[1]=t.angle;row[2]=t.power;row[3]=t.direction;}state.aims.length=this.game.tanks.length;
 }
 private sync(){
  const state=this.lastExternal,g=this.game;
  let changed=g.paused!==state.paused||g.targetX!==state.targetX||g.tanks.length!==state.aims.length;for(let i=0;!changed&&i<g.tanks.length;i++){const t=g.tanks[i],row=state.aims[i];changed=!row||row[0]!==t.id||row[1]!==t.angle||row[2]!==t.power||row[3]!==t.direction;}
  if(changed){this.append([-1,external(g)]);this.rememberExternal();}
 }
 get bufferBytes(){return this.commands.reduce((n,entry)=>n+(Array.isArray(entry)?JSON.stringify(entry).length*2:entry.steps.byteLength),0);}
 cue(kind:'charge-wait'|'charge-start'|'charge-stop'){if(!this.stopped)this.append([-2,kind]);}
 export():BattleReplay{
  if(this.error)throw Error(this.error);
  if(!this.stopped)this.sync();
  const commands:Command[]=[];for(const entry of this.commands){if(Array.isArray(entry))commands.push(entry);else for(let i=0;i<entry.length;i++)commands.push([0,entry.steps[i]]);}
  return traceClone({format:'piggy-battle-replay',formatVersion:REPLAY_FORMAT,gameVersion:this.game.gameVersion,id:this.id,createdAt:this.createdAt,initial:this.initial,commands,duration:this.duration,finalDigest:this.stopped?this.finalDigest:replayDigest(this.game)});
 }
 detach(){for(const [name,original] of this.originals)(this.game as any)[name]=original;this.originals.clear();}
}

export function replayDigest(game:Game){
 // Once at save/end, never per frame. Includes terrain, live rounds and RNG.
 const snapshot=game.battleSnapshot(),text=JSON.stringify({state:snapshot.current,rng:snapshot.rng});
 let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return (hash>>>0).toString(16);
}
export function validateReplay(value:any):asserts value is BattleReplay{
 const finite=(n:any)=>typeof n==='number'&&Number.isFinite(n);
 if(value?.format!=='piggy-battle-replay'||value.formatVersion!==REPLAY_FORMAT||typeof value.id!=='string'||!finite(value.createdAt)||!finite(value.duration)||value.duration<0||typeof value.finalDigest!=='string'||value.initial?.format!=='piggy-battle-snapshot'||!Array.isArray(value.commands)||value.commands.length>MAX_COMMANDS)throw Error('录像格式不支持或数据损坏。');
 for(const c of value.commands){
  if(!Array.isArray(c)||!Number.isInteger(c[0]))throw Error('录像操作数据损坏。');
  if(c[0]===-1){const p=c[1];if(c.length!==2||typeof p?.paused!=='boolean'||!finite(p.targetX)||!Array.isArray(p.aims)||p.aims.length>4||p.aims.some((a:any)=>!Array.isArray(a)||a.length!==4||a.some((n:any)=>!finite(n))||!Number.isInteger(a[0])||a[0]<0||a[0]>3))throw Error('录像状态数据损坏。');}
  else if(c[0]===-2){if(c.length!==2||!['charge-wait','charge-start','charge-stop'].includes(c[1]))throw Error('录像音效提示数据损坏。');}
  else if(c[0]===12&&(![2,...(backgroundMarkers(value.gameVersion)?[3]:[])].includes(c.length)||!finite(c[1])||c[1]<1||c[1]>100||c.length===3&&(!Number.isInteger(c[2])||c[2]<0||c[2]>3)))throw Error('录像力度记号损坏。');
  else if(c[0]===14&&(!sourceRangeModel(value.gameVersion)||![2,3,4].includes(c.length)||!finite(c[1])||c.length>=3&&(!Number.isInteger(c[2])||c[2]<0||c[2]>3)||c.length===4&&c[3]!==1&&c[3]!==-1))throw Error('录像预设角度损坏。');
  else if(c[0]<0||c[0]>=METHODS.length||c.length>5||c.slice(1).some((a:any)=>!['number','string','boolean'].includes(typeof a)||typeof a==='number'&&!finite(a))||c[0]===0&&(c.length!==2||c[1]<0||c[1]>.1)||c[0]===10&&(!['selfDamage','friendlyFire','allowDragon','fallDamage',...(modernAssistance(value.gameVersion)?['powerAssist','tankBlocking']:[])].includes(c[1])||typeof c[2]!=='boolean'))throw Error('录像操作不支持。');
 }
}
export class ReplayPlayer {
 game:Game;index=0;time=0;paused=false;speed=1;done=false;charging=false;waiting=false;waitingStartedAt=0;verified:boolean|null=null;private budget=0;private cues:ReplayCue[]=[];
 constructor(readonly recording:BattleReplay){validateReplay(recording);this.game=Game.fromBattleSnapshot(recording.initial);this.game.drainEvents();}
 advance(dt:number){
  if(this.paused||this.done)return;
  this.budget+=dt*this.speed;let count=0;
  while(this.index<this.recording.commands.length&&count++<2000){
   const command=this.recording.commands[this.index],method=command[0];
   if(method===0&&command[1]>this.budget+1e-10)break;
   this.index++;
   if(method===-1){const p=command[1] as External;this.game.paused=p.paused;this.game.targetX=p.targetX;for(const [id,angle,power,direction] of p.aims){const tank=this.game.tanks[id];if(!tank)throw Error('录像炮手状态损坏。');Object.assign(tank,{angle,power,direction});}}
   else if(method===-2){this.charging=command[1]==='charge-start';this.waiting=command[1]==='charge-wait';if(this.waiting)this.waitingStartedAt=this.time;this.cues.push({kind:command[1]});}
   else {if(method===0){this.budget-=command[1];this.time+=command[1];}(this.game[METHODS[method]] as Function).apply(this.game,command.slice(1));if(method===1&&this.charging)this.cues.push({kind:'charge-power',power:this.game.active.power});}
  }
  if(this.index===this.recording.commands.length){this.done=true;this.verified=replayDigest(this.game)===this.recording.finalDigest;if(this.charging||this.waiting){this.charging=false;this.waiting=false;this.cues.push({kind:'charge-stop'});}}
 }
 drainCues(){const result=this.cues;this.cues=[];return result;}
}
export interface ReplayStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export function readReplays(storage:ReplayStorage):BattleReplay[]{
 let values:any;try{values=JSON.parse(storage.getItem(REPLAY_STORAGE_KEY)||'[]');}catch{throw Error('读取录像失败，请检查本机存储权限。');}
 if(!Array.isArray(values))throw Error('录像列表数据损坏。');
 values.forEach(validateReplay);return values;
}
export function saveReplay(storage:ReplayStorage,recording:BattleReplay){
 validateReplay(recording);const existing=readReplays(storage),list=[recording,...existing.filter(r=>r.id!==recording.id)];
 if(list.length>MAX_RECORDINGS)throw Error('最多保存6局录像，请先删除一局。');
 const encoded=JSON.stringify(list);if(encoded.length>MAX_STORAGE_CHARS)throw Error('录像空间不足，请先删除旧录像；本局尚未保存。');
 try{storage.setItem(REPLAY_STORAGE_KEY,encoded);}catch{throw Error('录像保存失败：本机存储空间不足或未获存储权限。');}
}
export function deleteReplay(storage:ReplayStorage,id:string){
 const list=readReplays(storage).filter(r=>r.id!==id);
 try{storage.setItem(REPLAY_STORAGE_KEY,JSON.stringify(list));}catch{throw Error('删除失败，请检查本机存储权限。');}
}


/** Files are untrusted input. Bound before JSON parsing, then verify terrain
 * and executable state separately from the local recording format. */
export const MAX_REPLAY_FILE_BYTES=8_000_000;
export function exportReplay(recording:BattleReplay){validateReplay(recording);return JSON.stringify(recording);}
export function replayFilename(recording:BattleReplay){return `piggy-replay-${recording.initial.initial.config.map}-${new Date(recording.createdAt).toISOString().replace(/[:.]/g,'-')}.json`;}
export function parseReplayFile(text:string,currentVersion:string):BattleReplay{
 if(new TextEncoder().encode(text).byteLength>MAX_REPLAY_FILE_BYTES)throw Error('录像文件超过8MB，无法导入。');
 let value:any;try{value=JSON.parse(text);}catch{throw Error('请导入导出的录像 JSON 文件。');}
 // A recursive shape/size guard prevents pathological restored arrays or keys.
 let nodes=0;const visit=(v:any,depth=0)=>{if(++nodes>1_000_000||depth>24)throw Error('录像结构过大或过深。');if(typeof v==='number'&&!Number.isFinite(v))throw Error('录像数值损坏。');if(v&&typeof v==='object'){for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('录像包含无效字段。');visit(v[k],depth+1);}}};visit(value);
 validateReplay(value);
 const finite=(n:any)=>typeof n==='number'&&Number.isFinite(n),integer=(n:any)=>Number.isSafeInteger(n)&&n>=0;
 const version=(v:any)=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v)?v.split('.').map(Number):null;
 const v=version(value.gameVersion),now=version(currentVersion);
 if(!v||!now||v.some((n:number,i:number)=>n>now[i]&&v.slice(0,i).every((a:number,j:number)=>a===now[j])))throw Error('录像来自更新的游戏版本，请先更新游戏。');
 if(value.id.length>160||!value.id.length||value.createdAt<0||value.createdAt>8.64e15||value.duration>16000||! /^[0-9a-f]{1,8}$/.test(value.finalDigest))throw Error('录像信息损坏。');
 const snap=value.initial,state=snap.current,config=snap.initial?.config;
 if(snap.formatVersion!==1||snap.gameVersion!==value.gameVersion||!state||!config||!MAPS.some(m=>m.id===config.map)||!integer(config.seed)||config.seed>0xffffffff||!Array.isArray(config.slots)||config.slots.length!==4||!Array.isArray(snap.initial.slots)||snap.initial.slots.length!==4||typeof snap.initial.mapName!=='string')throw Error('录像开局信息损坏。');
 if(snap.rng?.algorithm!=='mulberry32'||!integer(snap.rng.index)||snap.rng.index>100_000_000||!integer(snap.rng.seed)||!integer(snap.rng.state)||snap.rng.state>0xffffffff||!Array.isArray(snap.events)||snap.events.length>1000||!Array.isArray(snap.critical)||snap.critical.length>64||!integer(snap.truncation?.dropped))throw Error('录像随机状态或日志损坏。');
 if(state.config?.map!==config.map||state.config?.seed!==config.seed||!Array.isArray(state.config?.slots)||state.config.slots.length!==4)throw Error('录像配置与开局不一致。');
 const size=recordedWorld(snap.initial.world,snap.gameVersion),length=(size.width+1)*size.height;
 for(const packed of [state.terrain?.mask,state.terrain?.protectedMask]){
  if(packed?.length!==length)throw Error('录像地形尺寸不匹配。');
  if(packed.encoding==='rle'){if(!Array.isArray(packed.data)||packed.data.length>10002||![0,1].includes(packed.data[0])||packed.data.slice(1).some((n:any)=>!integer(n)||n===0)||packed.data.slice(1).reduce((a:number,b:number)=>a+b,0)!==length)throw Error('录像地形游程损坏。');}
  else if(packed.encoding==='bits'){const bytes=Math.ceil(length/8);if(typeof packed.data!=='string'||packed.data.length!==4*Math.ceil(bytes/3)||! /^[A-Za-z0-9+/]*={0,2}$/.test(packed.data)||atob(packed.data).length!==bytes)throw Error('录像地形位图损坏。');}
  else throw Error('录像地形格式不支持。');
 }
 if(!integer(state.terrain.revision)||!Array.isArray(state.tanks)||state.tanks.length<2||state.tanks.length>4||!integer(state.current)||state.current>=state.tanks.length||!['aiming','flying','resolving','handoff','supply','ended'].includes(state.phase))throw Error('录像战场状态损坏。');
 const weapons=new Set(ALL_WEAPONS.map(w=>w.id)),items=new Set(ITEMS.map(i=>i.id));
 for(const [i,t] of state.tanks.entries()){if(t.id!==i||!(t.crew in CREW)||!DIFFICULTIES.some(d=>d.id===t.difficulty)||!VEHICLES.some(v=>v.id===t.vehicleId)||typeof t.name!=='string'||t.name.length>80||/[<>&]/.test(t.name)||![t.x,t.y,t.hp,t.maxHP,t.angle,t.power].every(finite)||t.maxHP<=0||t.maxHP>10000||Math.abs(t.x)>10000||Math.abs(t.y)>10000||!['human','ai'].includes(t.controller)||![0,1,2,3].includes(t.team)||!weapons.has(t.selectedWeapon))throw Error('录像炮手状态损坏。');}
 if(persistentShotItems(value.gameVersion))for(const t of state.tanks){
  const q=t.queuedShot;if(q===undefined)continue;
  const slot=(n:any)=>integer(n)&&n<4;
  if(!q||typeof q!=='object'||Array.isArray(q)||q.double!==undefined&&(!t.doubleShot||!slot(q.double))||q.boost!==undefined&&(!t.boost||!slot(q.boost))||
   q.ammo!==undefined&&(!q.ammo||!['repair','teleport'].includes(q.ammo.item)||!slot(q.ammo.slot)||t.itemSlots?.[q.ammo.slot]!==q.ammo.item))throw Error('录像待发道具状态损坏。');
 }
 for(const [key,max] of [['projectiles',128],['blasts',512],['mines',32],['crates',32],['fires',64],['gases',64],['texts',512],['itemCues',64]] as const)if(!Array.isArray(state[key])||state[key].length>max)throw Error('录像实体数量异常。');
 for(const p of state.projectiles)if(!weapons.has(p.weapon)||!integer(p.owner)||p.owner>=state.tanks.length||![p.x,p.y,p.vx,p.vy,p.delay,p.age].every(finite)||Math.max(Math.abs(p.vx),Math.abs(p.vy))>10000||!integer(p.penetrations)||p.penetrations>3)throw Error('录像弹体损坏。');
 for(const c of value.commands){const [m,...a]=c;const valid=m<0||m===0||m===1&&a.length===2&&a.every(finite)&&a[1]>=1&&a[1]<=100||m===2&&a.length===1&&[-1,1].includes(a[0])||m===3&&a.length===1&&weapons.has(a[0])||m===4&&a.length>=2&&a.length<=3&&[-1,1].includes(a[0])&&finite(a[1])&&a[1]>=0&&a[1]<=.1&&(a.length===2||typeof a[2]==='boolean')||m===5&&a.length>=1&&a.length<=3&&items.has(a[0])&&(a.length<2||typeof a[1]==='boolean')&&(a.length<3||integer(a[2])&&a[2]<4)||[6,7,8,11,13].includes(m)&&a.length===0||m===9&&a.length===1&&typeof a[0]==='boolean'||m===10&&a.length===2||m===12&&(a.length===1||backgroundMarkers(value.gameVersion)&&a.length===2&&integer(a[1])&&a[1]<state.tanks.length&&state.tanks[a[1]].controller==='human');if(!valid)throw Error('录像操作参数损坏。');if(m===-1&&(new Set(a[0].aims.map((r:number[])=>r[0])).size!==a[0].aims.length||a[0].aims.some((r:number[])=>r[0]>=state.tanks.length||r[2]<1||r[2]>100||![-1,1].includes(r[3]))))throw Error('录像炮手输入损坏。');}
 const duration=value.commands.reduce((n:number,c:Command)=>n+(c[0]===0?c[1]:0),0);
 if(Math.abs(duration-value.duration)>.000001)throw Error('录像时长与操作不一致。');
 try{Game.fromBattleSnapshot(snap);}catch{throw Error('录像初始状态无法恢复。');}
 return value;
}
export function importReplay(storage:ReplayStorage,recording:BattleReplay){
 const existing=readReplays(storage),match=existing.find(r=>r.id===recording.id);
 if(match&&exportReplay(match)===exportReplay(recording))return match;
 const imported=match?{...recording,id:`${recording.id.slice(0,110)}-import-${Date.now()}-${existing.length}`}:recording;
 saveReplay(storage,imported);return imported;
}
