import {Game,clamp,type Config} from './engine';
import {applyLanTerrain,inviteCode,lanDecode,LAN_HOST_KEY,LAN_PREFIX,LAN_PROTOCOL,LAN_VISUAL_KEYS,type LanCommand,type LanMessage,type LanRequest,type LanRoom,type LanVisuals} from './lan-protocol';
import type {BattleReplay} from './replay';
import type {BattleSnapshot} from './battle-trace';

export const lanServed=()=>document.documentElement.hasAttribute('data-lan-server');
const home=new URL(import.meta.env.BASE_URL,location.href);
export const lanPath=(route:string)=>new URL(LAN_PREFIX+route,home);
const read=(k:string)=>{try{return sessionStorage.getItem(k);}catch{return null;}};
const write=(k:string,v:string)=>{try{sessionStorage.setItem(k,v);}catch{/* Session may not be persistent. */}};
const forget=(k:string)=>{try{sessionStorage.removeItem(k);}catch{/* Optional storage. */}};
const cap=/^#host=([A-Za-z0-9_-]{32})$/.exec(location.hash)?.[1];
if(cap&&lanServed()){write(LAN_HOST_KEY,cap);history.replaceState(history.state,'',location.pathname+location.search);}
export const hostKey=()=>lanServed()?(cap??read(LAN_HOST_KEY)):null;
const ACTIVE_HOST='piggy-lan-host-active';
export const resumeHosting=()=>read(ACTIVE_HOST)===hostKey()&&!!hostKey();
export const resumeGuest=(code:string)=>!!read('piggy-lan-seat:'+code);
export const guestCode=()=>lanServed()?inviteCode(location.hash):null;

