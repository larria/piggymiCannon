const asset=(name:string)=>`${import.meta.env.BASE_URL}audio/${name}`;
export class AudioManager {
  music=new Audio(asset('bgm-sunny-30s.mp3'));
  enabled=false;volume=0.65;unlocked=false;
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private charge:{oscillators:OscillatorNode[];gain:GainNode}|null=null;
  private movement:{oscillator:OscillatorNode;noise:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}|null=null;
  constructor() {this.music.loop=true;this.music.volume=this.volume*0.55;}
  unlock() {this.unlocked=true;if(this.enabled) this.start();}
  setEnabled(enabled:boolean) {this.enabled=enabled;if(enabled&&this.unlocked) this.start();else {this.music.pause();this.stopCharge();this.stopMovement();}}
  private start() {void this.music.play().catch(()=>{});}
  setVolume(value:number) {this.volume=Math.max(0,Math.min(1,value));this.music.volume=this.volume*0.55;if(this.master&&this.context) this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,0.02);}
  pause(paused:boolean) {if(paused) {this.music.pause();this.stopCharge();this.stopMovement();}else if(this.enabled&&this.unlocked) this.start();}
  private graph() {
    if(!this.context) {
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.volume;
      const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=20;compressor.ratio.value=4;compressor.attack.value=0.004;compressor.release.value=0.22;
      this.master.connect(compressor);compressor.connect(this.context.destination);
    }
    if(this.context.state==='suspended') void this.context.resume();
    return {c:this.context,output:this.master!};
  }
  startCharge() {
    if(!this.enabled||!this.unlocked||this.charge) return;
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
  updateMovement(active:boolean,sourceX=0,viewerX=0) {
    if(!active||!this.enabled||!this.unlocked) {this.stopMovement();return;}
    try {
      const {c,output}=this.graph();
      if(!this.movement) {
        const oscillator=c.createOscillator(),noise=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner(),filter=c.createBiquadFilter();
        oscillator.type='sawtooth';oscillator.frequency.value=65;filter.type='lowpass';filter.frequency.value=390;
        const buffer=c.createBuffer(1,Math.floor(c.sampleRate*0.23),c.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.45;
        noise.buffer=buffer;noise.loop=true;oscillator.connect(filter);noise.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(output);
        gain.gain.value=0.18;oscillator.start();noise.start();this.movement={oscillator,noise,gain,pan};
      }
      this.movement.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,(sourceX-viewerX)/600)),c.currentTime,0.05);
      this.movement.gain.gain.setTargetAtTime(0.22/(1+Math.abs(sourceX-viewerX)/900),c.currentTime,0.05);
      this.movement.oscillator.frequency.setTargetAtTime(62+Math.sin(c.currentTime*18)*9,c.currentTime,0.02);
    }catch{this.stopMovement();}
  }
  stopMovement() {
    if(!this.movement||!this.context) return;
    const m=this.movement;this.movement=null;m.gain.gain.setTargetAtTime(0.0001,this.context.currentTime,0.012);
    m.oscillator.stop(this.context.currentTime+0.05);m.noise.stop(this.context.currentTime+0.05);
    m.oscillator.onended=()=>{m.oscillator.disconnect();m.noise.disconnect();m.gain.disconnect();m.pan.disconnect();};
  }
  play(type:'click'|'shot'|'explosion'|'item'|'win'|'crate-land',sourceX?:number,viewerX=0) {
    if(!this.enabled||!this.unlocked) return;
    if(type==='click'||type==='win') {
      const audio=new Audio(asset(type==='win'?'sfx_celebrate.mp3':'sfx_click.mp3'));audio.volume=this.volume*0.95;void audio.play().catch(()=>{});return;
    }
    try {
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
      if(type==='item') {tone(530,920,0.3,0.24);tone(790,1350,0.32,0.12);}
      else if(type==='crate-land') {noise(0.28,0.55,1600);tone(140,55,0.25,0.38,'triangle');}
      else if(type==='shot') {noise(0.22,0.65,2600);tone(190,65,0.19,0.4,'triangle');}
      else {noise(0.82,1.1,2300);noise(0.09,0.42,6500);tone(115,32,0.7,0.68);tone(65,26,0.5,0.26,'triangle');}
    } catch { /* Audio is optional; browsers without Web Audio can still play. */ }
  }
}
