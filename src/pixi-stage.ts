import {Application,CanvasSource,Texture,Sprite,Container} from 'pixi.js';

/** GPU retained background/terrain. Continuous vector animation stays in the
 * foreground canvas; no final-frame texture upload and no second ticker. */
export class PixiStage {
  readonly app=new Application();
  private world=new Container();
  private textures:Texture[]=[];
  private sky!:Sprite;private land!:Sprite;
  private signature='';private lost=false;private disposed=false;
  uploads=0;frames=0;
  constructor(readonly canvas:HTMLCanvasElement,private invalidate:()=>void){}
  private onLost=(event:Event)=>{event.preventDefault();this.lost=true;this.canvas.hidden=true;this.invalidate();};
  private onRestored=()=>{this.lost=false;this.signature='';this.invalidate();};
  async init(background:HTMLCanvasElement,terrain:HTMLCanvasElement,ratio:number,height:number){
    await this.app.init({canvas:this.canvas,width:1280,height:Math.floor(height*ratio)/ratio,resolution:ratio,autoDensity:false,autoStart:false,sharedTicker:false,preference:['webgl'],antialias:false,backgroundAlpha:0});
    this.app.stop();
    this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
    const texture=(resource:HTMLCanvasElement,resolution:number)=>{
      if(!resource.width||!resource.height)throw new Error('Empty scene texture');
      const t=new Texture({source:new CanvasSource({resource,resolution,autoGenerateMipmaps:false})});this.textures.push(t);this.uploads++;return t;
    };
    this.sky=new Sprite(texture(background,1));this.land=new Sprite(texture(terrain,ratio));this.land.x=-32;
    this.sky.width=1280;this.sky.height=height;
    this.app.stage.addChild(this.sky,this.world);this.world.addChild(this.land);
  }
  get available(){return !this.disposed&&!this.lost;}
  sync(backgroundDirty:boolean,terrainDirty:boolean,ratio:number,height:number){
    if(backgroundDirty){this.sky.texture.source.update();this.uploads++;}
    if(terrainDirty){const source=this.land.texture.source;source.resize(undefined,undefined,ratio);source.update();this.land.width=1344;this.land.height=600;this.uploads++;}
    const screenHeight=Math.floor(height*ratio)/ratio;
    if(this.app.renderer.resolution!==ratio||this.app.screen.height!==screenHeight){this.app.renderer.resize(1280,screenHeight,ratio);this.sky.height=height;this.signature='';}
    if(backgroundDirty||terrainDirty)this.signature='';
  }
  draw(x:number,y:number,shakeX:number,shakeY:number,height:number){
    if(!this.available)return false;
    // 1/1024 world pixel is below the DPR2 sampling grid; easing noise must
    // not keep a settled GPU scene submitting identical pixels forever.
    const signature=[Math.round(x*1024),Math.round(y*1024),shakeX,shakeY,height].join(',');
    if(signature!==this.signature){
      this.world.position.set(-x,-y);this.app.stage.position.set(shakeX,shakeY);this.app.render();this.frames++;this.signature=signature;
    }
    this.canvas.hidden=false;return true;
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);
    if(this.app.renderer)this.app.destroy(false,{children:true,texture:false,textureSource:false});
    this.textures.forEach(t=>t.destroy(true));this.textures=[];this.canvas.remove();
  }
}
