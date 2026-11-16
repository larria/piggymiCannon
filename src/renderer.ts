import type {TerrainChange} from './terrain';
import {paintTurnMarker} from './turn-marker';
import {loadBattleSprites,paintBattleSprite,battleSpriteRevision} from './battle-sprites';
import type {PixiStage} from './pixi-stage';
import {BattleCamera,BATTLE_ZOOM,BATTLE_VIEW_WIDTH} from './camera';
import { Game, WORLD_W, WORLD_H, BOTTOM_Y, clamp, makeRng, type Tank } from './engine';
import { weaponById,weaponHasTrail,MODERN_TRAIL_ALPHA,MODERN_TRAIL_WIDTH } from './catalog';
import {projectileDrawScale,projectileRearExtent} from './projectile-art';
import { breathingPose } from './feedback';
import {isRaging} from './health';
import {defeatedPig,victoryConfetti} from './result-art';
import {vehicleById} from './vehicles';
import {projectileArt,paintVehicle} from './vehicle-art';
import {paintCrew} from './crew-art';
import {teamFlag} from './crew';
import {crewPortrait,crewPortraitRevision} from './crew-portraits';
import {paintItemCue} from './item-feedback';
import {classicBackdrop,classicDetails} from './classic-map-art';

interface Palette {sky:string;horizon:string;sun:string;mountains:string[];soil:string;soilLight:string;grass:string;grassLight:string;water:string;ink:string}
const PALETTES:Record<string,Palette>={
  valley:{sky:'#e8eee3',horizon:'#f3edd9',sun:'#f5ce82',mountains:['#d1decd','#b5cbb5','#95b29a'],soil:'#586b4c',soilLight:'#70805a',grass:'#759160',grassLight:'#b8c78b',water:'#a7bbb0',ink:'#3d5543'},
  coast:{sky:'#f0dfd0',horizon:'#f8eacb',sun:'#e6a976',mountains:['#e0c9b4','#c7b4a3','#a0aba0'],soil:'#827262',soilLight:'#a18a70',grass:'#9a9b6c',grassLight:'#d2c28a',water:'#8eafb2',ink:'#626b57'},
  moon:{sky:'#e2eef2',horizon:'#f4f8f2',sun:'#f1dfa7',mountains:['#d0e1e7','#c0d5df','#afc9d3'],soil:'#a3becb',soilLight:'#d0e0e5',grass:'#e0eeeb',grassLight:'#f7faf1',water:'#acc3cf',ink:'#718d9b'},
  factory:{sky:'#e4e8e5',horizon:'#efece2',sun:'#dfc89c',mountains:['#c5d2cd','#b1c2bc','#9fafaa'],soil:'#607275',soilLight:'#8da1a2',grass:'#a6baba',grassLight:'#c5d5cf',water:'#9daeb0',ink:'#45595c'},
  temple:{sky:'#eeeadf',horizon:'#f7efd9',sun:'#edd198',mountains:['#dfd6c0','#cec3ac','#bdae92'],soil:'#a38b65',soilLight:'#c4b18e',grass:'#ccbb96',grassLight:'#f0deb6',water:'#b6c5bd',ink:'#756746'},
  egypt:{sky:'#f1e6d0',horizon:'#faedcd',sun:'#ecc079',mountains:['#e5ceaa','#d2b990','#bea575'],soil:'#b39260',soilLight:'#d3b481',grass:'#d6bd86',grassLight:'#f1d69c',water:'#9eaca7',ink:'#806641'},
};
const rr=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

