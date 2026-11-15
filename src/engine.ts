import { DIFFICULTIES, ITEMS, TURN_ITEMS, WEAPONS, ALL_WEAPONS,weaponById, weaponHasTrail, itemById, excavation, aiAimOffset, type Difficulty, type ItemId, type MapId, type WeaponId } from './catalog';
import {isRaging,redHealthLimit} from './health';
import {pointHitsTank} from './tank-hitbox';
import {resolveVehicle,vehicleById,type VehicleId,type VehicleChoice} from './vehicles';
import { Terrain, WORLD_W, WORLD_H, WATER_Y, TERRAIN_H } from './terrain';
import {rollWeather} from './weather';
import {buildClassicMap} from './classic-maps';

import {defaultSlots,slotProblem,teamFlag,CREW,type Slot,type CrewId} from './crew';
import {aimGeometry} from './aim';
import {chooseAIPosition,solveAIShot,type AIShot} from './ai-planner';
export {WORLD_W,WORLD_H,WATER_Y};
export const FLIGHT_SPEED=1.8;
export const MAX_CLIMB_ANGLE=60,MAX_STEP_HEIGHT=12;
export const SHOT_WIND_GAIN=3;
export const BRIDGE_THICKNESS=130;
export type Phase = 'lobby' | 'aiming' | 'flying' | 'resolving' | 'supply' | 'handoff' | 'ended';
export interface Config {slots:Slot[];map:MapId;timer:number;seed:number;fog?:boolean;fireLine?:boolean;snow?:boolean;selfDamage?:boolean;friendlyFire?:boolean;allowDragon?:boolean }
export interface Tank {
  id:number; name:string;crew:CrewId;slot:number;team:number;controller:'human'|'ai';difficulty:Difficulty; x:number; y:number; hp:number; shield:number; fuel:number;
  angle:number; power:number; direction:number; ammo:Record<WeaponId,number>;
  items:Record<ItemId,number>; frozen:number; boost:boolean; itemUsed:boolean;
  fallVelocity:number; fallStart:number; shots:number; damage:number;
  tactics:number; turnsTaken:number; itemReadyTurn:Record<ItemId,number>;
  doubleShot:boolean;reaction:{kind:'direct'|'graze'|'fall';remaining:number}|null;
  vehicleId:VehicleId|null;maxHP:number;minAngle:number;maxAngle:number;moveSpeed:number;moveDistance:number;nextActionAt:number;lastDelay:number;poisoned:boolean;immobile:number;
  selectedWeapon:WeaponId;lastPower:number|null;poisonOwner?:number;actionTime:number;movedThisTurn:number;itemDelay:number;delayCommitted:boolean;outOfBounds:boolean;
}
export interface Projectile { x:number; y:number; vx:number; vy:number; weapon:WeaponId; owner:number; age:number; bounces:number; drillY:number|null; sub:boolean; boost:number; trail:{x:number;y:number}[];delay:number;echo:boolean;fireBoosted:boolean;homing:boolean;penetrations:number;scale:number;phase:number;lockAge:number;lockX:number;lockY:number;lockTarget:number|null;volley:number;weaveX:number;weaveY:number;hitCooldown:number;mineArmed:boolean;digBoost:number;rage:boolean;transfer?:boolean;aimOffsetX?:number;aimOffsetY?:number }
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; color:string }
export interface Blast { x:number;y:number;radius:number;life:number;maxLife:number;color:string }
export interface FloatingText { x:number;y:number;text:string;color:string;life:number;tankId?:number }
export interface FireZone { x:number;y?:number;radius:number;turns:number;owner:number;weapon?:WeaponId;clock?:number }
export interface Crate { x:number;y:number;type:'ammo'|'medical'|'double'|'homing'|'transfer'|'boost';falling?:boolean;vy?:number;vx?:number }
export interface GameEvent { type:'shot'|'explosion'|'turn'|'item'|'hit'|'win'|'crate'|'crate-land'|'timeout'|'lock'|'weather'|'poison'; message:string; value?:number;x?:number;weapon?:WeaponId;transfer?:boolean }
export interface Mine {x:number;y:number;owner:number;weapon:WeaponId;boost:number}
export interface Gas {x:number;y:number;owner:number;radius:number;turns:number;clock?:number}
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
  fog=false;fogTurnsRemaining=0;fireLineTurnsRemaining=0;fireLine:{x:number;top:number;bottom:number}|null=null;
  movingUntil=[0,0];
  resultAge=0;
  mines:Mine[]=[];gases:Gas[]=[];
  private volleySequence=0;
  private volleyTargets=new Map<number,{x:number;y:number;target:number|null}>();
  private heardX=[175,1105];private afterSupply:'aiming'|'handoff'='aiming';private supplySettling=0;
  private rng:()=>number;
  private firedBy=0;
  private aiMoveGoal:number|null=null;
  private aiPending:{weapons:WeaponId[];offset:number;level:number;miss:boolean;target:number}|null=null;
  aiDecision:{target:number;fromX:number;goalX:number;weapon:WeaponId;intentionalMiss:boolean}|null=null;

  constructor(config:Partial<Config>={}) {
    this.config={slots:defaultSlots(),map:'valley',timer:45,seed:Date.now(),...config};
    if(this.config.slots.length!==4||slotProblem(this.config.slots))throw new Error(slotProblem(this.config.slots)??'需要四个固定槽位');
    this.rng=makeRng(this.config.seed);
    const weather=rollWeather(this.rng);this.fog=this.config.fog??weather.fog;
    this.fogTurnsRemaining=this.fog?2:0;
    if(this.config.fireLine??weather.fireLine) this.fireLine={x:450+this.rng()*380,top:50,bottom:550};
    this.fireLineTurnsRemaining=this.fireLine?2:0;
    this.generateTerrain();
    const participants=this.config.slots.map((slot,index)=>({...slot,index})).filter(s=>s.enabled);
    this.tanks=participants.map((seat,i)=>this.createTank(i,175+i*260,seat,seat.index));
    this.movingUntil=participants.map(()=>0);
    this.placeStartingTanks();this.heardX=this.tanks.map(t=>Math.round(t.x/90)*90);
    if(this.active.vehicleId) this.selected=vehicleById(this.active.vehicleId).normal;
    this.targetX=this.tanks[1].x;
  }
  get active() { return this.tanks[this.current]; }
  get enemy() { return this.opponents(this.active).sort((a,b)=>Math.abs(a.x-this.active.x)-Math.abs(b.x-this.active.x))[0]??this.tanks.find(t=>t.team!==this.active.team)!; }
  opponents(t:Tank){return this.tanks.filter(e=>e.team!==t.team&&e.hp>0);}
  canDamage(t:Tank,owner:number){const source=this.tanks[owner];return !source|| (t.id===owner?!!this.config.selfDamage:t.team===source.team?!!this.config.friendlyFire:true);}
  visible(t:Tank){return !this.fog||t.team===this.tanks[this.viewer].team;}
  get gravity() { return this.config.map==='moon'?145:230; }
  get snow(){return this.config.snow===true;}
  get humanTurn() { return this.phase==='aiming' && !this.paused && this.active.hp>0 && this.active.controller==='human'; }
  get round() { return Math.floor(this.turn/this.tanks.length)+1; }
  get viewer() {return this.active.controller==='human'||this.tanks.every(t=>t.controller==='ai')?this.current:this.tanks.find(t=>t.controller==='human'&&t.hp>0&&t.team===this.active.team)?.id??this.tanks.find(t=>t.controller==='human'&&t.hp>0)?.id??this.current;}
  get delayEnabled(){return this.tanks.every(t=>t.controller==='human');}
  ground(x:number,fromY=0) { return this.land.below(x,fromY); }
  support(x:number,footY:number) {
    return this.walkSupport(x,footY);
  }
  stablePlatform(x:number) {
    const levels=[-20,-10,0,10,20].map(dx=>this.ground(x+dx));
    return Math.max(...levels)<WATER_Y-12 && Math.max(...levels)-Math.min(...levels)<=28;
  }
  tankSlope(t:Tank) {
    if(t.fallVelocity>0) return 0;
    const levels=this.walkLevels(t.x,t.y+18);
    const limit=MAX_CLIMB_ANGLE*Math.PI/180;
    return clamp(Math.atan2(levels[4]-levels[0],32),-limit,limit);
  }
  private walkSurface(x:number,foot:number) {
    // Find the actual top of this connected platform, even when the probe starts inside a small step.
    // Starting near the feet keeps a lower sky platform distinct from the island above it.
    const at=Math.round(x); // Ground/support use this same column; floor-vs-round created false one-pixel falls.
    let y=this.ground(at,foot-MAX_STEP_HEIGHT-2);
    while(y>0&&this.land.solid(at,y-1))y--;
    return y;
  }
  private walkLevels(x:number,foot:number) {
    const center=this.walkSurface(x,foot),leftNear=this.walkSurface(x-8,center),rightNear=this.walkSurface(x+8,center);
    return [this.walkSurface(x-16,leftNear),leftNear,center,rightNear,this.walkSurface(x+16,rightNear)];
  }
  private walkSupport(x:number,foot:number) {
    return this.walkLevels(x,foot).sort((a,b)=>a-b)[2];
  }
  private reasonableSlope(x:number,foot:number,direction:number) {
    const heights:number[]=[];let probe=foot;
    for(let i=0;i<13;i++){probe=this.walkSurface(x+direction*i*2,probe);heights.push(probe);}
    if(heights.some(y=>y>=WATER_Y-10))return false;
    if(heights.slice(1).some((y,i)=>Math.abs(y-heights[i])>MAX_STEP_HEIGHT))return false;
    if(Math.max(...heights)-Math.min(...heights)<=MAX_STEP_HEIGHT)return true;
    const limit=Math.tan(MAX_CLIMB_ANGLE*Math.PI/180);
    // Check both a half-tread and full-tread run. One isolated ledge may be stepped over;
    // Sequential probes preserve thin sloped platforms; sustained ramps remain capped.
    for(const end of [6,12]){
      let steps=0;
      for(let i=1;i<=end;i++){
        const jump=Math.abs(heights[i]-heights[i-1]);
        if(jump>MAX_STEP_HEIGHT)return false;
        if(jump>3)steps+=heights[i]-heights[i-1];
      }
      const rise=heights[end]-heights[0],allowed=end*2*limit+1;
      if(Math.abs(rise)<=allowed)continue;
      if(Math.abs(steps)>MAX_STEP_HEIGHT||Math.abs(rise-steps)>allowed)return false;
    }
    return true;
  }
  traversable(t:Tank,x:number,allowDrop=false) {
    if(x<32||x>WORLD_W-32) return null;
    let previous=t.y+18;const direction=x>=t.x?1:-1,steps=Math.max(1,Math.ceil(Math.abs(x-t.x)/2));
    for(let i=1;i<=steps;i++) {
      const at=t.x+(x-t.x)*i/steps,level=this.walkSupport(at,previous);
      const center=this.walkSurface(at,previous);
      // A downward unsupported edge is a fall, never an invisible wall. Safe callers
      // (AI, spawning, supplies) keep allowDrop=false and reject that route.
      if(level-previous>MAX_STEP_HEIGHT||level>=WATER_Y-10){if(allowDrop)return Infinity;return null;}
      if(previous-level>MAX_STEP_HEIGHT||level-center>MAX_STEP_HEIGHT)return null;
      if(center-level>MAX_STEP_HEIGHT&&!allowDrop)return null;
      if(!this.reasonableSlope(at,level,direction)){
        const ahead=this.walkSurface(at+direction*24,level);
        if(!(allowDrop&&ahead>level&&center>=previous-1))return null;
      }
      previous=level;
    }
    return previous;
  }
  private createTank(id:number,x:number,seat:Slot,slot:number):Tank {
    const choice=seat.vehicle;
    const vehicleId=choice?resolveVehicle(choice,this.rng):null,v=vehicleId?vehicleById(vehicleId):null;
    const ammo=Object.fromEntries(ALL_WEAPONS.map(w=>[w.id,v?0:w.ammo])) as Record<WeaponId,number>;
    if(v) {ammo[v.normal]=Infinity;ammo[v.special]=Infinity;}
    return {id,slot,crew:seat.crew,team:seat.team,controller:seat.controller,difficulty:seat.difficulty,name:CREW[seat.crew].name,x,y:this.ground(x)-18,hp:v?.hp??150,shield:0,fuel:100,angle:clamp(48,v?.minAngle??5,v?.maxAngle??175),power:68,direction:id===0?1:-1,
      ammo,
      items:Object.fromEntries(ITEMS.map(i=>[i.id,TURN_ITEMS.includes(i.id)?1:0])) as Record<ItemId,number>,
      frozen:0,boost:false,itemUsed:false,fallVelocity:0,fallStart:0,shots:0,damage:0,tactics:2,turnsTaken:0,
      itemReadyTurn:Object.fromEntries(ITEMS.map(i=>[i.id,0])) as Record<ItemId,number>,doubleShot:false,reaction:null,vehicleId,maxHP:v?.hp??150,minAngle:v?.minAngle??5,maxAngle:v?.maxAngle??175,moveSpeed:v?v.movement*1.35:70,moveDistance:v?v.movement*3:100/0.33,nextActionAt:0,lastDelay:v?.waiting??560,poisoned:false,immobile:0,selectedWeapon:v?.normal??'shell',lastPower:null,actionTime:0,movedThisTurn:0,itemDelay:0,delayCommitted:false,outOfBounds:false};
  }
  private placeStartingTanks(){
    const both:number[]=[],one:number[]=[];
    for(let x=60;x<=WORLD_W-60;x+=8){
      if(!this.stablePlatform(x)||this.ground(x)>WATER_Y-40)continue;
      const probe={...this.tanks[0],x,y:this.ground(x)-18};
      const left=this.traversable(probe,x-60)!==null,right=this.traversable(probe,x+60)!==null;
      if(left||right)one.push(x);if(left&&right)both.push(x);
    }
    const pool=both.length>=4?both:one,close=this.rng()<.22;
    let pair:number[]|null=null;
    for(let attempt=0;attempt<80&&!pair;attempt++){
      const first=pool[Math.floor(this.rng()*pool.length)];
      const options=pool.filter(x=>Math.abs(x-first)>=120&&(close?Math.abs(x-first)<=280:Math.abs(x-first)>=320));
      if(options.length)pair=[first,options[Math.floor(this.rng()*options.length)]].sort((a,b)=>a-b);
    }
    if(!pair&&pool.length>=2){const first=pool[0],last=pool[pool.length-1];if(last-first>=120)pair=[first,last];}
    if(pair){
      const chosen=[...pair];
      for(let i=2;i<this.tanks.length;i++){const options=pool.filter(x=>chosen.every(at=>Math.abs(x-at)>=90));chosen.push(options[Math.floor(this.rng()*options.length)]??(i===2?430:850));}
      this.tanks.forEach((t,i)=>{t.x=chosen[i];t.y=this.ground(t.x)-18;});this.tanks.forEach(t=>t.direction=this.opponents(t)[0]?.x>t.x?1:-1);
    }
  }
  private generateTerrain() {
    const phase=this.rng()*2;
    if(buildClassicMap(this.land,this.config.map))return;
    for(let x=0;x<=WORLD_W;x++) {
      if(this.config.map==='coast') {
        if(x<90||x>1190) this.land.column(x,394,TERRAIN_H);
        else {
          const top=398+Math.sin(x/115)*4;
              this.land.column(x,top,top+BRIDGE_THICKNESS);
        }
      } else if(this.config.map==='moon') {
        if(x>=70&&x<=410) {const top=355+Math.sin(x/92+phase)*12;this.land.column(x,top,top+140);}
        if(x>=870&&x<=1210) {const top=333+Math.sin(x/96+phase)*12;this.land.column(x,top,top+140);}
        if(x>=520&&x<=750) this.land.column(x,439+Math.sin(x/45)*6,550);
        if(x>=550&&x<=730) this.land.column(x,215+Math.sin(x/50)*5,355);
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
    this.emit('turn',`${this.active.name}，轮到你了。`);
  }
  private emit(type:GameEvent['type'],message:string,value?:number,x?:number,weapon?:WeaponId,transfer=false) {
    this.events.push({type,message,value,x,weapon,transfer});
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
    if(this.paused||this.phase!=='aiming'||this.active.hp<=0||(!ai&&!this.humanTurn)||this.active.fallVelocity>0||this.active.immobile>0||!Number.isFinite(dt)||dt<=0||!Number.isFinite(direction)||!direction) return false;
    const t=this.active;
    t.direction=Math.sign(direction);
    const distance=Math.sign(direction)*t.moveSpeed*Math.min(dt,0.25);
    const x=clamp(t.x+distance,32,WORLD_W-32);
    const cost=Math.abs(x-t.x)*(100/t.moveDistance)*(t.frozen>0?2:1);
    if(t.fuel<cost||this.tanks.some(e=>e.id!==t.id&&e.hp>0&&Math.abs(e.y-t.y)<42&&Math.abs(x-e.x)<56)||x===t.x) return false;
    // Check every part of the path, plus tread-scale slope, independent of frame rate.
    const previous=this.traversable(t,x,!ai);if(previous===null) return false;
    t.fuel-=cost;t.movedThisTurn+=Math.abs(x-t.x);t.x=x;
    this.movingUntil[t.id]=this.elapsed+0.15;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    // Every substep already has valid ground. Follow it instead of briefly entering
    // free fall when a fast frame travels down a legitimate slope or small stair.
    if(previous===Infinity){t.fallStart=t.y;t.fallVelocity=1;}else t.y=previous-18;
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
    const wait=TURN_ITEMS.includes(id)?0:t.itemReadyTurn[id]-t.turnsTaken;
    if(wait>0) return `冷却还剩 ${wait} 回合`;
    if(t.tactics<i.cost) return `需要 ${i.cost} 战术点`;
    if(id==='repair'&&t.hp>=t.maxHP) return '生命已满，无需补给';
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
    t.itemDelay+=200;
    t.itemReadyTurn[id]=t.turnsTaken+i.cooldown+1;this.teleporting=false;
    this.emit('item',`${t.name}使用了${i.name}${i.cost?`，消耗 ${i.cost} 战术点`:''}。`,undefined,t.x);
  }
  useItem(id:ItemId,ai=false) {
    if(this.itemUnavailable(id,ai)) return false;
    const t=this.active;
    if(id==='teleport') {this.teleporting=!this.teleporting;return true;}
    if(id==='repair') {const gain=Math.round(t.maxHP*35/150);t.hp=Math.min(t.maxHP,t.hp+gain);this.float(t.x,t.y-42,`+${gain}`,'#548166');}
    if(id==='shield') t.shield=Math.round(t.maxHP*40/150);
    if(id==='fuel') t.fuel=Math.min(100,t.fuel+55);
    if(id==='boost') t.boost=true;
    if(id==='double') t.doubleShot=true;
    if(id==='wind') this.wind=0;
    this.consumeItem(id);return true;
  }
  private transferTo(t:Tank,x:number,impactY:number) {
    if(!Number.isFinite(x)||x<32||x>WORLD_W-32||this.tanks.some(other=>other.id!==t.id&&other.hp>0&&Math.abs(x-other.x)<56)) return false;
    const levels=[-16,-8,0,8,16].map(dx=>this.walkSurface(x+dx,impactY));
    const foot=levels.sort((a,b)=>a-b)[2];
    if(foot>=WATER_Y-12||Math.max(...levels)-Math.min(...levels)>24)return false;
    this.burst(t.x,t.y,18,'#a4bfd0');
    t.x=x;t.y=foot-18;t.fallVelocity=0;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    this.burst(t.x,t.y,18,'#a4bfd0');
    this.emit('item',`${t.name}随转移弹抵达落点。`);this.collectCrates();return true;
  }
  aim(t:Tank,angle=t.angle){return aimGeometry(angle,this.tankSlope(t),t.direction);}
  muzzle(t:Tank,angle=t.angle) {
    const vector=this.aim(t,angle),slope=this.tankSlope(t);
    return {x:t.x+Math.sin(slope)*13+vector.x*31,y:t.y-Math.cos(slope)*13+vector.y*31};
  }
  launch(t:Tank,weapon:WeaponId,angle=t.angle,power=t.power):Projectile {
    const vector=this.aim(t,angle),muzzle=this.muzzle(t,angle);
    const spec=weaponById(weapon),speed=(120+power*6.1)*(weapon==='sniper'?2:spec.speed??1);
    const rage=isRaging(t)?1.5:1;
    const weather=t.vehicleId==='water'&&this.snow?1.25:1;
    return {x:muzzle.x,y:muzzle.y,vx:vector.x*speed,vy:vector.y*speed,weapon,owner:t.id,age:0,bounces:0,drillY:null,sub:false,boost:(t.boost?1.5:1)*rage*weather,trail:[],delay:0,echo:false,fireBoosted:t.boost,homing:false,penetrations:0,scale:t.vehicleId&&!spec.effect?6:1,phase:0,lockAge:0,lockX:0,lockY:0,lockTarget:null,volley:0,weaveX:0,weaveY:0,hitCooldown:0,mineArmed:false,digBoost:rage>1?1.15:1,rage:rage>1};
  }
  delayFor(t:Tank,weapon?:WeaponId) {
    const base=t.vehicleId?vehicleById(t.vehicleId).waiting:560;
    const ordinary=t.vehicleId?vehicleById(t.vehicleId).normal:'shell';
    const attack=weapon?(weapon===ordinary?100:200):0;
    // Historical time/attack/item costs are known. Movement uses a disclosed Web-scale conversion.
    return base+attack+t.itemDelay+Math.round(t.movedThisTurn*2+t.actionTime*10);
  }
  fire(ai=false) {
    if(this.paused||this.phase!=='aiming'||this.active.hp<=0||(!ai&&!this.humanTurn)||(this.active.ammo[this.selected]??0)<=0||this.active.fallVelocity>0) return false;
    const t=this.active,id=this.selected,transfer=this.teleporting;
    if(transfer&&this.itemUnavailable('teleport',ai))return false;
    if(transfer)this.consumeItem('teleport');
    this.phase='flying';this.teleporting=false;this.firedBy=t.id;
    if(!transfer&&Number.isFinite(t.ammo[id])) t.ammo[id]--;
    t.shots++;
    t.lastPower=t.power;t.selectedWeapon=id;
    const spec=weaponById(id);
    t.lastDelay=this.delayFor(t,transfer?undefined:id);t.delayCommitted=true;
    if(transfer)this.projectiles=[{...this.launch(t,'shell'),transfer:true,scale:1,boost:1,fireBoosted:false,rage:false,digBoost:1}];
    else if(spec.shots&&spec.shots>1) this.projectiles=Array.from({length:spec.shots},(_,i)=>({...this.launch(t,id,t.angle+(i-(spec.shots!-1)/2)*(spec.spread??3)),phase:i*Math.PI*2/spec.shots!}));
    else if(id==='triple') this.projectiles=[-5,0,5].map(d=>this.launch(t,id,t.angle+d));
    else if(id==='airstrike') this.projectiles=[-38,0,38].map(d=>({...this.launch(t,id),x:clamp(this.targetX+d,20,WORLD_W-20),y:-40-Math.abs(d),vx:0,vy:190}));
    else this.projectiles=[this.launch(t,id)];
    if(!transfer&&(t.vehicleId==='multi'||t.vehicleId==='dragon')){
      const count=this.projectiles.length;
      this.projectiles.forEach((p,i)=>{
        const rank=(i-(count-1)/2)/Math.max(1,(count-1)/2),speed=1+rank*.025;
        p.vx*=speed;p.vy*=speed;
        if(spec.effect==='homing'){p.aimOffsetX=rank*20;p.aimOffsetY=Math.sin(i*2.4)*12;}
      });
    }
    if(!transfer&&spec.homingMode==='volley') {
      const volley=++this.volleySequence,impact=this.predict(t.angle,t.power,id,12,t);
      this.volleyTargets.set(volley,{x:impact.x,y:impact.y,target:null});
      this.projectiles.forEach(p=>p.volley=volley);
    }
    if(t.doubleShot) this.projectiles.push(...this.projectiles.map((p,i)=>({...p,trail:[],delay:0.35,echo:i===0})));
    t.boost=false;t.doubleShot=false;this.heardX[t.id]=Math.round(t.x/90)*90;
    this.emit('shot',`${t.name}发射了${transfer?'转移弹':weaponById(id).name}。`,undefined,t.x,transfer?'shell':id,transfer);
    this.burst(this.muzzle(t).x,this.muzzle(t).y,12,'#f5ce89');
    return true;
  }
  private projectileHit(p:Projectile) {
    if(p.age<0.09) return undefined;
    return this.tanks.find(t=>t.hp>0&&this.canDamage(t,p.owner)&&Math.abs(t.x-p.x)<50&&Math.abs(t.y-p.y)<62&&pointHitsTank(t,p.x,p.y,this.tankSlope(t)));
  }
  private invalidVolleyTarget(p:Projectile) {
    if(p.volley===0||weaponById(p.weapon).homingMode!=='volley')return false;
    const id=this.volleyTargets.get(p.volley)?.target??p.lockTarget;
    if(id===null)return false;
    const target=this.tanks[id];
    return !target||target.hp<=0||!this.canDamage(target,p.owner);
  }
  private cancelVolley(volley:number) {
    // Disposal has no damage or new explosions. The impact that killed the target
    // finishes normally; delayed double-shot copies belong to this same group.
    this.projectiles=this.projectiles.filter(p=>{
      if(p.volley!==volley)return true;
      p.trail=[];p.lockTarget=null;p.homing=false;p.lockAge=0;p.lockX=0;p.lockY=0;
      return false;
    });
    this.volleyTargets.delete(volley);
  }
  private stepProjectile(p:Projectile,dt:number):boolean {
    if(this.invalidVolleyTarget(p)){this.cancelVolley(p.volley);return true;}
    if(p.delay>0) {p.delay-=dt;if(p.delay<=0&&p.echo) this.emit('shot','双发装填追加了一轮齐射。',undefined,this.tanks[p.owner].x,p.weapon);return false;}
    p.age+=dt;
    p.hitCooldown=Math.max(0,p.hitCooldown-dt);
    const spec=weaponById(p.weapon),effect=spec.effect;
    const orbital=effect==='orbital'&&p.sub;
    const g=orbital?0:this.gravity*(p.weapon==='sniper'?0.27:spec.gravity??1);
    p.vx+=orbital?0:this.wind*SHOT_WIND_GAIN*(p.weapon==='sniper'?0.25:1)*dt;
    if(effect==='helix') {p.x-=p.weaveX;p.y-=p.weaveY;}
    const oldX=p.x,oldY=p.y;
    if((p.weapon==='homing'||effect==='homing')&&(p.vy>0||p.homing)) {
      const radius=spec.homingRadius??140,volleyTarget=this.volleyTargets.get(p.volley);
      if(p.lockTarget===null&&p.age>.18&&p.y>this.ground(p.x)-130) {
        // Classic guided missiles have no IFF. The bonus supply weapon keeps enemy-only targeting.
        const candidates=this.tanks.filter(t=>t.hp>0&&this.canDamage(t,p.owner));
        const x=volleyTarget?.x??p.x,y=volleyTarget?.y??p.y;
        const nearest=[...candidates].sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
        if(volleyTarget?.target!==null&&volleyTarget?.target!==undefined) p.lockTarget=volleyTarget.target;
        else if(nearest&&Math.hypot(nearest.x-x,nearest.y-y)<radius) {
          p.lockTarget=nearest.id;if(volleyTarget)volleyTarget.target=nearest.id;
        }
      }
      const target=p.lockTarget===null?null:this.tanks[p.lockTarget];
      if(target) {
        const aimX=target.x+(p.aimOffsetX??0),aimY=target.y+(p.aimOffsetY??0);
        const dx=aimX-p.x,dy=aimY-p.y,speed=Math.max(250,Math.hypot(p.vx,p.vy)),angle=Math.atan2(dy,dx),blend=Math.min(1,dt*5);
        p.vx+=(Math.cos(angle)*speed-p.vx)*blend;p.vy+=(Math.sin(angle)*speed-p.vy)*blend;
        if(!p.homing) this.emit('lock',`${spec.name}锁定目标，开始追踪。`,undefined,p.x,p.weapon);
        p.homing=true;p.lockX=aimX;p.lockY=aimY;p.lockAge+=dt;
      }
    }
    p.vy+=g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(effect==='helix') {
      const speed=Math.max(1,Math.hypot(p.vx,p.vy)),offset=Math.sin(p.age*17+p.phase)*18*Math.min(1,p.age*5);
      p.weaveX=-p.vy/speed*offset;p.weaveY=p.vx/speed*offset;p.x+=p.weaveX;p.y+=p.weaveY;
    }
    if(!p.transfer&&this.fireLine&&!p.fireBoosted&&(oldX-this.fireLine.x)*(p.x-this.fireLine.x)<=0&&p.y>=this.fireLine.top&&p.y<=this.fireLine.bottom) {
      p.boost*=1.5;p.fireBoosted=true;this.burst(p.x,p.y,10,'#f5a956');
    }
    if(weaponHasTrail(p.weapon)||p.fireBoosted){p.trail.push({x:p.x,y:p.y});if(p.trail.length>40)p.trail.shift();}
    if(p.weapon==='cluster'&&!p.sub&&p.vy>=0) {
      for(let i=-2;i<=2;i++) this.projectiles.push({...p,vx:p.vx*0.75+i*76,vy:40+Math.abs(i)*16,sub:true,age:0,trail:[]});
      this.burst(p.x,p.y,16,'#e0c384');return true;
    }
    if(p.x< -50||p.x>WORLD_W+50||p.y>WORLD_H+70||p.age>12){if(p.transfer)this.emit('item','转移弹未落在战场内，转移失败。');return true;}
    const hitTank=this.projectileHit(p);
    if(p.transfer&&(this.land.solid(p.x,p.y)||hitTank)){
      if(!this.transferTo(this.tanks[p.owner],p.x,p.y))this.emit('item','转移弹落点无法站立，转移失败。');
      return true;
    }
    if(p.hitCooldown<=0&&(this.land.solid(p.x,p.y)||hitTank||p.drillY!==null)) {
      if(effect==='mine'&&!hitTank) {
        this.mines.push({x:p.x,y:this.ground(p.x,oldY)-3,owner:p.owner,weapon:p.weapon,boost:p.boost});
        const own=this.mines.filter(m=>m.owner===p.owner);if(own.length>4) this.mines.splice(this.mines.indexOf(own[0]),1);
        this.burst(p.x,p.y,8,spec.color);return true;
      }
      if(effect==='orbital'&&!p.sub) {
        this.excavateImpact(p,12,8,hitTank?.id);this.burst(p.x,p.y,12,'#b8cfea');
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
      if(effect==='pierce'&&p.penetrations<3) {
        // A new remaining section continues from the impact, rather than teleporting the same shell.
        this.projectiles.push({...p,penetrations:p.penetrations+1,trail:[],hitCooldown:.025});
      }
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
  private excavateImpact(p:Projectile,radius:number,depth:number,directTarget?:number){
    if(radius<=0||depth<=0)return;
    let x=p.x,y=p.y;
    if(directTarget!==undefined){
      const target=this.tanks[directTarget],foot=target.y+18,surface=this.support(target.x,foot);
      if(surface<WATER_Y&&Math.abs(surface-foot)<=28){
        x=clamp(p.x,target.x-16,target.x+16);y=surface;
      }
    }
    this.crater(x,y,radius,depth);
  }
  private explode(p:Projectile,directTarget?:number) {
    const direct=directTarget!==undefined;
    const w=weaponById(p.weapon), radius=w.radius;
    const color=w.color;
    this.blasts.push({x:p.x,y:p.y,radius,life:0.65,maxLife:0.65,color});
    this.burst(p.x,p.y,Math.round(radius*0.6),color);
    this.shake=Math.min(10,radius/10);
    const dig=excavation(p.weapon,direct);
    dig.radius*=p.digBoost;dig.depth*=p.digBoost;
    this.excavateImpact(p,dig.radius,dig.depth,directTarget);
    for(const t of this.tanks) {
      if(!this.canDamage(t,p.owner))continue;
      const distance=Math.hypot(t.x-p.x,t.y-p.y);
      if(directTarget!==t.id&&distance>radius+26) continue;
      if(p.weapon==='emp') {t.shield=0;t.fuel=Math.max(0,t.fuel-35);this.float(t.x,t.y-65,'脉冲','#ac88bc');}
      if(p.weapon==='ice') {t.frozen=2;this.float(t.x,t.y-65,'冻结 ×2','#79aebe');}
      const mineScale=w.effect==='mine'?(!p.mineArmed?1/3:t.vehicleId==='mine'?.5:1):1;
      const damage=Math.round(w.damage*p.scale*p.boost*mineScale*(directTarget===t.id||distance<=28?1:clamp(1-(distance-28)/(radius+8),0.1,1)));
      this.damage(t,damage,p.owner,false,directTarget===t.id?'direct':'graze');
      if(w.effect==='poison'&&damage>0&&t.hp>redHealthLimit(t)) {
        const fresh=!t.poisoned;t.poisoned=true;t.poisonOwner=p.owner;
        if(fresh){this.float(t.x,t.y-95,'中毒','#6c994b',t.id);this.emit('poison',`${t.name}中了毒箭，自己的行动结束时结算毒伤。`,undefined,t.x,p.weapon);}
      }
      if(w.effect==='freeze'&&t.id!==p.owner&&damage>0)t.immobile=1;
    }
    if(p.weapon==='napalm') this.fires.push({x:p.x,y:p.y,radius:60,turns:3,owner:p.owner});
    if(w.effect==='fire'&&!this.snow) this.fires.push({x:p.x,y:this.ground(p.x,p.y-5),radius:25,turns:6,owner:p.owner,weapon:p.weapon,clock:0});
    if(w.effect==='gas'&&!this.snow) this.gases.push({x:p.x,y:p.y,radius:75,turns:6,owner:p.owner,clock:0});
    for(const mine of [...this.mines]) if(Math.hypot(mine.x-p.x,mine.y-p.y)<radius) {
      const index=this.mines.indexOf(mine);
      if(index<0) continue; // A nested blast may already have detonated this mine.
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[mine.owner],mine.weapon),x:mine.x,y:mine.y,boost:mine.boost,mineArmed:true});
    }
    this.emit('explosion',`${w.name}${direct?'直接命中，集中伤害':'命中地形，扩大挖地'}。`,undefined,p.x,p.weapon);
    // A point-blank collision can kill before the .18s guidance acquisition.
    // Only use that victim when no primary target was acquired: collateral
    // deaths must not cancel a volley still pursuing a living primary target.
    if(w.homingMode==='volley'&&p.volley>0&&directTarget!==undefined&&this.volleyTargets.get(p.volley)?.target===null) {
      const target=this.tanks[directTarget];
      if(!target||target.hp<=0||!this.canDamage(target,p.owner))this.cancelVolley(p.volley);
    }
  }
  private triggerMines(t:Tank) {
    if(t.vehicleId==='laser'||t.vehicleId==='water') return;
    for(const m of [...this.mines]) if(Math.hypot(t.x-m.x,t.y-m.y)<30) {
      const index=this.mines.indexOf(m);
      if(index<0) continue;
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[m.owner],m.weapon),x:m.x,y:m.y,boost:m.boost,mineArmed:true},t.id);
    }
  }
  damage(t:Tank,amount:number,owner:number,ignoreShield=false,reaction:'direct'|'graze'|'fall'='graze',status?:'poison') {
    if(t.hp<=0|| (reaction!=='fall'&&!this.canDamage(t,owner))) return;
    const absorbed=ignoreShield?0:Math.min(t.shield,amount);
    t.shield-=absorbed;const actual=Math.min(t.hp,amount-absorbed);t.hp-=actual;
    if(t.hp<=redHealthLimit(t))t.poisoned=false;
    if(amount>0) t.reaction={kind:actual>0?reaction:'graze',remaining:reaction==='direct'?1.4:reaction==='fall'?1.2:0.7};
    if(owner!==t.id&&actual>0) this.tanks[owner].damage+=actual;
    if(absorbed) this.float(t.x+16,t.y-43,`护盾 −${absorbed}`,'#75a7af');
    if(actual&&status==='poison'){
      this.texts=this.texts.filter(text=>text.tankId!==t.id);
      this.float(t.x,t.y-95,`毒伤 −${actual}`,'#6c994b',t.id);this.burst(t.x,t.y-18,12,'#91af6c');
      this.emit('poison',`${t.name}毒伤 −${actual}，生命 ${t.hp}/${t.maxHP}${t.poisoned?'':'，到达红血临界线，中毒解除'}。`,actual,t.x,'crossbow-special');
    }else if(actual){this.float(t.x,t.y-25,`−${actual}`,'#db674b',t.id);this.emit('hit',this.fog?`${t.name}的方向传来受击声。`:`${t.name}受到 ${actual} 点伤害。`,actual,t.x);}
    if(t.hp<=0)for(const volley of new Set(this.projectiles.filter(p=>this.invalidVolleyTarget(p)).map(p=>p.volley)))this.cancelVolley(volley);
  }
  private float(x:number,y:number,text:string,color:string,tankId?:number) {this.texts.push({x,y,text,color,life:1.8,tankId});}
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
      if(t.y+18>=WATER_Y) {t.outOfBounds=true;this.damage(t,t.hp,this.firedBy,true,'fall');this.emit('hit',`${t.name}掉出了战场。`); }
    }
  }
  private collectCrates() {
    this.crates=this.crates.filter(c=>{
      const t=this.active;
      if(c.falling||Math.abs(c.x-t.x)>28||Math.abs(c.y-t.y)>40) return true;
      if(TURN_ITEMS.every(id=>t.items[id]>0))return true;
      const item=c.type==='medical'?'repair':c.type==='double'?'double':c.type==='transfer'?'teleport':c.type==='boost'?'boost':null;
      let name:string;
      if(item){
        if(t.items[item]>0)return true;
        t.items[item]=1;name=itemById(item).name;
      }else{
        if(t.ammo.homing>0)return true;
        t.ammo.homing=1;name='猎星追踪弹';
      }
      this.float(t.x,t.y-40,`${name} +1`,'#ad9261');
      this.emit('crate',`${t.name}拾取了${name}补给。`,undefined,t.x);return false;
    });
  }
  private checkWin() {
    const teams=new Set(this.tanks.filter(t=>t.hp>0).map(t=>t.team));
    if(teams.size>1)return false;
    this.phase='ended';this.resultAge=0;
    this.tanks.forEach(t=>t.lastPower=null);
    this.fog=false;this.fogTurnsRemaining=0;this.fireLine=null;this.fireLineTurnsRemaining=0;
    this.winner=teams.size?[...teams][0]:null;
    this.emit('win',this.winner===null?'各队同时出局，平局！':`${teamFlag(this.winner).letter} 旗${teamFlag(this.winner).name}队赢得了这场对决！`);
    return true;
  }
  nextTurn() {
    if(this.checkWin()) return;
    const previous=this.active;
    // Poison settles once after the victim's own completed action and cannot kill.
    if(previous.poisoned&&previous.hp>0){
      const floor=redHealthLimit(previous),loss=Math.min(Math.ceil(previous.maxHP*.2),Math.max(0,previous.hp-floor));
      if(loss)this.damage(previous,loss,previous.poisonOwner??this.enemy.id,true,'graze','poison');
      if(previous.hp<=floor)previous.poisoned=false;
    }
    if(!previous.delayCommitted)previous.lastDelay=this.delayFor(previous);
    previous.boost=false;previous.doubleShot=false;
    // DELAY is a PVP rule. Single-player always hands one complete action to the other side.
    if(this.delayEnabled){previous.nextActionAt+=previous.lastDelay;this.current=this.tanks.filter(t=>t.hp>0).sort((a,b)=>a.nextActionAt-b.nextActionAt||a.id-b.id)[0].id;}
    else {do{this.current=(this.current+1)%this.tanks.length;}while(this.active.hp<=0);}
    this.turn++;
    if(this.fog&&--this.fogTurnsRemaining<=0){this.fog=false;this.emit('weather','雾气散去了，战场重新可见。');}
    if(this.fireLine&&--this.fireLineTurnsRemaining<=0){this.fireLine=null;this.emit('weather','火线熄灭了，强化通道已关闭。');}
    const preferred=this.active.selectedWeapon;
    this.selected=(this.active.ammo[preferred]??0)>0?preferred:this.active.vehicleId?vehicleById(this.active.vehicleId).normal:'shell';this.teleporting=false;
    this.active.selectedWeapon=this.selected;
    this.active.actionTime=0;this.active.movedThisTurn=0;this.active.itemDelay=0;this.active.delayCommitted=false;
    this.active.fuel=this.active.vehicleId?100:Math.min(100,this.active.fuel+18);this.active.itemUsed=false;
    this.active.turnsTaken++;if(this.active.turnsTaken>1) this.active.tactics=Math.min(4,this.active.tactics+1);
    // Status counts decrement after the affected unit has had its full turn.
    if(previous.frozen>0) previous.frozen--;
    if(previous.immobile>0) previous.immobile--;
    this.wind=(this.rng()-0.5)*(this.turn>=40?42:26);
    this.clock=this.config.timer;this.aiTime=0;this.aiMoveGoal=null;this.aiPending=null;this.aiDecision=null;
    for(const f of this.fires) if(!f.weapon&&Math.abs(this.active.x-f.x)<f.radius&&Math.abs(this.active.y+18-(f.y??this.ground(f.x)))<100) this.damage(this.active,14,f.owner);
    // Six action handoffs is our lifetime cap, not a verified original-client duration.
    for(const f of this.fires)if(f.weapon||this.turn%this.tanks.length===0)f.turns--;
    this.fires=this.fires.filter(f=>f.turns>0);
    for(const gas of this.gases)gas.turns--;
    this.gases=this.gases.filter(gas=>gas.turns>0);
    if(this.turn>=40) {this.damage(this.active,Math.ceil(this.active.maxHP*.08),this.active.id,true,'fall');this.float(this.active.x,this.active.y-55,'决胜时刻','#bd765d');}
    if(this.checkWin()) return;
    if(this.turn%5===0&&this.crates.length<3) {
      const human=this.tanks.find(t=>t.controller==='human'&&t.hp>0)??this.tanks[0],maxDistance=Math.min(205,(human.fuel+(human.vehicleId?200:36))/(100/human.moveDistance));
      for(let tries=0;tries<50;tries++) {
        const desired=human.x+(this.rng()<0.5?-1:1)*(45+this.rng()*Math.max(0,maxDistance-45));
        if(!this.stablePlatform(desired)||this.traversable(human,desired)===null) continue;
        const distance=this.ground(desired)+50;
        const capTime=(250-80)/220,capDistance=80*capTime+110*capTime*capTime;
        const time=distance>capDistance?capTime+(distance-capDistance)/250:(-80+Math.sqrt(6400+440*distance))/220;
        const drift=this.wind*2.5*(time/0.35-(1-Math.exp(-0.35*time))/0.35**2);
        const start=desired-drift,landing=this.predictSupply(start);
        if(start<32||start>WORLD_W-32||!landing||landing.x<40||landing.x>WORLD_W-40||!this.stablePlatform(landing.x)||this.traversable(human,landing.x)===null||Math.abs(landing.x-human.x)>maxDistance||this.crates.some(c=>Math.abs(c.x-landing.x)<45)) continue;
        const roll=this.rng(),type=roll<.3?'medical':roll<.5?'double':roll<.65?'transfer':roll<.8?'boost':'homing';
        this.crates.push({x:start,y:-50,type,falling:true,vy:80,vx:0});
        this.emit('crate','补给空降中，回合计时暂停。');break;
      }
    }
    this.afterSupply='aiming';
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
      p.vx+=this.wind*SHOT_WIND_GAIN*(weapon==='sniper'?0.25:1)*dt;
      p.vy+=this.gravity*(weapon==='sniper'?0.27:weaponById(weapon).gravity??1)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(i%6===0) points.push({x:p.x,y:p.y});
      direct=!this.fog&&i*dt>=0.09&&this.tanks.some(t=>t.hp>0&&this.canDamage(t,p.owner)&&Math.abs(t.x-p.x)<50&&Math.abs(t.y-p.y)<62&&pointHitsTank(t,p.x,p.y,this.tankSlope(t)));
      if(p.x<0||p.x>WORLD_W||p.y>WORLD_H||this.land.solid(p.x,p.y)||direct) break;
    }
    return {x:p.x,y:p.y,points,direct};
  }
  planAI() {
    const t=this.active,e=this.enemy,difficulty=t.difficulty;
    const enemyX=this.fog?this.heardX[e.id]:e.x,enemyY=this.fog?this.ground(enemyX)-18:e.y;
    const level=DIFFICULTIES.findIndex(d=>d.id===difficulty);
    if(level>=2) {
      const candidates:ItemId[]=[...(t.hp<=t.maxHP*.7?['repair' as ItemId]:[]),...(this.rng()>0.6?['boost' as ItemId]:[]),...(this.rng()>.8?['double' as ItemId]:[])];
      const item=candidates.find(id=>!this.itemUnavailable(id,true));if(item) this.useItem(item,true);
    }
    t.direction=enemyX>t.x?1:-1;
    let weapon:WeaponId='shell';
    if(t.vehicleId) {
      const v=vehicleById(t.vehicleId),special=weaponById(v.special),distance=Math.abs(enemyX-t.x);
      let chance=level===1?.25:.55;
      if(special.effect==='poison') chance=e.hp<=redHealthLimit(e)||(!this.fog&&e.poisoned)?0:.23;
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
    this.aiMoveGoal=null;this.aiPending=null;
    const targets=this.knownAITargets();
    if(weapon==='airstrike') {this.selected=weapon;this.targetX=clamp(enemyX+aiAimOffset(difficulty,weapon,this.rng).offset,20,WORLD_W-20);return;}
    const weapons=level===3&&t.vehicleId?[vehicleById(t.vehicleId).normal,vehicleById(t.vehicleId).special,...(t.ammo.homing>0?['homing' as WeaponId]:[])]:[weapon];
    const planned=level===3||level===2&&this.fires.some(f=>Math.abs(f.x-t.x)<f.radius&&this.canDamage(t,f.owner))?chooseAIPosition(this,t,weapons,targets):{stay:solveAIShot(this,t,weapons,targets),best:undefined};
    const best=planned.best??planned.stay;
    this.selected=best.weapon;
    const intent=aiAimOffset(difficulty,best.weapon,this.rng),offset=intent.offset+(this.fog?(this.rng()-.5)*120:0);
    this.aiDecision={target:best.target,fromX:t.x,goalX:best.x,weapon:best.weapon,intentionalMiss:intent.miss};
    this.applyAIShot(solveAIShot(this,t,[best.weapon],targets,offset,true,intent.miss,best.target),level);
    if(Math.abs(best.x-t.x)>2){this.aiMoveGoal=best.x;this.aiPending={weapons:[best.weapon],offset,level,miss:intent.miss,target:best.target};}
  }
  private knownAITargets(){return this.opponents(this.active).map(t=>this.fog?{...t,x:this.heardX[t.id],y:this.ground(this.heardX[t.id])-18}:{...t});}
  private applyAIShot(shot:AIShot,level:number){
    const t=this.active;t.direction=shot.direction;this.selected=shot.weapon;t.selectedWeapon=shot.weapon;
    t.angle=clamp(shot.angle+(this.rng()-.5)*[6,3,1.6,.5][level],t.minAngle,t.maxAngle);
    t.power=clamp(shot.power+(this.rng()-.5)*[7,4,1.6,.5][level],10,100);
  }
  private updateAIMovement(dt:number){
    if(!this.aiPending)return;
    if(this.aiMoveGoal!==null){
      const remaining=this.aiMoveGoal-this.active.x;
      const moved=Math.abs(remaining)>0.01&&this.move(Math.sign(remaining),Math.min(dt,Math.abs(remaining)/this.active.moveSpeed),true);
      if(moved&&Math.abs(this.aiMoveGoal-this.active.x)>=.1)return;
      this.aiMoveGoal=null;
    }
    // Mines or a collapsing platform can interrupt a legal route. Wait for
    // landing before solving from the actual support, never keep an air aim.
    if(this.active.fallVelocity>0)return;
    const pending=this.aiPending;this.aiPending=null;
    this.applyAIShot(solveAIShot(this,this.active,pending.weapons,this.knownAITargets(),pending.offset,true,pending.miss,pending.target),pending.level);
  }
  private updateHazards(dt:number) {
    if(this.snow){this.fires=[];this.gases=[];return;}
    for(const fire of this.fires) if(fire.weapon) {
      fire.radius=Math.min(90,fire.radius+dt*8);fire.x=clamp(fire.x+this.wind*.45*dt,0,WORLD_W);
      fire.y=this.ground(fire.x,(fire.y??0)-12);fire.clock=(fire.clock??0)+dt;
      const slope=Math.abs(this.ground(fire.x-10,fire.y-12)-this.ground(fire.x+10,fire.y-12));
      if(fire.y>=WATER_Y||slope>Math.tan(35*Math.PI/180)*20){fire.turns=0;continue;}
      while(fire.clock>=1){fire.clock-=1;for(const tank of this.tanks){
        if(Math.abs(tank.x-fire.x)>=fire.radius||Math.abs(tank.y+18-this.ground(tank.x,fire.y-12))>26)continue;
        const rate=tank.vehicleId==='bowl'||tank.vehicleId==='dragon'?1:tank.vehicleId==='water'?4:2;
        this.damage(tank,rate,fire.owner);
      }}
    }
    for(const gas of this.gases){
      gas.x=clamp(gas.x+this.wind*2.8*dt,0,WORLD_W);gas.clock=(gas.clock??0)+dt;
      while(gas.clock>=1){gas.clock-=1;for(const tank of this.tanks)if(Math.hypot(tank.x-gas.x,tank.y-gas.y)<gas.radius)this.damage(tank,2,gas.owner);}
    }
    this.fires=this.fires.filter(f=>f.turns>0);
  }
  update(dt:number) {
    if(this.paused) return;
    dt=Math.min(dt,0.05);this.elapsed+=dt;
    this.shake=Math.max(0,this.shake-dt*16);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.vy+=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
    this.blasts=this.blasts.filter(b=>{b.life-=dt;return b.life>0;});
    this.texts=this.texts.filter(t=>{t.life-=dt;t.y-=dt*20;return t.life>0;});
    for(const tank of this.tanks) if(tank.reaction) {tank.reaction.remaining-=dt;if(tank.reaction.remaining<=0) tank.reaction=null;}
    if(this.phase==='ended'){
      this.resultAge+=dt;
      for(const t of this.tanks)if(t.hp<=0&&!t.outOfBounds){
        const foot=this.support(t.x,t.y+18),target=foot-18;
        if(t.y<target-.5){t.fallVelocity+=this.gravity*dt;t.y=Math.min(target,t.y+t.fallVelocity*dt);}
        else t.fallVelocity=0;
        if(t.y+18>=WATER_Y)t.outOfBounds=true;
      }
      return;
    }
    if(this.phase==='lobby'||this.phase==='handoff') return;
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
    this.updateHazards(dt);
    if(this.phase==='aiming') {
      this.active.actionTime+=dt;
      this.collectCrates();
      if(this.checkWin()) return;
      if(this.active.hp<=0){this.nextTurn();return;}
      if(this.config.timer>0) {
        this.clock-=dt;
        if(this.clock<=0) {this.emit('timeout',`${this.active.name}的回合时间到了。`);this.nextTurn();return;}
      }
      if(this.active.controller==='ai') {
        const previous=this.aiTime;this.aiTime+=dt;
        if(previous<0.8&&this.aiTime>=0.8) this.planAI();
        this.updateAIMovement(dt);
        if(this.aiTime>=1.8&&this.aiMoveGoal===null&&this.aiPending===null) this.fire(true);
      }
    } else if(this.phase==='flying') {
      // Fixed small substeps prevent fast shells tunnelling through tanks and ground.
      const flightTime=dt*FLIGHT_SPEED,count=Math.ceil(flightTime/(1/180)),step=flightTime/count;
      for(let i=0;i<count;i++) {
        const active=[...this.projectiles];
        // A killing impact may cancel siblings already in this snapshot.
        for(const p of active) if(this.projectiles.includes(p)&&this.stepProjectile(p,step)) this.projectiles=this.projectiles.filter(q=>q!==p);
      }
      if(this.projectiles.length===0) {this.phase='resolving';this.resolveTime=0.55;this.volleyTargets.clear();}
    } else if(this.phase==='resolving') {
      this.resolveTime-=dt;
      if(this.resolveTime<=0&&this.tanks.every(t=>t.hp<=0||t.fallVelocity===0)) this.nextTurn();
    }
  }
}