type Events={room:()=>void;match:(g:Game,reconnected:boolean)=>void;error:(message:string)=>void};
type Aim={seq:number;action:Extract<LanCommand,['aim',number,number,number]>};
export class LanClient {
 room:LanRoom|null=null;
 invite:string|null=null;
 game:Game|null=null;
 slot=-1;
 status:'idle'|'connecting'|'ready'|'reconnecting'|'closed'='idle';
 error='';
 private socket:WebSocket|null=null;
 private receipt='';
 private retryTimer=0;
 private connectTimer=0;
 private retryUntil=0;
 private gameId=0;
 private frame=0;
 private seq=0;
 private draft:LanCommand[]=[];
 private unacked:Aim|null=null;
 private disposed=false;
 private terminal=false;
 private syncing=false;
 private moods:Array<[number|null,number|null]>=[];
 constructor(private readonly version:string,readonly ownerKey:string|null,readonly code:string|null,private readonly events:Events){
  if(code)this.receipt=read(this.storageKey())??'';
 }
 get canPlay(){return this.status==='ready'&&!this.room?.hold&&!this.syncing&&this.game?.phase==='aiming'&&this.game.active.slot===this.slot&&this.game.humanTurn;}
 get tank(){return this.game?.tanks.find(t=>t.slot===this.slot);}
 private storageKey(){return 'piggy-lan-seat:'+this.code;}
 connect(){
  if(this.socket||this.disposed||this.terminal)return;
  this.status=this.retryUntil?'reconnecting':'connecting';this.error='';
  const address=lanPath('socket');address.protocol=address.protocol==='https:'?'wss:':'ws:';
  const socket=this.socket=new WebSocket(address);
  this.connectTimer=window.setTimeout(()=>socket.close(),4500);
  socket.onopen=()=>this.send({
   type:'hello',protocol:LAN_PROTOCOL,version:this.version,...(this.ownerKey?{host:this.ownerKey}:{code:this.code??undefined,resume:this.receipt}),
  });
  socket.onmessage=e=>{
   if(this.socket!==socket||typeof e.data!=='string')return;
   try{const message=JSON.parse(e.data);this.receive(message.type==='match'?{...message,visual:lanDecode(JSON.stringify(message.visual))}:lanDecode(e.data));}catch{
    if(this.syncing){this.fatal('无法同步战场，请重新加入。');return;}
    this.syncing=true;this.send({type:'sync'});this.events.room();
   }
  };
  socket.onclose=()=>{
   if(this.socket!==socket)return;
   this.socket=null;clearTimeout(this.connectTimer);this.draft=[];this.unacked=null;
   if(this.disposed||this.terminal)return;
   if(!this.retryUntil)this.retryUntil=Date.now()+62_000;
   if(Date.now()>=this.retryUntil){this.fatal('连接超时，请确认房主仍在开房，然后重新加入。');return;}
   this.status='reconnecting';this.error='';this.events.room();
   this.retryTimer=window.setTimeout(()=>this.connect(),950);
  };
  this.events.room();
 }
 private fatal(message:string){
  this.error=message;this.terminal=true;this.status='closed';this.socket?.close();
  if(this.code)forget(this.storageKey());else forget(ACTIVE_HOST);
  this.room=null;this.game=null;
  this.events.error(message);this.events.room();
 }
 private receive(msg:LanMessage){
  switch(msg.type){
   case 'welcome':
    clearTimeout(this.connectTimer);this.retryUntil=0;this.seq=0;this.draft=[];this.unacked=null;this.syncing=false;
    this.slot=msg.slot;this.receipt=msg.token;
    if(this.code)write(this.storageKey(),this.receipt);
    this.room=msg.room;this.invite=msg.invite;this.status='ready';if(this.ownerKey&&this.room)write(ACTIVE_HOST,this.ownerKey);this.events.room();break;
   case 'room':
    this.room=msg.room;this.invite=msg.invite;
    if(this.ownerKey){if(this.room)write(ACTIVE_HOST,this.ownerKey);else forget(ACTIVE_HOST);}
    if(msg.room?.state!=='battle'){this.game=null;this.draft=[];this.unacked=null;this.syncing=false;}
    if(!msg.room&&this.code){forget(this.storageKey());this.fatal('房间已关闭。');}
    else this.events.room();
    break;
   case 'match':{
    const reconnected=msg.match===this.gameId||!msg.snapshot.current.introLocked;
    const g=Game.fromBattleSnapshot(msg.snapshot);
    this.game=g;this.gameId=msg.match;this.frame=msg.frame;this.syncing=false;this.draft=[];this.unacked=null;
    this.apply(g,msg.visual);
    const mine=g.tanks.find(t=>t.slot===this.slot);g.localViewer=mine?.id??null;
    g.crewCheerAge=id=>this.moods[id]?.[0]??null;
    g.crewShockAge=id=>this.moods[id]?.[1]??null;
    this.bind(g);
    this.events.match(g,reconnected);break;
   }
   case 'frame':{
    const g=this.game;
    if(!g||msg.match!==this.gameId||msg.frame<=this.frame||this.syncing)break;
    if(msg.frame!==this.frame+1)throw Error('战场帧不同步');
    this.frame=msg.frame;
    if(msg.land)applyLanTerrain(g.land,msg.land);
    const oldTurn=g.turn;
    this.apply(g,msg.visual);
    if(g.turn!==oldTurn){this.draft=[];this.unacked=null;}
    if(this.unacked&&this.unacked.seq<=msg.ack)this.unacked=null;
    const pending=this.draft.find(c=>c[0]==='aim')??this.unacked?.action;
    if(this.canPlay&&pending?.[0]==='aim')Object.assign(g.active,{angle:pending[1],power:pending[2],direction:pending[3]});
    if(!document.hidden)g.events.push(...msg.events.map(e=>e.type==='defeat'?{...e,observerTeam:this.tank?.team}:e));
    break;
   }
   case 'error':if(msg.fatal)this.fatal(msg.message);else this.events.error(msg.message);break;
  }
 }
 private apply(g:Game,visual:LanVisuals){
  const state=g as unknown as Record<string,unknown>;
  for(const k of LAN_VISUAL_KEYS)if(k in visual)state[k]=visual[k];
  if(visual.moods)this.moods=visual.moods as typeof this.moods;
 }
 private send(message:LanRequest){
  if(this.socket?.readyState!==WebSocket.OPEN)return false;
  this.socket.send(JSON.stringify(message));return true;
 }
 private action(command:LanCommand){
  if(!this.canPlay)return false;
  if(command[0]==='aim'){
   const existing=this.draft.findIndex(c=>c[0]==='aim');
   if(existing>=0)this.draft.splice(existing,1);
  }
  this.draft.push(command);
  if(command[0]!=='aim'&&command[0]!=='move')this.flush();
  return true;
 }
 flush(){
  if(!this.draft.length||!this.game)return;
  if(!this.canPlay){this.draft=[];return;}
  const actions=this.draft.splice(0,12),seq=++this.seq;
  if(this.send({type:'input',match:this.gameId,turn:this.game.turn,seq,actions})){
   const aim=actions.find((c):c is Aim['action']=>c[0]==='aim');
   if(aim)this.unacked={seq,action:aim};
  }
 }
 private bind(g:Game){
  // The existing controls can keep their touch/keyboard gestures. Only their
  // aim preview is predicted here; movement, damage, counters and turns are server state.
  g.setAim=(angle,power)=>{
   if(!this.canPlay||!Number.isFinite(angle)||!Number.isFinite(power))return;
   const t=g.active;angle=clamp(angle,t.minAngle,t.maxAngle);power=clamp(power,g.minimumShotPower,100);
   if(angle===t.angle&&power===t.power)return;
   Object.assign(t,{angle,power});this.action(['aim',angle,power,t.direction]);
  };
  g.face=direction=>{if(this.canPlay&&(direction===1||direction===-1)&&direction!==g.active.direction){g.active.direction=direction;return void this.action(['aim',g.active.angle,g.active.power,direction]);}};
  g.move=(direction,dt)=>this.action(['move',direction,dt]);
  g.selectWeapon=weapon=>this.action(['weapon',weapon]);
  g.useItem=(id,_ai,slot)=>g.itemUnavailable(id,false,slot)?false:this.action(slot===undefined?['item',id]:['item',id,slot]);
  g.fire=()=>this.action(['fire']);
  g.skipTurn=()=>{this.action(['skip']);};
  g.setPowerMarker=power=>this.action(['marker',power]);
 }
 aimTarget(x:number){this.action(['target',x]);}
 create(){return this.send({type:'create'});}
 closeRoom(){return this.send({type:'close-room'});}
 start(config:Config){return this.send({type:'start',config});}
 returnToRoom(){return this.send({type:'return'});}
 leave(){
  this.send({type:'leave'});this.dispose();if(this.code)forget(this.storageKey());else forget(ACTIVE_HOST);
 }
 dispose(){
  this.disposed=true;clearTimeout(this.retryTimer);clearTimeout(this.connectTimer);this.socket?.close();this.socket=null;this.game=null;
 }
 async document(kind:'snapshot'|'replay'):Promise<BattleSnapshot|BattleReplay>{
  const response=await fetch(lanPath(kind),{headers:{Authorization:'Bearer '+this.receipt},cache:'no-store',signal:AbortSignal.timeout(5000)});
  const value=await response.json();
  if(!response.ok)throw Error(value.message??'房主没有返回本局资料。');
  return value;
 }
}
