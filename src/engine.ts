import { DIFFICULTIES, ITEMS, WEAPONS, weaponById, type Difficulty, type ItemId, type MapId, type WeaponId } from './catalog';

export const WORLD_W = 1280;
export const WORLD_H = 600;
export const WATER_Y = 579;
export type Phase = 'lobby' | 'aiming' | 'flying' | 'resolving' | 'handoff' | 'ended';
export interface Config { mode:'ai'|'hotseat'; difficulty:Difficulty; map:MapId; timer:number; seed:number }
export interface Tank {
  id:number; name:string; x:number; y:number; hp:number; shield:number; fuel:number;
  angle:number; power:number; direction:number; ammo:Record<WeaponId,number>;
  items:Record<ItemId,number>; frozen:number; boost:boolean; itemUsed:boolean;
  fallVelocity:number; fallStart:number; shots:number; damage:number;
}
export interface Projectile { x:number; y:number; vx:number; vy:number; weapon:WeaponId; owner:number; age:number; bounces:number; drillY:number|null; sub:boolean; boost:number; trail:{x:number;y:number}[] }
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; color:string }
export interface Blast { x:number;y:number;radius:number;life:number;maxLife:number;color:string }
export interface FloatingText { x:number;y:number;text:string;color:string;life:number }
export interface FireZone { x:number;radius:number;turns:number;owner:number }
export interface Crate { x:number;y:number;type:'ammo'|'medical' }
export interface GameEvent { type:'shot'|'explosion'|'turn'|'item'|'hit'|'win'|'crate'|'timeout'; message:string; value?:number }
export const clamp = (v:number,min:number,max:number) => Math.min(max,Math.max(min,v));
export function makeRng(seed:number) { let a=seed>>>0; return () => { a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

export class Game {
  config:Config;
  terrain = new Float32Array(WORLD_W+1);
  tanks:Tank[] = [];
  phase:Phase = 'lobby';
  current=0; turn=0; wind=0; clock=45; selected:WeaponId='shell';
  projectiles:Projectile[]=[]; particles:Particle[]=[]; blasts:Blast[]=[];
  texts:FloatingText[]=[]; fires:FireZone[]=[]; crates:Crate[]=[];
  events:GameEvent[]=[]; log:string[]=[];
  paused=false; winner:number|null=null; shake=0; elapsed=0;
  targetX=1000; teleporting=false; aiTime=0; resolveTime=0;
  private rng:()=>number;
  private firedBy=0;

  constructor(config:Partial<Config>={}) {
    this.config={mode:'ai',difficulty:'normal',map:'valley',timer:45,seed:Date.now(),...config};
    this.rng=makeRng(this.config.seed);
    this.generateTerrain();
    this.tanks=[this.createTank(0,175),this.createTank(1,1105)];
    this.targetX=this.tanks[1].x;
  }
  get active() { return this.tanks[this.current]; }
  get enemy() { return this.tanks[1-this.current]; }
  get gravity() { return this.config.map==='moon'?145:230; }
  get humanTurn() { return this.phase==='aiming' && !this.paused && (this.config.mode==='hotseat'||this.current===0); }
  get round() { return Math.floor(this.turn/2)+1; }
  ground(x:number) { return this.terrain[Math.round(clamp(x,0,WORLD_W))]; }
  private createTank(id:number,x:number):Tank {
    return {id,name:id===0?'咪猪头':'大猪头爸爸',x,y:this.ground(x)-18,hp:150,shield:0,fuel:100,angle:48,power:68,direction:id===0?1:-1,
      ammo:Object.fromEntries(WEAPONS.map(w=>[w.id,w.ammo])) as Record<WeaponId,number>,
      items:Object.fromEntries(ITEMS.map(i=>[i.id,i.count])) as Record<ItemId,number>,
      frozen:0,boost:false,itemUsed:false,fallVelocity:0,fallStart:0,shots:0,damage:0};
  }
  private generateTerrain() {
    const phase=this.rng()*2;
    for(let x=0;x<=WORLD_W;x++) {
      let y:number;
      if(this.config.map==='coast') y=463+47*Math.sin(x/107+0.8)+19*Math.sin(x/43)+17*Math.cos(x/233);
      else if(this.config.map==='moon') y=461+29*Math.sin(x/130+phase)+18*Math.cos(x/64)+38*Math.exp(-(((x-620)/135)**2));
      else y=452+31*Math.sin(x/130+0.25)+14*Math.sin(x/55)+39*Math.exp(-(((x-660)/180)**2))-45*Math.exp(-(((x-1000)/180)**2));
      this.terrain[x]=clamp(y,370,548);
    }
    // Gentle deployment pads keep every map fair while preserving different elevations.
    for(const center of [175,1105]) {
      const base=this.terrain[center];
      for(let x=center-35;x<=center+35;x++) {
        const blend=1-Math.min(1,Math.abs(x-center)/35);
        this.terrain[x]=this.terrain[x]*(1-blend)+base*blend;
      }
    }
  }
  start() {
    if(this.phase!=='lobby') return;
    this.phase='aiming'; this.wind=(this.rng()-0.5)*22;
    this.emit('turn','咪猪头，轮到你了。');
  }
  private emit(type:GameEvent['type'],message:string,value?:number) {
    this.events.push({type,message,value});
    this.log.unshift(message); this.log=this.log.slice(0,24);
  }
  drainEvents() { return this.events.splice(0); }
  setAim(angle:number,power:number) {
    if(!this.humanTurn) return;
    this.active.angle=clamp(angle,5,175); this.active.power=clamp(power,10,100);
  }
  selectWeapon(id:WeaponId) {
    if(!this.humanTurn||this.active.ammo[id]<=0) return false;
    this.selected=id;this.teleporting=false;return true;
  }
  move(direction:number,dt:number,ai=false) {
    if(this.paused||this.phase!=='aiming'||(!ai&&!this.humanTurn)||this.teleporting) return false;
    const t=this.active;
    const distance=direction*70*dt;
    const x=clamp(t.x+distance,32,WORLD_W-32);
    const cost=Math.abs(x-t.x)*0.33*(t.frozen>0?2:1);
    if(t.fuel<cost||Math.abs(x-this.enemy.x)<56||this.ground(x)>=WATER_Y-10) return false;
    if(t.y+18-this.ground(x)>27) return false;
    t.fuel-=cost;t.x=x;
    const drop=this.ground(x)-18-t.y;
    if(drop<12) t.y=this.ground(x)-18;
    else { t.fallStart=t.y; t.fallVelocity=Math.max(1,t.fallVelocity); }
    this.collectCrates();return true;
  }
  face(direction:number) { if(this.humanTurn) this.active.direction=direction; }
  useItem(id:ItemId,ai=false) {
    const t=this.active;
    if(this.paused||this.phase!=='aiming'||(!ai&&!this.humanTurn)||t.itemUsed||t.items[id]<=0) return false;
    if(id==='repair'&&t.hp>=150 || id==='shield'&&t.shield>=60 || id==='fuel'&&t.fuel>=100) return false;
    if(id==='teleport') { this.teleporting=!this.teleporting; return true; }
    if(id==='repair') { const gain=Math.min(35,150-t.hp);t.hp+=gain;this.float(t.x,t.y-42,`+${gain}`,'#548166'); }
    if(id==='shield') t.shield=Math.min(60,t.shield+40);
    if(id==='fuel') t.fuel=Math.min(100,t.fuel+55);
    if(id==='boost') t.boost=true;
    if(id==='wind') this.wind=0;
    t.items[id]--;t.itemUsed=true;this.teleporting=false;
    this.emit('item',`${t.name}使用了${ITEMS.find(i=>i.id===id)!.name}。`);
    return true;
  }
  teleport(x:number) {
    if(!this.humanTurn||!this.teleporting||this.active.itemUsed||this.active.items.teleport<=0) return false;
    const t=this.active;
    x=clamp(x,32,WORLD_W-32);
    if(Math.abs(x-t.x)>230||Math.abs(x-this.enemy.x)<56||this.ground(x)>=WATER_Y-12) return false;
    this.burst(t.x,t.y,18,'#a4bfd0');
    t.x=x;t.y=this.ground(x)-18;t.fallVelocity=0;
    t.items.teleport--;t.itemUsed=true;this.teleporting=false;
    this.burst(t.x,t.y,18,'#a4bfd0');
    this.emit('item',`${t.name}完成了战术转移。`);this.collectCrates();return true;
  }
  muzzle(t:Tank,angle=t.angle) {
    const a=angle*Math.PI/180;
    return {x:t.x+Math.cos(a)*t.direction*31,y:t.y-13-Math.sin(a)*31};
  }
  launch(t:Tank,weapon:WeaponId,angle=t.angle,power=t.power):Projectile {
    const a=angle*Math.PI/180, muzzle=this.muzzle(t,angle);
    const speed=(120+power*6.1)*(weapon==='sniper'?2:1);
    return {x:muzzle.x,y:muzzle.y,vx:Math.cos(a)*speed*t.direction,vy:-Math.sin(a)*speed,weapon,owner:t.id,age:0,bounces:0,drillY:null,sub:false,boost:t.boost?1.5:1,trail:[]};
  }
  fire(ai=false) {
    if(this.paused||this.phase!=='aiming'||(!ai&&!this.humanTurn)||this.active.ammo[this.selected]<=0||this.active.fallVelocity>0) return false;
    const t=this.active,id=this.selected;
    this.phase='flying';this.teleporting=false;this.firedBy=t.id;
    if(Number.isFinite(t.ammo[id])) t.ammo[id]--;
    t.shots++;
    if(id==='triple') this.projectiles=[-5,0,5].map(d=>this.launch(t,id,t.angle+d));
    else if(id==='airstrike') this.projectiles=[-38,0,38].map(d=>({...this.launch(t,id),x:clamp(this.targetX+d,20,WORLD_W-20),y:-40-Math.abs(d),vx:0,vy:190}));
    else this.projectiles=[this.launch(t,id)];
    t.boost=false;
    this.emit('shot',`${t.name}发射了${weaponById(id).name}。`);
    this.burst(this.muzzle(t).x,this.muzzle(t).y,12,'#f5ce89');
    return true;
  }
  private projectileHit(p:Projectile) {
    if(p.age<0.09) return false;
    return this.tanks.some(t=>t.hp>0 && Math.hypot(p.x-t.x,p.y-(t.y-3))<22);
  }
  private stepProjectile(p:Projectile,dt:number):boolean {
    p.age+=dt;
    const g=this.gravity*(p.weapon==='sniper'?0.27:1);
    p.vx+=this.wind*(p.weapon==='sniper'?0.25:1)*dt;
    p.vy+=g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.trail.push({x:p.x,y:p.y});if(p.trail.length>40) p.trail.shift();
    if(p.weapon==='cluster'&&!p.sub&&p.vy>=0) {
      for(let i=-2;i<=2;i++) this.projectiles.push({...p,vx:p.vx*0.75+i*76,vy:40+Math.abs(i)*16,sub:true,age:0,trail:[]});
      this.burst(p.x,p.y,16,'#e0c384');return true;
    }
    if(p.x< -50||p.x>WORLD_W+50||p.y>WORLD_H+70||p.age>12) return true;
    const hitTank=this.projectileHit(p);
    if(p.y>=this.ground(p.x)||hitTank) {
      if(p.weapon==='drill'&&!hitTank) {
        if(p.drillY===null) p.drillY=p.y;
        p.vx*=0.96;
        if(p.y-p.drillY<58) return false;
      }
      if(p.weapon==='bounce'&&p.bounces<2&&!hitTank) {
        p.y=this.ground(p.x)-5;p.vy=-Math.max(125,Math.abs(p.vy)*0.57);p.vx*=0.77;p.bounces++;
        this.burst(p.x,p.y,8,'#c3bed2');return false;
      }
      this.explode(p);return true;
    }
    return false;
  }
  crater(x:number,y:number,radius:number) {
    for(let i=Math.max(0,Math.floor(x-radius));i<=Math.min(WORLD_W,Math.ceil(x+radius));i++) {
      const d=i-x;
      const bottom=y+Math.sqrt(Math.max(0,radius*radius-d*d));
      this.terrain[i]=Math.max(this.terrain[i],Math.min(WORLD_H+40,bottom));
    }
    for(const t of this.tanks) if(this.ground(t.x)-18>t.y+3 && t.fallVelocity===0) { t.fallStart=t.y;t.fallVelocity=1; }
    for(const c of this.crates) c.y=this.ground(c.x)-14;
    this.crates=this.crates.filter(c=>c.y<WATER_Y-14);
  }
  private explode(p:Projectile) {
    const w=weaponById(p.weapon), radius=w.radius;
    const color=p.weapon==='ice'?'#a1d7e0':p.weapon==='emp'?'#c2a3d8':'#efb274';
    this.blasts.push({x:p.x,y:p.y,radius,life:0.65,maxLife:0.65,color});
    this.burst(p.x,p.y,Math.round(radius*0.6),color);
    this.shake=Math.min(10,radius/10);
    this.crater(p.x,p.y,radius);
    for(const t of this.tanks) {
      const distance=Math.hypot(t.x-p.x,t.y-p.y);
      if(distance>radius+26) continue;
      if(p.weapon==='emp') {t.shield=0;t.fuel=Math.max(0,t.fuel-35);this.float(t.x,t.y-65,'脉冲','#ac88bc');}
      if(p.weapon==='ice') {t.frozen=2;this.float(t.x,t.y-65,'冻结 ×2','#79aebe');}
      const damage=Math.round(w.damage*p.boost*(distance<=28?1:clamp(1-(distance-28)/(radius+8),0.1,1)));
      this.damage(t,damage,p.owner);
    }
    if(p.weapon==='napalm') this.fires.push({x:p.x,radius:60,turns:3,owner:p.owner});
    this.emit('explosion',`${w.name}在 ${Math.round(p.x)} 米处爆炸。`);
  }
  damage(t:Tank,amount:number,owner:number,ignoreShield=false) {
    if(t.hp<=0) return;
    const absorbed=ignoreShield?0:Math.min(t.shield,amount);
    t.shield-=absorbed;const actual=Math.min(t.hp,amount-absorbed);t.hp-=actual;
    if(owner!==t.id&&actual>0) this.tanks[owner].damage+=actual;
    if(absorbed) this.float(t.x+16,t.y-43,`护盾 −${absorbed}`,'#75a7af');
    if(actual) { this.float(t.x,t.y-25,`−${actual}`,'#db674b');this.emit('hit',`${t.name}受到 ${actual} 点伤害。`,actual); }
  }
  private float(x:number,y:number,text:string,color:string) { this.texts.push({x,y,text,color,life:1.8}); }
  burst(x:number,y:number,count:number,color:string) {
    for(let i=0;i<count;i++) {
      const a=this.rng()*Math.PI*2,speed=30+this.rng()*170,life=0.35+this.rng()*0.6;
      this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-30,life,maxLife:life,size:2+this.rng()*5,color:i%3===0?'#f6ecd5':color});
    }
  }
  private updateTanks(dt:number) {
    for(const t of this.tanks) {
      if(t.hp<=0) continue;
      const ground=this.ground(t.x)-18;
      if(t.y<ground-0.5 || t.fallVelocity>0) {
        if(!t.fallVelocity) {t.fallStart=t.y;t.fallVelocity=1;}
        t.fallVelocity+=this.gravity*dt;t.y+=t.fallVelocity*dt;
        if(t.y>=ground) {
          t.y=ground; const fall=t.y-t.fallStart;t.fallVelocity=0;
          if(fall>48) { const damage=Math.round((fall-35)*0.3);this.damage(t,damage,this.firedBy,true);this.float(t.x,t.y-60,'坠落','#bc876c'); }
        }
      }
      if(t.y+18>=WATER_Y) { this.damage(t,t.hp,this.firedBy,true);this.emit('hit',`${t.name}掉出了战场。`); }
    }
  }
  private collectCrates() {
    this.crates=this.crates.filter(c=>{
      const t=this.active;
      if(Math.abs(c.x-t.x)>28) return true;
      if(c.type==='medical') { t.hp=Math.min(150,t.hp+22);t.items.repair++;this.float(t.x,t.y-40,'维修补给','#56866b'); }
      else {
        const id=WEAPONS[1+Math.floor(this.rng()*(WEAPONS.length-1))].id;
        t.ammo[id]+=2;t.items.fuel++;this.float(t.x,t.y-40,`${weaponById(id).name} +2`,'#a18c56');
      }
      this.emit('crate',`${t.name}拾取了${c.type==='medical'?'医疗':'弹药'}补给。`);return false;
    });
  }
  private checkWin() {
    if(this.tanks.every(t=>t.hp>0)) return false;
    this.phase='ended';
    this.winner=this.tanks.every(t=>t.hp<=0)?null:this.tanks[0].hp>0?0:1;
    this.emit('win',this.winner===null?'两位队长打成了平局！':`${this.tanks[this.winner].name}赢得了这场对决！`);
    return true;
  }
  nextTurn() {
    if(this.checkWin()) return;
    this.turn++;this.current=1-this.current;this.selected='shell';this.teleporting=false;
    this.active.fuel=Math.min(100,this.active.fuel+18);this.active.itemUsed=false;
    // Status counts decrement after the affected unit has had its full turn.
    const previous=this.tanks[1-this.current];
    if(previous.frozen>0) previous.frozen--;
    this.wind=(this.rng()-0.5)*(this.turn>=40?42:26);
    this.clock=this.config.timer;this.aiTime=0;
    for(const f of this.fires) if(Math.abs(this.active.x-f.x)<f.radius && this.active.y>this.ground(f.x)-100) this.damage(this.active,14,f.owner);
    // A fire lives for three complete pairs of turns.
    if(this.current===0) { for(const f of this.fires) f.turns--;this.fires=this.fires.filter(f=>f.turns>0); }
    if(this.turn>=40) {this.damage(this.active,12,1-this.current,true);this.float(this.active.x,this.active.y-55,'决胜时刻','#bd765d');}
    if(this.checkWin()) return;
    if(this.turn%5===0&&this.crates.length<3) {
      const x=240+this.rng()*800;
      if(this.ground(x)<WATER_Y-25) this.crates.push({x,y:this.ground(x)-14,type:this.rng()>0.45?'ammo':'medical'});
      this.emit('crate','新的补给箱已抵达战场。');
    }
    this.phase=this.config.mode==='hotseat'?'handoff':'aiming';
    this.emit('turn',`${this.active.name}，轮到你了。`);
  }
  acceptHandoff() { if(this.phase==='handoff') this.phase='aiming'; }
  skipTurn() { if(this.phase==='aiming'&&!this.paused) this.nextTurn(); }
  predict(angle=this.active.angle,power=this.active.power,weapon=this.selected,maxTime=10,tank=this.active) {
    const p=this.launch(tank,weapon,angle,power),points:{x:number;y:number}[]=[];
    const dt=1/40;
    for(let i=0;i<maxTime/dt;i++) {
      p.vx+=this.wind*(weapon==='sniper'?0.25:1)*dt;
      p.vy+=this.gravity*(weapon==='sniper'?0.27:1)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(i%3===0) points.push({x:p.x,y:p.y});
      if(p.x<0||p.x>WORLD_W||p.y>WORLD_H||p.y>=this.ground(p.x)||i>3&&this.tanks.some(t=>t.hp>0&&Math.hypot(p.x-t.x,p.y-(t.y-3))<21)) break;
    }
    return {x:p.x,y:p.y,points};
  }
  planAI() {
    const t=this.active,e=this.enemy,difficulty=this.config.difficulty;
    const level=DIFFICULTIES.findIndex(d=>d.id===difficulty);
    if(level>=2) {
      if(t.hp<105&&t.items.repair>0) this.useItem('repair',true);
      else if(t.shield<20&&t.items.shield>0) this.useItem('shield',true);
      else if(t.items.boost>0&&this.rng()>0.5) this.useItem('boost',true);
      const danger=this.fires.some(f=>Math.abs(f.x-t.x)<f.radius);
      if(danger||this.ground(t.x)>525) {for(let i=0;i<35;i++) this.move(t.x>640?-1:1,1/60,true);}
    }
    t.direction=e.x>t.x?1:-1;
    let weapon:WeaponId='shell';
    if(level>0) {
      const pool:WeaponId[]=level>=2?['heavy','triple','napalm','drill','ice','airstrike','quake']:['shell','heavy','triple'];
      const available=pool.filter(w=>t.ammo[w]>0);
      if(available.length) weapon=available[Math.floor(this.rng()*available.length)];
      if(level>=2&&e.shield>0&&t.ammo.emp>0) weapon='emp';
    }
    this.selected=weapon;
    const error=DIFFICULTIES[level].error;
    const target=e.x+(this.rng()-0.5)*error*2;
    if(weapon==='airstrike') {this.targetX=clamp(target,20,WORLD_W-20);return;}
    let best=Infinity,bestAngle=48,bestPower=68;
    for(let a=15;a<=83;a+=2) for(let power=22;power<=100;power+=2) {
      const impact=this.predict(a,power,weapon,10,t);
      const distance=Math.hypot(impact.x-target,(impact.y-e.y)*0.7);
      const score=distance+(a<25?5:0)+Math.max(0,100-Math.abs(impact.x-t.x))*2;
      if(score<best) {best=score;bestAngle=a;bestPower=power;}
    }
    t.angle=clamp(bestAngle+(this.rng()-0.5)*(level===0?5:1.2),5,175);
    t.power=clamp(bestPower+(this.rng()-0.5)*(level===0?7:1),10,100);
  }
  update(dt:number) {
    if(this.paused) return;
    dt=Math.min(dt,0.05);this.elapsed+=dt;
    this.shake=Math.max(0,this.shake-dt*16);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.vy+=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
    this.blasts=this.blasts.filter(b=>{b.life-=dt;return b.life>0;});
    this.texts=this.texts.filter(t=>{t.life-=dt;t.y-=dt*20;return t.life>0;});
    if(this.phase==='lobby'||this.phase==='ended'||this.phase==='handoff') return;
    this.updateTanks(dt);
    if(this.phase==='aiming') {
      this.collectCrates();
      if(this.checkWin()) return;
      if(this.config.timer>0) {
        this.clock-=dt;
        if(this.clock<=0) {this.emit('timeout',`${this.active.name}的回合时间到了。`);this.nextTurn();return;}
      }
      if(this.config.mode==='ai'&&this.current===1) {
        const previous=this.aiTime;this.aiTime+=dt;
        if(previous<0.8&&this.aiTime>=0.8) this.planAI();
        if(this.aiTime>=1.8) this.fire(true);
      }
    } else if(this.phase==='flying') {
      // Fixed small substeps prevent fast shells tunnelling through tanks and ground.
      const count=Math.ceil(dt/(1/180)),step=dt/count;
      for(let i=0;i<count;i++) {
        const active=[...this.projectiles];
        for(const p of active) if(this.stepProjectile(p,step)) this.projectiles=this.projectiles.filter(q=>q!==p);
      }
      if(this.projectiles.length===0) {this.phase='resolving';this.resolveTime=1;}
    } else if(this.phase==='resolving') {
      this.resolveTime-=dt;
      if(this.resolveTime<=0&&this.tanks.every(t=>t.hp<=0||t.fallVelocity===0)) this.nextTurn();
    }
  }
}
