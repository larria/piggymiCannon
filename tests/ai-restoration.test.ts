import test from 'node:test';import assert from 'node:assert/strict';import {Game,type Tank} from '../src/engine';import {planAIRestoration} from '../src/ai-restoration';import {Terrain} from '../src/terrain';import {defaultSlots} from '../src/crew';import {resolveVehicle} from '../src/vehicles';import {ReplayRecorder,ReplayPlayer} from '../src/replay';
function ledge(direction=1,version='4.0.3'){const slots=defaultSlots();slots[0].controller='ai';slots[0].difficulty='expert';slots[0].vehicle='cannon';slots[1].controller='human';slots[1].vehicle='cannon';const g=new Game({slots,map:'factory',seed:52,timer:0,fog:false,fireLine:false},version);g.start();g.land.mask.fill(0);g.land.protectedMask.fill(0);for(let x=0;x<=g.worldWidth;x++){if(x>=240&&x<=340)g.land.column(x,450,480);if(x>=1000)g.land.column(x,450,g.worldHeight);}g.land.rebuild();Object.assign(g.active,{x:direction<0?250:330,y:432,hp:100,direction,power:95,fallVelocity:0});Object.assign(g.enemy,{x:1300,y:432,fallVelocity:0});g.wind=0;return g;}
test('AI restoration uses 1%, drops above self and discards stale attack/move plans, on either ledge edge',()=>{for(const direction of [-1,1]){const g=ledge(direction);assert.ok(g.useItem('repair',true));(g as any).aiMoveGoal=g.active.x+80;(g as any).aiPending={weapons:['cannon-special'],offset:200,level:3,miss:true,target:1};g.planAI();assert.equal(g.active.power,1);assert.equal(g.active.angle,35);assert.equal((g as any).aiMoveGoal,null);assert.equal((g as any).aiPending,null);assert.equal(g.aiDecision?.target,g.active.id);assert.ok(g.fire(true));assert.equal(g.projectiles[0].x,g.active.x);assert.equal(g.projectiles[0].vx,0);assert.equal(g.projectiles[0].vy,0);for(let i=0;i<300&&g.projectiles.length;i++)g.update(.005);assert.equal(g.tanks[0].hp,468);assert.equal(g.projectiles.length,0);assert.equal(g.tanks[0].items.repair,0);}});
test('autonomous AI turn arms and fires restoration successfully without aiming off the ledge',()=>{const g=ledge(-1);for(let i=0;i<700&&g.tanks[0].hp===100;i++)g.update(.005);assert.ok(g.tanks[0].hp>400);assert.equal(g.tanks[0].lastPower,1);assert.equal(g.tanks[0].items.repair,0);});
test('AI random draws exclude hidden vehicles uniformly, human random retains the hidden draw and explicit choice is unchanged',()=>{assert.equal(resolveVehicle('random',()=>0,false),'bowl');assert.equal(resolveVehicle('random',()=>0,true),'dragon');assert.equal(resolveVehicle('dragon',()=>0,false),'dragon');const seen=new Set<string>();let humanHidden=0,oldAiHidden=0;for(let seed=0;seed<240;seed++){for(const version of ['4.0.2','4.0.3']){const slots=defaultSlots();slots.forEach((s,i)=>Object.assign(s,{enabled:true,controller:i===0?'human':'ai',vehicle:'random',team:i%2}));const g=new Game({slots,seed,map:'factory',fog:false,fireLine:false,timer:0},version);if(version==='4.0.3'){humanHidden+=Number(g.tanks[0].vehicleId==='dragon');g.tanks.slice(1).forEach(t=>{assert.notEqual(t.vehicleId,'dragon');seen.add(t.vehicleId!);});}else oldAiHidden+=g.tanks.slice(1).filter(t=>t.vehicleId==='dragon').length;}}assert.equal(seen.size,12);assert.ok(humanHidden>0);assert.ok(oldAiHidden>0);});
test('self-healing AI and RNG restore through current snapshots and exact replay',()=>{const g=ledge(-1),r=new ReplayRecorder(g);for(let i=0;i<600;i++)g.update(.005);const p=new ReplayPlayer(r.export());for(let i=0;i<1000&&!p.done;i++)p.advance(.05);assert.equal(p.verified,true);assert.equal(p.game.tanks[0].hp,g.tanks[0].hp);assert.deepEqual(p.game.battleSnapshot().rng,g.battleSnapshot().rng);r.detach();});

test('healthy AI chooses a reachable injured teammate, delivers healing and retains its own native weapon selection',()=>{const g=ledge(1);g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.active.hp=g.active.maxHP;const ally={...g.enemy,id:2,crew:'fox' as const,team:g.active.team,controller:'human' as const,x:550,y:432,hp:150,maxHP:920,items:{...g.enemy.items}};g.tanks.push(ally);const originalWeapon=g.selected;g.planAI();assert.equal(g.restoring,true);assert.equal(g.aiDecision?.target,2);assert.equal(g.selected,originalWeapon);assert.ok(g.fire(true));for(let i=0;i<2000&&g.projectiles.length;i++)g.update(.005);assert.ok(ally.hp>=350,`ally recovered ${ally.hp-150}`);assert.equal(g.active.items.repair,0);});
test('critical AI heals itself before allies, while unreachable allies do not cause wasteful restoration',()=>{const g=ledge(-1);g.tanks.push({...g.enemy,id:2,crew:'fox',team:0,hp:1,x:1250} as any);g.planAI();assert.equal(g.aiDecision?.target,0);assert.equal(g.active.power,1);const h=ledge(-1);h.active.hp=h.active.maxHP;h.tanks.push({...h.enemy,id:2,crew:'fox',team:0,hp:1,x:800,y:900} as any);for(let x=600;x<1000;x++)h.land.column(x,350,960,true);h.land.rebuild();h.planAI();assert.equal(h.restoring,false);assert.equal(h.active.items.repair,1);});

