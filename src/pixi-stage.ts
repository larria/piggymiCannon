import {type TerrainChange} from './terrain';
import {Application,CanvasSource,Texture,Sprite,Container,Rectangle} from 'pixi.js';
export const TERRAIN_TEXTURE_TILE=256;
type Tile={sprite:Sprite;texture:Texture;canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number};
/** Retained tiles copy the existing painting exactly; one-pixel gutters keep
 * filtering continuous across seams. Only changed tiles are uploaded. */
export class PixiStage {
  readonly app=new Application();private world=new Container();private textures:Texture[]=[];
  private sky!:Sprite;private background!:HTMLCanvasElement;private tiles:Tile[]=[];private terrain!:HTMLCanvasElement;private terrainRatio=0;
  private worldWidth=0;private worldHeight=0;
  private signature='';private lost=false;private disposed=false;
  uploads=0;frames=0;uploadedBytesLastSync=0;
  constructor(readonly canvas:HTMLCanvasElement,private invalidate:()=>void){}
  private onLost=(event:Event)=>{event.preventDefault();this.lost=true;this.canvas.hidden=true;this.invalidate();};
  private onRestored=()=>{this.lost=false;this.signature='';this.invalidate();};
  async init(background:HTMLCanvasElement,terrain:HTMLCanvasElement,ratio:number,height:number,width=1280,screenRatio=ratio){
    await this.app.init({canvas:this.canvas,width,height:Math.floor(height*screenRatio)/screenRatio,resolution:screenRatio,autoDensity:false,autoStart:false,sharedTicker:false,preference:['webgl'],antialias:false,backgroundAlpha:0});this.app.stop();
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    const texture=new Texture({source:new CanvasSource({resource:background,resolution:1,autoGenerateMipmaps:false})});this.textures.push(texture);this.uploads++;
    this.sky=new Sprite(texture);this.sky.width=width;this.sky.height=height;this.app.stage.addChild(this.sky,this.world);this.terrain=terrain;this.background=background;
    this.resetTiles(ratio);
    this.terrainRatio=ratio;
  }
  private resetTiles(ratio:number){
    for(const tile of this.tiles){this.world.removeChild(tile.sprite);tile.sprite.destroy();tile.texture.destroy(true);this.textures=this.textures.filter(t=>t!==tile.texture);}this.tiles=[];
    this.worldWidth=this.background.width;this.worldHeight=this.background.height;
    for(let y=0;y<this.worldHeight;y+=TERRAIN_TEXTURE_TILE)for(let x=0;x<this.worldWidth+64;x+=TERRAIN_TEXTURE_TILE){
      const w=Math.min(TERRAIN_TEXTURE_TILE,this.worldWidth+64-x),h=Math.min(TERRAIN_TEXTURE_TILE,this.worldHeight-y),canvas=document.createElement('canvas');canvas.width=Math.round((w+2)*ratio);canvas.height=Math.round((h+2)*ratio);
      const source=new CanvasSource({resource:canvas,resolution:ratio,autoGenerateMipmaps:false}),texture=new Texture({source,frame:new Rectangle(1,1,w,h)}),sprite=new Sprite(texture);
      sprite.position.set(x-32,y);sprite.width=w;sprite.height=h;this.world.addChild(sprite);this.textures.push(texture);const tile={sprite,texture,canvas,x,y,width:w,height:h};this.tiles.push(tile);this.copyTile(tile,ratio);
    }
  }
  private copyTile(tile:Tile,ratio:number){
    // Partition in source pixels; fractional desktop DPR must not add a second
    // interpolation pass while copying the tile and its two-pixel gutter.
    const totalWidth=this.worldWidth+64,px=Math.round(tile.x/totalWidth*this.terrain.width),py=Math.round(tile.y/this.worldHeight*this.terrain.height);
    const pw=Math.round((tile.x+tile.width)/totalWidth*this.terrain.width)-px,ph=Math.round((tile.y+tile.height)/this.worldHeight*this.terrain.height)-py,gutter=2,w=pw+gutter*2,h=ph+gutter*2;
    if(tile.canvas.width!==w||tile.canvas.height!==h){tile.canvas.width=w;tile.canvas.height=h;}
    const source=tile.texture.source;source.resize(w/ratio,h/ratio,ratio);
    const c=tile.canvas.getContext('2d')!;c.clearRect(0,0,w,h);
    const x=Math.max(0,px-gutter),y=Math.max(0,py-gutter),width=Math.min(this.terrain.width,px+pw+gutter)-x,height=Math.min(this.terrain.height,py+ph+gutter)-y;
    c.drawImage(this.terrain,x,y,width,height,x-px+gutter,y-py+gutter,width,height);
    // Expose one copied gutter pixel on each side. Identical neighbouring
    // pixels overlap, closing fractional-DPR/zoom rasterization cracks.
    const overlap=1;
    tile.texture.frame.set((gutter-overlap)/ratio,(gutter-overlap)/ratio,(pw+overlap*2)/ratio,(ph+overlap*2)/ratio);source.update();tile.texture.update();
    tile.sprite.position.set((px-overlap)/this.terrain.width*totalWidth-32,(py-overlap)/this.terrain.height*this.worldHeight);tile.sprite.width=(pw+overlap*2)/this.terrain.width*totalWidth;tile.sprite.height=(ph+overlap*2)/this.terrain.height*this.worldHeight;
    this.uploads++;this.uploadedBytesLastSync+=tile.canvas.width*tile.canvas.height*4;
  }
  get available(){return !this.disposed&&!this.lost;}
  sync(backgroundDirty:boolean,terrainDirty:boolean,ratio:number,height:number,width=1280,region:TerrainChange|null=null,screenRatio=ratio){
    this.uploadedBytesLastSync=0;
    if(backgroundDirty){this.sky.texture.source.resize(this.background.width,this.background.height,1);this.sky.texture.source.update();this.uploads++;this.uploadedBytesLastSync+=this.sky.texture.source.pixelWidth*this.sky.texture.source.pixelHeight*4;}
    const layoutChanged=this.background.width!==this.worldWidth||this.background.height!==this.worldHeight;
    if(layoutChanged)this.resetTiles(ratio);
    const resized=this.terrainRatio!==ratio||layoutChanged,margin=Math.max(1,2/ratio);
    if(terrainDirty||resized){for(const tile of this.tiles){const x=tile.x-32;if(resized||!region||x-margin<=region.to&&x+tile.width+margin>=region.from&&tile.y-margin<=region.bottom&&tile.y+tile.height+margin>=region.top)this.copyTile(tile,ratio);}this.terrainRatio=ratio;}
    const screenHeight=Math.floor(height*screenRatio+1e-7)/screenRatio,screenWidth=Math.floor(width*screenRatio+1e-7)/screenRatio;
    if(this.app.renderer.resolution!==screenRatio||this.app.screen.height!==screenHeight||this.app.screen.width!==screenWidth){this.app.renderer.resize(screenWidth,screenHeight,screenRatio);this.sky.width=width;this.sky.height=height;this.signature='';}
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
