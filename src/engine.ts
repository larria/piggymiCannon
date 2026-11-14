import { DIFFICULTIES, ITEMS, WEAPONS, ALL_WEAPONS,weaponById, itemById, excavation, aiAimOffset, type Difficulty, type ItemId, type MapId, type WeaponId } from './catalog';
import {resolveVehicle,vehicleById,type VehicleId,type VehicleChoice} from './vehicles';
import { Terrain, WORLD_W, WORLD_H, WATER_Y, TERRAIN_H } from './terrain';
import {rollWeather} from './weather';

export {WORLD_W,WORLD_H,WATER_Y};
export const FLIGHT_SPEED=1.8;
export type Phase = 'lobby' | 'aiming' | 'flying' | 'resolving' | 'supply' | 'handoff' | 'ended';
export interface Config { mode:'ai'|'hotseat'; difficulty:Difficulty; map:MapId; timer:number; seed:number;fog?:boolean;fireLine?:boolean;vehicle0?:VehicleChoice;vehicle1?:VehicleChoice }
export interface Tank {
  id:number; name:string; x:number; y:number; hp:number; shield:number; fuel:number;
  angle:number; power:number; direction:number; ammo:Record<WeaponId,number>;
  items:Record<ItemId,number>; frozen:number; boost:boolean; itemUsed:boolean;
  fallVelocity:number; fallStart:number; shots:number; damage:number;
  tactics:number; turnsTaken:number; itemReadyTurn:Record<ItemId,number>;
  doubleShot:boolean;reaction:{kind:'direct'|'graze'|'fall';remaining:number}|null;
  vehicleId:VehicleId|null;maxHP:number;minAngle:number;maxAngle:number;moveSpeed:number;moveDistance:number;nextActionAt:number;lastDelay:number;poisoned:boolean;immobile:number;
  selectedWeapon:WeaponId;lastPower:number;
}
export interface Projectile { x:number; y:number; vx:number; vy:number; weapon:WeaponId; owner:number; age:number; bounces:number; drillY:number|null; sub:boolean; boost:number; trail:{x:number;y:number}[];delay:number;echo:boolean;fireBoosted:boolean;homing:boolean;penetrations:number;scale:number;phase:number;lockAge:number;lockX:number;lockY:number }
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; color:string }
export interface Blast { x:number;y:number;radius:number;life:number;maxLife:number;color:string }
export interface FloatingText { x:number;y:number;text:string;color:string;life:number }
export interface FireZone { x:number;y?:number;radius:number;turns:number;owner:number }
export interface Crate { x:number;y:number;type:'ammo'|'medical'|'double'|'homing';falling?:boolean;vy?:number;vx?:number }
export interface GameEvent { type:'shot'|'explosion'|'turn'|'item'|'hit'|'win'|'crate'|'crate-land'|'timeout'|'lock'; message:string; value?:number;x?:number;weapon?:WeaponId }
export interface Mine {x:number;y:number;owner:number;weapon:WeaponId;boost:number}
export interface Gas {x:number;y:number;owner:number;radius:number;turns:number}
export const clamp = (v:number,min:number,max:number) => Math.min(max,Math.max(min,v));
export function makeRng(seed:number) { let a=seed>>>0; return () => { a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

export class Game {
  config:Config;
  land=new Terrain();
  terrain=this.land.surface;
  tanks:Tank[] = [];
  phase:Phase = 'lobby';
  current=0; turn=0; wind=0; clock=45; selected:WeaponId='shell';
  projectiles:Projectile[]=[]; particles:Particle[]=[]; blasts:Blast[]=[];
  texts:FloatingText[]=[]; fires:FireZone[]=[]; crates:Crate[]=[];
  events:GameEvent[]=[]; log:string[]=[];
  paused=false; winner:number|null=null; shake=0; elapsed=0;
  targetX=1000; teleporting=false; aiTime=0; resolveTime=0;
  fog=false;fireLine:{x:number;top:number;bottom:number}|null=null;
  movingUntil=[0,0];
  mines:Mine[]=[];gases:Gas[]=[];
  private heardX=[175,1105];private afterSupply:'aiming'|'handoff'='aiming';private supplySettling=0;
  private rng:()=>number;
  private firedBy=0;

  constructor(config:Partial<Config>={}) {
    this.config={mode:'ai',difficulty:'easy',map:'valley',timer:45,seed:Date.now(),...config};
    this.rng=makeRng(this.config.seed);
    const weather=rollWeather(this.rng);this.fog=this.config.fog??weather.fog;
    if(this.config.fireLine??weather.fireLine) this.fireLine={x:450+this.rng()*380,top:50,bottom:550};
    this.generateTerrain();
    this.tanks=[this.createTank(0,175),this.createTank(1,1105)];
    if(this.active.vehicleId) this.selected=vehicleById(this.active.vehicleId).normal;
    this.targetX=this.tanks[1].x;
  }
  get active() { return this.tanks[this.current]; }
  get enemy() { return this.tanks[1-this.current]; }
  get gravity() { return this.config.map==='moon'?145:230; }
  get humanTurn() { return this.phase==='aiming' && !this.paused && (this.config.mode==='hotseat'||this.current===0); }
  get round() { return Math.floor(this.turn/2)+1; }
  get viewer() {return this.config.mode==='ai'?0:this.current;}
  ground(x:number,fromY=0) { return this.land.below(x,fromY); }
  support(x:number,footY:number) {
    const levels=[-16,-8,0,8,16].map(dx=>this.ground(x+dx,footY-8)).sort((a,b)=>a-b);
    return levels[2];
  }
  stablePlatform(x:number) {
    const levels=[-20,-10,0,10,20].map(dx=>this.ground(x+dx));
    return Math.max(...levels)<WATER_Y-12 && Math.max(...levels)-Math.min(...levels)<=18;
  }
  tankSlope(t:Tank) {
    if(t.fallVelocity>0) return 0;
    const left=this.ground(t.x-14,t.y-22),right=this.ground(t.x+14,t.y-22);
    return clamp(Math.atan2(right-left,28),-0.61,0.61);
  }
  traversable(t:Tank,x:number) {
    if(x<32||x>WORLD_W-32) return null;
    let previous=t.y+18;const steps=Math.max(1,Math.ceil(Math.abs(x-t.x)/2));
    for(let i=1;i<=steps;i++) {
      const at=t.x+(x-t.x)*i/steps,level=this.support(at,previous);
      if(level>=WATER_Y-10||Math.abs(level-previous)>7) return null;
      const left=this.ground(at-10,previous-40),right=this.ground(at+10,previous-40);
      if(Math.abs(right-left)/20>Math.tan(35*Math.PI/180)) return null;
      previous=level;
    }
    return previous;
  }
  private createTank(id:number,x:number):Tank {
    const choice=id===0?this.config.vehicle0:this.config.vehicle1;
    const vehicleId=choice?resolveVehicle(choice,this.rng):null,v=vehicleId?vehicleById(vehicleId):null;
    const ammo=Object.fromEntries(ALL_WEAPONS.map(w=>[w.id,v?0:w.ammo])) as Record<WeaponId,number>;
    if(v) {ammo[v.normal]=Infinity;ammo[v.special]=Infinity;}
    return {id,name:id===0?'咪猪头':'大猪头爸爸',x,y:this.ground(x)-18,hp:v?.hp??150,shield:0,fuel:100,angle:clamp(48,v?.minAngle??5,v?.maxAngle??175),power:68,direction:id===0?1:-1,
      ammo,
      items:Object.fromEntries(ITEMS.map(i=>[i.id,i.count])) as Record<ItemId,number>,
      frozen:0,boost:false,itemUsed:false,fallVelocity:0,fallStart:0,shots:0,damage:0,tactics:2,turnsTaken:0,
      itemReadyTurn:Object.fromEntries(ITEMS.map(i=>[i.id,0])) as Record<ItemId,number>,doubleShot:false,reaction:null,vehicleId,maxHP:v?.hp??150,minAngle:v?.minAngle??5,maxAngle:v?.maxAngle??175,moveSpeed:v?v.movement*1.35:70,moveDistance:v?v.movement*3:100/0.33,nextActionAt:id===0?0:280,lastDelay:v?.waiting??560,poisoned:false,immobile:0,selectedWeapon:v?.normal??'shell',lastPower:68};
  }
  private generateTerrain() {
    const phase=this.rng()*2;
    for(let x=0;x<=WORLD_W;x++) {
      if(this.config.map==='coast') {
        if(x<90||x>1190) this.land.column(x,394,TERRAIN_H);
        else {
          const top=398+Math.sin(x/115)*4;
          const landing=(x<285||x>995);
          this.land.column(x,top,top+(landing?52:24));
        }
      } else if(this.config.map==='moon') {
        if(x>=70&&x<=410) {const top=355+Math.sin(x/92+phase)*12;this.land.column(x,top,top+76);}
        if(x>=870&&x<=1210) {const top=333+Math.sin(x/96+phase)*12;this.land.column(x,top,top+76);}
        if(x>=520&&x<=750) this.land.column(x,439+Math.sin(x/45)*6,480);
        if(x>=550&&x<=730) this.land.column(x,215+Math.sin(x/50)*5,248);
      } else if(x<585||x>705) {
        const top=452+31*Math.sin(x/130+0.25)+14*Math.sin(x/55)
          -70*Math.exp(-(((x-370)/110)**2))-65*Math.exp(-(((x-940)/120)**2));
        this.land.column(x,clamp(top,350,535),TERRAIN_H);
      }
    }
    this.land.rebuild();
    // Level just the deployment tread footprint; do not fill the void underneath.
    for(const center of [175,1105]) {
      const base=Math.round(this.ground(center));
      const original=Array.from({length:121},(_,i)=>({top:this.ground(center-60+i),bottom:this.land.bottom(center-60+i)}));
      for(let x=center-60;x<=center+60;x++) {
        const column=original[x-center+60],blend=clamp((60-Math.abs(x-center))/40,0,1);
        const top=Math.round(column.top*(1-blend)+base*blend);
        for(let y=0;y<TERRAIN_H;y++) this.land.mask[y*this.land.stride+x]=0;
        this.land.column(x,top,column.bottom);
      }
    }
    this.land.rebuild();
  }
  start() {
    if(this.phase!=='lobby') return;
    this.phase='aiming'; this.wind=(this.rng()-0.5)*22;
    this.active.turnsTaken=1;
    if(this.active.vehicleId) this.selected=vehicleById(this.active.vehicleId).normal;
    this.emit('turn','咪猪头，轮到你了。');
  }
  private emit(type:GameEvent['type'],message:string,value?:number,x?:number,weapon?:WeaponId) {
    this.events.push({type,message,value,x,weapon});
    this.log.unshift(message); this.log=this.log.slice(0,24);
  }
  drainEvents() { return this.events.splice(0); }
  setAim(angle:number,power:number) {
    if(!this.humanTurn) return;
    this.active.angle=clamp(angle,this.active.minAngle,this.active.maxAngle); this.active.power=clamp(power,10,100);
  }
  selectWeapon(id:WeaponId) {
    if(!this.humanTurn||!weaponById(id)||(this.active.ammo[id]??0)<=0) return false;
    if(this.active.vehicleId) {const v=vehicleById(this.active.vehicleId);if(id!==v.normal&&id!==v.special&&id!=='homing') return false;}
    this.selected=id;this.active.selectedWeapon=id;this.teleporting=false;return true;
  }
  move(direction:number,dt:number,ai=false) {
    if(this.paused||this.phase!=='aiming'||(!ai&&!this.humanTurn)||this.teleporting||this.active.fallVelocity>0||this.active.immobile>0||!Number.isFinite(dt)||dt<=0) return false;
    const t=this.active;
    const distance=Math.sign(direction)*t.moveSpeed*Math.min(dt,0.25);
    const x=clamp(t.x+distance,32,WORLD_W-32);
    const cost=Math.abs(x-t.x)*(100/t.moveDistance)*(t.frozen>0?2:1);
    if(t.fuel<cost||Math.abs(x-this.enemy.x)<56||x===t.x) return false;
    // Check every part of the path, plus tread-scale slope, independent of frame rate.
    const previous=this.traversable(t,x);if(previous===null) return false;
    t.fuel-=cost;t.x=x;
    this.movingUntil[t.id]=this.elapsed+0.15;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    const drop=previous-18-t.y;
    if(drop<12) t.y=previous-18;
    else { t.fallStart=t.y; t.fallVelocity=Math.max(1,t.fallVelocity); }
    this.collectCrates();this.triggerMines(t);return true;
  }
  face(direction:number) { if(this.humanTurn) this.active.direction=direction; }
  itemUnavailable(id:ItemId,ai=false):string|null {
    const t=this.active,i=itemById(id);
    if(this.phase!=='aiming'||this.paused||(!ai&&!this.humanTurn)) return '等待自己的回合';
    if(t.fallVelocity>0) return '坠落中不能使用';
    if(t.itemUsed) return '本回合已用过道具';
    if(t.items[id]<=0) return i.count===0?'仅空投获得':'库存已用完';
    if(t.turnsTaken<i.unlock) return `第 ${i.unlock} 回合解锁`;
    const wait=t.itemReadyTurn[id]-t.turnsTaken;
    if(wait>0) return `冷却还剩 ${wait} 回合`;
    if(t.tactics<i.cost) return `需要 ${i.cost} 战术点`;
    if(id==='repair'&&t.hp>Math.floor(t.maxHP*115/150)) return `生命需不高于 ${Math.floor(t.maxHP*115/150)}`;
    if(id==='shield'&&t.shield>0) return '已有护盾，不能叠加';
    if(id==='fuel'&&t.fuel>45) return '燃料需不高于 45';
    if(id==='boost'&&t.boost) return '火力已强化';
    if(id==='double'&&t.doubleShot) return '已装填双发';
    if(id==='wind'&&Math.abs(this.wind)<3) return '当前风力太小';
    return null;
  }
  private consumeItem(id:ItemId) {
    const t=this.active,i=itemById(id);
    t.items[id]--;t.tactics-=i.cost;t.itemUsed=true;
    t.itemReadyTurn[id]=t.turnsTaken+i.cooldown+1;this.teleporting=false;
    this.emit('item',`${t.name}使用了${i.name}，消耗 ${i.cost} 战术点。`,undefined,t.x);
  }
  useItem(id:ItemId,ai=false) {
    if(this.itemUnavailable(id,ai)) return false;
    const t=this.active;
    if(id==='teleport') {this.teleporting=!this.teleporting;return true;}
    if(id==='repair') {const gain=Math.round(t.maxHP*35/150);t.hp=Math.min(t.maxHP,t.hp+gain);t.poisoned=false;this.float(t.x,t.y-42,`+${gain}`,'#548166');}
    if(id==='shield') t.shield=Math.round(t.maxHP*40/150);
    if(id==='fuel') t.fuel=Math.min(100,t.fuel+55);
    if(id==='boost') t.boost=true;
    if(id==='double') t.doubleShot=true;
    if(id==='wind') this.wind=0;
    this.consumeItem(id);return true;
  }
  teleport(x:number) {
    if(!this.teleporting||this.itemUnavailable('teleport')) return false;
    const t=this.active;
    if(!Number.isFinite(x)||x<32||x>WORLD_W-32||Math.abs(x-t.x)>230||Math.abs(x-this.enemy.x)<56||!this.stablePlatform(x)) return false;
    this.burst(t.x,t.y,18,'#a4bfd0');
    t.x=x;t.y=this.ground(x)-18;t.fallVelocity=0;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    this.consumeItem('teleport');this.burst(t.x,t.y,18,'#a4bfd0');
    this.emit('item',`${t.name}完成了战术转移。`);this.collectCrates();return true;
  }
  muzzle(t:Tank,angle=t.angle) {
    const a=angle*Math.PI/180;
    const slope=this.tankSlope(t),pivotX=t.x+Math.sin(slope)*13,pivotY=t.y-Math.cos(slope)*13;
    return {x:pivotX+Math.cos(a)*t.direction*31,y:pivotY-Math.sin(a)*31};
  }
  launch(t:Tank,weapon:WeaponId,angle=t.angle,power=t.power):Projectile {
    const a=angle*Math.PI/180, muzzle=this.muzzle(t,angle);
    const spec=weaponById(weapon),speed=(120+power*6.1)*(weapon==='sniper'?2:spec.speed??1);
    const rage=t.vehicleId==='sea'&&t.hp<t.maxHP*0.5?1.5:1;
    return {x:muzzle.x,y:muzzle.y,vx:Math.cos(a)*speed*t.direction,vy:-Math.sin(a)*speed,weapon,owner:t.id,age:0,bounces:0,drillY:null,sub:false,boost:(t.boost?1.5:1)*rage,trail:[],delay:0,echo:false,fireBoosted:false,homing:false,penetrations:0,scale:t.vehicleId&&!spec.effect?6:1,phase:0,lockAge:0,lockX:0,lockY:0};
  }
  fire(ai=false) {
    if(this.paused||this.phase!=='aiming'||(!ai&&!this.humanTurn)||(this.active.ammo[this.selected]??0)<=0||this.active.fallVelocity>0) return false;
    const t=this.active,id=this.selected;
    this.phase='flying';this.teleporting=false;this.firedBy=t.id;
    if(Number.isFinite(t.ammo[id])) t.ammo[id]--;
    t.shots++;
    t.lastPower=t.power;t.selectedWeapon=id;
    const spec=weaponById(id);
    t.lastDelay=(t.vehicleId?vehicleById(t.vehicleId).waiting:560)+(spec.extraDelay??0);
    if(spec.shots&&spec.shots>1) this.projectiles=Array.from({length:spec.shots},(_,i)=>({...this.launch(t,id,t.angle+(i-(spec.shots!-1)/2)*(spec.spread??3)),phase:i*Math.PI*2/spec.shots!}));
    else if(id==='triple') this.projectiles=[-5,0,5].map(d=>this.launch(t,id,t.angle+d));
    else if(id==='airstrike') this.projectiles=[-38,0,38].map(d=>({...this.launch(t,id),x:clamp(this.targetX+d,20,WORLD_W-20),y:-40-Math.abs(d),vx:0,vy:190}));
    else this.projectiles=[this.launch(t,id)];
    if(t.doubleShot) this.projectiles.push(...this.projectiles.map((p,i)=>({...p,trail:[],delay:0.35,echo:i===0})));
    t.boost=false;t.doubleShot=false;this.heardX[t.id]=Math.round(t.x/90)*90;
    this.emit('shot',`${t.name}发射了${weaponById(id).name}。`,undefined,t.x,id);
    this.burst(this.muzzle(t).x,this.muzzle(t).y,12,'#f5ce89');
    return true;
  }
  private projectileHit(p:Projectile) {
    if(p.age<0.09) return undefined;
    return this.tanks.find(t=>t.hp>0 && Math.hypot(p.x-t.x,p.y-(t.y-3))<22);
  }
  private stepProjectile(p:Projectile,dt:number):boolean {
    if(p.delay>0) {p.delay-=dt;if(p.delay<=0&&p.echo) this.emit('shot','双发装填追加了一轮齐射。',undefined,this.tanks[p.owner].x,p.weapon);return false;}
    p.age+=dt;
    const spec=weaponById(p.weapon),effect=spec.effect;
    const orbital=effect==='orbital'&&p.sub;
    const g=orbital?0:this.gravity*(p.weapon==='sniper'?0.27:spec.gravity??1);
    p.vx+=orbital?0:this.wind*(p.weapon==='sniper'?0.25:1)*dt;
    const oldX=p.x,oldY=p.y;
    if((p.weapon==='homing'||effect==='homing')&&(p.vy>0||p.homing)) {
      const target=this.tanks[1-p.owner],dx=target.x-p.x,dy=target.y-p.y;
      if(target.hp>0&&Math.hypot(dx,dy)<140&&p.y>Math.min(this.ground(p.x),target.y+18)-130) {
        const speed=Math.max(250,Math.hypot(p.vx,p.vy)),angle=Math.atan2(dy,dx),blend=Math.min(1,dt*5);
        p.vx+=(Math.cos(angle)*speed-p.vx)*blend;p.vy+=(Math.sin(angle)*speed-p.vy)*blend;
        if(!p.homing) this.emit('lock',`${spec.name}锁定目标，开始追踪。`,undefined,p.x,p.weapon);
        p.homing=true;p.lockX=target.x;p.lockY=target.y;p.lockAge+=dt;
      }
    }
    p.vy+=g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(effect==='helix') {p.y+=Math.sin(p.age*17+p.phase)*45*dt;p.x+=Math.cos(p.age*17+p.phase)*25*dt;}
    if(this.fireLine&&!p.fireBoosted&&(oldX-this.fireLine.x)*(p.x-this.fireLine.x)<=0&&p.y>=this.fireLine.top&&p.y<=this.fireLine.bottom) {
      p.boost*=1.5;p.fireBoosted=true;this.burst(p.x,p.y,10,'#f5a956');
    }
    p.trail.push({x:p.x,y:p.y});if(p.trail.length>40) p.trail.shift();
    if(p.weapon==='cluster'&&!p.sub&&p.vy>=0) {
      for(let i=-2;i<=2;i++) this.projectiles.push({...p,vx:p.vx*0.75+i*76,vy:40+Math.abs(i)*16,sub:true,age:0,trail:[]});
      this.burst(p.x,p.y,16,'#e0c384');return true;
    }
    if(p.x< -50||p.x>WORLD_W+50||p.y>WORLD_H+70||p.age>12) return true;
    const hitTank=this.projectileHit(p);
    if(this.land.solid(p.x,p.y)||hitTank||p.drillY!==null) {
      if(effect==='mine'&&!hitTank) {
        this.mines=this.mines.filter(m=>m.owner!==p.owner||Math.abs(m.x-p.x)>12);
        this.mines.push({x:p.x,y:this.ground(p.x,oldY)-3,owner:p.owner,weapon:p.weapon,boost:p.boost});
        const own=this.mines.filter(m=>m.owner===p.owner);if(own.length>4) this.mines.splice(this.mines.indexOf(own[0]),1);
        this.burst(p.x,p.y,8,spec.color);return true;
      }
      if(effect==='orbital'&&!p.sub) {
        this.crater(p.x,p.y,12,8);this.burst(p.x,p.y,12,'#b8cfea');
        this.projectiles.push({...p,x:p.x,y:-50,vx:0,vy:680,sub:true,trail:[],age:0,delay:0.3});return true;
      }
      if(p.weapon==='drill'&&!hitTank) {
        if(p.drillY===null) p.drillY=p.y;
        p.vx*=0.96;
        if(p.y-p.drillY<58) return false;
      }
      if(p.weapon==='bounce'&&p.bounces<2&&!hitTank) {
        p.x=oldX;p.y=oldY;p.vy=(p.vy<0?1:-1)*Math.max(125,Math.abs(p.vy)*0.57);p.vx*=0.77;p.bounces++;
        this.burst(p.x,p.y,8,'#c3bed2');return false;
      }
      this.explode(p,hitTank?.id);
      if(effect==='pierce'&&p.penetrations<3) {p.penetrations++;p.x+=Math.sign(p.vx)*18;p.vx*=0.9;p.vy=Math.max(30,p.vy*0.7);return false;}
      return true;
    }
    return false;
  }
  crater(x:number,y:number,radius:number,depth=radius) {
    this.land.removeEllipse(x,y,radius,depth);
    for(const t of this.tanks) if(this.support(t.x,t.y+18)-18>t.y+3 && t.fallVelocity===0) { t.fallStart=t.y;t.fallVelocity=1; }
    for(const c of this.crates) c.y=this.ground(c.x,c.y-5)-14;
    this.crates=this.crates.filter(c=>c.y<WATER_Y-14);
  }
  private explode(p:Projectile,directTarget?:number) {
    const direct=directTarget!==undefined;
    const w=weaponById(p.weapon), radius=w.radius;
    const color=p.weapon==='ice'?'#a1d7e0':p.weapon==='emp'?'#c2a3d8':'#efb274';
    this.blasts.push({x:p.x,y:p.y,radius,life:0.65,maxLife:0.65,color});
    this.burst(p.x,p.y,Math.round(radius*0.6),color);
    this.shake=Math.min(10,radius/10);
    const dig=excavation(p.weapon,direct);
    this.crater(p.x,p.y,dig.radius,dig.depth);
    for(const t of this.tanks) {
      const distance=Math.hypot(t.x-p.x,t.y-p.y);
      if(distance>radius+26) continue;
      if(p.weapon==='emp') {t.shield=0;t.fuel=Math.max(0,t.fuel-35);this.float(t.x,t.y-65,'脉冲','#ac88bc');}
      if(p.weapon==='ice') {t.frozen=2;this.float(t.x,t.y-65,'冻结 ×2','#79aebe');}
      const damage=Math.round(w.damage*p.scale*p.boost*(distance<=28?1:clamp(1-(distance-28)/(radius+8),0.1,1)));
      this.damage(t,damage,p.owner,false,directTarget===t.id?'direct':'graze');
      if(w.effect==='poison'&&directTarget===t.id) t.poisoned=true;
      if(w.effect==='freeze') t.immobile=3;
    }
    if(p.weapon==='napalm') this.fires.push({x:p.x,y:p.y,radius:60,turns:3,owner:p.owner});
    if(w.effect==='fire') this.fires.push({x:p.x,y:p.y,radius:65,turns:3,owner:p.owner});
    if(w.effect==='gas') this.gases.push({x:p.x,y:p.y,radius:75,turns:3,owner:p.owner});
    for(const mine of [...this.mines]) if(Math.hypot(mine.x-p.x,mine.y-p.y)<radius) {
      const index=this.mines.indexOf(mine);
      if(index<0) continue; // A nested blast may already have detonated this mine.
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[mine.owner],mine.weapon),x:mine.x,y:mine.y,boost:mine.boost});
    }
    this.emit('explosion',`${w.name}${direct?'直接命中，集中伤害':'命中地形，扩大挖地'}。`,undefined,p.x,p.weapon);
  }
  private triggerMines(t:Tank) {
    for(const m of [...this.mines]) if(Math.hypot(t.x-m.x,t.y-m.y)<30) {
      const index=this.mines.indexOf(m);
      if(index<0) continue;
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[m.owner],m.weapon),x:m.x,y:m.y,boost:m.boost},t.id);
    }
  }
  damage(t:Tank,amount:number,owner:number,ignoreShield=false,reaction:'direct'|'graze'|'fall'='graze') {
    if(t.hp<=0) return;
    const absorbed=ignoreShield?0:Math.min(t.shield,amount);
    t.shield-=absorbed;const actual=Math.min(t.hp,amount-absorbed);t.hp-=actual;
    if(amount>0) t.reaction={kind:actual>0?reaction:'graze',remaining:reaction==='direct'?1.4:reaction==='fall'?1.2:0.7};
    if(owner!==t.id&&actual>0) this.tanks[owner].damage+=actual;
    if(absorbed) this.float(t.x+16,t.y-43,`护盾 −${absorbed}`,'#75a7af');
    if(actual) { this.float(t.x,t.y-25,`−${actual}`,'#db674b');this.emit('hit',this.fog?`${t.name}的方向传来受击声。`:`${t.name}受到 ${actual} 点伤害。`,actual,t.x); }
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
      const ground=this.support(t.x,t.y+18)-18;
      if(t.y<ground-0.5 || t.fallVelocity>0) {
        if(!t.fallVelocity) {t.fallStart=t.y;t.fallVelocity=1;}
        t.fallVelocity+=this.gravity*dt;t.y+=t.fallVelocity*dt;
        if(t.y>=ground) {
          t.y=ground; const fall=t.y-t.fallStart;t.fallVelocity=0;
          if(fall>48) { const damage=Math.round((fall-35)*0.3);this.damage(t,damage,this.firedBy,true,'fall');this.float(t.x,t.y-60,'坠落','#bc876c'); }
        }
      }
      if(t.y+18>=WATER_Y) { this.damage(t,t.hp,this.firedBy,true);this.emit('hit',`${t.name}掉出了战场。`); }
    }
  }
  private collectCrates() {
    this.crates=this.crates.filter(c=>{
      const t=this.active;
      if(c.falling||Math.abs(c.x-t.x)>28||Math.abs(c.y-t.y)>40) return true;
      if(c.type==='medical') { t.hp=Math.min(t.maxHP,t.hp+Math.round(t.maxHP*22/150));t.items.repair=Math.min(2,t.items.repair+1);this.float(t.x,t.y-40,'维修补给','#56866b'); }
      else if(c.type==='double') {t.items.double=Math.min(2,t.items.double+1);this.float(t.x,t.y-40,'双发装填 +1','#ad9261');}
      else if(c.type==='homing') {t.ammo.homing=Math.min(3,t.ammo.homing+1);this.float(t.x,t.y-40,'猎星追踪弹 +1','#b58d55');}
      else {
        const id=t.vehicleId?'homing':WEAPONS[1+Math.floor(this.rng()*(WEAPONS.length-1))].id;
        t.ammo[id]=Math.min(weaponById(id).ammo+2,t.ammo[id]+2);t.items.fuel=Math.min(2,t.items.fuel+1);this.float(t.x,t.y-40,`${weaponById(id).name} +2`,'#a18c56');
      }
      this.emit('crate',`${t.name}拾取了${c.type==='medical'?'医疗':c.type==='double'?'双发':c.type==='homing'?'稀有追踪弹':'弹药'}补给。`,undefined,t.x);return false;
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
    this.active.boost=false;this.active.doubleShot=false;
    const previous=this.active;
    if(previous.vehicleId) {previous.nextActionAt+=previous.lastDelay;previous.lastDelay=vehicleById(previous.vehicleId).waiting;this.current=this.tanks[0].nextActionAt<=this.tanks[1].nextActionAt?0:1;}
    else this.current=1-this.current;
    this.turn++;this.selected=this.active.vehicleId?vehicleById(this.active.vehicleId).normal:'shell';this.teleporting=false;
    this.active.selectedWeapon=this.selected;
    this.active.fuel=this.active.vehicleId?100:Math.min(100,this.active.fuel+18);this.active.itemUsed=false;
    this.active.turnsTaken++;if(this.active.turnsTaken>1) this.active.tactics=Math.min(4,this.active.tactics+1);
    // Status counts decrement after the affected unit has had its full turn.
    if(previous.frozen>0) previous.frozen--;
    if(previous.immobile>0) previous.immobile--;
    this.wind=(this.rng()-0.5)*(this.turn>=40?42:26);
    this.clock=this.config.timer;this.aiTime=0;
    for(const f of this.fires) if(Math.abs(this.active.x-f.x)<f.radius && Math.abs(this.active.y+18-(f.y??this.ground(f.x)))<100) this.damage(this.active,this.active.vehicleId?45:14,f.owner);
    for(const gas of this.gases) if(Math.hypot(this.active.x-gas.x,this.active.y-gas.y)<gas.radius) this.damage(this.active,this.active.vehicleId?40:12,gas.owner);
    if(this.active.poisoned) {const floor=Math.ceil(this.active.maxHP/3);if(this.active.hp<=floor) this.active.poisoned=false;else this.damage(this.active,Math.min(this.active.hp-floor,Math.round(this.active.maxHP*0.045)),1-this.active.id,true);}
    // A fire lives for three complete pairs of turns.
    if(this.current===0) { for(const f of this.fires) f.turns--;this.fires=this.fires.filter(f=>f.turns>0); }
    if(this.current===0) {for(const gas of this.gases) gas.turns--;this.gases=this.gases.filter(gas=>gas.turns>0);}
    if(this.turn>=40) {this.damage(this.active,Math.ceil(this.active.maxHP*.08),1-this.current,true);this.float(this.active.x,this.active.y-55,'决胜时刻','#bd765d');}
    if(this.checkWin()) return;
    if(this.turn%5===0&&this.crates.length<3) {
      const human=this.tanks[0],maxDistance=Math.min(205,(human.fuel+(human.vehicleId?200:36))/(100/human.moveDistance));
      for(let tries=0;tries<50;tries++) {
        const desired=human.x+(this.rng()<0.5?-1:1)*(45+this.rng()*Math.max(0,maxDistance-45));
        if(!this.stablePlatform(desired)||this.traversable(human,desired)===null) continue;
        const distance=this.ground(desired)+50;
        const capTime=(250-80)/220,capDistance=80*capTime+110*capTime*capTime;
        const time=distance>capDistance?capTime+(distance-capDistance)/250:(-80+Math.sqrt(6400+440*distance))/220;
        const drift=this.wind*2.5*(time/0.35-(1-Math.exp(-0.35*time))/0.35**2);
        const start=desired-drift,landing=this.predictSupply(start);
        if(start<32||start>WORLD_W-32||!landing||landing.x<40||landing.x>WORLD_W-40||!this.stablePlatform(landing.x)||this.traversable(human,landing.x)===null||Math.abs(landing.x-human.x)>maxDistance||this.crates.some(c=>Math.abs(c.x-landing.x)<45)) continue;
        const roll=this.rng(),type=roll<0.35?'medical':roll<0.6?'double':roll<0.8?'ammo':'homing';
        this.crates.push({x:start,y:-50,type,falling:true,vy:80,vx:0});
        this.emit('crate','补给空降中，回合计时暂停。');break;
      }
    }
    this.afterSupply=this.config.mode==='hotseat'?'handoff':'aiming';
    this.phase=this.crates.some(c=>c.falling)?'supply':this.afterSupply;this.supplySettling=0.35;
    this.emit('turn',`${this.active.name}，轮到你了。`);
  }
  predictSupply(startX:number) {
    let x=startX,y=-50,vx=0,vy=80;const dt=1/120;
    for(let i=0;i<1000;i++) {
      const target=this.ground(x,y-8)-14;
      vx=(vx+this.wind*2.5*dt)*Math.exp(-0.35*dt);x+=vx*dt;vy=Math.min(250,vy+220*dt);y+=vy*dt;
      if(x<32||x>WORLD_W-32||y>=WATER_Y-14) return null;
      if(y>=target) return {x,y:target};
    }
    return null;
  }
  acceptHandoff() { if(this.phase==='handoff') this.phase='aiming'; }
  skipTurn() { if(this.phase==='aiming'&&!this.paused) this.nextTurn(); }
  predict(angle=this.active.angle,power=this.active.power,weapon=this.selected,maxTime=10,tank=this.active) {
    const p=this.launch(tank,weapon,angle,power),points:{x:number;y:number}[]=[];
    const dt=1/90;let direct=false;
    for(let i=0;i<maxTime/dt;i++) {
      p.vx+=this.wind*(weapon==='sniper'?0.25:1)*dt;
      p.vy+=this.gravity*(weapon==='sniper'?0.27:weaponById(weapon).gravity??1)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(i%6===0) points.push({x:p.x,y:p.y});
      direct=!this.fog&&i*dt>=0.09&&this.tanks.some(t=>t.hp>0&&Math.hypot(p.x-t.x,p.y-(t.y-3))<22);
      if(p.x<0||p.x>WORLD_W||p.y>WORLD_H||this.land.solid(p.x,p.y)||direct) break;
    }
    return {x:p.x,y:p.y,points,direct};
  }
  planAI() {
    const t=this.active,e=this.enemy,difficulty=this.config.difficulty;
    const enemyX=this.fog?this.heardX[e.id]:e.x,enemyY=this.fog?this.ground(enemyX)-18:e.y;
    const level=DIFFICULTIES.findIndex(d=>d.id===difficulty);
    if(level>=2) {
      const candidates:ItemId[]=[...(t.hp<=t.maxHP*.7?['repair' as ItemId]:[]),'shield',...(this.rng()>0.6?['boost' as ItemId]:[])];
      const item=candidates.find(id=>!this.itemUnavailable(id,true));if(item) this.useItem(item,true);
      const danger=this.fires.some(f=>Math.abs(f.x-t.x)<f.radius);
      if(danger||this.ground(t.x)>525) {for(let i=0;i<35;i++) this.move(t.x>640?-1:1,1/60,true);}
    }
    t.direction=enemyX>t.x?1:-1;
    let weapon:WeaponId='shell';
    if(t.vehicleId) {
      const v=vehicleById(t.vehicleId),special=weaponById(v.special),distance=Math.abs(enemyX-t.x);
      let chance=level===1?.25:.55;
      if(special.effect==='poison') chance=!this.fog&&e.poisoned?0:.23;
      if(special.effect==='fire') chance=this.fires.some(f=>Math.abs(f.x-enemyX)<f.radius)?.05:.27;
      if(special.effect==='gas') chance=this.gases.some(g=>Math.abs(g.x-enemyX)<g.radius)?.08:.32;
      if(special.effect==='mine') chance=distance<320?.38:.14;
      if(special.effect==='freeze') chance=!this.fog&&e.immobile>0?.08:.25;
      if((special.shots??1)>=9) chance=distance<350?.6:.16;
      weapon=level===0||this.rng()>chance?v.normal:v.special;
    }
    else if(level>0) {
      const pool:WeaponId[]=level>=2?['shell','heavy','triple','napalm','drill','ice',...(t.turnsTaken>=3?['airstrike' as WeaponId,'quake' as WeaponId]:[])]:['shell','shell','shell','triple'];
      const available=pool.filter(w=>t.ammo[w]>0);
      if(available.length) weapon=available[Math.floor(this.rng()*available.length)];
      if(level>=2&&!this.fog&&e.shield>0&&t.ammo.emp>0) weapon='emp';
      if(t.ammo.homing>0&&this.rng()<0.3) weapon='homing';
    }
    this.selected=weapon;
    const intent=aiAimOffset(difficulty,weapon,this.rng);
    const target=enemyX+intent.offset+(this.fog?(this.rng()-0.5)*120:0);
    if(weapon==='airstrike') {this.targetX=clamp(target,20,WORLD_W-20);return;}
    let best=Infinity,bestAngle=48,bestPower=68;
    for(let a=t.minAngle;a<=Math.min(85,t.maxAngle);a+=2) for(let power=22;power<=100;power+=2) {
      const impact=this.predict(a,power,weapon,10,t);
      const distance=Math.hypot(impact.x-target,(impact.y-enemyY)*0.7);
      let score=distance+(a<25?5:0)+Math.max(0,100-Math.abs(impact.x-t.x))*2;
      if(level>=2&&!this.fog&&!intent.miss&&!impact.direct) {
        const dig=excavation(weapon,false),dx=Math.abs(impact.x-e.x);
        const foot=e.y+18,bottom=this.land.bottom(e.x,foot-5);
        const reach=dx<dig.radius?dig.depth*Math.sqrt(1-(dx/dig.radius)**2):0;
        if(dx<dig.radius-18 && impact.y-reach<=foot && impact.y+reach>=bottom && bottom<WATER_Y) score-=95;
      }
      if(score<best) {best=score;bestAngle=a;bestPower=power;}
    }
    t.angle=clamp(bestAngle+(this.rng()-0.5)*[6,3,2,1.5][level],t.minAngle,t.maxAngle);
    t.power=clamp(bestPower+(this.rng()-0.5)*[7,4,3,2.5][level],10,100);
  }
  update(dt:number) {
    if(this.paused) return;
    dt=Math.min(dt,0.05);this.elapsed+=dt;
    this.shake=Math.max(0,this.shake-dt*16);
    for(const gas of this.gases) gas.x=clamp(gas.x+this.wind*2.8*dt,0,WORLD_W);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.vy+=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
    this.blasts=this.blasts.filter(b=>{b.life-=dt;return b.life>0;});
    this.texts=this.texts.filter(t=>{t.life-=dt;t.y-=dt*20;return t.life>0;});
    for(const tank of this.tanks) if(tank.reaction) {tank.reaction.remaining-=dt;if(tank.reaction.remaining<=0) tank.reaction=null;}
    if(this.phase==='lobby'||this.phase==='ended'||this.phase==='handoff') return;
    this.updateTanks(dt);
    if(this.phase==='supply') {
      for(const c of this.crates) if(c.falling) {
        const steps=Math.ceil(dt/(1/120)),step=dt/steps;
        for(let i=0;i<steps&&c.falling;i++) {
          const target=this.ground(c.x,c.y-8)-14;
          c.vx=((c.vx??0)+this.wind*2.5*step)*Math.exp(-0.35*step);
          c.x+=(c.vx??0)*step;c.vy=Math.min(250,(c.vy??80)+220*step);c.y+=(c.vy??80)*step;
          if(c.y>=target) {c.y=target;c.falling=false;this.burst(c.x,c.y+13,15,'#d9c29a');this.emit('crate-land','补给箱已落地。',undefined,c.x);}
        }
      }
      if(!this.crates.some(c=>c.falling)) {this.supplySettling-=dt;if(this.supplySettling<=0) {this.phase=this.afterSupply;this.emit('turn',`${this.active.name}，轮到你了。`);}}
      return;
    }
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
      const flightTime=dt*FLIGHT_SPEED,count=Math.ceil(flightTime/(1/180)),step=flightTime/count;
      for(let i=0;i<count;i++) {
        const active=[...this.projectiles];
        for(const p of active) if(this.stepProjectile(p,step)) this.projectiles=this.projectiles.filter(q=>q!==p);
      }
      if(this.projectiles.length===0) {this.phase='resolving';this.resolveTime=0.55;}
    } else if(this.phase==='resolving') {
      this.resolveTime-=dt;
      if(this.resolveTime<=0&&this.tanks.every(t=>t.hp<=0||t.fallVelocity===0)) this.nextTurn();
    }
  }
}