test('if the intended ally dies before the shot, AI replans and keeps the recovery item rather than firing at a corpse',()=>{const g=ledge(-1);g.land=new Terrain();for(let x=0;x<=1920;x++)g.land.column(x,450,960);g.land.rebuild();g.active.hp=g.active.maxHP;const ally={...g.enemy,id:2,crew:'fox',team:0,x:550,hp:150};g.tanks.push(ally as any);g.planAI();assert.equal(g.aiDecision?.target,2);ally.hp=0;assert.equal(g.fire(true),false);assert.equal(g.active.items.repair,1);assert.equal(g.restoring,false);});

function gradedScenario(difficulty:Tank['difficulty']='expert',ledgeOnly=false,version='5.1.11'){
 const g=ledge(1,version);
 if(!ledgeOnly){for(let x=0;x<=g.worldWidth;x++)g.land.column(x,450,g.worldHeight);g.land.rebuild();}
 Object.assign(g.active,{hp:g.active.maxHP,difficulty});
 const ally={...g.enemy,id:2,crew:'fox' as const,team:g.active.team,x:570,y:432,hp:150,maxHP:1000};
 if(!ledgeOnly)g.tanks.push(ally);
 return {g,ally};
}
test('AI saves restoration at exactly 40%, and even recruits can heal a nearby ally below that line',()=>{
 const {g,ally}=gradedScenario('easy');
 Object.assign(g.active,{hp:g.active.maxHP*.4});ally.hp=400;
 assert.equal(planAIRestoration(g,g.active,()=>{throw Error('no eligible recipient should roll aim');}),null);
 g.planAI();assert.equal(g.restoring,false);assert.equal(g.active.items.repair,1);
 g.active.hp=g.active.maxHP;ally.hp=399;
 g.planAI();assert.equal(g.restoring,true);assert.equal(g.aiDecision?.target,2);
 assert.ok(g.fire(true));for(let i=0;i<2000&&g.projectiles.length;i++)g.update(.005);
 assert.ok(ally.hp>399);assert.equal(g.active.items.repair,0);
});
test('the same aim roll produces a grazing heal on lower ranks and an accurate heal on ace',()=>{
 const {g,ally}=gradedScenario('easy');
 const accurate=planAIRestoration(g,g.active,()=>.99)!;
 const glancing=planAIRestoration(g,g.active,()=>.4)!;
 assert.equal(accurate.target,ally.id);assert.equal(glancing.target,ally.id);assert.equal(glancing.inaccurate,true);
 assert.ok(glancing.gain>20&&glancing.gain<accurate.gain*.65);
 g.active.difficulty='expert';assert.deepEqual(planAIRestoration(g,g.active,()=>.4),accurate);
 const aceLapse=planAIRestoration(g,g.active,()=>.05)!;
 assert.equal(aceLapse.inaccurate,true);assert.ok(aceLapse.gain>glancing.gain&&aceLapse.gain<accurate.gain);
 g.active.difficulty='easy';(g as any).rng=()=>.4;
 g.planAI();assert.equal(g.aiDecision?.intentionalMiss,true);
 assert.ok(g.fire(true));const before=ally.hp;for(let i=0;i<2000&&g.projectiles.length;i++)g.update(.005);
 assert.ok(ally.hp>before&&ally.hp-before<accurate.gain, 'executed glancing shot must still heal');
});
test('self-healing aim lapses still touch the tank on a ledge or keep the safe drop',()=>{
 const {g}=gradedScenario('easy',true);g.active.hp=100;
 const accurate=planAIRestoration(g,g.active,()=>.99)!;assert.equal(accurate.power,1);
 (g as any).rng=()=>.05;g.planAI();assert.equal(g.aiDecision?.target,0);assert.ok(g.fire(true));
 for(let i=0;i<2000&&g.projectiles.length;i++)g.update(.005);
 assert.ok(g.active.hp>100);
});
test('an ally who reaches 40% before release no longer spends the AI item',()=>{
 const {g,ally}=gradedScenario();
 g.planAI();assert.equal(g.aiDecision?.target,2);ally.hp=400;
 assert.equal(g.fire(true),false);assert.equal(g.restoring,false);assert.equal(g.active.items.repair,1);
});
test('graded restoration reproduces the selected aim, healing and RNG state in a saved replay',()=>{
 const {g}=gradedScenario('easy',true);g.active.hp=100;
 const recording=new ReplayRecorder(g);for(let i=0;i<700;i++)g.update(.005);
 assert.ok(g.tanks[0].hp>100);
 const player=new ReplayPlayer(recording.export());for(let i=0;i<1000&&!player.done;i++)player.advance(.05);
 assert.equal(player.verified,true);assert.equal(player.game.tanks[0].hp,g.tanks[0].hp);
 assert.deepEqual(player.game.battleSnapshot().rng,g.battleSnapshot().rng);recording.detach();
});
