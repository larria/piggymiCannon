import assert from 'node:assert/strict';
import test from 'node:test';
import {Game} from '../src/engine';
import {defaultSlots} from '../src/crew';

function match(){
 const g=new Game({map:'coast',seed:52,fog:false,fireLine:false,friendlyFire:true,slots:defaultSlots().map((s,i)=>({...s,enabled:true,team:i%2,controller:'human',vehicle:'cannon'}))},'5.1.2');
 g.start();return g;
}

test('only teammates other than the shooter cheer once an actual volley takes 25% of one enemy’s maximum HP',()=>{
 const g=match(),[shooter,enemy,ally,otherEnemy]=g.tanks,quarter=Math.ceil(enemy.maxHP*.25);
 const impact={cause:'direct' as const,weapon:'cannon-normal' as const};
 g.damage(ally,quarter,shooter.id,false,'direct',undefined,impact);assert.equal(g.crewCheerAge(ally.id),null);
 assert.deepEqual(g.tanks.map(t=>g.crewShockAge(t.id)),[0,null,null,null]);g.elapsed+=2;
 enemy.shield=quarter;
 g.damage(enemy,quarter,shooter.id,false,'direct',undefined,impact);assert.equal(g.crewCheerAge(ally.id),null);
 g.damage(enemy,quarter-1,shooter.id,false,'direct',undefined,impact);assert.equal(g.crewCheerAge(ally.id),null);
 g.damage(otherEnemy,10,shooter.id,false,'graze',undefined,impact);assert.equal(g.crewCheerAge(ally.id),null);
 g.damage(enemy,1,shooter.id,false,'graze',undefined,impact);
 assert.deepEqual(g.tanks.map(t=>g.crewCheerAge(t.id)),[null,null,0,null]);
 assert.deepEqual(g.tanks.map(t=>g.crewShockAge(t.id)),[null,null,null,0]);
 g.elapsed+=2;assert.equal(g.crewCheerAge(ally.id),null);
});

test('cheering for enemy falls needs newly destroyed support and a long drop or map exit',()=>{
 for(const [drop,cheer] of [[28,false],[62,true],[null,true]] as const){
  const g=match(),[attacker,enemy,ally]=g.tanks,source={owner:attacker.id,weapon:'cannon-normal' as const};
  g.land.mask.fill(0);g.land.protectedMask.fill(0);Object.assign(enemy,{x:700,y:382,fallVelocity:0});
  for(let x=640;x<=760;x++){g.land.column(x,400,404);if(drop!==null)g.land.column(x,400+drop,418+drop);}
  g.land.rebuild();g.crater(700,401,52,8,source);
  assert.ok(enemy.fallVelocity>0);assert.equal(g.crewCheerAge(ally.id)!==null,cheer);assert.equal(g.crewShockAge(g.tanks[3].id)!==null,cheer);assert.equal(g.crewShockAge(enemy.id),null);
 }
 const g=match(),[attacker,enemy,ally]=g.tanks;
 Object.assign(enemy,{x:700,y:100,fallVelocity:0});
 g.crater(enemy.x,g.ground(enemy.x),52,120,{owner:attacker.id,weapon:'cannon-normal'});
 assert.equal(g.crewCheerAge(ally.id),null);
});
