import {WORLD_W,TERRAIN_H,type TerrainChange} from './terrain';
import {Application,CanvasSource,Texture,Sprite,Container,Rectangle} from 'pixi.js';
export const TERRAIN_TEXTURE_TILE=256;
type Tile={sprite:Sprite;texture:Texture;canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number};
/** Retained tiles copy the existing painting exactly; one-pixel gutters keep
 * filtering continuous across seams. Only changed tiles are uploaded. */
export class PixiStage {
  readonly app=new Application();private world=new Container();private textures:Texture[]=[];
  private sky!:Sprite;private tiles:Tile[]=[];private terrain!:HTMLCanvasElement;private terrainRatio=0;
  private signature='';private lost=false;private disposed=false;
  uploads=0;frames=0;uploadedBytesLastSync=0;
  constructor(readonly canvas:HTMLCanvasElement,private invalidate:()=>void){}
  private onLost=(event:Event)=>{event.preventDefault();this.lost=true;this.canvas.hidden=true;this.invalidate();};
  private onRestored=()=>{this.lost=false;this.signature='';this.invalidate();};
  async init(background:HTMLCanvasElement,terrain:HTMLCanvasElement,ratio:number,height:number,width=1280){
    await this.app.init({canvas:this.canvas,width,height:Math.floor(height*ratio)/ratio,resolution:ratio,autoDensity:false,autoStart:false,sharedTicker:false,preference:['webgl'],antialias:false,backgroundAlpha:0});this.app.stop();
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    const texture=new Texture({source:new CanvasSource({resource:background,resolution:1,autoGenerateMipmaps:false})});this.textures.push(texture);this.uploads++;
    this.sky=new Sprite(texture);this.sky.width=width;this.sky.height=height;this.app.stage.addChild(this.sky,this.world);this.terrain=terrain;
    for(let y=0;y<TERRAIN_H;y+=TERRAIN_TEXTURE_TILE)for(let x=0;x<WORLD_W+64;x+=TERRAIN_TEXTURE_TILE){
      const w=Math.min(TERRAIN_TEXTURE_TILE,WORLD_W+64-x),h=Math.min(TERRAIN_TEXTURE_TILE,TERRAIN_H-y),canvas=document.createElement('canvas');canvas.width=Math.round((w+2)*ratio);canvas.height=Math.round((h+2)*ratio);
      const source=new CanvasSource({resource:canvas,resolution:ratio,autoGenerateMipmaps:false}),texture=new Texture({source,frame:new Rectangle(1,1,w,h)}),sprite=new Sprite(texture);
      sprite.position.set(x-32,y);sprite.width=w;sprite.height=h;this.world.addChild(sprite);this.textures.push(texture);const tile={sprite,texture,canvas,x,y,width:w,height:h};this.tiles.push(tile);this.copyTile(tile,ratio);
    }
    this.terrainRatio=ratio;
  }
  private copyTile(tile:Tile,ratio:number){
    // Partition in source pixels; fractional desktop DPR must not add a second
    // interpolation pass while copying the tile and its two-pixel gutter.
    const totalWidth=WORLD_W+64,px=Math.round(tile.x/totalWidth*this.terrain.width),py=Math.round(tile.y/TERRAIN_H*this.terrain.height);
    const pw=Math.round((tile.x+tile.width)/totalWidth*this.terrain.width)-px,ph=Math.round((tile.y+tile.height)/TERRAIN_H*this.terrain.height)-py,gutter=2,w=pw+gutter*2,h=ph+gutter*2;
    if(tile.canvas.width!==w||tile.canvas.height!==h){tile.canvas.width=w;tile.canvas.height=h;}
    const source=tile.texture.source;source.resize(w/ratio,h/ratio,ratio);
    const c=tile.canvas.getContext('2d')!;c.clearRect(0,0,w,h);
    const x=Math.max(0,px-gutter),y=Math.max(0,py-gutter),width=Math.min(this.terrain.width,px+pw+gutter)-x,height=Math.min(this.terrain.height,py+ph+gutter)-y;
    c.drawImage(this.terrain,x,y,width,height,x-px+gutter,y-py+gutter,width,height);
    tile.texture.frame.set(gutter/ratio,gutter/ratio,pw/ratio,ph/ratio);source.update();tile.texture.update();
    tile.sprite.position.set(px/this.terrain.width*totalWidth-32,py/this.terrain.height*TERRAIN_H);tile.sprite.width=pw/this.terrain.width*totalWidth;tile.sprite.height=ph/this.terrain.height*TERRAIN_H;
    this.uploads++;this.uploadedBytesLastSync+=tile.canvas.width*tile.canvas.height*4;
  }
  get available(){return !this.disposed&&!this.lost;}
  sync(backgroundDirty:boolean,terrainDirty:boolean,ratio:number,height:number,width=1280,region:TerrainChange|null=null){
    this.uploadedBytesLastSync=0;
    if(backgroundDirty){this.sky.texture.source.update();this.uploads++;this.uploadedBytesLastSync+=this.sky.texture.source.pixelWidth*this.sky.texture.source.pixelHeight*4;}
    const resized=this.terrainRatio!==ratio,margin=Math.max(1,2/ratio);
    if(terrainDirty||resized){for(const tile of this.tiles){const x=tile.x-32;if(resized||!region||x-margin<=region.to&&x+tile.width+margin>=region.from&&tile.y-margin<=region.bottom&&tile.y+tile.height+margin>=region.top)this.copyTile(tile,ratio);}this.terrainRatio=ratio;}
    const screenHeight=Math.floor(height*ratio)/ratio,screenWidth=Math.round(width*ratio)/ratio;
    if(this.app.renderer.resolution!==ratio||this.app.screen.height!==screenHeight||this.app.screen.width!==screenWidth){this.app.renderer.resize(width,screenHeight,ratio);this.sky.width=width;this.sky.height=height;this.signature='';}
    if(backgroundDirty||terrainDirty||resized)this.signature='';
  }
  draw(x:number,y:number,shakeX:number,shakeY:number,height:number){
    if(!this.available)return false;
    const signature=[Math.round(x*1024),Math.round(y*1024),shakeX,shakeY,height].join(',');
    if(signature!==this.signature){this.world.position.set(-x,-y);this.app.stage.position.set(shakeX,shakeY);this.app.render();this.frames++;this.signature=signature;}
    this.canvas.hidden=false;return true;
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
    if(this.app.renderer)this.app.destroy(false,{children:true,texture:false,textureSource:false});this.textures.forEach(t=>t.destroy(true));this.textures=[];this.tiles=[];this.canvas.remove();
  }
}