export class Renderer {
  canvas:HTMLCanvasElement; ctx:CanvasRenderingContext2D; background:HTMLCanvasElement;terrainCanvas=document.createElement('canvas');terrainRevision=-1;
  game:Game; palette:Palette; ratio=1;time=0;viewHeight=WORLD_H;viewWidth=WORLD_W;
  readonly zoom=BATTLE_ZOOM;
  private camera=new BattleCamera();
  private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  get offsetX(){return this.camera.x;}set offsetX(v:number){this.camera.x=v;}
  get offsetY(){return this.camera.y;}set offsetY(v:number){this.camera.y=v;}
  private windMotes:{x:number;y:number;vx:number;fall:number;alpha:number;size:number;phase:number}[]=[];
  private get manualFocus(){return this.camera.manual?.y??null;}
  private set manualFocus(v:number|null){this.camera.manual=v===null?null:{x:this.offsetX,y:v};}
  private labelRects:{left:number;right:number;top:number;bottom:number;tank:number}[]=[];
  private portraitHits:{x:number;y:number;id:number}[]=[];
  private staticTerrain=document.createElement('canvas');private staticRevision=-1;private staticRatio=0;
  private terrainChange:TerrainChange|null=null;private terrainDirtyRegion:TerrainChange|null=null;
  private coastGrainBounds=new Map<number,{top:number;bottom:number}>();
  rasterPixelsLastUpdate=0;staticPixelsLastUpdate=0;
  private stage:PixiStage|null=null;private backgroundDirty=true;private terrainDirty=true;
  private invalidated=true;private pausedStamp='';private destroyed=false;
  backend:'canvas'|'pixi'='canvas';frames=0;
  invalidate(){this.invalidated=true;}
  focusAt(x:number,y?:number){this.camera.center(y===undefined?this.offsetX+this.viewWidth/2:x,y??x);this.invalidate();}
  panBy(dx:number,dy:number){this.camera.pan(dx,dy);this.invalidate();}
  follow(recenter=true){this.camera.follow();if(recenter){this.camera.center(this.game.active.x,this.game.active.y,true);this.camera.manual=null;}this.invalidate();}
  get touring(){return this.camera.touring;}
  get tourPlayer(){return this.camera.tourPlayer;}
  startTour(done:()=>void){const points=this.game.tanks.map(t=>({x:t.x,y:t.y,id:t.id}));points.push({...points[this.game.current]});this.camera.startTour(points,done,matchMedia('(prefers-reduced-motion: reduce)').matches);this.invalidate();}
  finishTour(recenter=true){if(!this.touring)return;this.camera.finishTour();if(recenter){this.camera.center(this.game.active.x,this.game.active.y,false);this.camera.follow();}this.invalidate();}
  portraitAt(x:number,y:number){return this.portraitHits.find(p=>Math.hypot(x-p.x,y-p.y)<=23)?.id??null;}
  constructor(canvas:HTMLCanvasElement,game:Game) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d')!;this.background=document.createElement('canvas');
    this.background.width=WORLD_W;this.background.height=WORLD_H;this.game=game;this.palette=PALETTES[game.config.map];
    this.resize();void loadBattleSprites();
    void document.fonts.ready.then(()=>{this.staticRevision=-1;this.invalidate();});
    if(!new URLSearchParams(location.search).has('canvas'))void this.initializePixi();
  }
  private async initializePixi(){
    const layer=document.createElement('canvas');layer.className='pixi-battle-layer';layer.hidden=true;layer.setAttribute('aria-hidden','true');this.canvas.before(layer);
    let stage:PixiStage|undefined;
    try{
      const {PixiStage}=await import('./pixi-stage');if(this.destroyed){layer.remove();return;}
      this.rebuildStaticTerrain();stage=new PixiStage(layer,()=>{this.invalidate();if(this.stage&&!this.stage.available)this.draw(0);});
      await stage.init(this.background,this.staticTerrain,this.ratio,this.viewHeight,this.viewWidth);
      if(this.destroyed){stage.destroy();return;}this.stage=stage;this.backgroundDirty=true;this.terrainDirty=true;this.invalidate();
    }catch{stage?.destroy();layer.remove();this.backend='canvas';this.invalidate();}
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.stage?.destroy();this.stage=null;}
  setGame(game:Game) {this.camera.reset();this.game=game;this.palette=PALETTES[game.config.map];this.terrainRevision=-1;this.staticRevision=-1;this.windMotes=[];this.paintBackground();this.invalidate();}
  resize() {
    this.ratio=Math.min(window.devicePixelRatio||1,2)*this.zoom;
    this.viewWidth=BATTLE_VIEW_WIDTH;
    this.viewHeight=Math.max(370/this.zoom,this.canvas.clientHeight/Math.max(1,this.canvas.clientWidth)*this.viewWidth);
    this.camera.configure(this.viewWidth,this.viewHeight);
    this.canvas.width=this.viewWidth*this.ratio;this.canvas.height=this.viewHeight*this.ratio;
    this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
    this.paintBackground();
    this.invalidate();
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
    this.backgroundDirty=true;
    const ctx=this.background.getContext('2d')!,p=this.palette;
    const gradient=ctx.createLinearGradient(0,0,0,WORLD_H);gradient.addColorStop(0,p.sky);gradient.addColorStop(0.72,p.horizon);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,WORLD_W,WORLD_H);
    if(this.game.config.map==='moon') {
      const rng=makeRng(82);for(let i=0;i<90;i++) {ctx.fillStyle=`rgba(249,239,210,${0.2+rng()*0.6})`;ctx.beginPath();ctx.arc(rng()*WORLD_W,rng()*340,rng()*1.4+0.4,0,Math.PI*2);ctx.fill();}
    }
    const sx=1005,sy=130,sunRatio=WORLD_H/this.viewHeight*this.viewWidth/WORLD_W;
    ctx.fillStyle=this.game.config.map==='moon'?'#cbc3b41a':'#f6d49435';ctx.beginPath();ctx.ellipse(sx,sy,81,81*sunRatio,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=this.game.config.map==='moon'?'#e5decc17':'#f6d49440';ctx.beginPath();ctx.ellipse(sx,sy,64,64*sunRatio,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.sun;ctx.beginPath();ctx.ellipse(sx,sy,44,44*sunRatio,0,0,Math.PI*2);ctx.fill();
    this.cloud(ctx,227,115,0.92,0.55);this.cloud(ctx,639,80,0.7,0.4);this.cloud(ctx,1170,219,0.64,0.5);
    this.mountain(ctx,376,p.mountains[0],26,162);
    this.mountain(ctx,422,p.mountains[1],75,123);
    const rng=makeRng(192);
    if(['valley','coast','moon'].includes(this.game.config.map))for(let x=0;x<WORLD_W;x+=17+rng()*12) {
      const y=393+Math.sin(x/91)*16;
      this.pine(ctx,x,y,28+rng()*48,p.mountains[1]);
    }
    this.mountain(ctx,472,p.mountains[2],9,100);
    if(['valley','coast','moon'].includes(this.game.config.map))for(let x=-20;x<WORLD_W+40;x+=23+rng()*24) {
      const y=441+Math.sin(x/157+0.8)*18;
      this.pine(ctx,x,y,25+rng()*62,p.mountains[2]);
    }
    classicBackdrop(ctx,this.game.config.map,p.mountains[2]);
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
  private rebuildTerrain() {
    const g=this.game,p=this.palette,c=this.terrainCanvas;
    const full=this.terrainRevision<0||c.width!==WORLD_W+1||c.height!==WORLD_H;
    if(full){c.width=WORLD_W+1;c.height=WORLD_H;this.coastGrainBounds.clear();}
    const changed=full?{from:0,to:WORLD_W,top:0,bottom:WORLD_H-1}:g.land.changedSince(this.terrainRevision)!;
    const region={from:Math.max(0,changed.from-1),to:Math.min(WORLD_W,changed.to+1),top:Math.max(0,changed.top-1),bottom:Math.min(WORLD_H-1,changed.bottom+9)};
    // The bridge grain runs from surface to bottom. A changed endpoint moves
    // the entire stroke, so repaint both its old and new vertical extent.
    if(g.config.map==='coast')for(let x=96;x<WORLD_W-90;x+=17)if(full||x>=region.from-5&&x<=region.to+5){
      const old=this.coastGrainBounds.get(x),top=g.ground(x),bottom=g.land.bottom(x);
      region.top=Math.max(0,Math.min(region.top,top-2,(old?.top??top)-2));
      region.bottom=Math.min(WORLD_H-1,Math.max(region.bottom,bottom+2,(old?.bottom??bottom)+2));
    }
    const width=region.to-region.from+1,height=region.bottom-region.top+1;
    const ctx=c.getContext('2d')!,data=ctx.createImageData(width,height);
    const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const soil=rgb(p.soil),light=rgb(p.soilLight),ink=rgb(p.ink),grass=rgb(p.grassLight);
    const stride=g.land.stride,mask=g.land.mask;
    const snow=[241,247,239],branchTop=[192,201,167],branchBody=[130,141,111],permanentColor=g.config.map==='factory'?[135,157,157]:[200,177,106];
    for(let y=region.top;y<=region.bottom;y++){
      const shade=clamp((y-250)/350,0,1),base=soil.map((v,i)=>light[i]*(1-shade)+v*shade);
      for(let x=region.from;x<=region.to;x++) {
        const index=y*stride+x;if(!mask[index])continue;
        const offset=((y-region.top)*width+x-region.from)*4,top=y===0||!mask[index-stride];
        const edge=x===0||x===WORLD_W||!mask[index-1]||!mask[index+1]||!mask[index+stride];
        const grain=((x*13+y*7)%31===0?7:0)+(Math.sin(x/90+y/20)>0.99?4:0);
        const permanent=g.land.protectedMask[index],snowcap=g.config.map==='moon'&&(y<9||!mask[index-stride*9]),branch=g.config.map==='moon'&&y>720;
        const color=branch?(top?branchTop:branchBody):permanent?permanentColor:top?grass:edge?ink:snowcap?snow:base;
        const tint=color===base?grain:0;
        data.data[offset]=color[0]+tint;data.data[offset+1]=color[1]+tint;data.data[offset+2]=color[2]+tint;data.data[offset+3]=255;
      }
    }
    ctx.putImageData(data,region.from,region.top);
    if(g.config.map==='coast') {
      ctx.save();ctx.beginPath();ctx.rect(region.from,region.top,width,height);ctx.clip();ctx.globalCompositeOperation='source-atop';ctx.strokeStyle='#69564775';ctx.lineWidth=2;
      for(let x=96;x<WORLD_W-90;x+=17) {const top=g.ground(x),bottom=g.land.bottom(x);ctx.beginPath();ctx.moveTo(x,top+4);ctx.lineTo(x-3,bottom-2);ctx.stroke();this.coastGrainBounds.set(x,{top,bottom});}
      ctx.restore();
    }
    this.terrainRevision=g.land.revision;this.terrainChange=region;this.rasterPixelsLastUpdate=width*height;
  }
  private rebuildStaticTerrain(){
    if(this.staticRevision===this.game.land.revision&&this.staticRatio===this.ratio)return;
    if(this.terrainRevision!==this.game.land.revision)this.rebuildTerrain();
    const full=this.staticRevision<0||this.staticRatio!==this.ratio;
    const dirty=this.terrainChange??{from:0,to:WORLD_W,top:0,bottom:WORLD_H-1};
    const region=full?{from:-32,to:WORLD_W+31,top:0,bottom:WORLD_H-1}:{from:Math.max(-32,dirty.from-32),to:Math.min(WORLD_W+31,dirty.to+32),top:Math.max(0,dirty.top-22),bottom:Math.min(WORLD_H-1,dirty.bottom+22)};
    // These decorations depend on one distant occupancy test.
    if(this.game.config.map==='egypt'&&dirty.from<=960&&dirty.to>=960&&dirty.top<=518&&dirty.bottom>=518)region.bottom=Math.max(region.bottom,620);
    if(this.game.config.map==='temple'&&dirty.from<=960&&dirty.to>=960&&dirty.top<=555&&dirty.bottom>=555){region.from=Math.min(region.from,856);region.to=Math.max(region.to,1092);region.bottom=Math.max(region.bottom,580);}
    const old=this.ctx,c=this.staticTerrain;if(full){c.width=(WORLD_W+64)*this.ratio;c.height=WORLD_H*this.ratio;}
    this.ctx=c.getContext('2d')!;this.ctx.setTransform(1,0,0,1,0,0);this.ctx.save();const left=Math.floor((region.from+32)*this.ratio),top=Math.floor(region.top*this.ratio),right=Math.ceil((region.to+33)*this.ratio),bottom=Math.ceil((region.bottom+1)*this.ratio);this.ctx.beginPath();this.ctx.rect(left,top,right-left,bottom-top);this.ctx.clip();this.ctx.clearRect(left,top,right-left,bottom-top);this.ctx.setTransform(this.ratio,0,0,this.ratio,32*this.ratio,0);
    try{this.paintTerrainDecoration(region);classicDetails(this.ctx,this.game);}finally{this.ctx.restore();this.ctx=old;}
    this.staticRevision=this.game.land.revision;this.staticRatio=this.ratio;this.terrainDirty=true;
    const previous=this.terrainDirtyRegion;this.terrainDirtyRegion=previous?{from:Math.min(previous.from,region.from),to:Math.max(previous.to,region.to),top:Math.min(previous.top,region.top),bottom:Math.max(previous.bottom,region.bottom)}:region;
    this.terrainChange=null;this.staticPixelsLastUpdate=(region.to-region.from+1)*(region.bottom-region.top+1);
  }
  private paintTerrainDecoration(region?:TerrainChange) {
    const ctx=this.ctx,g=this.game,p=this.palette;
    if(this.terrainRevision!==g.land.revision) this.rebuildTerrain();
    ctx.drawImage(this.terrainCanvas,0,0);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=p.grassLight;ctx.lineWidth=3;
    ctx.beginPath();let previous=-1000;
    for(let x=0;x<=WORLD_W;x+=2) {
      const y=g.terrain[x];
      if(y>=BOTTOM_Y) {previous=-1000;continue;}
      if(Math.abs(y-previous)>12) ctx.moveTo(x,y);else ctx.lineTo(x,y);
      previous=y;
    }
    ctx.stroke();
    // Grass tufts and little flowers follow the destructible surface.
    const flora=makeRng(20);
    if(['valley','coast'].includes(g.config.map))for(let x=18;x<WORLD_W;x+=16+flora()*23) {
      const y=g.ground(x);if(y>BOTTOM_Y-10) continue;
      const size=5+flora()*8;
      ctx.strokeStyle=flora()>0.55?p.grass:p.grassLight;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x-4,y);ctx.quadraticCurveTo(x-5,y-size*0.7,x-8,y-size);ctx.moveTo(x,y);ctx.quadraticCurveTo(x,y-size*0.8,x+2,y-size*1.1);ctx.moveTo(x+2,y);ctx.lineTo(x+8,y-size*0.5);ctx.stroke();
      if(flora()>0.86) {ctx.fillStyle='#edd3a0';ctx.beginPath();ctx.arc(x+2,y-size*1.1,2.5,0,Math.PI*2);ctx.fill();}
    }
    // Foreground shrubs at the perimeter frame the battlefield.
    if(['valley','coast'].includes(g.config.map))for(const x of [14,52,1236,1270]) {
      const y=g.ground(x);if(y>BOTTOM_Y-5) continue;
      ctx.fillStyle=p.ink;ctx.beginPath();ctx.ellipse(x,y,19,10,-0.2,Math.PI,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.grass;ctx.beginPath();ctx.ellipse(x+3,y-7,12,9,0,Math.PI,Math.PI*2);ctx.fill();
    }
  }

  private atmosphere() {
    const ctx=this.ctx,g=this.game;
    for(let i=0;i<this.windMotes.length;i++) {
      const mote=this.windMotes[i];
      ctx.save();ctx.translate(mote.x,mote.y);ctx.globalAlpha=mote.alpha;
      if(g.config.map==='moon'||g.snow) {ctx.fillStyle='#fffcf0';ctx.strokeStyle='#8aa6a34d';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(0,0,mote.size,0,Math.PI*2);ctx.fill();ctx.stroke();}
      else {ctx.rotate(Math.sin(this.time+mote.phase)*0.9+Math.sign(g.wind)*0.5);ctx.fillStyle=i%3===0?'#bd915e':'#8da46c';ctx.beginPath();ctx.ellipse(0,0,4.6,2.0,0,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    if(g.fireLine) {
      const f=g.fireLine;ctx.save();ctx.strokeStyle='#ee955383';ctx.lineWidth=7;
      ctx.beginPath();for(let y=f.top;y<f.bottom;y+=7) {const x=f.x+Math.sin(y/22+this.time*5)*4;if(y===f.top) ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      ctx.strokeStyle='#ffe4a0c0';ctx.lineWidth=2;ctx.stroke();
      for(let i=0;i<18;i++) {const y=f.top+((i*29+this.time*42)%(f.bottom-f.top));ctx.fillStyle='#ffc87990';ctx.beginPath();ctx.arc(f.x+Math.sin(i+this.time)*12,y,1.8,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    if(g.fog&&!g.introLocked) {
      const viewer=g.tanks[g.viewer],mist=ctx.createRadialGradient(viewer.x,viewer.y-25,80,viewer.x,viewer.y-25,460);
      mist.addColorStop(0,'#e5eae42b');mist.addColorStop(0.5,'#e5eae4b5');mist.addColorStop(1,'#e5eae4ee');
      ctx.fillStyle=mist;ctx.fillRect(this.offsetX,this.offsetY,this.viewWidth,this.viewHeight);
    }
  }
  private visibleAt(x:number) {return this.game.introLocked||!this.game.fog||Math.abs(x-this.game.tanks[this.game.viewer].x)<230;}
  private tank(t:Tank) {
    const ctx=this.ctx,g=this.game;
    if(t.hp<=0) {
      defeatedPig(ctx,t,this.time);
      return;
    }
    const vehicle=t.vehicleId?vehicleById(t.vehicleId):null;
    const slope=g.tankSlope(t);
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(slope);ctx.scale(t.direction,1);
    ctx.fillStyle='#34413028';ctx.beginPath();ctx.ellipse(0,17,33,7,0,0,Math.PI*2);ctx.fill();
    if(t.shield>0) {ctx.fillStyle='#b4e4e515';ctx.strokeStyle='#c5eef0a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-9,40,42,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(t.poisoned){ctx.fillStyle='#91af6c24';ctx.beginPath();ctx.ellipse(0,-17,36,34,0,0,7);ctx.fill();ctx.strokeStyle='#9bbd7980';ctx.lineWidth=1.5;for(let i=0;i<6;i++){const p=(this.time*.8+i/6)%1;ctx.beginPath();ctx.arc(Math.sin(i*5.1)*28,-3-p*43,2+p*2,0,7);ctx.stroke();}}
    const celebrating=g.phase==='ended'&&g.winner===t.team;
    const moving=g.movingUntil[t.id]>g.elapsed;
    const fired=g.projectiles.some(p=>p.owner===t.id&&p.age<.5);
    const firing=fired?Math.max(0,1-(g.projectiles.find(p=>p.owner===t.id)?.age??0)*2):0;
    if(vehicle)paintVehicle(ctx,vehicle,t.angle,this.time,firing,moving);
    const breathing=breathingPose(t.hp,this.time+t.id*.5,t.maxHP,t.vehicleId);
    paintCrew(ctx,t,this.time,celebrating?'win':t.reaction?'hurt':fired?'fire':moving?'move':'idle',breathing.active);
    if(isRaging(t)&&!celebrating){ctx.strokeStyle='#d88b50';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-31,-39);ctx.lineTo(-27,-33);ctx.lineTo(-30,-27);ctx.stroke();}
    ctx.restore();
    if(celebrating)victoryConfetti(ctx,t,this.time);
    for(const cue of g.itemCues)if(cue.tank===t.id){const top=Math.min(...g.tanks.filter(e=>e.hp>0&&Math.abs(e.x-t.x)<100).map(e=>e.y))-(celebrating?162:132);paintItemCue(ctx,cue,clamp(t.x,this.offsetX+48,this.offsetX+this.viewWidth-48),Math.max(this.offsetY+38,top),teamFlag(t.team).color,this.reducedMotion);}
    // The portrait stays upright; its frame carries the team colour.
    const celebrateOffset=celebrating?-26:0;let labelOffset=0;
    const box=()=>({left:t.x-25,right:t.x+(t.poisoned?76:25),top:t.y-108+celebrateOffset+labelOffset,bottom:t.y-53+celebrateOffset+labelOffset});
    for(let attempt=0;attempt<4;attempt++){const b=box();if(!this.labelRects.some(a=>b.left<a.right+4&&b.right>a.left-4&&b.top<a.bottom+4&&b.bottom>a.top-4))break;labelOffset-=55;}
    this.labelRects.push({...box(),tank:t.id});
    this.portraitHits.push({x:t.x,y:t.y-85+celebrateOffset+labelOffset,id:t.id});
    ctx.save();ctx.translate(t.x,t.y);
    ctx.save();ctx.translate(0,celebrateOffset+labelOffset);
    const active=(g.introLocked?this.tourPlayer===t.id:g.current===t.id)&&!['lobby','ended','resolving'].includes(g.phase);
    if(active)paintTurnMarker(ctx,0,-126,teamFlag(t.team).color,this.time,this.reducedMotion);
    ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(0,-85,21,0,Math.PI*2);ctx.fill();
    const portrait=crewPortrait(t.crew);
    ctx.save();ctx.beginPath();ctx.arc(0,-85,19,0,Math.PI*2);ctx.clip();if(portrait)ctx.drawImage(portrait,-20,-105,40,40);ctx.restore();
    ctx.strokeStyle=teamFlag(t.team).color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-85,20,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#f8f3e5b0';rr(ctx,-23,-59,46,3,1.5);ctx.fill();ctx.fillStyle=teamFlag(t.team).color;rr(ctx,-23,-59,46*t.hp/t.maxHP,3,1.5);ctx.fill();
    if(t.poisoned){ctx.fillStyle='#e6eddb';rr(ctx,30,-95,35,17,8);ctx.fill();ctx.fillStyle='#6c8d4c';ctx.font='600 10px sans-serif';ctx.textAlign='center';ctx.fillText('中毒',47,-83);}
    ctx.restore();
    if(t.frozen>0) {ctx.strokeStyle='#acd9e2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-30,-5);ctx.lineTo(-26,-25);ctx.lineTo(-17,-13);ctx.moveTo(26,5);ctx.lineTo(31,-20);ctx.lineTo(20,-8);ctx.stroke();}
    if(t.boost) {ctx.fillStyle='#f5cc83';ctx.font='bold 17px sans-serif';ctx.fillText('↑',34,-29);}
    ctx.restore();
  }
  private targetAid() {
    const g=this.game,ctx=this.ctx;
    // Transfer shells use the angle/charge controls without a predicted path.
  }
  draw(dt:number) {
    const ctx=this.ctx,g=this.game;
    const stamp=[g.land.revision,g.current,crewPortraitRevision(),battleSpriteRevision()].join(':');
    // draw(0) remains the explicit still-frame API used by snapshots/review.
    if(dt!==0&&g.paused&&!this.camera.animating&&!this.invalidated&&this.pausedStamp===stamp)return;
    this.invalidated=false;this.pausedStamp=g.paused?stamp:'';this.frames++;this.time+=g.paused&&!this.touring?0:dt;
    if(!this.windMotes.length) {const rng=makeRng(609);this.windMotes=Array.from({length:40},()=>({x:rng()*WORLD_W,y:rng()*WORLD_H,vx:g.wind*13,fall:8+rng()*11,alpha:0.52+rng()*0.24,size:1.4+rng()*1.6,phase:rng()*10}));}
    if(!g.paused) for(const mote of this.windMotes) {mote.vx+=(g.wind*13-mote.vx)*Math.min(1,dt*2);mote.x=((mote.x+mote.vx*dt)%WORLD_W+WORLD_W)%WORLD_W;mote.y=(mote.y+mote.fall*dt)%WORLD_H;}
    const actor=g.active;let camera=actor.y-this.viewHeight*.5,targetX=actor.x-this.viewWidth*.5;
    if(g.phase==='flying'&&g.projectiles.some(p=>this.visibleAt(p.x)&&p.delay<=0)) camera=Math.min(camera,Math.min(...g.projectiles.filter(p=>this.visibleAt(p.x)&&p.delay<=0).map(p=>p.y))-this.viewHeight*0.3);
    if(g.phase==='supply'&&g.crates.some(c=>c.falling)) camera=Math.min(camera,Math.min(...g.crates.filter(c=>c.falling).map(c=>c.y))-this.viewHeight*0.32);
    const flying=g.projectiles.filter(p=>p.delay<=0&&this.visibleAt(p.x));
    if(g.phase==='flying'&&flying.length)targetX=flying.reduce((x,p)=>x+p.x,0)/flying.length-this.viewWidth*.5;
    if(g.phase==='resolving'&&g.observation){const falling=g.tanks.find(t=>t.hp>0&&t.fallVelocity>0),t=falling??(g.observation.target===null?null:g.tanks[g.observation.target]),point=t?(t.defeat??t):g.observation.point;if(point){targetX=point.x-this.viewWidth*.5;camera=point.y-this.viewHeight*.5;}}
    this.camera.update(dt,{x:targetX,y:camera});
    ctx.save();ctx.clearRect(0,0,this.viewWidth,this.viewHeight);
    const shakeX=g.shake>0?Math.sin(this.time*88)*g.shake:0,shakeY=g.shake>0?Math.cos(this.time*69)*g.shake*.5:0;
    ctx.translate(shakeX,shakeY);this.rebuildStaticTerrain();
    let gpu=false;
    try{if(this.stage?.available){this.stage.sync(this.backgroundDirty,this.terrainDirty,this.ratio,this.viewHeight,this.viewWidth,this.terrainDirtyRegion);gpu=this.stage.draw(this.offsetX,this.offsetY,shakeX,shakeY,this.viewHeight);this.backgroundDirty=false;this.terrainDirty=false;this.terrainDirtyRegion=null;}}
    catch{this.stage?.destroy();this.stage=null;}
    this.backend=gpu?'pixi':'canvas';this.canvas.dataset.renderBackend=this.backend;
    if(!gpu)ctx.drawImage(this.background,0,0,this.viewWidth,this.viewHeight);
    ctx.translate(-this.offsetX,-this.offsetY);
    if(!gpu)ctx.drawImage(this.staticTerrain,-32,0,WORLD_W+64,WORLD_H);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=this.palette.grassLight;ctx.lineWidth=3;
    this.atmosphere();this.targetAid();
    for(const f of g.fires) {
      for(let i=-Math.floor(f.radius/11);i<=Math.floor(f.radius/11);i++) {
        const x=f.x+i*11,y=g.ground(x,(f.y??0)-20)-1;if(y>=BOTTOM_Y-5) continue;
        ctx.fillStyle=i%2===0?'#e89754bd':'#f5c376bb';ctx.beginPath();ctx.moveTo(x-5,y);ctx.quadraticCurveTo(x-8,y-10,x+Math.sin(this.time*6+i)*6,y-20-Math.sin(this.time*5+i)*7);ctx.quadraticCurveTo(x+8,y-8,x+5,y);ctx.fill();
        paintBattleSprite(ctx,'flame',this.time*.6+i*.09,x-8,y-30,16,30,.5,true);
      }
    }
    for(const gas of g.gases) if(this.visibleAt(gas.x)) {
      ctx.save();ctx.fillStyle='#a7bc7660';for(let i=0;i<6;i++) {ctx.beginPath();ctx.ellipse(gas.x+Math.sin(i*3+this.time)*gas.radius*.6,gas.y-15+Math.cos(i+this.time)*12,23,15,0,0,7);ctx.fill();}
      paintBattleSprite(ctx,'gas',this.time*.3,gas.x-gas.radius,gas.y-43,gas.radius*2,54,.48,true);ctx.restore();
    }
    for(const mine of g.mines) if((mine.owner===g.viewer||g.snow)&&this.visibleAt(mine.x)) {ctx.fillStyle=weaponById(mine.weapon).color;ctx.beginPath();ctx.ellipse(mine.x,mine.y,9,4,0,0,7);ctx.fill();ctx.fillStyle='#eeb58a';ctx.fillRect(mine.x-2,mine.y-5,4,2);}
    for(const crate of g.crates) {
      if(!this.visibleAt(crate.x)&&!crate.falling) continue;
      if(crate.falling) {ctx.strokeStyle='#f6f1dfaa';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(crate.x-14,crate.y-10);ctx.lineTo(crate.x-27,crate.y-48);ctx.moveTo(crate.x+14,crate.y-10);ctx.lineTo(crate.x+27,crate.y-48);ctx.stroke();ctx.fillStyle='#ead9b8cc';ctx.beginPath();ctx.ellipse(crate.x,crate.y-48,36,20,0,Math.PI,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#b29469';rr(ctx,crate.x-14,crate.y-10,28,25,3);ctx.fill();ctx.strokeStyle='#ead7aa';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#e9d9b5';ctx.fillRect(crate.x-2,crate.y-10,4,25);
      if(['double','homing','transfer','boost'].includes(crate.type)) {ctx.fillStyle=crate.type==='double'?'#e7c081':'#acc4d0';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(crate.type==='double'?'×2':crate.type==='transfer'?'⇄':crate.type==='boost'?'↑':'◎',crate.x,crate.y+9);}
      if(crate.type==='medical') {ctx.fillStyle='#a47158';ctx.fillRect(crate.x-7,crate.y-2,14,4);ctx.fillRect(crate.x-2,crate.y-7,4,14);}
    }
    this.labelRects=[];this.portraitHits=[];g.tanks.filter(t=>g.visible(t)).forEach(t=>this.tank(t));
    for(const p of g.projectiles) {
      if(p.delay>0||!this.visibleAt(p.x)) continue;
      if(!p.fireBoosted&&!p.transfer&&weaponHasTrail(p.weapon)&&p.trail.length>1){ctx.save();const first=p.trail[0],last=p.trail[p.trail.length-1],weapon=weaponById(p.weapon),color=weapon.color,rear=projectileRearExtent(weapon.shape??p.weapon,4-p.penetrations),angle=Math.atan2(p.vy,p.vx);ctx.translate(-Math.cos(angle)*rear,-Math.sin(angle)*rear);const fade=ctx.createLinearGradient(first.x,first.y,last.x,last.y);fade.addColorStop(0,color+'00');fade.addColorStop(1,color);ctx.strokeStyle=fade;ctx.globalAlpha=MODERN_TRAIL_ALPHA;ctx.lineWidth=MODERN_TRAIL_WIDTH;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();p.trail.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.restore();}
      if(p.fireBoosted){ctx.save();p.trail.filter((_,i)=>i%6===0).forEach((q,i)=>{ctx.globalAlpha=.3+i/10;ctx.translate(q.x,q.y);ctx.fillStyle=i%2?'#e8a958':'#fae5a1';ctx.strokeStyle='#b27939';ctx.lineWidth=.6;ctx.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?2.6:6;const x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.translate(-q.x,-q.y);});ctx.restore();}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
      const weapon=weaponById(p.weapon),shape=p.transfer?'transfer':weapon.shape??p.weapon;ctx.save();const size=projectileDrawScale(shape);ctx.scale(size,size);projectileArt(ctx,shape,p.transfer?'#63adbd':weapon.color,this.time+p.phase,4-p.penetrations);ctx.restore();
      if(p.homing) {ctx.strokeStyle='#bddce3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();}ctx.restore();
      if(p.homing&&this.visibleAt(p.lockX)) {ctx.save();ctx.strokeStyle='#d6efdfb0';ctx.lineWidth=1.5;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.lockX,p.lockY);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.lockX,p.lockY,15+Math.sin(p.lockAge*12)*4,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(p.lockX-23,p.lockY);ctx.lineTo(p.lockX-13,p.lockY);ctx.moveTo(p.lockX+13,p.lockY);ctx.lineTo(p.lockX+23,p.lockY);ctx.stroke();ctx.restore();}
      if(weapon.effect==='orbital'&&p.sub) {ctx.save();ctx.strokeStyle='#c0bdf595';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,-40);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();}
    }
    for(const b of g.blasts) {
      if(!this.visibleAt(b.x)) continue;
      const progress=1-b.life/b.maxLife;
      const effect=b.weapon?weaponById(b.weapon).effect:undefined;
      const sprite=effect==='freeze'||b.weapon?.startsWith('water-')?'water':['beam','helix','orbital'].includes(effect??'')?'energy':'blast';
      paintBattleSprite(ctx,sprite,progress,b.x-b.radius*1.15,b.y-b.radius*1.15,b.radius*2.3,b.radius*2.3,.6*(1-progress*.7));
      ctx.globalAlpha=(1-progress)*0.7;ctx.fillStyle=b.color;
      ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(0.4+progress*0.8),0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=(1-progress)*0.9;ctx.strokeStyle='#fff0c9';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(0.2+progress*1.25),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    }
    for(const p of g.particles) {if(!this.visibleAt(p.x)) continue;ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(0.4+p.life/p.maxLife*0.6),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(const t of g.texts) {if(!this.visibleAt(t.x)) continue;ctx.globalAlpha=clamp(t.life,0,1);ctx.font='bold 18px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.strokeStyle='#fff8e8';ctx.lineWidth=3;ctx.strokeText(t.text,t.x,t.y);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;
    ctx.restore();
  }
}
