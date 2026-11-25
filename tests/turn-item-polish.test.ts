import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';
import {ReplayPlayer,ReplayRecorder} from '../src/replay';
import {placeItemCue} from '../src/item-feedback';

function match(version='5.1.10',ai=false){
 const slots=defaultSlots().map((s,i)=>({...s,enabled:i<2,team:i,controller:ai&&i===0?'ai' as const:'human' as const,vehicle:'cannon' as const}));
 const g=new Game({slots,map:'factory',timer:0,seed:52,fog:false,fireLine:false},version);
 g.start();return g;
}
const step=(g:Game,seconds:number)=>{for(let n=0;n<Math.round(seconds/.01);n++)g.update(.01);};
test('same-turn boost/double is refused in either order; cross-turn carry still fires boosted double healing and replays',()=>{
 for(const [first,second] of [['double','boost'],['boost','double']] as const){
  const g=match(),t=g.active,recorder=new ReplayRecorder(g);
  assert.ok(g.useItem(first));
  assert.match(g.itemUnavailable(second)!,/分开回合/);assert.equal(g.useItem(second),false);
  assert.equal(t.items[second],1);
  const h=Game.fromBattleSnapshot(g.battleSnapshot());assert.equal(h.itemUnavailable(second),g.itemUnavailable(second));
  g.skipTurn();assert.notEqual(g.active.id,t.id);
  // A tactical item adds initiative delay, so the other player may act twice.
  for(let i=0;i<4&&g.active.id!==t.id;i++)g.skipTurn();
  assert.equal(g.active.id,t.id);
  assert.ok(g.useItem(second));assert.ok(g.useItem('repair'));g.setAim(35,1);assert.ok(g.fire());
  assert.equal(g.projectiles.length,2);assert.ok(g.projectiles.every(p=>p.healing&&p.boost===1.5));
  step(g,.28);const replay=new ReplayPlayer(recorder.export());recorder.detach();
  while(!replay.done)replay.advance(.25);assert.equal(replay.verified,true);
 }
 const old=match('5.1.9');assert.ok(old.useItem('double'));assert.ok(old.useItem('boost'));
});
test('AI holds the shot after activating an item, resumes the saved wait and retains legacy timing',()=>{
 for(const [version,used,delay] of [['5.1.10',true,.6],['5.1.9',true,0],['5.1.10',false,0]] as const){
  const g=match(version,true);
  // Use the real update/stock path with a deterministic self-heal plan, independent of target search.
  g.planAI=()=>{g.aiDecision={target:g.current,fromX:g.active.x,goalX:g.active.x,weapon:g.selected,intentionalMiss:false};};
  g.active.hp=100;step(g,.82);
  if(used)assert.ok(g.useItem('repair',true));
  const restored=Game.fromBattleSnapshot(g.battleSnapshot());
  for(const game of [g,restored]){
   const until=1.8+delay;while(game.aiTime<until-.015)game.update(.01);
   assert.equal(game.phase,'aiming');assert.equal(game.active.shots,0);
   step(game,.04);assert.equal(game.active.shots,1);assert.equal(game.phase,'flying');
  }
 }
 const late=match('5.1.10',true);late.aiTime=2.7;late.aiDecision={target:0,fromX:late.active.x,goalX:late.active.x,weapon:late.selected,intentionalMiss:false};
 assert.ok(late.useItem('repair',true));step(late,.59);assert.equal(late.active.shots,0);step(late,.04);assert.equal(late.active.shots,1);
});
test('ticket keeps animated bounds out of the action indicator near the top edge',()=>{
 const bounds={left:0,right:500,top:0,bottom:250},pointer={left:205,right:295,top:3,bottom:75},occupied=[pointer];
 const ticket=placeItemCue(250,-8,1,bounds,occupied);assert.ok(ticket);
 assert.ok(ticket.x!==250);assert.ok(occupied[1].top>=bounds.top);
 assert.ok(occupied[1].right<=pointer.left||occupied[1].left>=pointer.right);
});
