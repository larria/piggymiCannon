import { Game, WORLD_W, WORLD_H, WATER_Y, clamp, makeRng, type Tank } from './engine';
import { DIFFICULTIES, weaponById } from './catalog';

interface Palette {sky:string;horizon:string;sun:string;mountains:string[];soil:string;soilLight:string;grass:string;grassLight:string;water:string;ink:string}
const PALETTES:Record<string,Palette>={
  valley:{sky:'#e8eee3',horizon:'#f3edd9',sun:'#f5ce82',mountains:['#d1decd','#b5cbb5','#95b29a'],soil:'#586b4c',soilLight:'#70805a',grass:'#759160',grassLight:'#b8c78b',water:'#a7bbb0',ink:'#3d5543'},
  coast:{sky:'#f0dfd0',horizon:'#f8eacb',sun:'#e6a976',mountains:['#e0c9b4','#c7b4a3','#a0aba0'],soil:'#827262',soilLight:'#a18a70',grass:'#9a9b6c',grassLight:'#d2c28a',water:'#8eafb2',ink:'#626b57'},
  moon:{sky:'#34384e',horizon:'#6c6b83',sun:'#e7dbc1',mountains:['#626279','#515a70','#424e62'],soil:'#62697b',soilLight:'#7b8193',grass:'#9298a7',grassLight:'#bdc5d0',water:'#7786a1',ink:'#343e57'},
};
const rr=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

