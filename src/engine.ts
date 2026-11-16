import {flightCollision} from './flight-collision';
import {salvoProfile,DOUBLE_SHOT_INTERVAL} from './salvo';
import {impactDamageScale,FULL_BLAST_DISTANCE} from './impact-damage';
import {eraDamageFactor,ERA_DAMAGE_VERSION} from './era-damage';
import { DIFFICULTIES, ITEMS, TURN_ITEMS, WEAPONS, ALL_WEAPONS,weaponById,launchDamageScale, weaponHasTrail,MODERN_TRAIL_POINTS,MODERN_TRAIL_LENGTH, itemById, excavation, aiAimOffset, type Difficulty, type ItemId, type MapId, type WeaponId } from './catalog';
import {isRaging,redHealthLimit} from './health';
import {pointHitsTank} from './tank-hitbox';
import {resolveVehicle,vehicleById,type VehicleId,type VehicleChoice} from './vehicles';
import {mapSpecification,referenceGrid,MAP_SPECIFICATION_VERSION} from './map-specification';
import {bodyScale,bodyClearance,bodyBroadPhase,referenceBodyScale} from './tank-geometry';
import {buildSkyMap} from './sky-map';
import {OBSERVATION_SECONDS,OBSERVATION_PRIORITY,type ObservationKind,type ShotObservation} from './shot-observation';
import { Terrain, WORLD_W, WORLD_H, BOTTOM_Y, TERRAIN_H } from './terrain';
import {rollWeather} from './weather';
import {buildNativeClassicMap} from './native-classic-maps';

