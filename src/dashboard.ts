import type {Game,Tank} from './engine';
import {WORLD_W} from './engine';
import {paintMapOverview} from './map-preview';
import {teamFlag} from './crew';
export class DashboardView {
  private terrain=document.createElement('canvas');private revision=-1;private previousGame:Game|null=null;
  private dialSignature='';private mapSignature='';dialFrames=0;mapFrames=0;
  private turnPulse:HTMLElement|null;
  constructor(private dial:HTMLCanvasElement,private map:HTMLCanvasElement){dial.width=260;dial.height=260;map.width=300;map.height=168;this.terrain.width=300;this.terrain.height=168;this.turnPulse=map.parentElement?.querySelector('.minimap-turn-pulse')??null;}
  invalidate(){this.dialSignature='';this.mapSignature='';}
  draw(game:Game,t:Tank,offset:number,viewHeight:number,offsetX=0,viewWidth=WORLD_W){
    const signature=[t.angle,t.direction,t.minAngle,t.maxAngle,game.tankSlope(t)].join('|');
    if(signature!==this.dialSignature){this.dialSignature=signature;this.dialFrames++;
    const c=this.dial.getContext('2d')!;c.clearRect(0,0,260,260);c.save();c.scale(2,2);
    c.fillStyle='#f6f4e9';c.strokeStyle='#ccd5bd';c.lineWidth=2;c.beginPath();c.arc(65,65,58,0,7);c.fill();c.stroke();
    c.save();c.translate(65,65);c.scale(t.direction,1);
    const polar=(angle:number,r:number)=>({x:Math.cos(angle*Math.PI/180)*r,y:-Math.sin(angle*Math.PI/180)*r});
    c.rotate(game.tankSlope(t)*t.direction);c.fillStyle='#dce7c955';c.beginPath();c.moveTo(0,0);c.arc(0,0,52,-t.maxAngle*Math.PI/180,-t.minAngle*Math.PI/180);c.closePath();c.fill();
    for(let a=0;a<=180;a+=15){const p=polar(a,50),q=polar(a,54);c.strokeStyle='#d7dccd';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}
    c.strokeStyle='#bec8b2';c.lineWidth=1;c.beginPath();c.moveTo(-53,0);c.lineTo(53,0);c.stroke();
    const slope=0;c.strokeStyle='#baa27a';c.lineWidth=1.5;c.beginPath();c.moveTo(-47*Math.cos(slope),-47*Math.sin(slope));c.lineTo(47*Math.cos(slope),47*Math.sin(slope));c.stroke();
    for(const a of [t.minAngle,t.maxAngle]){const p=polar(a,52);c.strokeStyle='#c7b58e';c.setLineDash([3,4]);c.beginPath();c.moveTo(0,0);c.lineTo(p.x,p.y);c.stroke();}c.setLineDash([]);
    const p=polar(t.angle,50);c.strokeStyle='#718c5a';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(p.x,p.y);c.stroke();c.fillStyle='#e8a26a';c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill();c.restore();
    c.fillStyle='#8da273';c.beginPath();c.arc(65,65,5,0,7);c.fill();c.fillStyle='#597347';c.font='600 19px "Manrope",sans-serif';c.textAlign='center';c.restore();
    }
    const pulsing=!game.introLocked&&(game.phase==='aiming'||game.phase==='flying')&&!game.weatherObservation;
    const mapSignature=[game.land.revision,game.current,game.viewer,game.introLocked,game.fog,game.snow,game.fireLine?.x,pulsing,game.paused,Math.round(offset*1024),Math.round(offsetX*1024),viewWidth,viewHeight,this.map.clientWidth,this.map.clientHeight,...game.tanks.flatMap(t=>[t.x,t.y,t.hp,t.team,t.outOfBounds]),...game.crates.flatMap(c=>[c.x,c.y,c.falling,c.type])].join('|');
    if(this.previousGame===game&&this.mapSignature===mapSignature)return;
    this.mapSignature=mapSignature;this.mapFrames++;
    const m=this.map.getContext('2d')!,base=this.terrain.getContext('2d')!;
    if(this.previousGame!==game||this.revision!==game.land.revision){paintMapOverview(base,game,300,168);this.previousGame=game;this.revision=game.land.revision;}
    m.clearRect(0,0,300,168);m.save();m.globalAlpha=.56;m.drawImage(this.terrain,0,0);m.restore();m.strokeStyle='#f9f2d7b0';m.lineWidth=2;m.strokeRect(offsetX/game.worldWidth*300+2,offset/game.worldHeight*168,viewWidth/game.worldWidth*300-4,viewHeight/game.worldHeight*168);
    if(game.fireLine){m.strokeStyle='#f5ae70';m.beginPath();m.moveTo(game.fireLine.x/game.worldWidth*300,15);m.lineTo(game.fireLine.x/game.worldWidth*300,145);m.stroke();}
    const markers=game.tanks.filter(tank=>!tank.outOfBounds&&tank.x>=0&&tank.x<=game.worldWidth&&tank.y>=0&&tank.y<=game.worldHeight&&game.visible(tank));
    // The terrain overview is deliberately shallow; markers stay circular in CSS pixels.
    const markerAspect=this.map.clientHeight?this.map.clientWidth/300/(this.map.clientHeight/168):1;
    for(const tank of markers.sort((a,b)=>Number(a.id===game.current)-Number(b.id===game.current))){
      const x=tank.x/game.worldWidth*300,y=tank.y/game.worldHeight*168;
      const radius=tank.id===game.current?7:6;
      m.fillStyle=tank.hp>0?teamFlag(tank.team).color:'#8c9188';m.beginPath();m.ellipse(x,y,radius,radius*markerAspect,0,0,Math.PI*2);m.fill();
    }
    if(this.turnPulse){
      const tank=pulsing?markers.find(t=>t.id===game.current&&t.hp>0):null;
      this.turnPulse.hidden=!tank;
      if(tank){const style=this.turnPulse.style;style.left=`${tank.x/game.worldWidth*100}%`;style.top=`${tank.y/game.worldHeight*100}%`;style.width=`${14*this.map.clientWidth/300}px`;style.setProperty('--flag-ink',teamFlag(tank.team).color);style.animationPlayState=game.paused?'paused':'running';}
    }
    for(const crate of game.crates)if(!game.fog||Math.abs(crate.x-game.tanks[game.viewer].x)<230){m.fillStyle='#e6ba75';m.fillRect(crate.x/game.worldWidth*300-2,crate.y/game.worldHeight*168-2,5,5);}
  }
}
