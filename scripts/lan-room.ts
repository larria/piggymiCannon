import {randomBytes,randomInt} from 'node:crypto';
import {Game,clamp,type Config} from '../src/engine';
import {MAPS,ALL_WEAPONS,TURN_ITEMS,type ItemId,type WeaponId} from '../src/catalog';
import {normalizeSlots,slotProblem} from '../src/crew';
import {ReplayRecorder} from '../src/replay';
import {lanEncode,lanVisual,readLanTerrain,LAN_PROTOCOL,LAN_RECONNECT_MS,type LanCommand,type LanMessage,type LanRequest,type LanRoom,type LanVisuals} from '../src/lan-protocol';

interface Connection {send(message:LanMessage):void;close():void}
interface Player {slot:number;token:string;conn:Connection|null;away:number;seq:number;budget:number;lastBudget:number;limit:number;lastLimit:number}
export const makeNonce=(bytes=12)=>randomBytes(bytes).toString('base64url');
const makePlayer=(slot:number,conn:Connection):Player=>({slot,token:makeNonce(24),conn,away:0,seq:0,budget:.05,lastBudget:0,limit:0,lastLimit:0});
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const direction=(n:unknown):n is 1|-1=>n===1||n===-1;
const ruleKeys=['allowDragon','fallDamage','selfDamage','friendlyFire','powerAssist','tankBlocking'] as const;

