import test from 'node:test';import assert from 'node:assert/strict';
import {projectileSpeed} from '../src/ballistics';import {chargePower,touchChargePower} from '../src/interaction';
import {aiScenario} from './ai-scenarios';import {solveAIShot,predictAIImpact} from '../src/ai-planner';
import {weaponById} from '../src/catalog';import {VEHICLES} from '../src/vehicles';
test('short-speed branch reaches 95 at minimum and joins the unchanged medium/long curve smoothly',()=>{
 assert.equal(projectileSpeed(10),95);for(const p of [22,25,35,50,75,100])for(const multiplier of [.9,1,1.15,2])assert.equal(projectileSpeed(p,multiplier),(120+p*6.1)*multiplier);
 for(const multiplier of [.9,1,1.15,1.34,2])assert.equal(projectileSpeed(10,multiplier),95);
 let previous=projectileSpeed(10);for(let p=10.01;p<=100;p+=.01){const speed=projectileSpeed(p);assert.ok(speed>previous);previous=speed;}
 const h=.0001;assert.ok(Math.abs((projectileSpeed(22)-projectileSpeed(22-h))/h-6.1)<.001);assert.ok(Math.abs((projectileSpeed(22+h)-projectileSpeed(22))/h-6.1)<.001);
});
test('touch tap holds exactly minimum, smoothly rejoins normal charge, and long holds/SPACE retain timing',()=>{
 for(const seconds of [0,.01,.05,.1,.159,.16])assert.equal(touchChargePower(seconds),10);
 let previous=10;for(let s=.1601;s<=.35;s+=.001){assert.ok(touchChargePower(s)>previous);previous=touchChargePower(s);}
 for(const s of [.35,.4,1,2,2.5,5])assert.equal(touchChargePower(s),chargePower(s));assert.equal(chargePower(.1),13.6);assert.equal(touchChargePower(2.5),100);
 const h=.000001;assert.ok((touchChargePower(.16+h)-10)/h<.01);assert.ok(Math.abs((touchChargePower(.35)-touchChargePower(.35-h))/h-36)<.01);
});
test('minimum actual shots hit body-contact and several close distances in both directions without self/ally damage',()=>{
 for(const direction of [-1,1])for(const distance of [56,60,65,75,90,110])for(const crew of ['dad','mimi','fox','fish'] as const){
  const g=aiScenario('expert',52,'valley',distance,'cannon');g.tanks.forEach(t=>t.controller='human');g.active.x=direction===1?220:1000;g.active.direction=direction;g.tanks[1].x=g.active.x+direction*distance;g.tanks[1].crew=crew;g.tanks[2].x=direction===1?70:1170;g.tanks[3].x=direction===1?1180:70;
  g.tanks.forEach(t=>t.hp=t.maxHP=920);g.wind=0;g.active.angle=45;g.active.power=10;assert.ok(g.fire());for(let i=0;i<600&&g.current===0;i++)g.update(1/120);
  assert.ok(g.tanks[1].hp<920,`${direction}/${distance}/${crew}`);assert.equal(g.tanks[0].hp,920);assert.equal(g.tanks[2].hp,920);assert.equal(g.tanks[0].lastPower,10);
 }
});
test('AI can solve contact and low-power near shots using the same actual launch mapping',()=>{
 for(const distance of [56,65,90,130,170]){const g=aiScenario('expert',52,'valley',distance,'cannon');g.wind=0;g.tanks[1].crew='dad';g.tanks.forEach(t=>t.hp=t.maxHP=920);
  const shot=solveAIShot(g,g.active,['cannon-normal'],g.opponents(g.active));assert.equal(shot.target,1);assert.ok(shot.effective);assert.ok(shot.power>=10&&shot.power<=100);if(distance>=90)assert.ok(shot.power<22);Object.assign(g.active,{angle:shot.angle,power:shot.power,direction:shot.direction});assert.ok(g.fire(true));for(let i=0;i<600&&g.current===0;i++)g.update(1/120);assert.ok(g.tanks[1].hp<920);assert.equal(g.tanks[0].hp,920);
 }
});
test('minimum cannon shots on ordinary destructible ground hit near enemies without self blast or fall injury',()=>{
 for(const distance of [56,65,75,90,110,130]){const g=aiScenario('expert',52,'valley',distance,'cannon');g.land.protectedMask.fill(0);g.tanks.forEach(t=>{t.controller='human';t.hp=t.maxHP=920;});g.active.direction=1;g.tanks[1].direction=-1;g.tanks[1].crew='dad';g.wind=0;g.active.angle=45;g.active.power=10;g.fire();for(let i=0;i<1000&&g.current===0;i++)g.update(1/120);assert.ok(g.tanks[1].hp<920);assert.equal(g.tanks[0].hp,920);assert.equal(g.tanks[2].hp,920);}
});
test('low-power read-only AI trajectory matches live impact including headwind and tailwind',()=>{
 for(const power of [10,12,16,20,22,60])for(const wind of [-9,0,9]){const g=aiScenario('expert',52,'valley',900,'cannon');g.tanks.slice(1).forEach(t=>t.hp=0);g.wind=wind;g.active.angle=35;g.active.power=power;
  const spec=weaponById('cannon-normal'),p=g.launch(g.active,'cannon-normal');assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-projectileSpeed(power,spec.speed??1,g.gravity*(spec.gravity??1)))<1e-8);
  const predicted=predictAIImpact(g,g.active,'cannon-normal');let hit:any;const old=(g as any).explode.bind(g);(g as any).explode=(p:any,id:any)=>{hit??={x:p.x,y:p.y};old(p,id);};g.projectiles=[p];g.phase='flying';for(let i=0;i<2400&&!hit;i++)g.update(1/120);
  if(hit)assert.ok(Math.hypot(hit.x-predicted.x,hit.y-predicted.y)<4);else assert.ok(predicted.x< -50||predicted.x>1330);
 }
});
test('all thirteen ordinary guns can hit a touching/near enemy at minimum with their native arcs and physics',()=>{
 for(const v of VEHICLES)for(const map of ['valley','moon'] as const)for(const distance of [56,90]){const g=aiScenario('expert',52,map,distance,v.id);g.tanks.forEach(t=>t.controller='human');g.tanks[1].crew='dad';g.tanks[1].vehicleId='cannon';g.tanks[1].hp=g.tanks[1].maxHP=920;g.active.direction=1;g.tanks[1].direction=-1;g.wind=0;g.active.power=10;const self=g.active.hp;g.fire();for(let i=0;i<1000&&g.current===0;i++)g.update(1/120);assert.ok(g.tanks[1].hp<920,`${v.id}/${map}/${distance}`);assert.equal(g.active.id===0?g.active.hp:g.tanks[0].hp,self);}
});
