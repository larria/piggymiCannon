const asset=(name:string)=>`${import.meta.env.BASE_URL}audio/${name}`;
export class AudioManager {
  music=new Audio(asset('bgm-sunny-30s.mp3'));
  enabled=false;volume=0.35;unlocked=false;
  private context:AudioContext|null=null;
  constructor() {this.music.loop=true;this.music.volume=this.volume*0.45;}
  unlock() {this.unlocked=true;if(this.enabled) this.start();}
  setEnabled(enabled:boolean) {this.enabled=enabled;if(enabled&&this.unlocked) this.start();else this.music.pause();}
  private start() {void this.music.play().catch(()=>{});}
  setVolume(value:number) {this.volume=value;this.music.volume=value*0.45;}
  pause(paused:boolean) {if(paused) this.music.pause();else if(this.enabled&&this.unlocked) this.start();}
  play(type:'click'|'shot'|'explosion'|'item'|'win') {
    if(!this.enabled||!this.unlocked) return;
    if(type==='click'||type==='win') {
      const audio=new Audio(asset(type==='win'?'sfx_celebrate.mp3':'sfx_click.mp3'));audio.volume=this.volume*0.65;void audio.play().catch(()=>{});return;
    }
    try {
      this.context??=new AudioContext();const c=this.context;if(c.state==='suspended') void c.resume();
      const now=c.currentTime,gain=c.createGain();gain.connect(c.destination);
      if(type==='item') {
        const oscillator=c.createOscillator();oscillator.type='sine';oscillator.frequency.setValueAtTime(530,now);oscillator.frequency.exponentialRampToValueAtTime(920,now+0.18);
        gain.gain.setValueAtTime(this.volume*0.11,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.3);oscillator.connect(gain);oscillator.start();oscillator.stop(now+0.31);
      } else {
        const duration=type==='explosion'?0.55:0.2;
        const buffer=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
        const source=c.createBufferSource();source.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='explosion'?700:1800;
        source.connect(filter);filter.connect(gain);gain.gain.setValueAtTime(this.volume*0.55,now);gain.gain.exponentialRampToValueAtTime(0.001,now+duration);source.start();
      }
    } catch { /* Audio is optional; a browser without Web Audio can still play. */ }
  }
}