export class LanAuthority {
 private players=new Map<number,Player>();
 private code='';
 private notice='';
 game:Game|null=null;
 private recorder:ReplayRecorder|null=null;
 private match=0;
 private frame=0;
 private landRevision=0;
 private visual=new Map<string,string>();
 private introLeft=0;
 private frameSteps=0;
 private seedBgm:NonNullable<Game['matchBgm']>|null=null;
 constructor(readonly version:string,readonly hostKey:string,private readonly address:string){}
 get room():LanRoom|null{
  if(!this.code)return null;
  return {state:this.game?'battle':'waiting',code:this.code,hold:this.holding,seats:[...this.players.values()].sort((a,b)=>a.slot-b.slot).map(p=>({slot:p.slot,online:!!p.conn})),notice:this.notice};
 }
 get holding(){return !!this.game&&this.game.phase!=='ended'&&[...this.players.values()].some(p=>!p.conn);}
 get invite(){return this.code?this.address+'#lan='+this.code:null;}
 get hostOnline(){return !!this.players.get(0)?.conn;}
 private error(conn:Connection,message:string,fatal=false){conn.send({type:'error',message,fatal});}
 private notify(){
  const room=this.room;
  for(const p of this.players.values())p.conn?.send({type:'room',room,invite:p.slot===0?this.invite:null});
 }
 private snapshot(p:Player){
  const g=this.game;if(!g||!p.conn)return;
  const {events,critical,...snapshot}=g.battleSnapshot();
  p.conn.send({type:'match',match:this.match,frame:this.frame,snapshot:{...snapshot,events:[],critical:[]},visual:lanVisual(g)});
 }
 hello(conn:Connection,msg:Extract<LanRequest,{type:'hello'}>){
  if(msg.protocol!==LAN_PROTOCOL||msg.version!==this.version)return this.error(conn,'游戏版本不同，请重新打开房主的邀请链接。',true);
  let player:Player|undefined;
  if(msg.host&&msg.host!==this.hostKey)return this.error(conn,'房主链接已失效，请打开终端显示的新链接。',true);
  if(msg.host===this.hostKey)player=this.players.get(0)??makePlayer(0,conn);
  else{
   if(!this.code||msg.code!==this.code)return this.error(conn,'这个邀请已经失效，请向房主索取新链接。',true);
   player=[...this.players.values()].find(p=>p.slot!==0&&p.token===msg.resume);
   if(!player){
    if(this.game)return this.error(conn,'本局已开始，请等房主开启下一局。',true);
    const slot=[1,2,3].find(i=>!this.players.has(i));
    if(slot===undefined)return this.error(conn,'房间已满，最多四位炮手。',true);
    player=makePlayer(slot,conn);
   }
  }
  if(player.conn&&player.conn!==conn){const old=player.conn;player.conn=conn;this.error(old,'这个席位已经在另一个页面打开。',true);old.close();}
  player.conn=conn;player.away=0;player.seq=0;player.limit=0;player.lastLimit=0;
  this.players.set(player.slot,player);
  conn.send({type:'welcome',slot:player.slot,token:player.token,room:this.room,invite:player.slot===0?this.invite:null});
  // All peers must share the same delta baseline at the moment a snapshot arrives.
  if(this.game){this.broadcastFrame(true);this.snapshot(player);}
  this.notify();
 }
 disconnect(conn:Connection,now=Date.now()){
  const p=[...this.players.values()].find(p=>p.conn===conn);if(!p)return;
  p.conn=null;p.away=now;p.budget=0;
  this.notify();
 }
 private endRoom(){
  for(const [slot,p] of this.players)if(slot!==0){p.conn?.send({type:'room',room:null,invite:null});p.conn?.close();this.players.delete(slot);}
  this.code='';this.clearGame();this.notice='';this.notify();
 }
 private clearGame(){this.recorder?.detach();this.recorder=null;this.game=null;}
 private returnRoom(notice=''){
  this.clearGame();this.notice=notice;
  for(const [slot,p] of this.players)if(slot!==0&&!p.conn)this.players.delete(slot);
  this.notify();
 }
 handle(conn:Connection,raw:unknown,now=Date.now()){
  if(!raw||typeof raw!=='object'||!('type' in raw))return;
  const msg=raw as LanRequest;
  const p=[...this.players.values()].find(p=>p.conn===conn);
  if(!p){if(msg.type==='hello')this.hello(conn,msg);return;}
  if(msg.type==='input'){this.input(p,msg,now);return;}
  if(msg.type==='sync'){if(this.game){this.broadcastFrame(true);this.snapshot(p);}else this.notify();return;}
  if(msg.type==='leave'){
   if(p.slot===0){this.endRoom();return;}
   this.players.delete(p.slot);
   p.conn?.send({type:'room',room:null,invite:null});p.conn?.close();
   if(this.game&&this.game.phase!=='ended')this.returnRoom('有炮手退出，本局已结束。');else this.notify();
   return;
  }
  if(p.slot!==0)return;
  if(msg.type==='create'&&!this.game){if(!this.code){this.code=makeNonce();this.notice='';}this.notify();}
  if(msg.type==='close-room')this.endRoom();
  if(msg.type==='return'&&this.game?.phase==='ended')this.returnRoom();
  if(msg.type==='start'){
   try{this.start(msg.config);}catch(error){this.error(conn,error instanceof Error?error.message:'无法开始对局。');}
  }
 }
 private start(raw:unknown){
  if(!this.code||this.game)return;
  if([...this.players.values()].some(p=>!p.conn))throw Error('还有炮手在重连，请稍候。');
  if(this.players.size<2)throw Error('请先等至少一位朋友加入。');
  if(!raw||typeof raw!=='object')throw Error('对局配置无效。');
  const input=raw as Config;
  const map=MAPS.some(m=>m.id===input.map)?input.map:'valley';
  const config:Config={map,mapChoice:input.mapChoice==='random'?'random':map,timer:[0,30,45,60].includes(input.timer)?input.timer:0,seed:randomInt(0,0x1_0000_0000),slots:normalizeSlots(input.slots,input.allowDragon===true)};
  for(const key of ruleKeys)config[key]=input[key]===true;
  config.slots.forEach((slot,index)=>{
   if(this.players.has(index)){slot.enabled=true;slot.controller='human';}
   else slot.controller='ai';
  });
  const problem=slotProblem(config.slots);if(problem)throw Error(problem);
  this.game=new Game(config,this.version,undefined,this.seedBgm);
  const g=this.game;g.start();
  this.seedBgm=g.matchBgm;
  this.recorder=new ReplayRecorder(g);
  g.setIntroLocked(true);
  this.introLeft=Math.max(4.5,(g.tanks.length+1)*1.2);
  this.match++;this.frame=0;this.frameSteps=0;this.landRevision=g.land.revision;this.visual.clear();this.notice='';
  for(const p of this.players.values()){p.budget=.05;p.lastBudget=0;}
  this.notify();
  for(const p of this.players.values())this.snapshot(p);
 }
 private input(p:Player,msg:Extract<LanRequest,{type:'input'}>,now:number){
  const g=this.game;
  if(!g||msg.match!==this.match||!Number.isSafeInteger(msg.seq)||msg.seq<=p.seq||!Array.isArray(msg.actions)||msg.actions.length>12)return;
  p.seq=msg.seq;
  if(now-p.lastLimit>=1000){p.lastLimit=now;p.limit=0;}
  if(++p.limit>100||this.holding||msg.turn!==g.turn||g.active.slot!==p.slot||!g.humanTurn)return;
  const dt=p.lastBudget?clamp((now-p.lastBudget)/1000,0,.09):.025;
  p.lastBudget=now;p.budget=Math.min(.09,p.budget+dt);
  for(const action of msg.actions){
   if(msg.turn!==g.turn||!g.humanTurn||g.active.slot!==p.slot)break;
   if(!Array.isArray(action))continue;
   this.act(g,p,action);
  }
 }
 private act(g:Game,p:Player,action:LanCommand){
  const t=g.active;
  switch(action[0]){
   case 'aim':if(action.length===4&&finite(action[1])&&finite(action[2])&&direction(action[3])){if(action[3]!==t.direction)g.face(action[3]);g.setAim(action[1],action[2]);}break;
   case 'move':if(action.length===3&&direction(action[1])&&finite(action[2])&&action[2]>0){const dt=Math.min(p.budget,action[2],.07);if(dt>0){p.budget-=dt;g.move(action[1],dt);}}break;
   case 'item':if((TURN_ITEMS as readonly string[]).includes(action[1])&&(action[2]===undefined||Number.isInteger(action[2])&&action[2]>=0&&action[2]<4))g.useItem(action[1] as ItemId,false,action[2]);break;
   case 'weapon':if(ALL_WEAPONS.some(w=>w.id===action[1]))g.selectWeapon(action[1] as WeaponId);break;
   case 'marker':if(finite(action[1]))g.setPowerMarker(action[1],t.id);break;
   case 'target':if(g.selected==='airstrike'&&!g.teleporting&&finite(action[1]))g.targetX=clamp(action[1],20,g.worldWidth-20);break;
   case 'fire':if(action.length===1)g.fire();break;
   case 'skip':if(action.length===1)g.skipTurn();break;
  }
 }
 step(now=Date.now(),dt=1/60){
  for(const [slot,p] of this.players)if(!p.conn&&now-p.away>=LAN_RECONNECT_MS){
   if(slot===0){this.endRoom();this.players.delete(slot);return;}
   this.players.delete(slot);
   if(this.game&&this.game.phase!=='ended')this.returnRoom('重连超时，本局已结束。');else this.notify();
  }
  if(!this.game||this.holding)return;
  if(this.game.introLocked){this.introLeft-=dt;if(this.introLeft<=0)this.game.setIntroLocked(false);}
  const settled=this.game.phase==='ended'&&this.game.resultAge>=3.1;
  if(!settled){if(this.game.phase==='handoff')this.game.acceptHandoff();this.game.update(dt);if(++this.frameSteps%2===0)this.broadcastFrame();}
 }
 private broadcastFrame(force=false){
  const g=this.game;if(!g)return;
  const visual:LanVisuals={};
  for(const [key,field] of Object.entries(lanVisual(g))){
   const value=lanEncode(field);if(force||value!==this.visual.get(key)){visual[key]=field;this.visual.set(key,value);}
  }
  const land=readLanTerrain(g.land,this.landRevision);this.landRevision=g.land.revision;
  const events=g.drainEvents(),frame=++this.frame;
  for(const p of this.players.values())p.conn?.send({type:'frame',match:this.match,frame,ack:p.seq,visual,land,events});
 }
 document(token:string,kind:'snapshot'|'replay'){
  if(!this.game||![...this.players.values()].some(p=>p.conn&&p.token===token))return null;
  return kind==='snapshot'?this.game.battleSnapshot():this.recorder?.export()??null;
 }
}
