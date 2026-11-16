import type {Game,Tank} from './engine';
import {WORLD_W,WORLD_H} from './engine';
import {paintMapOverview} from './map-preview';
import {paintVehicle} from './vehicle-art';
import {vehicleById} from './vehicles';
import {teamFlag} from './crew';
import {crewPortrait,crewPortraitRevision} from './crew-portraits';
export class DashboardView {
  private terrain=document.createElement('canvas');private revision=-1;private previousGame:Game|null=null;
  private dialSignature='';private mapSignature='';dialFrames=0;mapFrames=0;
  constructor(private dial:HTMLCanvasElement,private map:HTMLCanvasElement){dial.width=260;dial.height=260;map.width=300;map.height=168;this.terrain.width=300;this.terrain.height=168;}
  draw(game:Game,t:Tank,offset:number,viewHeight:number){
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
    const mapSignature=[game.land.revision,game.current,game.viewer,game.fog,game.snow,game.fireLine?.x,Math.round(offset*1024),viewHeight,crewPortraitRevision(),this.map.clientHeight,...game.tanks.flatMap(t=>[t.x,t.y,t.hp,t.team,t.vehicleId,t.crew]),...game.crates.flatMap(c=>[c.x,c.y,c.falling,c.type])].join('|');
    if(this.previousGame===game&&this.mapSignature===mapSignature)return;
    this.mapSignature=mapSignature;this.mapFrames++;
    const m=this.map.getContext('2d')!,base=this.terrain.getContext('2d')!;
    if(this.previousGame!==game||this.revision!==game.land.revision){paintMapOverview(base,game,300,168);this.previousGame=game;this.revision=game.land.revision;}
    m.drawImage(this.terrain,0,0);m.strokeStyle='#f9f2d7b0';m.lineWidth=2;m.strokeRect(2,offset/640*168,296,viewHeight/640*168);
    if(game.fireLine){m.strokeStyle='#f5ae70';m.beginPath();m.moveTo(game.fireLine.x/WORLD_W*300,15);m.lineTo(game.fireLine.x/WORLD_W*300,145);m.stroke();}
    for(const tank of game.tanks)if(tank.hp>0&&game.visible(tank)){
      const x=tank.x/WORLD_W*300,y=tank.y/640*168;
      m.save();m.translate(x,y);m.strokeStyle=teamFlag(tank.team).color;m.lineWidth=tank.id===game.current?2:1;m.fillStyle='#fff4df';m.beginPath();m.arc(0,0,tank.id===game.current?9:7,0,7);m.fill();m.stroke();
      if(tank.vehicleId){m.save();m.scale(.17,.17);paintVehicle(m,vehicleById(tank.vehicleId),20,0,0,false);m.restore();}
      const avatar=crewPortrait(tank.crew);if(avatar){m.save();m.beginPath();m.arc(0,0,7,0,7);m.clip();m.drawImage(avatar,-7,-7,14,14);m.restore();}m.fillStyle=teamFlag(tank.team).color;m.font='bold 9px sans-serif';m.fillText(String(tank.slot+1),8,-6);m.restore();
    }
    for(const crate of game.crates)if(!game.fog||Math.abs(crate.x-game.tanks[game.viewer].x)<230){m.fillStyle='#e6ba75';m.fillRect(crate.x/WORLD_W*300-2,crate.y/640*168-2,5,5);}
  }
}
