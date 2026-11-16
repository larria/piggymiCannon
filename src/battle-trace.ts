/** Match-local diagnostics. No storage, network, wall clock or device identifiers. */
export const TRACE_VERSION=1,TRACE_LIMIT=1000,TRACE_BYTE_LIMIT=350_000;
export interface TraceEvent {sequence:number;time:number;action:number;round:number;actor:number|null;type:string;summary:string;rngIndex:number;data:Record<string,any>}
export interface BattleSnapshot {format:'piggy-battle-snapshot';formatVersion:1;gameVersion:string;initial:any;rng:{algorithm:'mulberry32';seed:number;index:number;state:number};current:any;events:TraceEvent[];critical:TraceEvent[];truncation:{dropped:number;firstRetained:number|null};replay:{mode:string;notes:string}}
export const traceClone=<T>(value:T):T=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'&&!Number.isFinite(v)?(v===Infinity?'Infinity':v===-Infinity?'-Infinity':'NaN'):v));
const eventBytes=(event:unknown)=>new TextEncoder().encode(JSON.stringify(event)).byteLength;
export class BattleTrace {
 initial:any=null;events:TraceEvent[]=[];critical:TraceEvent[]=[];sequence=0;rngIndex=0;dropped=0;private bytes=0;
 constructor(readonly seed:number){}
 get rngState(){return ((this.seed>>>0)+Math.imul(this.rngIndex,0x6D2B79F5))>>>0;}
 record(entry:Omit<TraceEvent,'sequence'|'rngIndex'>,pin=false,merge=false){
  let last:TraceEvent|undefined;
  if(merge)for(let i=this.events.length-1;i>=0;i--){const candidate=this.events[i];if(!['move','aim','face'].includes(candidate.type))break;if(candidate.type===entry.type){last=candidate;break;}}
  if(merge&&last&&last.actor===entry.actor&&last.action===entry.action&&entry.time-(last.data.endedAt??last.time)<.3){
   const old=eventBytes(last);entry.data.from=last.data.from;entry.data.fuelBefore=last.data.fuelBefore;entry.data.startedAt=last.data.startedAt??last.time;
   entry.data.endedAt=entry.time;entry.time=last.time;
   if(entry.type==='move')entry.data.distance=(last.data.distance??0)+(entry.data.distance??0);
   Object.assign(last,traceClone(entry),{rngIndex:this.rngIndex});this.bytes+=eventBytes(last)-old;this.trim();return last.sequence;
  }
  const event=traceClone({...entry,sequence:++this.sequence,rngIndex:this.rngIndex});this.events.push(event);this.bytes+=eventBytes(event);
  // At most four deaths per match. Also pin the complete lethal damage payload.
  if(pin)this.critical.push(event);
  this.trim();return event.sequence;
 }
 private trim(){while(this.events.length>TRACE_LIMIT||this.bytes>TRACE_BYTE_LIMIT){this.bytes-=eventBytes(this.events.shift()!);this.dropped++;}}
 snapshot(gameVersion:string,current:any):BattleSnapshot{return traceClone({format:'piggy-battle-snapshot',formatVersion:TRACE_VERSION,gameVersion,initial:this.initial,rng:{algorithm:'mulberry32',seed:this.seed,index:this.rngIndex,state:this.rngState},current,events:this.events,critical:this.critical,truncation:{dropped:this.dropped,firstRetained:this.events[0]?.sequence??null},replay:{mode:'restore-current-state',notes:'当前状态含地形、机体、弹体、状态时钟与随机状态，可恢复后逐步继续模拟；事件按动作合并，不能把合并事件当作逐帧输入。截断后不承诺从开局逐帧重演，致死明细与开局仍保留。'}});}
 restore(snapshot:BattleSnapshot){this.initial=traceClone(snapshot.initial);this.events=traceClone(snapshot.events);this.critical=traceClone(snapshot.critical);this.sequence=Math.max(0,...this.events.map(e=>e.sequence),...this.critical.map(e=>e.sequence));this.rngIndex=snapshot.rng.index;this.dropped=snapshot.truncation.dropped;this.bytes=this.events.reduce((n,e)=>n+eventBytes(e),0);this.trim();}
}
export function snapshotText(snapshot:BattleSnapshot){
 const initial=snapshot.initial,config=initial.config,all=new Map<number,TraceEvent>();
 for(const event of [...snapshot.events,...snapshot.critical])all.set(event.sequence,event);
 const head=[`咪猪头对局快照 · 游戏 v${snapshot.gameVersion} · 格式 ${snapshot.formatVersion}`,`地图 ${initial.mapName}（${config.map}），种子 ${config.seed}，随机调用 ${snapshot.rng.index}，状态 ${snapshot.rng.state}`,`开局：${initial.slots.map((s:any)=>`${s.slot+1}槽 ${s.name} ${s.enabled?`${s.flag.letter}旗 ${s.controller==='ai'?(s.difficultyName??s.difficulty)+' AI':'人类'}／${s.vehicleName}`:'×空位'}`).join('；')}`,`天气／开关：${JSON.stringify(initial.rules)}`,`现场：行动 ${snapshot.current.turn+1}，阶段 ${snapshot.current.phase}，风 ${snapshot.current.wind}，火线剩余 ${snapshot.current.fireLineTurnsRemaining}`,`截断 ${snapshot.truncation.dropped} 条；致死明细 ${snapshot.critical.filter(e=>e.type==='death').length} 条保留。${snapshot.replay.notes}`];
 const lines=[...all.values()].sort((a,b)=>a.sequence-b.sequence).map(e=>`#${e.sequence} [${e.time.toFixed(3)}秒 第${e.action}行动／第${e.round}轮] ${e.summary}${e.type==='move'?` 起点${JSON.stringify(e.data.from)}→终点${JSON.stringify(e.data.to)}，燃料${e.data.fuelBefore}→${e.data.fuelAfter}`:''}`);
 return [...head,...lines,'','以下 JSON 与上述摘要来自同一事件序列（字段明细及现场状态以此为准）：','```json',JSON.stringify(snapshot),'```'].join('\n');
}
/** Occupancy RLE, falling back to a bounded bitset for fragmented terrain. */
export function packTerrain(mask:Uint8Array){
 const runs=[mask[0]],maxRuns=100_000;let length=0,value=mask[0];
 for(const v of mask){if(v===value)length++;else{runs.push(length);value=v;length=1;if(runs.length>maxRuns)break;}}
 if(runs.length<=maxRuns&&runs.length*7<Math.ceil(mask.length/8)*4/3){runs.push(length);return {encoding:'rle' as const,length:mask.length,data:runs};}
 const bits=new Uint8Array(Math.ceil(mask.length/8));for(let i=0;i<mask.length;i++)if(mask[i])bits[i>>3]|=1<<(i&7);
 let binary='';for(let i=0;i<bits.length;i+=8192)binary+=String.fromCharCode(...bits.subarray(i,i+8192));return {encoding:'bits' as const,length:mask.length,data:btoa(binary)};
}
export function unpackTerrain(packed:ReturnType<typeof packTerrain>,mask:Uint8Array){
 if(packed.length!==mask.length)throw new Error('地形尺寸不匹配');mask.fill(0);
 if(packed.encoding==='bits'){const bytes=atob(packed.data as string);for(let i=0;i<mask.length;i++)mask[i]=(bytes.charCodeAt(i>>3)>>(i&7))&1;}
 else {const runs=packed.data as number[];let at=0,value=runs[0];for(const count of runs.slice(1)){mask.fill(value,at,at+count);at+=count;value=1-value;}if(at!==mask.length)throw new Error('地形游程不完整');}
}