import {defaultSlots,slotProblem,teamFlag,CREW,type Slot,type CrewId} from './crew';
import {aimGeometry} from './aim';
import {chooseAIPosition,solveAIShot,type AIShot} from './ai-planner';
import {BattleTrace,packTerrain,unpackTerrain,snapshotText,traceClone,type BattleSnapshot} from './battle-trace';
import {MAPS,type MapChoice} from './catalog';
import {nextNaturalWind,nextWindRound,MAX_WIND_CHANGE,NATURAL_WIND_LIMIT} from './wind-cycle';
import {ITEM_CUE_SECONDS,type ItemCue} from './item-feedback';
import {projectileSpeed} from './ballistics';
export {WORLD_W,WORLD_H,BOTTOM_Y};
export {WATER_Y} from './terrain';
export const FLIGHT_SPEED=1.8;
export const MAX_CLIMB_ANGLE=60,MAX_STEP_HEIGHT=12;
export const SHOT_WIND_GAIN=3;
export const BRIDGE_THICKNESS=180;
export type Phase = 'lobby' | 'aiming' | 'flying' | 'resolving' | 'supply' | 'handoff' | 'ended';
export interface Config {slots:Slot[];map:MapId;mapChoice?:MapChoice;timer:number;seed:number;fog?:boolean;fireLine?:boolean;snow?:boolean;selfDamage?:boolean;friendlyFire?:boolean;allowDragon?:boolean;fallDamage?:boolean }
export interface Tank {
  id:number;bodyScale?:number; name:string;crew:CrewId;slot:number;team:number;controller:'human'|'ai';difficulty:Difficulty; x:number; y:number; hp:number; shield:number; fuel:number;
  angle:number; power:number; direction:number; ammo:Record<WeaponId,number>;
  items:Record<ItemId,number>; frozen:number; boost:boolean; itemUsed:boolean;
  fallVelocity:number; fallStart:number; shots:number; damage:number;
  tactics:number; turnsTaken:number; itemReadyTurn:Record<ItemId,number>;
  doubleShot:boolean;reaction:{kind:'direct'|'graze'|'fall';remaining:number}|null;
  vehicleId:VehicleId|null;maxHP:number;minAngle:number;maxAngle:number;moveSpeed:number;moveDistance:number;nextActionAt:number;lastDelay:number;poisoned:boolean;immobile:number;
  selectedWeapon:WeaponId;lastPower:number|null;poisonOwner?:number;actionTime:number;movedThisTurn:number;itemDelay:number;delayCommitted:boolean;outOfBounds:boolean;
}
export interface DefeatPose {x:number;y:number;slope:number;direction:number}
export interface Tank {defeat?:DefeatPose|null;deathResolved?:boolean}
export interface Projectile { x:number; y:number; vx:number; vy:number; weapon:WeaponId; owner:number; age:number; bounces:number; drillY:number|null; sub:boolean; boost:number; trail:{x:number;y:number}[];delay:number;echo:boolean;fireBoosted:boolean;homing:boolean;penetrations:number;scale:number;phase:number;lockAge:number;lockX:number;lockY:number;lockTarget:number|null;volley:number;weaveX:number;weaveY:number;hitCooldown:number;mineArmed:boolean;digBoost:number;rage:boolean;transfer?:boolean;aimOffsetX?:number;aimOffsetY?:number }
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; color:string }
export interface Blast { x:number;y:number;radius:number;life:number;maxLife:number;color:string;weapon?:WeaponId }
export interface FloatingText { x:number;y:number;text:string;color:string;life:number;tankId?:number }
export interface FireZone { x:number;y?:number;radius:number;turns:number;owner:number;weapon?:WeaponId;clock?:number }
export interface Crate { x:number;y:number;type:'ammo'|'medical'|'double'|'homing'|'transfer'|'boost';falling?:boolean;vy?:number;vx?:number }
export interface GameEvent { type:'shot'|'explosion'|'turn'|'item'|'hit'|'win'|'crate'|'crate-land'|'timeout'|'lock'|'weather'|'poison'|'defeat'|'wind'; message:string; value?:number;x?:number;weapon?:WeaponId;transfer?:boolean }
export interface Mine {x:number;y:number;owner:number;weapon:WeaponId;boost:number}
export interface Gas {x:number;y:number;owner:number;radius:number;turns:number;clock?:number}
interface BoostSources {fire:'item'|'line'|null;rage:number;snow:number;inherited?:number}
export interface Projectile {traceId?:number;traceParent?:number;boostSources?:BoostSources;traceCrossed?:boolean;traceLaunch?:Record<string,any>;traceFireLine?:unknown}
export interface Mine {boostSources?:BoostSources;traceOrigin?:number;traceLaunch?:Record<string,any>}
export interface GameEvent {sequence?:number;time?:number;action?:number}
interface DamageContext {cause:string;weapon?:WeaponId;projectile?:number;impact?:number;base?:number;factors?:{source:string;value:number}[];formula?:string;dig?:unknown;origin?:unknown}
const DAMAGE_CAUSES:Record<string,string>={direct:'直接命中',graze:'爆炸擦中／波及',mine:'地雷',fall:'坠落',out:'掉出战场',poison:'毒箭持续伤害',fire:'火烧',gas:'毒气',sudden:'决胜时刻扣血',unknown:'未标注来源'};
const RESTORE_KEYS=['config','observation','tanks','phase','current','turn','roundNumber','roundPending','windChangeRound','wind','itemCues','clock','selected','projectiles','blasts','fires','gases','mines','crates','texts','paused','winner','elapsed','resultAge','resolveTime','resolveHazardTime','targetX','teleporting','aiTime','fog','fogTurnsRemaining','fireLine','fireLineTurnsRemaining','movingUntil','volleySequence','volleyTargets','heardX','afterSupply','supplySettling','firedBy','aiMoveGoal','aiPending','aiDecision','fallOrigins','projectileSequence','log'] as const;
export const clamp = (v:number,min:number,max:number) => Math.min(max,Math.max(min,v));
export function makeRng(seed:number) { let a=seed>>>0; return () => { a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

export class Game {
  config:Config;
  land=new Terrain();
  terrain=this.land.surface;
  tanks:Tank[] = [];
  phase:Phase = 'lobby';
  current=0; turn=0; roundNumber=1; private roundPending:number[]=[]; private windChangeRound=2; wind=0; clock=45; selected:WeaponId='shell';
  projectiles:Projectile[]=[]; particles:Particle[]=[]; blasts:Blast[]=[];
  itemCues:ItemCue[]=[];
  texts:FloatingText[]=[]; fires:FireZone[]=[]; crates:Crate[]=[];
  events:GameEvent[]=[]; log:string[]=[];
  introLocked=false;observation:ShotObservation|null=null;paused=false; winner:number|null=null; shake=0; elapsed=0;
  targetX=1000; teleporting=false; aiTime=0; resolveTime=0;resolveHazardTime=0;
  fog=false;fogTurnsRemaining=0;fireLineTurnsRemaining=0;fireLine:{x:number;top:number;bottom:number}|null=null;
  movingUntil=[0,0];
  resultAge=0;
  mines:Mine[]=[];gases:Gas[]=[];
  private volleySequence=0;
  private volleyTargets=new Map<number,{x:number;y:number;target:number|null}>();
  private heardX=[175,1105];private afterSupply:'aiming'|'handoff'='aiming';private supplySettling=0;
  private rng:()=>number;
  private trace:BattleTrace;
  private visualRandom=false;
  private projectileSequence=0;
  private fallOrigins=new Map<number,unknown>();
  private explosionDepth=0;
  private blastGrounded=new Map<number,DefeatPose>();
  private firedBy=0;
  private aiMoveGoal:number|null=null;
  private aiPending:{weapons:WeaponId[];offset:number;level:number;miss:boolean;target:number}|null=null;
  aiDecision:{target:number;fromX:number;goalX:number;weapon:WeaponId;intentionalMiss:boolean}|null=null;

  constructor(config:Partial<Config>={},readonly gameVersion='development') {
    this.config={slots:defaultSlots(),map:'valley',timer:0,fallDamage:false,seed:Date.now(),...config};
    this.config.fallDamage=!!this.config.fallDamage;
    if(this.config.slots.length!==4||slotProblem(this.config.slots))throw new Error(slotProblem(this.config.slots)??'需要四个固定槽位');
    this.trace=new BattleTrace(this.config.seed);this.rng=this.diagnosticRng(makeRng(this.config.seed));
    if(this.config.mapChoice==='random'){
      this.config.map=MAPS[Math.min(MAPS.length-1,Math.floor(this.rng()*MAPS.length))].id;
      this.recordBattle('map-selection',`随机地图抽中${MAPS.find(m=>m.id===this.config.map)!.name}`,{choice:'random',actual:this.config.map,available:MAPS.map(m=>m.id)});
    }else if(this.config.mapChoice&&MAPS.some(m=>m.id===this.config.mapChoice))this.config.map=this.config.mapChoice;
    const mapSize=mapSpecification(this.config.map);this.land=new Terrain(mapSize.width,mapSize.height,mapSize.cellSize);this.terrain=this.land.surface;
    const weather=rollWeather(this.rng);this.fog=this.config.fog??weather.fog;
    this.fogTurnsRemaining=this.fog?2:0;
    if(this.config.fireLine??weather.fireLine) this.fireLine={x:this.worldWidth*(.35+this.rng()*.3),top:50,bottom:this.bottomY-50};
    this.fireLineTurnsRemaining=this.fireLine?2:0;
    this.generateTerrain();
    const participants=this.config.slots.map((slot,index)=>({...slot,index})).filter(s=>s.enabled);
    this.tanks=participants.map((seat,i)=>this.createTank(i,262+i*390,seat,seat.index));
    this.movingUntil=participants.map(()=>0);this.roundPending=this.tanks.map(t=>t.id);
    this.placeStartingTanks();this.heardX=this.tanks.map(t=>Math.round(t.x/90)*90);
    if(this.active.vehicleId) this.selected=vehicleById(this.active.vehicleId).normal;
    this.targetX=this.tanks[1].x;
    this.trace.initial=traceClone({world:{width:this.worldWidth,height:this.worldHeight,bottomY:this.bottomY,cellSize:this.land.cellSize,specification:MAP_SPECIFICATION_VERSION},config:this.config,mapName:MAPS.find(m=>m.id===this.config.map)?.name??this.config.map,slots:this.config.slots.map((s,slot)=>{const id=this.tanks.find(t=>t.slot===slot)?.vehicleId;return {...s,slot,name:CREW[s.crew].name,flag:teamFlag(s.team),difficultyName:DIFFICULTIES.find(d=>d.id===s.difficulty)?.name,vehicleName:id?vehicleById(id).name:'原创炮手'};}),rules:this.traceRules(),deployed:this.traceTanks()});
    this.recordBattle('match','新建本局；上一局记录不继承。',{config:this.trace.initial.config,rules:this.trace.initial.rules});
  }
  private diagnosticRng(raw:()=>number){return ()=>{const value=raw();this.trace.rngIndex++;if(!this.visualRandom)this.recordBattle('rng',`随机抽取 #${this.trace.rngIndex} = ${value}`,{value,state:this.trace.rngState});return value;};}
  private recordBattle(type:string,summary:string,data:Record<string,any>={},pin=false,merge=false){return this.trace.record({time:this.elapsed,action:this.turn+1,round:this.roundNumber,actor:this.tanks[this.current]?.id??null,type,summary,data},pin,merge);}
  private traceRules(){return {eraDamageVersion:ERA_DAMAGE_VERSION,雾:this.fog,火线:!!this.fireLine,雪:this.snow,自伤:!!this.config.selfDamage,友伤:!!this.config.friendlyFire,坠落伤害:!!this.config.fallDamage,直接选择暴龙:!!this.config.allowDragon};}
  private landPose(t:Tank,groundedOnly=false):DefeatPose|null {
    if(t.outOfBounds||t.y+18>=this.bottomY||t.x<0||t.x>this.worldWidth)return null;
    const foot=this.tankSupport(t),near=Math.abs(foot-(t.y+18))<=28;
    if(foot>=this.bottomY||(groundedOnly&&(!near||t.fallVelocity>0)))return null;
    const y=near?t.y:foot-18,probe={...t,y,fallVelocity:0};
    return {x:t.x,y,slope:this.tankSlope(probe),direction:t.direction};
  }
  private settleDefeat(t:Tank) {
    if(t.hp>0||t.deathResolved)return;
    // The outer blast remembers land BEFORE excavation, including nested mines.
    // Once resolved this is a visual marker, never another terrain physics body.
    const pose=t.outOfBounds||t.y+18>=this.bottomY?null:this.blastGrounded.get(t.id)??this.landPose(t);
    t.defeat=pose?{...pose}:null;t.deathResolved=true;t.fallVelocity=0;
    if(!pose)t.outOfBounds=true;
    this.movingUntil[t.id]=0;
    this.recordBattle('defeat-state',`${t.name}${pose?'立即进入陆地趴地哭泣，位置固定':'不留残骸：掉穿底边／出界或无陆地落点'}`,{target:t.id,pose:t.defeat,outOfBounds:t.outOfBounds});
    this.emit('defeat',`${t.name}出局了。`,undefined,t.x);
  }
  private traceTanks(){return this.tanks.map(t=>({...t,flag:teamFlag(t.team),red:t.hp>0&&t.hp<=redHealthLimit(t),raging:isRaging(t),slope:this.tankSlope(t),absoluteAngle:this.aim(t).absolute}));}
  private traceTurn(type:'turn-start'|'turn-end'){
    const t=this.active;this.recordBattle(type,`${t.name}${type==='turn-start'?'开始':'结束'}行动；等待值 ${t.lastDelay}，风 ${this.wind.toFixed(2)}，火线剩余 ${this.fireLineTurnsRemaining}；${this.tanks.map(t=>`${t.name} HP${t.hp}/${t.maxHP} 护盾${t.shield}${t.poisoned?' 中毒':''}${t.frozen||t.immobile?' 冻结':''}${isRaging(t)?' 发怒':''}`).join('；')}`,{tanks:this.traceTanks(),delayEnabled:this.delayEnabled,lastDelay:t.lastDelay,nextActionAt:t.nextActionAt,wind:this.wind,fireLine:this.fireLine,fireLineTurnsRemaining:this.fireLineTurnsRemaining,fogTurnsRemaining:this.fogTurnsRemaining,rules:this.traceRules()});
  }
  battleSnapshot():BattleSnapshot {
    const current:Record<string,any>={};for(const key of RESTORE_KEYS){const value=(this as any)[key];current[key]=value instanceof Map?[...value]:key==='projectiles'?this.projectiles.map(({trail,...p})=>p):value;}
    current.terrain={width:this.worldWidth,height:this.worldHeight,cellSize:this.land.cellSize,mask:packTerrain(this.land.mask),protectedMask:packTerrain(this.land.protectedMask),revision:this.land.revision};
    current.annotatedTanks=this.traceTanks();
    return this.trace.snapshot(this.gameVersion,current);
  }
  battleSnapshotText(){return snapshotText(this.battleSnapshot());}
  setBattleRule(key:'selfDamage'|'friendlyFire'|'allowDragon'|'fallDamage',value:boolean){this.config[key]=value;this.recordBattle('rule-change',`规则切换：${key==='selfDamage'?'自伤':key==='friendlyFire'?'友伤':key==='fallDamage'?'坠落伤害':'直接选择暴龙'}${value?'开启':'关闭'}`,{key,value,rules:this.traceRules()});}
  static fromBattleSnapshot(snapshot:BattleSnapshot){
    if(snapshot.format!=='piggy-battle-snapshot'||snapshot.formatVersion!==1)throw new Error('不支持的快照格式');
    const g=new Game(snapshot.initial.config,snapshot.gameVersion),state=JSON.parse(JSON.stringify(snapshot.current),(_key,v)=>v==='Infinity'?Infinity:v==='-Infinity'?-Infinity:v==='NaN'?NaN:v);
    for(const key of RESTORE_KEYS)if(key in state)(g as any)[key]=['volleyTargets','fallOrigins'].includes(key)?new Map(state[key]):state[key];
    if(state.terrain.width)g.land=new Terrain(state.terrain.width,state.terrain.height,state.terrain.cellSize??1);g.terrain=g.land.surface;unpackTerrain(state.terrain.mask,g.land.mask);unpackTerrain(state.terrain.protectedMask,g.land.protectedMask);g.land.rebuild();g.land.revision=state.terrain.revision;
    g.projectiles.forEach(p=>p.trail=[]);g.trace.restore(snapshot);g.rng=g.diagnosticRng(makeRng(snapshot.rng.state));g.events=[];g.particles=[];return g;
  }
  get worldWidth(){return this.land.width;}
  get worldHeight(){return this.land.height;}
  get bottomY(){return this.land.height;}
  get active() { return this.tanks[this.current]; }
  get enemy() { return this.opponents(this.active).sort((a,b)=>Math.abs(a.x-this.active.x)-Math.abs(b.x-this.active.x))[0]??this.tanks.find(t=>t.team!==this.active.team)!; }
  opponents(t:Tank){return this.tanks.filter(e=>e.team!==t.team&&e.hp>0);}
  canDamage(t:Tank,owner:number){const source=this.tanks[owner];return !source|| (t.id===owner?!!this.config.selfDamage:t.team===source.team?!!this.config.friendlyFire:true);}
  visible(t:Tank){return this.introLocked||!this.fog||t.team===this.tanks[this.viewer].team;}
  get gravity() { return this.config.map==='moon'?145:230; }
  get snow(){return this.config.snow===true;}
  get humanTurn() { return this.phase==='aiming' && !this.paused && !this.introLocked && this.active.hp>0 && this.active.controller==='human'; }
  get round() { return this.roundNumber; }
  get viewer() {return this.active.controller==='human'||this.tanks.every(t=>t.controller==='ai')?this.current:this.tanks.find(t=>t.controller==='human'&&t.hp>0&&t.team===this.active.team)?.id??this.tanks.find(t=>t.controller==='human'&&t.hp>0)?.id??this.current;}
  get delayEnabled(){return this.tanks.every(t=>t.controller==='human');}
  ground(x:number,fromY=0) { return this.land.below(x,fromY); }
  support(x:number,footY:number) {
    return this.walkSupport(x,footY);
  }
  tankSupport(t:Tank){return this.walkSupport(t.x,t.y+18,bodyScale(t));}
  stablePlatform(x:number) {
    const levels=[-20,-10,0,10,20].map(dx=>this.ground(x+dx));
    return Math.max(...levels)<this.bottomY-12 && Math.max(...levels)-Math.min(...levels)<=28;
  }
  tankSlope(t:Tank) {
    if(t.fallVelocity>0) return 0;
    const levels=this.walkLevels(t.x,t.y+18,bodyScale(t));
    const limit=MAX_CLIMB_ANGLE*Math.PI/180;
    // Ignore a missing tread end or a different lower platform; neither is this body's slope.
    const offsets=[-16,-8,0,8,16].map(v=>v*bodyScale(t)),valid=(i:number)=>levels[i]<this.bottomY&&Math.abs(levels[i]-levels[2])<=MAX_STEP_HEIGHT+Math.abs(offsets[i])*Math.tan(limit);
    const left=[0,1,2].find(valid)??2,right=[4,3,2].find(valid)??2,span=offsets[right]-offsets[left];
    return span?clamp(Math.atan2(levels[right]-levels[left],span),-limit,limit):0;
  }
  private walkSurface(x:number,foot:number) {
    // Find the actual top of this connected platform, even when the probe starts inside a small step.
    // Starting near the feet keeps a lower sky platform distinct from the island above it.
    const at=Math.round(x); // Ground/support use this same column; floor-vs-round created false one-pixel falls.
    let y=this.ground(at,foot-MAX_STEP_HEIGHT-2);
    while(y>0&&this.land.solid(at,y-1))y--;
    return y;
  }
  private walkLevels(x:number,foot:number,scale=1) {
    const center=this.walkSurface(x,foot),leftNear=this.walkSurface(x-8*scale,center),rightNear=this.walkSurface(x+8*scale,center);
    return [this.walkSurface(x-16*scale,leftNear),leftNear,center,rightNear,this.walkSurface(x+16*scale,rightNear)];
  }
  private walkSupport(x:number,foot:number,scale=1) {
    return this.walkLevels(x,foot,scale).sort((a,b)=>a-b)[2];
  }
  private reasonableSlope(x:number,foot:number,direction:number) {
    const heights:number[]=[];let probe=foot;
    for(let i=0;i<13;i++){
      const next=this.walkSurface(x+direction*i*2,probe);
      // A gap beyond the requested position is not an uphill wall. The actual
      // route still checks every step and safe callers reject real drops.
      if(next>=this.bottomY-10||(heights.length&&next-probe>MAX_STEP_HEIGHT))break;
      probe=next;heights.push(probe);
    }
    if(!heights.length)return false;
    if(heights.slice(1).some((y,i)=>Math.abs(y-heights[i])>MAX_STEP_HEIGHT))return false;
    if(Math.max(...heights)-Math.min(...heights)<=MAX_STEP_HEIGHT)return true;
    const limit=Math.tan(MAX_CLIMB_ANGLE*Math.PI/180);
    // Check both a half-tread and full-tread run. One isolated ledge may be stepped over;
    // Sequential probes preserve thin sloped platforms; sustained ramps remain capped.
    for(const end of new Set([Math.min(6,heights.length-1),heights.length-1])){
      if(!end)continue;
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
    if(x<32||x>this.worldWidth-32) return null;
    let previous=t.y+18;const direction=x>=t.x?1:-1,steps=Math.max(1,Math.ceil(Math.abs(x-t.x)/2));
    for(let i=1;i<=steps;i++) {
      const at=t.x+(x-t.x)*i/steps,level=this.walkSupport(at,previous,bodyScale(t));
      const center=this.walkSurface(at,previous);
      // A downward unsupported edge is a fall, never an invisible wall. Safe callers
      // (AI, spawning, supplies) keep allowDrop=false and reject that route.
      if(level-previous>MAX_STEP_HEIGHT||level>=this.bottomY-10){if(allowDrop)return Infinity;return null;}
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
    return {id,bodyScale:referenceBodyScale(vehicleId),slot,crew:seat.crew,team:seat.team,controller:seat.controller,difficulty:seat.difficulty,name:CREW[seat.crew].name,x,y:this.ground(x)-18,hp:v?.hp??150,shield:0,fuel:100,angle:clamp(48,v?.minAngle??5,v?.maxAngle??175),power:68,direction:id===0?1:-1,
      ammo,
      items:Object.fromEntries(ITEMS.map(i=>[i.id,TURN_ITEMS.includes(i.id)?1:0])) as Record<ItemId,number>,
      frozen:0,boost:false,itemUsed:false,fallVelocity:0,fallStart:0,shots:0,damage:0,tactics:2,turnsTaken:0,
      itemReadyTurn:Object.fromEntries(ITEMS.map(i=>[i.id,0])) as Record<ItemId,number>,doubleShot:false,reaction:null,vehicleId,maxHP:v?.hp??150,minAngle:v?.minAngle??5,maxAngle:v?.maxAngle??175,moveSpeed:v?v.movement*1.35:70,moveDistance:v?v.movement*3:100/0.33,nextActionAt:0,lastDelay:v?.waiting??560,poisoned:false,immobile:0,selectedWeapon:v?.normal??'shell',lastPower:null,actionTime:0,movedThisTurn:0,itemDelay:0,delayCommitted:false,outOfBounds:false};
  }
  private placeStartingTanks(){
    const both:number[]=[],one:number[]=[];
    for(let x=60;x<=this.worldWidth-60;x+=8){
      if(!this.stablePlatform(x)||this.ground(x)>this.bottomY-40)continue;
      const probe={...this.tanks[0],x,y:this.ground(x)-18};
      const left=this.traversable(probe,x-60)!==null,right=this.traversable(probe,x+60)!==null;
      if(left||right)one.push(x);if(left&&right)both.push(x);
    }
    const pool=both.length>=4?both:one,close=this.rng()<.22;
    let pair:number[]|null=null;
    for(let attempt=0;attempt<80&&!pair;attempt++){
      const first=pool[Math.floor(this.rng()*pool.length)];
      const options=pool.filter(x=>Math.abs(x-first)>=150&&Math.abs(x-first)<=1400&&Math.abs(this.ground(x)-this.ground(first))<=300&&(close?Math.abs(x-first)<=280:Math.abs(x-first)>=320));
      if(options.length)pair=[first,options[Math.floor(this.rng()*options.length)]].sort((a,b)=>a-b);
    }
    if(!pair&&pool.length>=2){const first=pool[0],last=pool[pool.length-1];if(last-first>=120)pair=[first,last];}
    if(pair){
      const chosen=[...pair];
      for(let i=2;i<this.tanks.length;i++){const options=pool.filter(x=>chosen.every(at=>Math.abs(x-at)>=150)&&chosen.some(at=>Math.abs(x-at)<350&&Math.abs(this.ground(x)-this.ground(at))<=300));chosen.push(options[Math.floor(this.rng()*options.length)]??(i===2?430:850));}
      this.tanks.forEach((t,i)=>{t.x=chosen[i];t.y=this.ground(t.x)-18;t.y=this.tankSupport(t)-18;});this.tanks.forEach(t=>t.direction=this.opponents(t)[0]?.x>t.x?1:-1);
    }
  }
  private generateTerrain(){
    const phase=this.rng()*2,map=this.config.map;
    if(map==='moon'){buildSkyMap(this.land,phase);return;}
    if(buildNativeClassicMap(this.land,map))return;
    if(map==='coast'){
      const src=referenceGrid('coast');
      for(let x=0;x<=this.worldWidth;x++){
        const gx=Math.min(src.gridWidth-1,Math.floor(x/3));let y=0;while(y<src.gridHeight&&!src.values[y*src.gridWidth+gx])y++;
        const top=y*3;if(top>=this.worldHeight)continue;this.land.column(x,top,(x<this.worldWidth*.1||x>this.worldWidth*.9)?this.worldHeight:Math.min(this.worldHeight,top+BRIDGE_THICKNESS));
      }
    }else{
      for(let x=0;x<=this.worldWidth;x++){const u=x/this.worldWidth*1280;if(u<585||u>705){const top=452+31*Math.sin(u/130+.25)+14*Math.sin(u/55)-70*Math.exp(-(((u-370)/110)**2))-65*Math.exp(-(((u-940)/120)**2));this.land.column(x,clamp(top,350,535)/640*this.worldHeight,this.worldHeight);}}
    }
    this.land.rebuild();
  }

  start() {
    if(this.phase!=='lobby') return;
    this.phase='aiming'; this.wind=(this.rng()-0.5)*NATURAL_WIND_LIMIT*2;this.windChangeRound=nextWindRound(this.roundNumber,this.rng);
    this.recordBattle('wind-start','开局风力；每1–2完整轮次变化，单次最多全风程60%',{wind:this.wind,nextRound:this.windChangeRound,maxDelta:MAX_WIND_CHANGE});
    this.active.turnsTaken=1;
    if(this.active.vehicleId) this.selected=vehicleById(this.active.vehicleId).normal;
    this.emit('turn',`${this.active.name}，轮到你了。`);
    this.traceTurn('turn-start');
  }
  private emit(type:GameEvent['type'],message:string,value?:number,x?:number,weapon?:WeaponId,transfer=false) {
    const sequence=this.recordBattle(type,message,{value,x,weapon,transfer});
    this.events.push({type,message,value,x,weapon,transfer,sequence,time:this.elapsed,action:this.turn+1});
    this.log.unshift(message); this.log=this.log.slice(0,24);
  }
  drainEvents() { return this.events.splice(0); }
  setAim(angle:number,power:number) {
    if(!this.humanTurn) return;
    const from={relative:this.active.angle,absolute:this.aim(this.active).absolute,power:this.active.power};
    this.active.angle=clamp(angle,this.active.minAngle,this.active.maxAngle); this.active.power=clamp(power,10,100);
    const to={relative:this.active.angle,absolute:this.aim(this.active).absolute,power:this.active.power};
    if(from.relative!==to.relative||from.power!==to.power)this.recordBattle('aim',`${this.active.name}瞄准：相对${to.relative.toFixed(2)}°／绝对${to.absolute.toFixed(2)}°，力度${to.power.toFixed(2)}，${weaponById(this.selected).name}`,{from,to,weapon:this.selected},false,true);
  }
  selectWeapon(id:WeaponId) {
    if(!this.humanTurn||!weaponById(id)||(this.active.ammo[id]??0)<=0) return false;
    if(this.active.vehicleId) {const v=vehicleById(this.active.vehicleId);if(id!==v.normal&&id!==v.special&&id!=='homing') return false;}
    this.selected=id;this.active.selectedWeapon=id;this.teleporting=false;this.recordBattle('weapon',`${this.active.name}选择${weaponById(id).name}`,{weapon:id});return true;
  }
  move(direction:number,dt:number,ai=false) {
    if(this.paused||this.introLocked||this.phase!=='aiming'||this.active.hp<=0||(!ai&&!this.humanTurn)||this.active.fallVelocity>0||this.active.immobile>0||!Number.isFinite(dt)||dt<=0||!Number.isFinite(direction)||!direction) return false;
    const t=this.active;
    const from={x:t.x,y:t.y,slope:this.tankSlope(t)},fuelBefore=t.fuel;
    t.direction=Math.sign(direction);
    const distance=Math.sign(direction)*t.moveSpeed*Math.min(dt,0.25);
    const x=clamp(t.x+distance,32,this.worldWidth-32);
    const cost=Math.abs(x-t.x)*(100/t.moveDistance)*(t.frozen>0?2:1);
    if(t.fuel<cost||this.tanks.some(e=>e.id!==t.id&&e.hp>0&&Math.abs(e.y-t.y)<42*Math.max(bodyScale(t),bodyScale(e))&&Math.abs(x-e.x)<bodyClearance(t,e))||x===t.x) return false;
    // Check every part of the path, plus tread-scale slope, independent of frame rate.
    const previous=this.traversable(t,x,!ai);if(previous===null) return false;
    t.fuel-=cost;t.movedThisTurn+=Math.abs(x-t.x);t.x=x;
    this.movingUntil[t.id]=this.elapsed+0.15;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    // Every substep already has valid ground. Follow it instead of briefly entering
    // free fall when a fast frame travels down a legitimate slope or small stair.
    if(previous===Infinity){t.fallStart=t.y;t.fallVelocity=1;this.fallOrigins.set(t.id,{cause:'主动驶出平台',action:this.turn+1});}else t.y=previous-18;
    this.recordBattle('move',`${t.name}移动${ai?'（AI）':''}`,{from,to:{x:t.x,y:t.y,slope:this.tankSlope(t)},fuelBefore,fuelAfter:t.fuel,distance:Math.abs(x-from.x),ai},false,true);
    this.collectCrates();this.triggerMines(t);return true;
  }
  face(direction:number) { if(this.humanTurn){if(direction!==this.active.direction)this.recordBattle('face',`${this.active.name}转向${direction<0?'左':'右'}`,{direction});this.active.direction=direction;} }
  itemUnavailable(id:ItemId,ai=false):string|null {
    const t=this.active,i=itemById(id);
    if(this.phase!=='aiming'||this.paused||this.introLocked||(!ai&&!this.humanTurn)) return '等待自己的回合';
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
    this.itemCues.push({tank:t.id,item:id,age:0});
    this.emit('item',`${t.name}使用了${i.name}${i.cost?`，消耗 ${i.cost} 战术点`:''}。`,undefined,t.x);
    this.recordBattle('item-use',`${t.name}使用${i.name}；HP${t.hp}，护盾${t.shield}，道具等待+200`,{item:id,tank:this.traceTanks().find(e=>e.id===t.id)});
  }
  useItem(id:ItemId,ai=false) {
    if(this.itemUnavailable(id,ai)) return false;
    const t=this.active;
    const before={hp:t.hp,shield:t.shield,fuel:t.fuel,boost:t.boost,doubleShot:t.doubleShot,wind:this.wind};
    if(id==='teleport') {this.teleporting=!this.teleporting;if(this.teleporting)this.itemCues.push({tank:t.id,item:id,age:0});this.recordBattle('teleport-arm',`${t.name}${this.teleporting?'装填':'取消'}转移弹`,{armed:this.teleporting});return true;}
    if(id==='repair') {const gain=Math.round(t.maxHP*35/150);t.hp=Math.min(t.maxHP,t.hp+gain);this.float(t.x,t.y-42,`+${gain}`,'#548166');}
    if(id==='shield') t.shield=Math.round(t.maxHP*40/150);
    if(id==='fuel') t.fuel=Math.min(100,t.fuel+55);
    if(id==='boost') t.boost=true;
    if(id==='double') t.doubleShot=true;
    if(id==='wind') this.wind=0;
    this.consumeItem(id);this.recordBattle('item-effect',`${t.name}道具${itemById(id).name}生效：HP${before.hp}→${t.hp}，护盾${before.shield}→${t.shield}`,{item:id,before,after:{hp:t.hp,shield:t.shield,fuel:t.fuel,boost:t.boost,doubleShot:t.doubleShot,wind:this.wind}});return true;
  }
  private transferTo(t:Tank,x:number,impactY:number) {
    if(!Number.isFinite(x)||x<32||x>this.worldWidth-32||this.tanks.some(other=>other.id!==t.id&&other.hp>0&&Math.abs(x-other.x)<bodyClearance(t,other))) return false;
    const levels=[-16,-8,0,8,16].map(dx=>this.walkSurface(x+dx,impactY));
    const foot=levels.sort((a,b)=>a-b)[2];
    if(foot>=this.bottomY-12||Math.max(...levels)-Math.min(...levels)>24)return false;
    const from={x:t.x,y:t.y};this.burst(t.x,t.y,18,'#a4bfd0');
    t.x=x;t.y=foot-18;t.fallVelocity=0;
    this.heardX[t.id]=Math.round(t.x/90)*90;
    this.burst(t.x,t.y,18,'#a4bfd0');
    this.itemCues.push({tank:t.id,item:'teleport',age:0});
    this.emit('item',`${t.name}随转移弹抵达落点。`);this.recordBattle('transfer',`${t.name}转移抵达(${t.x.toFixed(2)},${t.y.toFixed(2)})`,{from,to:{x:t.x,y:t.y}});this.collectCrates();return true;
  }
  aim(t:Tank,angle=t.angle){return aimGeometry(angle,this.tankSlope(t),t.direction);}
  muzzle(t:Tank,angle=t.angle) {
    const vector=this.aim(t,angle),slope=this.tankSlope(t);
    return {x:t.x+Math.sin(slope)*(31*bodyScale(t)-18)+vector.x*31*bodyScale(t),y:t.y+Math.cos(slope)*(18-31*bodyScale(t))+vector.y*31*bodyScale(t)};
  }
  shotSpeed(t:Tank,weapon:WeaponId,power:number){
    const spec=weaponById(weapon),u=clamp((power-50)/50,0,1),blend=u*u*(3-2*u);
    // Legacy small test rigs retain their established units. In original-scale
    // arenas mid-power covers the larger layout; full power reaches high tiers.
    // Low-power range multipliers still fade out at the contact-shot minimum.
    const units=this.worldWidth>WORLD_W?1.6+.6*blend:1;
    return projectileSpeed(power,(weapon==='sniper'?2:spec.speed??1)*units,this.gravity*(weapon==='sniper'?.27:spec.gravity??1));
  }
  launch(t:Tank,weapon:WeaponId,angle=t.angle,power=t.power):Projectile {
    const vector=this.aim(t,angle),muzzle=this.muzzle(t,angle);
    const spec=weaponById(weapon),speed=this.shotSpeed(t,weapon,power);
    const rage=isRaging(t)?1.5:1;
    const weather=t.vehicleId==='water'&&this.snow?1.25:1;
    return {x:muzzle.x,y:muzzle.y,vx:vector.x*speed,vy:vector.y*speed,weapon,owner:t.id,age:0,bounces:0,drillY:null,sub:false,boost:(t.boost?1.5:1)*rage*weather,boostSources:{fire:t.boost?'item':null,rage,snow:weather},trail:[],delay:0,echo:false,fireBoosted:t.boost,homing:false,penetrations:0,scale:launchDamageScale(!!t.vehicleId,weapon),phase:0,lockAge:0,lockX:0,lockY:0,lockTarget:null,volley:0,weaveX:0,weaveY:0,hitCooldown:0,mineArmed:false,digBoost:rage>1?1.15:1,rage:rage>1};
  }
  delayFor(t:Tank,weapon?:WeaponId) {
    const base=t.vehicleId?vehicleById(t.vehicleId).waiting:560;
    const ordinary=t.vehicleId?vehicleById(t.vehicleId).normal:'shell';
    const attack=weapon?(weapon===ordinary?100:200):0;
    // Historical time/attack/item costs are known. Movement uses a disclosed Web-scale conversion.
    return base+attack+t.itemDelay+Math.round(t.movedThisTurn*2+t.actionTime*10);
  }
  fire(ai=false) {
    if(this.paused||this.introLocked||this.phase!=='aiming'||this.active.hp<=0||(!ai&&!this.humanTurn)||(this.active.ammo[this.selected]??0)<=0||this.active.fallVelocity>0) return false;
    const t=this.active,id=this.selected,transfer=this.teleporting;
    if(transfer&&this.itemUnavailable('teleport',ai))return false;
    if(transfer)this.consumeItem('teleport');
    this.phase='flying';this.teleporting=false;this.firedBy=t.id;this.observation={kind:'ground',target:null,point:null};
    if(!transfer&&Number.isFinite(t.ammo[id])) t.ammo[id]--;
    t.shots++;
    t.lastPower=t.power;t.selectedWeapon=id;
    const spec=weaponById(id);
    t.lastDelay=this.delayFor(t,transfer?undefined:id);t.delayCommitted=true;
    if(transfer)this.projectiles=[{...this.launch(t,'shell'),transfer:true,scale:1,boost:1,fireBoosted:false,rage:false,digBoost:1}];
    else if(spec.shots&&spec.shots>1) this.projectiles=Array.from({length:spec.shots},(_,i)=>(()=>{const profile=salvoProfile(t.vehicleId,id,i,spec.shots!),p=this.launch(t,id,t.angle+profile.angle);p.vx*=profile.vx;p.vy*=profile.vy;p.aimOffsetX=profile.aimX;p.aimOffsetY=profile.aimY;p.phase=i*Math.PI*2/spec.shots!;return p;})());
    else if(id==='triple') this.projectiles=[-5,0,5].map(d=>this.launch(t,id,t.angle+d));
    else if(id==='airstrike') this.projectiles=[-38,0,38].map(d=>({...this.launch(t,id),x:clamp(this.targetX+d,20,this.worldWidth-20),y:-40-Math.abs(d),vx:0,vy:190}));
    else this.projectiles=[this.launch(t,id)];
    // Preserve the old carrier spread for legacy bonus salvos; Multi's own
    // normal/special pair above already uses its new shared velocity profile.
    if(!transfer&&!(spec.shots&&spec.shots>1)&&(t.vehicleId==='multi'||t.vehicleId==='dragon'))this.projectiles.forEach((p,i)=>{const profile=salvoProfile(t.vehicleId,id,i,this.projectiles.length);p.vx*=profile.vx;p.vy*=profile.vy;if(spec.effect==='homing'){p.aimOffsetX=profile.aimX;p.aimOffsetY=profile.aimY;}});
    if(!transfer&&spec.homingMode==='volley') {
      const volley=++this.volleySequence,impact=this.predict(t.angle,t.power,id,12,t);
      this.volleyTargets.set(volley,{x:impact.x,y:impact.y,target:null});
      this.projectiles.forEach(p=>p.volley=volley);
    }
    if(t.doubleShot) this.projectiles.push(...this.projectiles.map((p,i)=>({...p,trail:[],delay:DOUBLE_SHOT_INTERVAL*FLIGHT_SPEED,echo:i===0})));
    this.recordBattle('fire-action',`${t.name}发射${transfer?'转移弹':spec.name}，${this.projectiles.length}枚；相对${t.angle.toFixed(2)}°／绝对${this.aim(t).absolute.toFixed(2)}°，力度${t.power.toFixed(2)}，等待${t.lastDelay}`,{owner:t.id,weapon:transfer?'shell':id,selectedWeapon:id,transfer,relative:t.angle,absolute:this.aim(t).absolute,power:t.power,direction:t.direction,position:{x:t.x,y:t.y},slope:this.tankSlope(t),projectileCount:this.projectiles.length,doubleShot:t.doubleShot,doubleShotIntervalSeconds:t.doubleShot?DOUBLE_SHOT_INTERVAL:0,delay:t.lastDelay,ammo:t.ammo[id],rules:this.traceRules()});
    this.projectiles.forEach(p=>this.traceProjectile(p));
    t.boost=false;t.doubleShot=false;this.heardX[t.id]=Math.round(t.x/90)*90;
    this.emit('shot',`${t.name}发射了${transfer?'转移弹':weaponById(id).name}。`,undefined,t.x,transfer?'shell':id,transfer);
    this.burst(this.muzzle(t).x,this.muzzle(t).y,12,'#f5ce89');
    return true;
  }
  setIntroLocked(value:boolean){this.introLocked=value;}
  private observe(kind:ObservationKind,t:Tank|null,point?:{x:number;y:number}){
    if(!this.observation||!['flying','resolving'].includes(this.phase))return;
    if(OBSERVATION_PRIORITY[kind]<OBSERVATION_PRIORITY[this.observation.kind])return;
    this.observation={kind,target:t?.id??null,point:point??(t?{x:t.x,y:t.y}:this.observation.point)};
    if(this.phase==='resolving')this.resolveTime=Math.max(this.resolveTime,OBSERVATION_SECONDS[kind]);
  }
  private traceProjectile(p:Projectile,parent?:number){
    p.traceId=++this.projectileSequence;p.traceParent=parent;
    const owner=this.tanks[p.owner];p.traceLaunch??={action:this.turn+1,time:this.elapsed,owner:p.owner,name:owner?.name,vehicle:owner?.vehicleId,hp:owner?.hp,maxHP:owner?.maxHP,x:p.x,y:p.y,vx:p.vx,vy:p.vy,relative:owner?.angle,absolute:owner?this.aim(owner).absolute:null,power:owner?.power,wind:this.wind,rngIndex:this.trace.rngIndex};
    this.recordBattle('projectile-start',`${this.tanks[p.owner]?.name??p.owner}的${weaponById(p.weapon).name}第${p.traceId}弹${p.delay?'（延迟追加）':''}`,{projectile:p.traceId,parent,owner:p.owner,weapon:p.weapon,volley:p.volley,x:p.x,y:p.y,vx:p.vx,vy:p.vy,delay:p.delay,boost:p.boost,scale:p.scale,fireBoosted:p.fireBoosted,boostSources:p.boostSources,digBoost:p.digBoost,aimOffsetX:p.aimOffsetX,aimOffsetY:p.aimOffsetY});return p;
  }
  private projectileHit(p:Projectile) {
    if(p.age<0.09) return undefined;
    return this.tanks.find(t=>t.hp>0&&this.canDamage(t,p.owner)&&Math.abs(t.x-p.x)<bodyBroadPhase(t).x&&Math.abs(t.y-p.y)<bodyBroadPhase(t).y&&pointHitsTank(t,p.x,p.y,this.tankSlope(t)));
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
      this.recordBattle('projectile-end',`第${p.traceId??'?'}枚黄金导弹消散：目标死亡／不可攻击`,{projectile:p.traceId,volley,lockTarget:p.lockTarget,sharedTarget:this.volleyTargets.get(volley)?.target,x:p.x,y:p.y});
      p.trail=[];p.lockTarget=null;p.homing=false;p.lockAge=0;p.lockX=0;p.lockY=0;
      return false;
    });
    this.volleyTargets.delete(volley);
  }
  private stepProjectile(p:Projectile,dt:number):boolean {
    if(this.invalidVolleyTarget(p)){this.cancelVolley(p.volley);return true;}
    if(p.delay>0) {p.delay-=dt;if(p.delay<=0){this.recordBattle('projectile-echo',`第${p.traceId??'?'}弹延迟装填完成`,{projectile:p.traceId,weapon:p.weapon,owner:p.owner});if(p.echo)this.emit('shot','双发装填追加了一轮齐射。',undefined,this.tanks[p.owner].x,p.weapon);}return false;}
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
        if(!p.homing){this.emit('lock',`${spec.name}锁定目标，开始追踪。`,undefined,p.x,p.weapon);this.recordBattle('projectile-lock',`第${p.traceId??'?'}弹 ${spec.name}锁定${target.name}`,{projectile:p.traceId,volley:p.volley,target:target.id,owner:p.owner,weapon:p.weapon,aimX,aimY,x:p.x,y:p.y,eligible:this.canDamage(target,p.owner)});}
        p.homing=true;p.lockX=aimX;p.lockY=aimY;p.lockAge+=dt;
      }
    }
    p.vy+=g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(effect==='helix') {
      const speed=Math.max(1,Math.hypot(p.vx,p.vy)),offset=Math.sin(p.age*17+p.phase)*18*Math.min(1,p.age*5);
      p.weaveX=-p.vy/speed*offset;p.weaveY=p.vx/speed*offset;p.x+=p.weaveX;p.y+=p.weaveY;
    }
    if(!p.transfer&&this.fireLine&&!p.fireBoosted&&(oldX-this.fireLine.x)*(p.x-this.fireLine.x)<=0&&p.y>=this.fireLine.top&&p.y<=this.fireLine.bottom) {
      p.boost*=1.5;p.fireBoosted=true;p.trail=[];p.boostSources={...(p.boostSources??{rage:1,snow:1}),fire:'line'};this.burst(p.x,p.y,10,'#f5a956');
    }
    if(!p.transfer&&!p.traceCrossed&&this.fireLine&&(oldX-this.fireLine.x)*(p.x-this.fireLine.x)<=0&&p.y>=this.fireLine.top&&p.y<=this.fireLine.bottom){p.traceCrossed=true;p.traceFireLine={...this.fireLine,time:this.elapsed,xImpact:p.x,yImpact:p.y};this.recordBattle('fire-line',`第${p.traceId??'?'}弹穿越火线；${p.boostSources?.fire==='item'?'道具已强化，不重复乘1.5':'火线强化×1.5'}，总boost=${p.boost}`,{projectile:p.traceId,fireBoosted:p.fireBoosted,boost:p.boost,sources:p.boostSources,line:this.fireLine});}
    if(p.fireBoosted){p.trail.push({x:p.x,y:p.y});if(p.trail.length>40)p.trail.shift();}
    else if(!p.transfer&&weaponHasTrail(p.weapon)){
      p.trail.push({x:p.x,y:p.y});while(p.trail.length>MODERN_TRAIL_POINTS)p.trail.shift();
      let length=0;for(let i=p.trail.length-1;i>0;i--){const newer=p.trail[i],older=p.trail[i-1],segment=Math.hypot(newer.x-older.x,newer.y-older.y);if(length+segment>MODERN_TRAIL_LENGTH){const fraction=(MODERN_TRAIL_LENGTH-length)/segment;p.trail[i-1]={x:newer.x+(older.x-newer.x)*fraction,y:newer.y+(older.y-newer.y)*fraction};p.trail.splice(0,i-1);break;}length+=segment;}
    }
    else if(p.trail.length)p.trail.length=0;
    if(p.weapon==='cluster'&&!p.sub&&p.vy>=0) {
      for(let i=-2;i<=2;i++) this.projectiles.push(this.traceProjectile({...p,vx:p.vx*0.75+i*76,vy:40+Math.abs(i)*16,sub:true,age:0,trail:[]},p.traceId));
      this.burst(p.x,p.y,16,'#e0c384');return true;
    }
    if(p.x< -50||p.x>this.worldWidth+50||p.y>this.worldHeight+70||p.age>12){this.observe('ground',null,{x:clamp(p.x,0,this.worldWidth),y:clamp(p.y,-this.worldHeight,this.bottomY)});this.recordBattle('projectile-end',`第${p.traceId??'?'}弹${p.age>12?'超时':'越界'}消失`,{projectile:p.traceId,weapon:p.weapon,x:p.x,y:p.y,age:p.age});if(p.transfer)this.emit('item','转移弹未落在战场内，转移失败。');return true;}
    const collision=p.hitCooldown<=0?flightCollision(this.land,{x:oldX,y:oldY},p,this.tanks.filter(t=>t.hp>0).map(t=>({tank:t,slope:this.tankSlope(t),eligible:this.canDamage(t,p.owner)})),p.age):null;
    if(collision){p.x=collision.x;p.y=collision.y;}
    const hitTank=collision?.body?.tank??this.projectileHit(p);
    if(p.transfer&&(this.land.solid(p.x,p.y)||hitTank)){
      if(!this.transferTo(this.tanks[p.owner],p.x,p.y))this.emit('item','转移弹落点无法站立，转移失败。');
      return true;
    }
    if(p.hitCooldown<=0&&(this.land.solid(p.x,p.y)||hitTank||p.drillY!==null)) {
      if(effect==='mine'&&!hitTank) {
        this.mines.push({x:p.x,y:this.ground(p.x,oldY)-3,owner:p.owner,weapon:p.weapon,boost:p.boost,boostSources:p.boostSources,traceOrigin:p.traceId,traceLaunch:p.traceLaunch});
        this.recordBattle('mine-place',`${this.tanks[p.owner].name}布设地雷`,{projectile:p.traceId,weapon:p.weapon,x:p.x,y:p.y,boost:p.boost,sources:p.boostSources});
        const own=this.mines.filter(m=>m.owner===p.owner);if(own.length>4) this.mines.splice(this.mines.indexOf(own[0]),1);
        this.burst(p.x,p.y,8,spec.color);return true;
      }
      if(effect==='orbital'&&!p.sub) {
        this.excavateImpact(p,12,8,hitTank?.id);this.burst(p.x,p.y,12,'#b8cfea');
        this.projectiles.push(this.traceProjectile({...p,x:p.x,y:-50,vx:0,vy:680,sub:true,trail:[],age:0,delay:0.3},p.traceId));return true;
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
        this.projectiles.push(this.traceProjectile({...p,penetrations:p.penetrations+1,trail:[],hitCooldown:.025},p.traceId));
      }
      return true;
    }
    return false;
  }
  crater(x:number,y:number,radius:number,depth=radius,source?:{owner:number;weapon:WeaponId;traceId?:number}) {
    const removed=this.land.removeEllipse(x,y,radius,depth);
    const event=this.recordBattle('terrain',`挖土(${x.toFixed(2)},${y.toFixed(2)})，半径${radius.toFixed(2)}／深${depth.toFixed(2)}，移除${removed}像素（永久层保留）`,{x,y,radius,depth,removed,source});
    for(const t of this.tanks) if(t.hp>0&&this.tankSupport(t)-18>t.y+3 && t.fallVelocity===0) { t.fallStart=t.y;t.fallVelocity=1;this.fallOrigins.set(t.id,{event,source:traceClone(source??null),terrain:{x,y,radius,depth,removed},cause:'地形支撑被破坏'}); }
    for(const c of this.crates) c.y=this.ground(c.x,c.y-5)-14;
    this.crates=this.crates.filter(c=>c.y<this.bottomY-14);
  }
  private excavateImpact(p:Projectile,radius:number,depth:number,directTarget?:number){
    if(radius<=0||depth<=0)return;
    let x=p.x,y=p.y;
    if(directTarget!==undefined){
      const target=this.tanks[directTarget],foot=target.y+18,surface=this.tankSupport(target);
      if(surface<this.bottomY&&Math.abs(surface-foot)<=28){
        x=clamp(p.x,target.x-16,target.x+16);y=surface;
      }
    }
    this.crater(x,y,radius,depth,p);
  }
  private explode(p:Projectile,directTarget?:number) {
    if(this.explosionDepth++===0)for(const t of this.tanks)if(t.hp>0){const pose=this.landPose(t,true);if(pose)this.blastGrounded.set(t.id,pose);}
    try {
    if(p.traceId===undefined)this.traceProjectile(p,p.traceParent);
    const direct=directTarget!==undefined;this.observe('ground',null,{x:p.x,y:p.y});
    const w=weaponById(p.weapon), radius=w.radius;
    const impact=this.recordBattle('impact',`第${p.traceId}弹 ${this.tanks[p.owner]?.name??p.owner}的${w.name}${direct?`直接命中${this.tanks[directTarget!]?.name}`:'命中地形／爆炸波及'}；(${p.x.toFixed(2)},${p.y.toFixed(2)})`,{projectile:p.traceId,parent:p.traceParent,owner:p.owner,weapon:p.weapon,directTarget,x:p.x,y:p.y,age:p.age,boost:p.boost,scale:p.scale,fireBoosted:p.fireBoosted,sources:p.boostSources});
    const damageGeometry=this.tanks.map(t=>({tank:t,distance:Math.hypot(t.x-p.x,t.y-p.y),scale:impactDamageScale(t,p.x,p.y,this.tankSlope(t),radius,directTarget===t.id)}));
    const color=w.color;
    this.blasts.push({x:p.x,y:p.y,radius,life:0.65,maxLife:0.65,color,weapon:p.weapon});
    this.burst(p.x,p.y,Math.round(radius*0.6),color);
    this.shake=Math.min(10,radius/10);
    const dig=excavation(p.weapon,direct);
    dig.radius*=p.digBoost;dig.depth*=p.digBoost;
    this.excavateImpact(p,dig.radius,dig.depth,directTarget);
    for(const {tank:t,distance,scale:distanceScale} of damageGeometry) {
      if(directTarget!==t.id&&distance>radius+26) continue;
      if(!this.canDamage(t,p.owner)){this.recordBattle('damage-blocked',`${t.name}未受伤：${t.id===p.owner?'自伤':'友伤'}关闭`,{target:t.id,owner:p.owner,weapon:p.weapon,projectile:p.traceId,impact,rules:this.traceRules()});continue;}
      if(p.weapon==='emp') {const before={shield:t.shield,fuel:t.fuel};t.shield=0;t.fuel=Math.max(0,t.fuel-35);this.float(t.x,t.y-65,'脉冲','#ac88bc');this.recordBattle('status',`${t.name}被脉冲移除护盾${before.shield}，燃料−35（伤害计算前）`,{target:t.id,weapon:p.weapon,impact,before,after:{shield:t.shield,fuel:t.fuel}});}
      if(p.weapon==='ice') {t.frozen=2;this.float(t.x,t.y-65,'冻结 ×2','#79aebe');this.recordBattle('status',`${t.name}冻结2次行动`,{target:t.id,weapon:p.weapon,impact,frozen:2});}
      const mineScale=w.effect==='mine'?(!p.mineArmed?1/3:t.vehicleId==='mine'?.5:1):1;
      const era=eraDamageFactor(this.tanks[p.owner]?.vehicleId,t.vehicleId);
      const damage=Math.round(w.damage*p.scale*p.boost*mineScale*era.value*distanceScale);
      const sources=p.boostSources??{fire:p.fireBoosted?'line':null,rage:p.rage?1.5:1,snow:1},fire=sources.fire?1.5:1,known=fire*sources.rage*sources.snow;
      const factors=[era,{source:'弹体scale（实际实现）',value:p.scale},{source:sources.fire==='item'?'威力加强（fireBoosted仅一次）':sources.fire==='line'?'火线（fireBoosted仅一次）':'未强化',value:fire},{source:'海怪发怒',value:sources.rage},{source:'水鬼雪天',value:sources.snow},{source:'继承／外部boost修正',value:p.boost/known},{source:'地雷直击／踩踏系数',value:mineScale},{source:'距离衰减',value:distanceScale}];
      this.damage(t,damage,p.owner,false,directTarget===t.id?'direct':'graze',undefined,{cause:w.effect==='mine'?'mine':directTarget===t.id?'direct':'graze',weapon:p.weapon,projectile:p.traceId,impact,base:w.damage,factors,formula:'round(base × scale × boost × mineScale × distanceScale × eraScale)',dig:{...dig,digBoost:p.digBoost,source:p.rage?'海怪发怒挖土×1.15':'武器挖土（不乘入伤害）'},origin:{projectileStart:p.traceId,parent:p.traceParent,launch:p.traceLaunch,impact:{x:p.x,y:p.y,age:p.age},fireLine:p.traceFireLine,boost:p.boost,fireBoosted:p.fireBoosted,weaponBase:w.damage,fullDamageArea:{blastDistance:FULL_BLAST_DISTANCE,directCore:{xRadius:23,yRadius:32,yCenter:-9}},dragon:this.tanks[p.owner]?.vehicleId==='dragon'?'暴龙固有武器基础伤害，无额外暴龙倍率':null}});
      if(w.effect==='poison'&&damage>0&&t.hp>redHealthLimit(t)) {
        const fresh=!t.poisoned;t.poisoned=true;t.poisonOwner=p.owner;
        if(fresh){this.float(t.x,t.y-95,'中毒','#6c994b',t.id);this.emit('poison',`${t.name}中了毒箭，自己的行动结束时结算毒伤。`,undefined,t.x,p.weapon);}
      }
      if(w.effect==='freeze'&&t.id!==p.owner&&damage>0){t.immobile=1;this.recordBattle('status',`${t.name}被紫水定身1次自己的行动`,{target:t.id,weapon:p.weapon,impact,immobile:1});}
    }
    if(p.weapon==='napalm') this.fires.push({x:p.x,y:p.y,radius:60,turns:3,owner:p.owner});
    if(w.effect==='fire'&&!this.snow) this.fires.push({x:p.x,y:this.ground(p.x,p.y-5),radius:25,turns:6,owner:p.owner,weapon:p.weapon,clock:0});
    if(w.effect==='gas'&&!this.snow) this.gases.push({x:p.x,y:p.y,radius:75,turns:6,owner:p.owner,clock:0});
    for(const mine of [...this.mines]) if(Math.hypot(mine.x-p.x,mine.y-p.y)<radius) {
      const index=this.mines.indexOf(mine);
      if(index<0) continue; // A nested blast may already have detonated this mine.
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[mine.owner],mine.weapon),x:mine.x,y:mine.y,boost:mine.boost,boostSources:mine.boostSources??{fire:null,rage:1,snow:1,inherited:mine.boost},traceParent:mine.traceOrigin,traceLaunch:mine.traceLaunch,mineArmed:true});
    }
    this.emit('explosion',`${w.name}${direct?'直接命中，集中伤害':'命中地形，扩大挖地'}。`,undefined,p.x,p.weapon);
    // A point-blank collision can kill before the .18s guidance acquisition.
    // Only use that victim when no primary target was acquired: collateral
    // deaths must not cancel a volley still pursuing a living primary target.
    if(w.homingMode==='volley'&&p.volley>0&&directTarget!==undefined&&this.volleyTargets.get(p.volley)?.target===null) {
      const target=this.tanks[directTarget];
      if(!target||target.hp<=0||!this.canDamage(target,p.owner))this.cancelVolley(p.volley);
    }
    } finally {if(--this.explosionDepth===0)this.blastGrounded.clear();}
  }
  private triggerMines(t:Tank) {
    if(t.vehicleId==='laser'||t.vehicleId==='water') return;
    for(const m of [...this.mines]) if(Math.hypot(t.x-m.x,t.y-m.y)<30) {
      const index=this.mines.indexOf(m);
      if(index<0) continue;
      this.mines.splice(index,1);
      this.explode({...this.launch(this.tanks[m.owner],m.weapon),x:m.x,y:m.y,boost:m.boost,boostSources:m.boostSources??{fire:null,rage:1,snow:1,inherited:m.boost},traceParent:m.traceOrigin,traceLaunch:m.traceLaunch,mineArmed:true},t.id);
    }
  }
  damage(t:Tank,amount:number,owner:number,ignoreShield=false,reaction:'direct'|'graze'|'fall'='graze',status?:'poison',context:DamageContext={cause:status==='poison'?'poison':reaction==='fall'?'fall':'unknown'}) {
    if(t.hp<=0)return;
    if(context.cause==='fall'&&!this.config.fallDamage){this.recordBattle('damage-blocked',`${t.name}未受坠落伤害：开关关闭`,{target:t.id,owner,amount,context,rules:this.traceRules()});return;}
    if(reaction!=='fall'&&!this.canDamage(t,owner)){this.recordBattle('damage-blocked',`${t.name}未受伤：伤害开关阻止`,{target:t.id,owner,amount,context,rules:this.traceRules()});return;}
    const hpBefore=t.hp,shieldBefore=t.shield;
    const absorbed=ignoreShield?0:Math.min(t.shield,amount);
    t.shield-=absorbed;const actual=Math.min(t.hp,amount-absorbed);t.hp-=actual;
    if(t.hp<=0)this.settleDefeat(t);
    if(t.hp<=0)this.observe('death',t);else if((actual>0||absorbed>0)&&['direct','graze','mine'].includes(context.cause))this.observe('hit',t);
    const high=amount>=t.maxHP*.5||actual>=t.maxHP*.5,cause=DAMAGE_CAUSES[context.cause]??context.cause,source=this.tanks[owner]?.name??`来源${owner}`,weapon=context.weapon?weaponById(context.weapon).name:'无武器／直接机制扣血';
    const detail={...context,base:context.base??amount,factors:context.factors??[],requested:amount,actual,hpBefore,hpAfter:t.hp,shieldBefore,shieldAfter:t.shield,absorbed,ignoreShield,owner,target:t.id,sourceName:source,targetName:t.name,weaponName:weapon,relation:t.id===owner?'self':this.tanks[owner]?.team===t.team?'ally':'enemy',rules:this.traceRules(),reaction,highDamage:high,position:{x:t.x,y:t.y},stateBefore:{poisoned:t.poisoned,frozen:t.frozen,immobile:t.immobile,rage:isRaging({...t,hp:hpBefore})}};
    const summary=`${high?'⚠ 高伤害 ':''}${source}→${t.name}，${weapon}／${cause}：基础${detail.base}${detail.factors.map(f=>` ×${f.value.toFixed(4)}[${f.source}]`).join('')}，计算${amount}，护盾吸收${absorbed}，实际扣血${actual}，HP ${hpBefore}→${t.hp}`;
    const damageEvent=this.recordBattle('damage',summary,detail,t.hp<=0);
    if(t.hp<=0){const fallOrigin=this.fallOrigins.get(t.id) as any,trigger=fallOrigin?.source;const chain=['fall','out'].includes(context.cause)?`；触发：${fallOrigin?.cause??'失去地形支撑'}${trigger?`，${this.tanks[trigger.owner]?.name??trigger.owner}的${weaponById(trigger.weapon).name}挖土#${fallOrigin.event}`:''}`:'';this.recordBattle('death',`‼ ${t.name}死亡：${cause}，${source}／${weapon}；致死伤害#${damageEvent}，HP ${hpBefore}→0${chain}`,{target:t.id,cause:context.cause,damageEvent,lethal:detail,fallOrigin,defeat:t.defeat,outOfBounds:t.outOfBounds},true);}
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
    const previousVisual=this.visualRandom;this.visualRandom=true;
    for(let i=0;i<count;i++) {
      const a=this.rng()*Math.PI*2,speed=30+this.rng()*170,life=0.35+this.rng()*0.6;
      this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-30,life,maxLife:life,size:2+this.rng()*5,color:i%3===0?'#f6ecd5':color});
    }
    this.visualRandom=previousVisual;
  }
  private updateTanks(dt:number) {
    for(const t of this.tanks) {
      if(t.hp<=0) continue;
      const ground=this.tankSupport(t)-18;
      if(t.y<ground-0.5 || t.fallVelocity>0) {
        if(!t.fallVelocity) {t.fallStart=t.y;t.fallVelocity=1;this.fallOrigins.set(t.id,{cause:'失去地形支撑',action:this.turn+1});}
        this.observe('fall',t);t.fallVelocity+=this.gravity*dt;t.y+=t.fallVelocity*dt;
        if(ground<this.bottomY-18&&t.y>=ground) {
          t.y=ground; const fall=t.y-t.fallStart;t.fallVelocity=0;
          this.observe('fall',t);this.recordBattle('landing',`${t.name}落地，落差${fall.toFixed(2)}，坠落伤害${this.config.fallDamage?'开启':'关闭'}`,{target:t.id,distance:fall,fallDamage:!!this.config.fallDamage,position:{x:t.x,y:t.y}});
          if(fall>48&&this.config.fallDamage) { const damage=Math.round((fall-35)*0.3);this.damage(t,damage,this.firedBy,true,'fall',undefined,{cause:'fall',weapon:(this.fallOrigins.get(t.id) as any)?.source?.weapon,base:fall-35,factors:[{source:'坠落落差系数',value:.3}],formula:'round((fallDistance - 35) × 0.3)，落差>48',origin:{fallDistance:fall,fallStart:t.fallStart,attributedOwner:this.firedBy,trigger:this.fallOrigins.get(t.id)}});this.float(t.x,t.y-60,'坠落','#bc876c'); }
        }
      }
      if(t.y+18>=this.bottomY) {t.outOfBounds=true;this.damage(t,t.hp,this.firedBy,true,'fall',undefined,{cause:'out',weapon:(this.fallOrigins.get(t.id) as any)?.source?.weapon,base:t.hp,formula:'掉穿地图底边，扣除剩余HP（绕过护盾）',origin:{bottomY:this.bottomY,fallStart:t.fallStart,attributedOwner:this.firedBy,trigger:this.fallOrigins.get(t.id)}});this.emit('hit',`${t.name}掉出了战场。`); }
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
      this.recordBattle('crate-pickup',`${t.name}拾取${name}，填入空槽`,{target:t.id,crate:c,item,items:t.items,ammo:t.ammo});
      this.emit('crate',`${t.name}拾取了${name}补给。`,undefined,t.x);return false;
    });
  }
  private checkWin() {
    const teams=new Set(this.tanks.filter(t=>t.hp>0).map(t=>t.team));
    if(teams.size>1)return false;
    this.traceTurn('turn-end');
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
      if(loss)this.damage(previous,loss,previous.poisonOwner??this.enemy.id,true,'graze','poison',{cause:'poison',weapon:'crossbow-special',base:previous.maxHP,factors:[{source:'每次自己行动后的毒伤',value:.2}],formula:'min(ceil(maxHP × 20%), HP - ceil(maxHP × 30%))',origin:{redFloor:floor,poisonOwner:previous.poisonOwner}});
      if(previous.hp<=floor)previous.poisoned=false;
    }
    if(!previous.delayCommitted)previous.lastDelay=this.delayFor(previous);
    this.traceTurn('turn-end');
    previous.boost=false;previous.doubleShot=false;
    const living=this.tanks.filter(t=>t.hp>0);
    this.roundPending=this.roundPending.filter(id=>id!==previous.id&&this.tanks[id].hp>0);
    const completedRound=this.roundPending.length===0;
    if(completedRound){this.roundNumber++;this.roundPending=living.map(t=>t.id);}
    if(this.delayEnabled)previous.nextActionAt+=previous.lastDelay;
    // Teams rotate; within a team DELAY still chooses the next human seat.
    // Every living teammate acts once before repeating. Individual PVP retains initiative.
    const teamGame=this.tanks.length>2&&new Set(this.tanks.map(t=>t.team)).size<this.tanks.length;
    if(teamGame){
      const pending=living.filter(t=>this.roundPending.includes(t.id));
      const teams=[...new Set(this.tanks.map(t=>t.team))],at=teams.indexOf(previous.team);
      const team=Array.from({length:teams.length},(_,n)=>teams[(at+n+1)%teams.length]).find(team=>pending.some(t=>t.team===team))!;
      this.current=pending.filter(t=>t.team===team).sort((a,b)=>this.delayEnabled?a.nextActionAt-b.nextActionAt||a.id-b.id:a.id-b.id)[0].id;
    }else if(this.delayEnabled)this.current=living.sort((a,b)=>a.nextActionAt-b.nextActionAt||a.id-b.id)[0].id;
    else {do{this.current=(this.current+1)%this.tanks.length;}while(this.active.hp<=0);}
    this.turn++;
    if(completedRound&&this.roundNumber>=this.windChangeRound){
      const from=this.wind;this.wind=nextNaturalWind(from,this.rng);this.windChangeRound=nextWindRound(this.roundNumber,this.rng);
      this.recordBattle('wind-change',`第${this.roundNumber}完整轮风力变化`,{from,to:this.wind,maxDelta:MAX_WIND_CHANGE,nextRound:this.windChangeRound});
      this.emit('wind','风向轻轻变了。');
    }
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
    this.clock=this.config.timer;this.aiTime=0;this.aiMoveGoal=null;this.aiPending=null;this.aiDecision=null;
    this.traceTurn('turn-start');
    for(const f of this.fires) if(!f.weapon&&Math.abs(this.active.x-f.x)<f.radius&&Math.abs(this.active.y+18-(f.y??this.ground(f.x)))<100) this.damage(this.active,14,f.owner,false,'graze',undefined,{cause:'fire',weapon:'napalm',base:14,formula:'行动开始时旧燃烧区域固定14伤害',origin:f});
    // Six action handoffs is our lifetime cap, not a verified original-client duration.
    for(const f of this.fires)if(f.weapon||this.turn%this.tanks.length===0)f.turns--;
    this.fires=this.fires.filter(f=>f.turns>0);
    for(const gas of this.gases)gas.turns--;
    this.gases=this.gases.filter(gas=>gas.turns>0);
    if(this.turn>=40) {this.damage(this.active,Math.ceil(this.active.maxHP*.08),this.active.id,true,'fall',undefined,{cause:'sudden',base:this.active.maxHP,factors:[{source:'第40次行动后决胜扣血',value:.08}],formula:'ceil(maxHP × 8%)，绕过护盾与伤害开关'});this.float(this.active.x,this.active.y-55,'决胜时刻','#bd765d');}
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
        const reachable=landing?this.traversable(human,landing.x):null;
        // A lower-layer player cannot collect a box resting on the roof above.
        if(start<32||start>this.worldWidth-32||!landing||landing.x<40||landing.x>this.worldWidth-40||!this.stablePlatform(landing.x)||reachable===null||Math.abs(landing.y+14-reachable)>MAX_STEP_HEIGHT||Math.abs(landing.x-human.x)>maxDistance||this.crates.some(c=>Math.abs(c.x-landing.x)<45)) continue;
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
      if(x<32||x>this.worldWidth-32||y>=this.bottomY-14) return null;
      if(y>=target) return {x,y:target};
    }
    return null;
  }
  acceptHandoff() { if(this.phase==='handoff') this.phase='aiming'; }
  skipTurn() { if(this.phase==='aiming'&&!this.paused&&!this.introLocked) this.nextTurn(); }
  predict(angle=this.active.angle,power=this.active.power,weapon=this.selected,maxTime=10,tank=this.active) {
    const p=this.launch(tank,weapon,angle,power),points:{x:number;y:number}[]=[];
    const dt=1/90;let direct=false;
    for(let i=0;i<maxTime/dt;i++) {
      p.vx+=this.wind*SHOT_WIND_GAIN*(weapon==='sniper'?0.25:1)*dt;
      p.vy+=this.gravity*(weapon==='sniper'?0.27:weaponById(weapon).gravity??1)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(i%6===0) points.push({x:p.x,y:p.y});
      direct=!this.fog&&i*dt>=0.09&&this.tanks.some(t=>t.hp>0&&this.canDamage(t,p.owner)&&Math.abs(t.x-p.x)<bodyBroadPhase(t).x&&Math.abs(t.y-p.y)<bodyBroadPhase(t).y&&pointHitsTank(t,p.x,p.y,this.tankSlope(t)));
      if(p.x<0||p.x>this.worldWidth||p.y>this.worldHeight||this.land.solid(p.x,p.y)||direct) break;
    }
    return {x:p.x,y:p.y,points,direct};
  }
  planAI() {if(this.introLocked)return;
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
    if(weapon==='airstrike') {this.selected=weapon;this.targetX=clamp(enemyX+aiAimOffset(difficulty,weapon,this.rng).offset,20,this.worldWidth-20);return;}
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
      fire.radius=Math.min(90,fire.radius+dt*8);fire.x=clamp(fire.x+this.wind*.45*dt,0,this.worldWidth);
      fire.y=this.ground(fire.x,(fire.y??0)-12);fire.clock=(fire.clock??0)+dt;
      const slope=Math.abs(this.ground(fire.x-10,fire.y-12)-this.ground(fire.x+10,fire.y-12));
      if(fire.y>=this.bottomY||slope>Math.tan(35*Math.PI/180)*20){fire.turns=0;continue;}
      while(fire.clock>=1){fire.clock-=1;for(const tank of this.tanks){
        if(Math.abs(tank.x-fire.x)>=fire.radius||Math.abs(tank.y+18-this.ground(tank.x,fire.y-12))>26)continue;
        const rate=tank.vehicleId==='bowl'||tank.vehicleId==='dragon'?1:tank.vehicleId==='water'?4:2;
        this.damage(tank,rate,fire.owner,false,'graze',undefined,{cause:'fire',weapon:fire.weapon,base:rate,formula:'每模拟秒火烧；大腕／暴龙1、水鬼4、其余2',origin:{...fire}});
      }}
    }
    for(const gas of this.gases){
      gas.x=clamp(gas.x+this.wind*2.8*dt,0,this.worldWidth);gas.clock=(gas.clock??0)+dt;
      while(gas.clock>=1){gas.clock-=1;for(const tank of this.tanks)if(Math.hypot(tank.x-gas.x,tank.y-gas.y)<gas.radius)this.damage(tank,2,gas.owner,false,'graze',undefined,{cause:'gas',weapon:'duke-special',base:2,formula:'每模拟秒毒气2伤害',origin:{...gas}});}
    }
    this.fires=this.fires.filter(f=>f.turns>0);
  }
  update(dt:number) {
    if(this.paused||this.introLocked) return;
    for(const t of this.tanks)if(t.hp<=0&&!t.deathResolved)this.settleDefeat(t);
    dt=Math.min(dt,0.05);this.elapsed+=dt;
    this.itemCues=this.itemCues.filter(c=>{c.age+=dt;return c.age<ITEM_CUE_SECONDS;});
    this.shake=Math.max(0,this.shake-dt*16);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.vy+=170*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
    this.blasts=this.blasts.filter(b=>{b.life-=dt;return b.life>0;});
    this.texts=this.texts.filter(t=>{t.life-=dt;t.y-=dt*20;return t.life>0;});
    for(const tank of this.tanks) if(tank.reaction) {tank.reaction.remaining-=dt;if(tank.reaction.remaining<=0) tank.reaction=null;}
    if(this.phase==='ended'){
      this.resultAge+=dt;
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
    // The added, settled observation window must not grant extra burn/gas DPS.
    if(this.phase!=='resolving'||this.resolveHazardTime>0||this.tanks.some(t=>t.hp>0&&t.fallVelocity>0))this.updateHazards(this.phase==='resolving'&&this.resolveHazardTime>0?Math.min(dt,this.resolveHazardTime):dt);
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
      if(this.projectiles.length===0) {this.phase='resolving';this.resolveHazardTime=.55;this.resolveTime=OBSERVATION_SECONDS[this.observation?.kind??'ground'];this.recordBattle('observation','弹着后观察战场',{...this.observation,seconds:this.resolveTime});this.volleyTargets.clear();}
    } else if(this.phase==='resolving') {
      this.resolveTime-=dt;this.resolveHazardTime=Math.max(0,this.resolveHazardTime-dt);
      if(this.resolveTime<=0&&this.tanks.every(t=>t.hp<=0||t.fallVelocity===0)) this.nextTurn();
    }
  }
}
