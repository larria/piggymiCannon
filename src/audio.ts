const asset=(name:string)=>`${import.meta.env.BASE_URL}audio/${name}`;
import {weaponById,type WeaponId} from './catalog';
import type {VehicleId} from './vehicles';
import {BGM_TRACKS,COMMON_CLIPS,vehicleClips,weaponSoundClip,type AudioScene} from './audio-catalog';
export class AudioManager {
  music=new Audio(asset(BGM_TRACKS.lobby));
  soundEnabled=false;musicEnabled=false;volume=0.65;unlocked=false;
  private paused=false;
  private playingEffects=new Set<HTMLAudioElement>();
  private pausedEffects=new Set<HTMLAudioElement>();
  private scene:AudioScene='lobby';
  private buffers=new Map<string,AudioBuffer>();
  private loading=new Map<string,Promise<void>>();
  private sources=new Set<AudioBufferSourceNode>();
  private lastSamples=new Map<string,number>();
  private movementSample:AudioBufferSourceNode|null=null;private movingVehicle:VehicleId|null=null;
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private charge:{oscillators:OscillatorNode[];gain:GainNode}|null=null;
  private movement:{oscillator:OscillatorNode;noise:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}|null=null;
  private tracking:{oscillator:OscillatorNode;gain:GainNode;pan:StereoPannerNode}|null=null;private lastLock=-10;
  constructor() {this.music.loop=true;this.music.volume=this.volume*0.55;}
  unlock() {this.unlocked=true;try{this.graph();void this.preloadForMatch([]);}catch{/* Optional audio. */}if(this.musicEnabled&&!this.paused) this.start();}
  setMusicEnabled(enabled:boolean) {this.musicEnabled=enabled;if(enabled&&this.unlocked&&!this.paused)this.start();else this.music.pause();}
  setSoundEnabled(enabled:boolean) {this.soundEnabled=enabled;if(this.master&&this.context)this.master.gain.setTargetAtTime(enabled?this.volume:0,this.context.currentTime,.02);if(!enabled)this.resetEffects();}
  private start() {void this.music.play().catch(()=>{});}
  setVolume(value:number) {this.volume=Math.max(0,Math.min(1,value));this.music.volume=this.volume*0.55;for(const clip of this.playingEffects)clip.volume=this.volume*.75;if(this.master&&this.context) this.master.gain.setTargetAtTime(this.soundEnabled?this.volume:0,this.context.currentTime,0.02);}
  pause(paused:boolean) {this.paused=paused;if(paused) {this.music.pause();this.stopCharge();this.stopMovement();this.stopTracking();if(this.context)void this.context.suspend().catch(()=>{});for(const clip of this.playingEffects)if(!clip.paused){clip.pause();this.pausedEffects.add(clip);}}else {if(this.context&&this.unlocked)void this.context.resume().catch(()=>{});if(this.musicEnabled&&this.unlocked)this.start();if(this.soundEnabled&&this.unlocked)for(const clip of this.pausedEffects)void clip.play().catch(()=>{});this.pausedEffects.clear();}}
  setScene(scene:AudioScene){if(this.scene===scene)return;this.scene=scene;this.music.pause();this.music.src=asset(BGM_TRACKS[scene]);this.music.load();if(this.musicEnabled&&this.unlocked&&!this.paused)this.start();}
  resetEffects(){this.stopCharge();this.stopMovement();this.stopTracking();for(const source of [...this.sources])source.stop();for(const clip of this.playingEffects)clip.pause();this.playingEffects.clear();this.pausedEffects.clear();this.lastSamples.clear();}
  async preloadForMatch(vehicles:(VehicleId|null)[]){if(!this.unlocked)return;await Promise.all([...new Set([...COMMON_CLIPS,...vehicles.flatMap(id=>vehicleClips(id??'cannon'))])].map(name=>this.loadClip(name)));}
  private loadClip(name:string){if(this.buffers.has(name))return Promise.resolve();const existing=this.loading.get(name);if(existing)return existing;
    const task=(async()=>{try{const {c}=this.graph(),response=await fetch(asset(name));if(!response.ok)throw new Error('Audio missing');this.buffers.set(name,await c.decodeAudioData(await response.arrayBuffer()));}catch{/* Keep synthesized fallback; retry after reconnect. */}})().finally(()=>this.loading.delete(name));this.loading.set(name,task);return task;
  }
  private sample(name:string,x?:number,viewerX=0,loop=false):AudioBufferSourceNode|null {
    const buffer=this.buffers.get(name);if(!buffer){void this.loadClip(name);return null;}
    const {c,output}=this.graph();if(!loop&&c.currentTime-(this.lastSamples.get(name)??-10)<.075)return null;
    this.lastSamples.set(name,c.currentTime);if(this.sources.size>=20)[...this.sources][0].stop();
    const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=buffer;source.loop=loop;gain.gain.value=loop?.22:.75;pan.pan.value=x===undefined?0:Math.max(-1,Math.min(1,(x-viewerX)/600));source.connect(gain);gain.connect(pan);pan.connect(output);this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);if(this.movementSample===source)this.movementSample=null;source.disconnect();gain.disconnect();pan.disconnect();};source.start();return source;
  }
  private graph() {
    if(!this.context) {
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.soundEnabled?this.volume:0;
      const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=20;compressor.ratio.value=4;compressor.attack.value=0.004;compressor.release.value=0.22;
      this.master.connect(compressor);compressor.connect(this.context.destination);
    }
    if(this.context.state==='suspended'&&!this.paused) void this.context.resume().catch(()=>{});
    return {c:this.context,output:this.master!};
  }
  startCharge() {
    if(!this.soundEnabled||!this.unlocked||this.charge) return;
    try {
      const {c,output}=this.graph(),gain=c.createGain(),now=c.currentTime;
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(0.12,now+0.07);gain.connect(output);
      const oscillators=[c.createOscillator(),c.createOscillator()];
      oscillators[0].type='triangle';oscillators[0].frequency.value=150;
      oscillators[1].type='sine';oscillators[1].frequency.value=301;
      const harmonic=c.createGain();harmonic.gain.value=0.2;harmonic.connect(gain);
      oscillators[0].connect(gain);oscillators[1].connect(harmonic);
      oscillators.forEach(o=>o.start());this.charge={oscillators,gain};
    } catch {this.charge=null;}
  }
  updateCharge(power:number) {
    if(!this.charge||!this.context) return;
    const now=this.context.currentTime,frequency=120+power*4.2;
    this.charge.oscillators[0].frequency.setTargetAtTime(frequency,now,0.03);
    this.charge.oscillators[1].frequency.setTargetAtTime(frequency*2.01,now,0.03);
    this.charge.gain.gain.setTargetAtTime(0.1+power*0.0008,now,0.04);
  }
  stopCharge() {
    if(!this.charge||!this.context) return;
    const {oscillators,gain}=this.charge,now=this.context.currentTime;this.charge=null;
    gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0.0001,now,0.012);
    for(const oscillator of oscillators) {oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.stop(now+0.06);}
  }
  updateMovement(active:boolean,sourceX=0,viewerX=0,vehicle:VehicleId|null='cannon') {
    if(!active||!this.soundEnabled||!this.unlocked||this.paused) {this.stopMovement(!this.paused&&this.soundEnabled&&this.unlocked);return;}
    try {
      const {c,output}=this.graph();
      const id=vehicle??'cannon';if(this.movingVehicle!==id){this.stopMovement();this.movingVehicle=id;}
      if(!this.movementSample)this.movementSample=this.sample(`sfx-move-${id}.mp3`,sourceX,viewerX,true);
      if(!this.movement) {
        const oscillator=c.createOscillator(),noise=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner(),filter=c.createBiquadFilter();
        oscillator.type='sawtooth';oscillator.frequency.value=65;filter.type='lowpass';filter.frequency.value=390;
        const buffer=c.createBuffer(1,Math.floor(c.sampleRate*0.23),c.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.45;
        noise.buffer=buffer;noise.loop=true;oscillator.connect(filter);noise.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(output);
        gain.gain.value=0.18;oscillator.start();noise.start();this.movement={oscillator,noise,gain,pan};
      }
      this.movement.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(sourceX-viewerX)/600)),c.currentTime,0.05);
      this.movement.gain.gain.setTargetAtTime((this.movementSample?.055:.22)/(1+Math.abs(sourceX-viewerX)/900),c.currentTime,0.05);
      this.movement.oscillator.frequency.setTargetAtTime(62+Math.sin(c.currentTime*18)*9,c.currentTime,0.02);
    }catch{this.stopMovement();}
  }
  stopMovement(stoppingSound=false) {
    if(this.movementSample){this.movementSample.stop();this.movementSample=null;}
    if(stoppingSound&&this.movingVehicle)this.sample(`sfx-stop-${this.movingVehicle}.mp3`);this.movingVehicle=null;
    if(!this.movement||!this.context) return;
    const m=this.movement;this.movement=null;m.gain.gain.setTargetAtTime(0.0001,this.context.currentTime,0.012);
    m.oscillator.stop(this.context.currentTime+0.05);m.noise.stop(this.context.currentTime+0.05);
    m.oscillator.onended=()=>{m.oscillator.disconnect();m.noise.disconnect();m.gain.disconnect();m.pan.disconnect();};
  }
  updateTracking(active:boolean,weapon?:WeaponId,x=0,viewerX=0) {
    if(!active||!this.soundEnabled||!this.unlocked) {this.stopTracking();return;}
    try {const {c,output}=this.graph();if(!this.tracking){const oscillator=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();oscillator.type='sine';oscillator.connect(gain);gain.connect(pan);pan.connect(output);gain.gain.value=.08;oscillator.start();this.tracking={oscillator,gain,pan};}
      const signature=weapon?weaponById(weapon).sound??27:27;
      this.tracking.oscillator.frequency.setTargetAtTime(430+signature*11+Math.sin(c.currentTime*14)*80,c.currentTime,.02);
      this.tracking.gain.gain.setTargetAtTime(.045+(Math.sin(c.currentTime*15)+1)*.035,c.currentTime,.02);
      this.tracking.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(x-viewerX)/600)),c.currentTime,.04);
    }catch{this.stopTracking();}
  }
  stopTracking(){if(!this.tracking||!this.context)return;const t=this.tracking;this.tracking=null;t.gain.gain.setTargetAtTime(.0001,this.context.currentTime,.02);t.oscillator.stop(this.context.currentTime+.07);t.oscillator.onended=()=>{t.oscillator.disconnect();t.gain.disconnect();t.pan.disconnect();};}
  play(type:'click'|'shot'|'explosion'|'item'|'win'|'crate-land'|'lock'|'aim'|'transfer'|'turn'|'wind'|'firewall'|'supply'|'warning',sourceX?:number,viewerX=0,weapon?:WeaponId) {
    if(!this.soundEnabled||!this.unlocked||(this.paused&&type!=='click'&&type!=='aim')) return;
    if(type==='click'||type==='win'||(type==='aim'&&this.paused)) {
      const audio=new Audio(asset(`sfx-${type==='aim'?'select':type}.mp3`));audio.volume=this.volume*.75;this.playingEffects.add(audio);audio.onended=()=>{this.playingEffects.delete(audio);this.pausedEffects.delete(audio);};void audio.play().catch(()=>this.playingEffects.delete(audio));return;
    }
    try {
      const name=type==='shot'||type==='explosion'?weaponSoundClip(type,weapon):`sfx-${type==='aim'?'select':type}.mp3`;
      const loaded=this.buffers.has(name),sample=this.sample(name,sourceX,viewerX);
      // Keep the established lock chirp alongside Homming; fallback synthesis covers first-use loading.
      if(type!=='lock'&&(sample||loaded))return;
      if(['turn','wind','firewall','supply','warning'].includes(type))return;
      const graph=this.graph(),c=graph.c,now=c.currentTime;let output:AudioNode=graph.output;
      if(sourceX!==undefined) {const pan=c.createStereoPanner();pan.pan.value=Math.max(-1,Math.min(1,(sourceX-viewerX)/600));pan.connect(output);output=pan;}
      const tone=(start:number,end:number,duration:number,level:number,wave:OscillatorType='sine')=>{
        const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type=wave;
        oscillator.frequency.setValueAtTime(start,now);oscillator.frequency.exponentialRampToValueAtTime(end,now+duration);
        gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(0.001,now+duration);
        oscillator.connect(gain);gain.connect(output);oscillator.start();oscillator.stop(now+duration+0.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      };
      const noise=(duration:number,level:number,cutoff:number)=>{
        const buffer=c.createBuffer(1,Math.floor(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
        const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;
        filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(180,now+duration);
        gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(0.001,now+duration);
        source.connect(filter);filter.connect(gain);gain.connect(output);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
      };
      if(type==='aim') {tone(740,600,.055,.09,'triangle');return;}
      if(type==='transfer'){tone(260,1500,.45,.24,'sine');tone(780,260,.3,.16,'triangle');noise(.18,.25,2600);return;}
      if(type==='lock') {if(now-this.lastLock<.1)return;this.lastLock=now;const index=weapon?weaponById(weapon).sound??27:27;tone(650+index*9,1150+index*9,.18,.22);tone(980+index*7,1400+index*7,.13,.11);return;}
      if((type==='shot'||type==='explosion')&&weapon) {
        const w=weaponById(weapon),i=w.sound??27,pitch=85+i*13,waves:OscillatorType[]=['sine','triangle','sawtooth','square'];
        const wave=waves[i%4],duration=.15+(i%6)*.027;
        if(type==='shot') {
          if(w.effect==='beam'||w.effect==='helix'||w.effect==='orbital') {tone(240+i*17,900+i*23,duration+.11,.22,wave);tone(620+i*11,190+i*9,.17,.13);}
          else if(w.effect==='homing'||weapon==='homing') {noise(.34,.45,2500+i*40);tone(180+i*9,620+i*14,.32,.17,'sawtooth');}
          else if(w.effect==='mine') {tone(380+i*8,170+i*6,.11,.28,'square');noise(.13,.4,1900+i*17);}
          else if(w.effect==='poison'||w.effect==='gas'||w.effect==='freeze') {tone(390+i*12,180+i*9,.26,.28,'sine');noise(.14,.32,2100+i*32);}
          else {noise(duration,.5,1800+i*67);tone(pitch*1.8,pitch*.5,duration,.34,wave);}
        } else {
          if(w.effect==='beam'||w.effect==='helix'||w.effect==='orbital') {tone(850+i*19,100+i*7,.42,.3,'sawtooth');noise(.39,.63,2600+i*41);}
          else if(w.effect==='gas'||w.effect==='poison'||w.effect==='freeze') {tone(340+i*11,100+i*3,.5,.29,'sine');noise(.46,.68,1400+i*33);}
          else {const size=w.radius/80;noise(.3+size*.4,.58+size*.35,1400+i*53);tone(pitch,30+i*2,.38+size*.3,.32+size*.25,wave);}
          tone(420+i*17,200+i*9,.1+duration*.3,.06,'triangle');
        }
        return;
      }
      if(type==='item') {tone(530,920,0.3,0.24);tone(790,1350,0.32,0.12);}
      else if(type==='crate-land') {noise(0.28,0.55,1600);tone(140,55,0.25,0.38,'triangle');}
      else if(type==='shot') {noise(0.22,0.65,2600);tone(190,65,0.19,0.4,'triangle');}
      else {noise(0.82,1.1,2300);noise(0.09,0.42,6500);tone(115,32,0.7,0.68);tone(65,26,0.5,0.26,'triangle');}
    } catch { /* Audio is optional; browsers without Web Audio can still play. */ }
  }
}