export class Renderer {
  canvas:HTMLCanvasElement; ctx:CanvasRenderingContext2D; background:HTMLCanvasElement;
  game:Game; palette:Palette; ratio=1;time=0;viewHeight=WORLD_H;offsetY=0;
  constructor(canvas:HTMLCanvasElement,game:Game) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.background=document.createElement('canvas');
    this.background.width=WORLD_W;this.background.height=WORLD_H;this.game=game;this.palette=PALETTES[game.config.map];
    this.resize();
  }
  setGame(game:Game) {this.game=game;this.palette=PALETTES[game.config.map];this.paintBackground();}
  resize() {
    this.ratio=Math.min(window.devicePixelRatio||1,2);
    this.viewHeight=Math.max(370,this.canvas.clientHeight/this.canvas.clientWidth*WORLD_W);
    this.offsetY=WORLD_H-this.viewHeight;
    this.canvas.width=WORLD_W*this.ratio;this.canvas.height=this.viewHeight*this.ratio;
    this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
    this.paintBackground();
  }
  private mountain(ctx:CanvasRenderingContext2D,base:number,color:string,seed:number,height:number) {
    const rng=makeRng(seed);ctx.beginPath();ctx.moveTo(-60,WORLD_H);ctx.lineTo(-60,base);
    let x=-60,y=base;
    while(x<WORLD_W+120) {
      const nextX=x+110+rng()*170,nextY=base-rng()*height;
      ctx.bezierCurveTo(x+45,y-25,nextX-70,nextY,nextX,nextY);x=nextX;y=nextY;
    }
    ctx.lineTo(WORLD_W+120,WORLD_H);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  private pine(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,color:string) {
    ctx.fillStyle=color;
    ctx.fillRect(x-size*0.045,y-size*0.3,size*0.09,size*0.36);
    for(let i=0;i<3;i++) {
      const width=size*(0.27+i*0.06),top=y-size*(1-i*0.2),bottom=top+size*0.51;
      ctx.beginPath();ctx.moveTo(x,top);ctx.quadraticCurveTo(x-width*0.25,top+size*0.25,x-width,bottom);
      ctx.quadraticCurveTo(x,bottom-size*0.07,x+width,bottom);ctx.quadraticCurveTo(x+width*0.25,top+size*0.25,x,top);ctx.fill();
    }
  }
  private cloud(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,alpha=0.5) {
    ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=`rgba(255,252,239,${alpha})`;
    ctx.beginPath();ctx.moveTo(-58,10);ctx.bezierCurveTo(-90,10,-87,-11,-57,-10);ctx.bezierCurveTo(-55,-37,-21,-40,-9,-23);
    ctx.bezierCurveTo(7,-54,46,-42,47,-14);ctx.bezierCurveTo(85,-21,95,11,61,12);ctx.closePath();ctx.fill();ctx.restore();
  }
  private paintBackground() {
    const ctx=this.background.getContext('2d')!,p=this.palette;
    const gradient=ctx.createLinearGradient(0,0,0,WORLD_H);gradient.addColorStop(0,p.sky);gradient.addColorStop(0.72,p.horizon);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,WORLD_W,WORLD_H);
    if(this.game.config.map==='moon') {
      const rng=makeRng(82);for(let i=0;i<90;i++) {ctx.fillStyle=`rgba(249,239,210,${0.2+rng()*0.6})`;ctx.beginPath();ctx.arc(rng()*WORLD_W,rng()*340,rng()*1.4+0.4,0,Math.PI*2);ctx.fill();}
    }
    const sx=1005,sy=130,sunRatio=WORLD_H/this.viewHeight;
    ctx.fillStyle=this.game.config.map==='moon'?'#cbc3b41a':'#f6d49435';ctx.beginPath();ctx.ellipse(sx,sy,81,81*sunRatio,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=this.game.config.map==='moon'?'#e5decc17':'#f6d49440';ctx.beginPath();ctx.ellipse(sx,sy,64,64*sunRatio,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.sun;ctx.beginPath();ctx.ellipse(sx,sy,44,44*sunRatio,0,0,Math.PI*2);ctx.fill();
    if(this.game.config.map==='moon') {ctx.fillStyle='#c9c3b3';ctx.beginPath();ctx.arc(sx-13,sy+13,10,0,Math.PI*2);ctx.arc(sx+18,sy-11,6,0,Math.PI*2);ctx.fill();}
    this.cloud(ctx,227,115,0.92,0.55);this.cloud(ctx,639,80,0.7,0.4);this.cloud(ctx,1170,219,0.64,0.5);
    this.mountain(ctx,376,p.mountains[0],26,162);
    this.mountain(ctx,422,p.mountains[1],75,123);
    const rng=makeRng(192);
    for(let x=0;x<WORLD_W;x+=17+rng()*12) {
      const y=393+Math.sin(x/91)*16;
      this.pine(ctx,x,y,28+rng()*48,p.mountains[1]);
    }
    this.mountain(ctx,472,p.mountains[2],9,100);
    for(let x=-20;x<WORLD_W+40;x+=23+rng()*24) {
      const y=441+Math.sin(x/157+0.8)*18;
      this.pine(ctx,x,y,25+rng()*62,p.mountains[2]);
    }
    // Quiet ink details make the valley feel like a little illustrated world.
    if(this.game.config.map!=='moon') {
      ctx.strokeStyle=p.ink+'70';ctx.lineWidth=1.7;ctx.lineCap='round';
      for(const [x,y,s] of [[403,160,8],[433,147,6],[453,165,5]]) {
        ctx.beginPath();ctx.moveTo(x-s,y+2);ctx.quadraticCurveTo(x-s/2,y-4,x,y);ctx.quadraticCurveTo(x+s/2,y-4,x+s,y+2);ctx.stroke();
      }
    }
    if(this.game.config.map==='valley') {
      ctx.save();ctx.translate(777,203);ctx.rotate(0.06);
      ctx.strokeStyle='#879783';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-10,8);ctx.lineTo(-5,33);ctx.moveTo(10,8);ctx.lineTo(5,33);ctx.stroke();
      ctx.fillStyle='#b4a582';rr(ctx,-7,31,14,11,2);ctx.fill();
      ctx.fillStyle='#d7a081';ctx.beginPath();ctx.ellipse(0,-7,22,28,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#edc7a5';ctx.beginPath();ctx.ellipse(0,-7,9,28,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // Deterministic paper grain; drawn once, never animated.
    const noise=makeRng(13);
    for(let i=0;i<7200;i++) {ctx.fillStyle=noise()>0.5?'#ffffff08':'#35432e06';ctx.fillRect(noise()*WORLD_W,noise()*WORLD_H,1,1);}
  }
  private terrain() {
    const ctx=this.ctx,g=this.game,p=this.palette;
    ctx.save();ctx.beginPath();ctx.moveTo(0,WORLD_H);
    for(let x=0;x<=WORLD_W;x+=2) ctx.lineTo(x,g.terrain[x]);
    ctx.lineTo(WORLD_W,WORLD_H);ctx.closePath();ctx.clip();
    const gradient=ctx.createLinearGradient(0,400,0,600);gradient.addColorStop(0,p.soilLight);gradient.addColorStop(1,p.soil);
    ctx.fillStyle=gradient;ctx.fillRect(0,350,WORLD_W,250);
    ctx.strokeStyle=p.soilLight+'80';ctx.lineWidth=2;
    for(let row=0;row<6;row++) {
      ctx.beginPath();ctx.moveTo(0,510+row*26);
      for(let x=0;x<=WORLD_W;x+=30) ctx.lineTo(x,510+row*26+Math.sin(x/94+row)*9);ctx.stroke();
    }
    const rng=makeRng(379);
    for(let i=0;i<115;i++) {
      const x=rng()*WORLD_W,y=460+rng()*135;
      ctx.fillStyle=i%3===0?p.grassLight+'38':p.soil+'80';ctx.beginPath();ctx.ellipse(x,y,2+rng()*4,1+rng()*2,rng()*2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=p.ink;ctx.lineWidth=8;
    ctx.beginPath();for(let x=0;x<=WORLD_W;x+=2) {if(x===0) ctx.moveTo(x,g.terrain[x]);else ctx.lineTo(x,g.terrain[x]);}ctx.stroke();
    ctx.strokeStyle=p.grassLight;ctx.lineWidth=4;ctx.stroke();
    // Grass tufts and little flowers follow the destructible surface.
    const flora=makeRng(20);
    for(let x=18;x<WORLD_W;x+=16+flora()*23) {
      const y=g.ground(x);if(y>WATER_Y-10) continue;
      const size=5+flora()*8;
      ctx.strokeStyle=flora()>0.55?p.grass:p.grassLight;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x-4,y);ctx.quadraticCurveTo(x-5,y-size*0.7,x-8,y-size);ctx.moveTo(x,y);ctx.quadraticCurveTo(x,y-size*0.8,x+2,y-size*1.1);ctx.moveTo(x+2,y);ctx.lineTo(x+8,y-size*0.5);ctx.stroke();
      if(flora()>0.86) {ctx.fillStyle='#edd3a0';ctx.beginPath();ctx.arc(x+2,y-size*1.1,2.5,0,Math.PI*2);ctx.fill();}
    }
    // Foreground shrubs at the perimeter frame the battlefield.
    for(const x of [14,52,1236,1270]) {
      const y=g.ground(x);if(y>WATER_Y-5) continue;
      ctx.fillStyle=p.ink;ctx.beginPath();ctx.ellipse(x,y,19,10,-0.2,Math.PI,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.grass;ctx.beginPath();ctx.ellipse(x+3,y-7,12,9,0,Math.PI,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=p.water+'85';ctx.fillRect(0,WATER_Y,WORLD_W,WORLD_H-WATER_Y);
    ctx.strokeStyle=p.water;ctx.lineWidth=2;ctx.beginPath();
    for(let x=0;x<=WORLD_W;x+=8) ctx.lineTo(x,WATER_Y+Math.sin(x/23+this.time)*2);ctx.stroke();
  }
  private tank(t:Tank) {
    const ctx=this.ctx,g=this.game,isPink=t.id===0;
    if(t.hp<=0) {
      ctx.save();ctx.translate(t.x,Math.min(t.y,WATER_Y));ctx.fillStyle='#535d4d';rr(ctx,-24,-1,48,15,7);ctx.fill();ctx.strokeStyle='#747d68';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10,-2);ctx.lineTo(18,-13);ctx.stroke();ctx.restore();return;
    }
    const body=isPink?'#e39079':'#81946c',dark=isPink?'#a66250':'#52684d',light=isPink?'#f1b097':'#a8b98c';
    ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.direction,1);
    ctx.fillStyle='#34413028';ctx.beginPath();ctx.ellipse(0,17,33,7,0,0,Math.PI*2);ctx.fill();
    if(t.shield>0) {ctx.fillStyle='#b4e4e515';ctx.strokeStyle='#c5eef0a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-9,40,42,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    // Treads, with real wheel spacing and two tiny sprockets.
    ctx.fillStyle='#405045';rr(ctx,-29,4,58,19,10);ctx.fill();ctx.strokeStyle='#748069';ctx.lineWidth=2;rr(ctx,-26,7,52,13,7);ctx.stroke();
    for(let x=-20;x<=20;x+=10) {ctx.fillStyle='#83907a';ctx.beginPath();ctx.arc(x,13,4.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#435246';ctx.beginPath();ctx.arc(x,13,1.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=body;rr(ctx,-29,-3,58,14,5);ctx.fill();ctx.fillStyle=light;rr(ctx,-25,-4,50,5,3);ctx.fill();
    ctx.fillStyle=dark;rr(ctx,-6,-8,22,10,4);ctx.fill();
    // Barrel follows the actual simulated launch angle.
    ctx.save();ctx.translate(0,-13);ctx.rotate(-t.angle*Math.PI/180);ctx.fillStyle=dark;rr(ctx,5,-5,29,10,3);ctx.fill();
    ctx.fillStyle=light;rr(ctx,25,-6,10,12,2);ctx.fill();ctx.fillStyle='#4b594c';ctx.fillRect(33,-3,3,6);ctx.restore();
    // Our little pig commander, with a helmet and a snout.
    ctx.fillStyle='#e3a895';ctx.beginPath();ctx.moveTo(-16,-24);ctx.lineTo(-20,-36);ctx.quadraticCurveTo(-11,-39,-8,-29);ctx.fill();
    ctx.beginPath();ctx.moveTo(7,-29);ctx.lineTo(16,-37);ctx.quadraticCurveTo(20,-28,13,-23);ctx.fill();
    ctx.fillStyle='#f0b7a0';ctx.beginPath();ctx.ellipse(-3,-21,17,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(-4,-29,19,11,-0.06,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle=body;rr(ctx,-23,-30,37,7,3);ctx.fill();
    ctx.fillStyle='#f2d2a3';ctx.beginPath();ctx.arc(-5,-35,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3e4538';ctx.beginPath();ctx.arc(4,-23,1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e59b85';ctx.beginPath();ctx.ellipse(9,-15,9,6,0.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b97162';ctx.beginPath();ctx.ellipse(7,-15,1.2,1.8,0,0,Math.PI*2);ctx.ellipse(12,-15,1.2,1.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d98f7d70';ctx.beginPath();ctx.arc(-4,-14,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Names stay upright even when the tank turns around.
    ctx.save();ctx.translate(t.x,t.y);
    const active=g.current===t.id&&g.phase!=='lobby'&&g.phase!=='ended';
    if(active) {
      const bob=Math.sin(this.time*3)*2;
      ctx.fillStyle=isPink?'#d47d54':'#637d5b';ctx.beginPath();ctx.moveTo(-5,-82+bob);ctx.lineTo(5,-82+bob);ctx.lineTo(0,-75+bob);ctx.closePath();ctx.fill();
    }
    const label=isPink?'咪猪头':'大猪头爸爸';ctx.font='600 11px "PingFang SC", sans-serif';ctx.textAlign='center';
    const labelWidth=Math.max(58,ctx.measureText(label).width+20);
    ctx.fillStyle='#fbf8ecdd';rr(ctx,-labelWidth/2,-70,labelWidth,21,10);ctx.fill();ctx.fillStyle='#4f5d49';ctx.fillText(label,0,-55);
    ctx.fillStyle='#f8f3e5b0';rr(ctx,-23,-44,46,3,1.5);ctx.fill();ctx.fillStyle=body;rr(ctx,-23,-44,46*t.hp/150,3,1.5);ctx.fill();
    if(t.frozen>0) {ctx.strokeStyle='#acd9e2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-30,-5);ctx.lineTo(-26,-25);ctx.lineTo(-17,-13);ctx.moveTo(26,5);ctx.lineTo(31,-20);ctx.lineTo(20,-8);ctx.stroke();}
    if(t.boost) {ctx.fillStyle='#f5cc83';ctx.font='bold 17px sans-serif';ctx.fillText('↑',34,-29);}
    ctx.restore();
  }
  private trajectory() {
    const g=this.game,ctx=this.ctx;
    if(g.teleporting) {
      ctx.save();ctx.strokeStyle='#e4f1e380';ctx.fillStyle='#e4f1e310';ctx.lineWidth=1.5;ctx.setLineDash([6,6]);
      ctx.beginPath();ctx.rect(Math.max(0,g.active.x-230),280,Math.min(WORLD_W,g.active.x+230)-Math.max(0,g.active.x-230),300);ctx.fill();ctx.stroke();ctx.restore();return;
    }
    if(g.phase!=='aiming'&&g.phase!=='lobby') return;
    if(g.config.mode==='ai'&&g.current===1&&g.phase!=='lobby') return;
    if(g.selected==='airstrike') {
      const x=g.targetX,y=g.ground(x);
      ctx.strokeStyle='#edaa86';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(x,95);ctx.lineTo(x,y-15);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.ellipse(x,y-2,35,9,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f3e8d4';ctx.font='12px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.fillText('点击选择落点',x,80);return;
    }
    const maxTime=g.phase==='lobby'?6:DIFFICULTIES.find(d=>d.id===g.config.difficulty)!.preview;
    if(!maxTime) return;
    const preview=g.predict(g.active.angle,g.active.power,g.selected,maxTime);
    ctx.save();
    preview.points.forEach((p,i)=>{
      const alpha=g.phase==='lobby'?0.75:1-i/preview.points.length*0.5;
      ctx.fillStyle=`rgba(255,249,230,${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,i%3===0?3:2,0,Math.PI*2);ctx.fill();
    });
    if(g.config.difficulty==='easy'&&g.phase==='aiming') {ctx.strokeStyle='#fff8df90';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(preview.x,preview.y,12,5,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  draw(dt:number) {
    const ctx=this.ctx,g=this.game;this.time+=g.paused?0:dt;
    let camera=WORLD_H-this.viewHeight;
    if(g.phase==='flying'&&g.projectiles.length) camera=Math.min(camera,Math.max(0,Math.min(...g.projectiles.map(p=>p.y))-70));
    this.offsetY+=(camera-this.offsetY)*Math.min(1,dt*5);
    ctx.save();ctx.clearRect(0,0,WORLD_W,this.viewHeight);
    if(g.shake>0) ctx.translate(Math.sin(this.time*88)*g.shake,Math.cos(this.time*69)*g.shake*0.5);
    ctx.drawImage(this.background,0,0,WORLD_W,this.viewHeight);
    ctx.translate(0,-this.offsetY);
    this.terrain();this.trajectory();
    for(const f of g.fires) {
      for(let i=-4;i<=4;i++) {
        const x=f.x+i*11,y=g.ground(x)-1;
        ctx.fillStyle=i%2===0?'#e89754bd':'#f5c376bb';ctx.beginPath();ctx.moveTo(x-5,y);ctx.quadraticCurveTo(x-8,y-10,x+Math.sin(this.time*6+i)*6,y-20-Math.sin(this.time*5+i)*7);ctx.quadraticCurveTo(x+8,y-8,x+5,y);ctx.fill();
      }
    }
    for(const crate of g.crates) {
      ctx.fillStyle='#b29469';rr(ctx,crate.x-14,crate.y-10,28,25,3);ctx.fill();ctx.strokeStyle='#ead7aa';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#e9d9b5';ctx.fillRect(crate.x-2,crate.y-10,4,25);
      if(crate.type==='medical') {ctx.fillStyle='#a47158';ctx.fillRect(crate.x-7,crate.y-2,14,4);ctx.fillRect(crate.x-2,crate.y-7,4,14);}
    }
    g.tanks.forEach(t=>this.tank(t));
    for(const p of g.projectiles) {
      ctx.strokeStyle=weaponById(p.weapon).color+'90';ctx.lineWidth=p.weapon==='sniper'?2:3;
      ctx.beginPath();p.trail.forEach((q,i)=>{if(i===0) ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
      ctx.fillStyle=p.weapon==='ice'?'#b4d9e6':p.weapon==='napalm'?'#eda656':'#5e6b50';ctx.beginPath();ctx.ellipse(0,0,p.sub?4:7,p.sub?3:5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f4ce82';ctx.fillRect(-8,-2,4,4);ctx.restore();
    }
    for(const b of g.blasts) {
      const progress=1-b.life/b.maxLife;
      ctx.globalAlpha=(1-progress)*0.7;ctx.fillStyle=b.color;
      ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(0.4+progress*0.8),0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=(1-progress)*0.9;ctx.strokeStyle='#fff0c9';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(0.2+progress*1.25),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    }
    for(const p of g.particles) {ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(0.4+p.life/p.maxLife*0.6),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(const t of g.texts) {ctx.globalAlpha=clamp(t.life,0,1);ctx.font='bold 18px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.strokeStyle='#fff8e8';ctx.lineWidth=3;ctx.strokeText(t.text,t.x,t.y);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;
    ctx.restore();
  }
}
