import test from 'node:test';
import assert from 'node:assert/strict';
import {LanAuthority} from '../scripts/lan-room';
import {LAN_PROTOCOL,LAN_RECONNECT_MS,applyLanTerrain,parseLanInvite,lanDecode,lanEncode,readLanTerrain,type LanMessage} from '../src/lan-protocol';
import {ReplayPlayer,type BattleReplay} from '../src/replay';
import {Terrain} from '../src/terrain';
import {defaultSlots} from '../src/crew';

function peer(){
 const messages:LanMessage[]=[];
 let closed=false;
 return {messages,send(message:LanMessage){messages.push(lanDecode(lanEncode(message)));},close(){closed=true;},get closed(){return closed;},welcome(){
  const value=messages.find(m=>m.type==='welcome');assert.ok(value&&value.type==='welcome');return value;
 }};
}
const VERSION='6.0.0';
test('the room admits friends, enforces seat and turn ownership, resumes, and exports a verified replay',()=>{
 const room=new LanAuthority(VERSION,'test-host','http://192.168.8.10:4178/');
 const host=peer(),guest=peer(),stranger=peer();
 const hello={type:'hello',protocol:LAN_PROTOCOL,version:VERSION};
 room.handle(host,{...hello,host:'test-host'});room.handle(host,{type:'create'});
 assert.equal(parseLanInvite(room.invite!)?.hash,'#lan='+room.room!.code);
 room.handle(stranger,{...hello,code:'bad'});assert.equal(stranger.messages[0]?.type,'error');
 room.handle(guest,{...hello,code:room.room!.code});
 const slots=defaultSlots().map(s=>({...s,vehicle:'cannon'}));
 slots[2].enabled=true;slots[2].team=1;
 room.handle(guest,{type:'start',config:{slots,map:'coast',timer:30}});
 assert.equal(room.game,null);
 room.handle(host,{type:'start',config:{slots,map:'coast',timer:30}});
 const g=room.game!;
 assert.deepEqual(g.tanks.map(t=>t.controller),['human','human','ai']);
 let now=1000;const step=(n:number)=>{for(let i=0;i<n;i++)room.step(now+=17);};
 step(390);assert.equal(g.humanTurn,true);
 const actor=g.active.slot===0?host:guest,other=actor===host?guest:host;
 const shot=(seq:number,turn=g.turn)=>({type:'input',match:1,turn,seq,actions:[['aim',g.active.minAngle,15,g.active.direction],['fire']]});
 room.handle(other,shot(1),now);assert.equal(g.phase,'aiming');
 room.handle(actor,shot(1,g.turn+1),now);assert.equal(g.phase,'aiming');
 room.handle(actor,shot(1),now);assert.equal(g.phase,'aiming','stale sequence is ignored');
 room.handle(actor,shot(2),now);assert.equal(g.phase,'flying');
 room.disconnect(guest,now);
 assert.equal(room.room!.hold,true);
 const before=g.elapsed;step(8);assert.equal(g.elapsed,before);
 const rejoin=peer();room.handle(rejoin,{...hello,code:room.room!.code,resume:guest.welcome().token},now);
 assert.equal(rejoin.welcome().slot,guest.welcome().slot);assert.equal(room.room!.hold,false);
 assert.ok(rejoin.messages.some(m=>m.type==='match'));
 step(240);
 const recording=room.document(host.welcome().token,'replay') as BattleReplay;
 const playback=new ReplayPlayer(recording);for(let i=0;i<1000&&!playback.done;i++)playback.advance(.05);
 assert.equal(playback.verified,true);
 assert.equal(room.document('wrong-token','snapshot'),null);
 room.disconnect(rejoin,now);room.step(now+LAN_RECONNECT_MS);
 assert.equal(room.game,null);assert.equal(room.room!.state,'waiting');assert.equal(room.room!.seats.length,1);
});
test('terrain patches rebuild a replica across multiple craters without changing protected geometry',()=>{
 const authority=new Terrain(90,75),replica=new Terrain(90,75);
 for(const t of [authority,replica]){for(let x=0;x<=90;x++){t.column(x,20,55);t.column(x,67,73,true);}t.rebuild();}
 authority.removeEllipse(24,22,11,9);authority.removeEllipse(67,50,10,15);
 const patch=readLanTerrain(authority,replica.revision)!;
 assert.ok(patch.from>0&&patch.to<90);
 applyLanTerrain(replica,patch);
 assert.equal(replica.revision,authority.revision);
 assert.deepEqual(replica.mask,authority.mask);
 assert.deepEqual(replica.protectedMask,authority.protectedMask);
 assert.deepEqual(replica.surface,authority.surface);
});
test('manual invitations take only local addresses and a valid room code',()=>{
 const hash='#lan=abcdefghijklmnop';
 assert.ok(parseLanInvite(' http://192.168.1.9:4178/'+hash+' '));
 assert.equal(parseLanInvite('https://example.org/'+hash),null);
 assert.equal(parseLanInvite('http://192.168.1.5:4178/#host=abcdefghijklmnop'),null);
 assert.equal(parseLanInvite('http://guest:abc@192.168.1.5:4178/'+hash),null);
});
