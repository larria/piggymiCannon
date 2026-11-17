import {Game} from './legacy-fixture';
import test from 'node:test';import assert from 'node:assert/strict';
import {MAX_CLIMB_ANGLE,WATER_Y} from '../src/engine';import {Terrain} from '../src/terrain';
import {aimGeometry} from '../src/aim';import {defaultSlots} from '../src/crew';const defaultSeats=(f:any='1v1',m:any='ai')=>new Game({formation:f,mode:m}).config.slots.filter(s=>s.enabled);import {validChoice,resolveVehicle,VEHICLES} from '../src/vehicles';
const ready=(c:any={},version='development')=>{const g=new Game({seed:52,timer:0,fog:false,fireLine:false,vehicle0:'bowl',vehicle1:'cannon',...c},version);g.start();return g;};
const flat=(c:any={},version='development')=>{const g=ready(c,version);g.land=new Terrain();g.terrain=g.land.surface;for(let x=0;x<=1280;x++)g.land.column(x,450,640);g.land.rebuild();g.tanks.forEach((t,i)=>{t.x=150+i*275;t.y=432;});g.wind=0;return g;};
const run=(g:Game,n:number)=>{for(let i=0;i<n*120;i++)g.update(1/120);};
const finishSupply=(g:Game)=>{for(let i=0;i<240&&g.phase==='supply';i++)g.update(1/120);assert.notEqual(g.phase,'supply');};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('body-relative angles derive signs for both facings and unbounded absolute angles',()=>{
 for(const slope of [-Math.PI/3,-.4,0,.4,Math.PI/3])for(const d of [-1,1])for(const a of [0,25,45,90,175]){
  const v=aimGeometry(a,slope,d);near(v.absolute,a-d*slope*180/Math.PI);near(v.x*v.x+v.y*v.y,1);
  const world=Math.atan2(-v.y,d*v.x)*180/Math.PI;
  near(Math.sin(world*Math.PI/180),Math.sin(v.absolute*Math.PI/180));
 }
 near(aimGeometry(25,Math.PI/3,1).absolute,-35);
 near(aimGeometry(45,-Math.PI/3,1).absolute,105);
});
test('muzzle and launch use the same rotated axis, with relative min/max shifting after crater change',()=>{
 const g=flat(),t=g.active;t.x=300;
 for(const grade of [-.7,.7,0]){
  g.land=new Terrain();for(let x=0;x<=1280;x++)g.land.column(x,450+(x-300)*grade,640);g.land.rebuild();t.y=g.ground(t.x)-18;
  for(const d of [-1,1])for(const angle of [t.minAngle,t.maxAngle,40]){t.direction=d;const a=g.aim(t,angle),s=g.tankSlope(t),m=g.muzzle(t,angle),p=g.launch(t,'bowl-normal',angle);near(m.x-t.x-Math.sin(s)*13,a.x*31);near(m.y-t.y+Math.cos(s)*13,a.y*31);near(p.vx/Math.hypot(p.vx,p.vy),a.x);near(p.vy/Math.hypot(p.vx,p.vy),a.y);}
 }
 t.direction=1;const before=g.aim(t).absolute;g.crater(t.x+24,450,18,15);assert.notEqual(g.aim(t).absolute,before);
});
test('AI solver on a slope searches relative angles and can hit, while each AI keeps its own difficulty',()=>{
 const g=flat({formation:'2v2',seats:defaultSeats('2v2','ai').map((s,i)=>({...s,vehicle:'bowl',difficulty:['easy','normal','hard','expert'][i] as any}))});
 g.current=1;const t=g.active;t.x=330;g.tanks[0].x=650;g.tanks[2].x=100;g.tanks[3].x=1050;
 g.land=new Terrain();for(let x=0;x<=1280;x++)g.land.column(x,x<400?450+(x-330)*.35:450,640);g.land.rebuild();g.tanks.forEach(t=>t.y=g.ground(t.x)-18);
 // Seeded repeated plans include hits but do not demand a perfect highest difficulty.
 t.difficulty='expert';let best=Infinity;for(let i=0;i<20;i++){g.planAI();const p=g.predict();best=Math.min(best,Math.hypot(p.x-g.enemy.x,p.y-g.enemy.y));assert.ok(t.angle>=t.minAngle&&t.angle<=t.maxAngle);}assert.ok(best<45,`closest ${best}`);
 assert.deepEqual(g.tanks.map(t=>t.difficulty),['easy','expert','hard','expert']);
});
test('all formations deploy distinct safe actors and solo allies/opponents have independent controls',()=>{
 for(const f of ['1v1','1v2','2v1','2v2'] as const)for(const map of ['factory','temple','valley','moon','coast','egypt'] as const)for(let seed=1;seed<=10;seed++){
  const g=ready({formation:f,map,seed});const [a,b]=f.split('v').map(Number);assert.equal(g.tanks.filter(t=>t.team===0).length,a);assert.equal(g.tanks.filter(t=>t.team===1).length,b);
  for(const t of g.tanks){assert.ok(g.stablePlatform(t.x),`${f}/${map}/${seed}/${t.id}`);assert.ok(g.traversable(t,t.x-60)!==null||g.traversable(t,t.x+60)!==null);assert.ok(t.y<WATER_Y-30);for(const e of g.tanks)if(e.id!==t.id)assert.ok(Math.abs(e.x-t.x)>=90);}
  assert.equal(g.tanks[0].controller,'human');assert.ok(g.tanks.slice(1).every(t=>t.controller==='ai'));
 }
});
test('team victory waits for all opponents, actors skip dead seats, pure hotseat has no handoff phase',()=>{
 const g=flat({formation:'2v2'});g.damage(g.tanks[1],9999,0);g.nextTurn();assert.notEqual(g.phase,'ended');assert.equal(g.current,3);assert.equal(g.humanTurn,false);g.nextTurn();assert.equal(g.current,2);g.damage(g.tanks[3],9999,0);g.nextTurn();assert.equal(g.phase,'ended');assert.equal(g.winner,0);
 const p=flat({mode:'hotseat',formation:'2v2'});assert.ok(p.tanks.every(t=>t.controller==='human'));p.nextTurn();assert.equal(p.phase,'aiming');assert.equal(p.humanTurn,true);assert.equal(p.current,1);
});
test('AI and mixed cooperation use cyclic alive-seat turns; every AI fires once per action',()=>{
 const g=flat({formation:'2v2'});g.tanks.forEach(t=>t.hp=t.maxHP=100000);
 for(let i=0;i<8;i++){const actor=g.active;assert.equal(actor.id,i%4);if(actor.controller==='human'){g.fire();}else{run(g,1.85);assert.equal(actor.shots,Math.floor(i/4)+1);}assert.equal(g.fire(true),false);g.projectiles=[];g.nextTurn();if(g.phase==='supply'){g.crates=[];finishSupply(g);}}
 const coop=flat({mode:'hotseat',formation:'2v2',seats:defaultSeats('2v2','hotseat').map(s=>({...s,controller:s.team===0?'human':'ai'}))});for(let i=0;i<8;i++){assert.equal(coop.current,i%4);coop.nextTurn();}
});
test('self/friendly damage defaults off across blasts, statuses, hazards and guidance; fall always hurts',()=>{
 const g=flat({formation:'2v2'});g.tanks.forEach(t=>{t.x=300+t.id*10;t.y=432;});
 const self=g.tanks[0],ally=g.tanks[2],foe=g.tanks[1];const p={...g.launch(self,'crossbow-special'),x:foe.x,y:foe.y};(g as any).explode(p,foe.id);assert.equal(self.hp,self.maxHP);assert.equal(ally.hp,ally.maxHP);assert.equal(ally.poisoned,false);assert.ok(foe.poisoned);
 g.damage(self,10,0);g.damage(ally,10,0);assert.equal(ally.hp,ally.maxHP);g.damage(self,10,0,true,'fall');assert.equal(self.hp,self.maxHP-10);
 g.config.selfDamage=true;g.damage(self,10,0);assert.equal(self.hp,self.maxHP-20);g.config.friendlyFire=true;g.damage(ally,10,0);assert.equal(ally.hp,ally.maxHP-10);
 g.config.selfDamage=false;g.config.friendlyFire=false;g.tanks[1].x=800;g.tanks[3].x=1100;const missile={...g.launch(self,'dragon-special'),x:ally.x,y:ally.y-70,vx:20,vy:80,age:.5};g.projectiles=[missile];g.phase='flying';g.update(.01);assert.equal(missile.lockTarget,null);
});
test('one shared 50% boost for item, fire line, both, double volleys and transfer; legacy line expires after two actions',()=>{
 for(const item of [false,true])for(const line of [false,true]){
  const g=flat({fireLine:line,vehicle0:'dragon'});g.active.boost=item;const p=g.launch(g.active,'dragon-normal');const base=420;
  if(line){g.fireLine!.x=p.x+2;g.fireLine!.top=0;g.fireLine!.bottom=600;}g.projectiles=[p];g.phase='flying';g.update(.01);assert.equal(p.fireBoosted,item||line);assert.equal(p.boost,item||line?1.5:1);assert.equal(p.boost*base,item||line?630:420);assert.equal(p.trail.length>0,item||line);
 }
 const g=flat({fireLine:true,vehicle0:'dragon'},'3.2.6');g.active.boost=true;g.active.doubleShot=true;g.selectWeapon('dragon-special');g.fire();assert.equal(g.projectiles.length,18);assert.ok(g.projectiles.every(p=>p.fireBoosted&&p.boost===1.5));g.projectiles=[];g.nextTurn();assert.equal(g.fireLineTurnsRemaining,1);g.nextTurn();assert.equal(g.fireLine,null);assert.equal(g.fireLineTurnsRemaining,0);
 const t=flat({fireLine:true});t.teleporting=true;t.active.boost=true;t.fire();assert.equal(t.projectiles[0].fireBoosted,false);assert.equal(t.projectiles[0].boost,1);
});
function ledge(map='valley',dynamic=false){const g=flat({map});g.land=new Terrain();for(let x=0;x<=1280;x++){g.land.column(x,550,554,true);if(x<350||dynamic)g.land.column(x,280,330);}g.land.rebuild();g.active.x=320;g.active.y=262;g.enemy.x=1000;g.enemy.y=532;if(dynamic)g.crater(500,280,180,250);return g;}
test('generic downward edges enter continuous free fall on multi-layer, ordinary and destroyed terrain',()=>{
 for(const map of ['factory','temple','valley'])for(const dynamic of [false,true]){
  const g=ledge(map,dynamic),t=g.active,hp=t.hp,from=t.y;let fell=false;
  for(let i=0;i<100;i++){g.move(1,.04);g.update(.01);if(t.fallVelocity>0){fell=true;break;}}
  assert.ok(fell,`${map}/${dynamic}`);assert.ok(t.y<500);const x=t.x;for(let i=0;i<50;i++)assert.equal(g.move(1,.05),false);assert.equal(t.x,x);
  run(g,3);assert.equal(t.y,532);assert.equal(t.fallVelocity,0);assert.equal(t.hp,hp-Math.round((532-from-35)*.3));assert.ok(g.land.protectedMask[g.land.stride*550+Math.round(t.x)]);assert.ok(g.move(1,.04));
 }
});
test('AI safe traversal never chooses a cliff and upward 60 degree / 12px caps remain',()=>{
 const g=ledge(),x=g.active.x;for(let i=0;i<100;i++)g.move(1,.04,true);assert.ok(g.active.x<350);assert.equal(g.active.fallVelocity,0);assert.ok(g.active.x>=x);assert.equal(MAX_CLIMB_ANGLE,60);
 for(const slope of [55,59,65,75]){const g=flat();g.land=new Terrain();for(let x=0;x<=1280;x++)g.land.column(x,450-(x-200)*Math.tan(slope*Math.PI/180),640);g.land.rebuild();g.active.x=200;g.active.y=432;assert.equal(g.move(1,.05),slope<60);}
});
test('dragon direct choice gate never changes the ten percent random branch',()=>{
 assert.equal(validChoice('dragon'),false);assert.equal(validChoice('dragon',true),true);assert.equal(resolveVehicle('random',()=>.09),'dragon');assert.equal(resolveVehicle('random',()=>.09),'dragon');assert.notEqual(resolveVehicle('random',()=>.1),'dragon');assert.equal(ready({vehicle0:'dragon',allowDragon:true}).active.vehicleId,'dragon');assert.equal(VEHICLES.find(v=>v.id==='bowl')!.name,'大腕');
});
test('an active actor eliminated by terrain or hazards cannot fire and is handed past immediately',()=>{
 const g=flat({formation:'2v2'});g.damage(g.active,9999,1);assert.equal(g.fire(true),false);assert.equal(g.humanTurn,false);g.update(.01);assert.notEqual(g.phase,'ended');assert.equal(g.current,1);
});
test('all four crew slots retain consumed stock and their selected guns independently',()=>{
 const seats=defaultSeats('2v2','hotseat').map(s=>({...s,vehicle:'water' as const})),g=flat({mode:'hotseat',formation:'2v2',seats});
 for(let i=0;i<4;i++){assert.equal(g.current,i);g.selectWeapon('water-special');g.useItem('double');g.skipTurn();}
 for(let i=0;i<4;i++){assert.equal(g.current,i);assert.equal(g.selected,'water-special');assert.equal(g.active.items.double,0);g.skipTurn();if(g.phase==='supply'){g.crates=[];finishSupply(g);}}
});
test('touch aiming inverts body rotation without flipping facing at >90 or negative absolute elevations',async()=>{
 const {relativeAimForVector}=await import('../src/aim');
 for(const slope of [-Math.PI/3,-.4,0,.4,Math.PI/3])for(const direction of [-1,1])for(const relative of [25,45,80]){const v=aimGeometry(relative,slope,direction),input=relativeAimForVector(v.x,v.y,slope,direction);near(input.relative,relative);assert.equal(input.direction,direction);}
});
