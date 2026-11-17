import {Game} from './engine';
import {traceClone,type BattleSnapshot} from './battle-trace';

export const REPLAY_FORMAT=1,REPLAY_STORAGE_KEY='piggy-replays-v1';
const METHODS=['update','setAim','face','selectWeapon','move','useItem','fire','skipTurn','acceptHandoff','setIntroLocked','setBattleRule','nextTurn','setPowerMarker','forfeitHumanSide'] as const;
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
  else if(c[0]===12&&(c.length!==2||!finite(c[1])||c[1]<1||c[1]>100))throw Error('录像力度记号损坏。');
  else if(c[0]<0||c[0]>=METHODS.length||c.length>5||c.slice(1).some((a:any)=>!['number','string','boolean'].includes(typeof a)||typeof a==='number'&&!finite(a))||c[0]===0&&(c.length!==2||c[1]<0||c[1]>.1)||c[0]===10&&(!['selfDamage','friendlyFire','allowDragon','fallDamage'].includes(c[1])||typeof c[2]!=='boolean'))throw Error('录像操作不支持。');
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
