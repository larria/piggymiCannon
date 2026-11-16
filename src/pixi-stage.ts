import {Application,CanvasSource,Texture,Sprite,Container} from 'pixi.js';import type {TerrainTile} from './terrain-tiles';
/** Retained, bounded tile textures; no whole-world upload and no extra ticker. */
export class PixiStage {
 readonly app=new Application();private world=new Container();private sky!:Sprite;private tiles=new Map<string,{sprite:Sprite;canvas:HTMLCanvasElement;revision:number}>();private signature='';private lost=false;private disposed=false;uploads=0;frames=0;
 constructor(readonly canvas:HTMLCanvasElement,private invalidate:()=>void){}
 private onLost=(event:Event)=>{event.preventDefault();this.lost=true;this.canvas.hidden=true;this.invalidate();};
 private onRestored=()=>{this.lost=false;this.signature='';this.invalidate();};
 private texture(canvas:HTMLCanvasElement,ratio:number){return new Texture({source:new CanvasSource({resource:canvas,resolution:ratio,autoGenerateMipmaps:false})});}
 async init(background:HTMLCanvasElement,ratio:number,height:number,width=1280){
  await this.app.init({canvas:this.canvas,width,height:Math.floor(height*ratio)/ratio,resolution:ratio,autoDensity:false,autoStart:false,sharedTicker:false,preference:['webgl'],antialias:false,backgroundAlpha:0});this.app.stop();this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
  this.sky=new Sprite(this.texture(background,1));this.sky.width=width;this.sky.height=height;this.app.stage.addChild(this.sky,this.world);this.uploads++;
 }
 get available(){return !this.disposed&&!this.lost;}
 get textureCount(){return this.tiles.size+1;}
 sync(backgroundDirty:boolean,all:TerrainTile[],visible:TerrainTile[],ratio:number,height:number,width=1280){
  let changed=backgroundDirty;if(backgroundDirty){const old=this.sky.texture;this.sky.texture=this.texture(old.source.resource as HTMLCanvasElement,1);old.destroy(true);this.sky.width=width;this.sky.height=height;this.uploads++;}
  const retained=new Set(all.map(t=>t.key)),shown=new Set(visible.map(t=>t.key));
  for(const [key,row]of this.tiles)if(!retained.has(key)){row.sprite.destroy({texture:true,textureSource:true});this.tiles.delete(key);changed=true;}
  for(const tile of visible){let row=this.tiles.get(tile.key);
   if(row&&row.canvas!==tile.canvas){row.sprite.destroy({texture:true,textureSource:true});this.tiles.delete(tile.key);row=undefined;}
   if(!row){const sprite=new Sprite(this.texture(tile.canvas,ratio));sprite.position.set(tile.x,tile.y);sprite.width=tile.width;sprite.height=tile.height;this.world.addChild(sprite);row={sprite,canvas:tile.canvas,revision:tile.paintVersion};this.tiles.set(tile.key,row);this.uploads++;changed=true;}
   else if(row.revision!==tile.paintVersion){row.sprite.texture.source.update();row.revision=tile.paintVersion;this.uploads++;changed=true;}
  }
  for(const [key,row]of this.tiles){const on=shown.has(key);if(row.sprite.visible!==on){row.sprite.visible=on;changed=true;}}
  const h=Math.floor(height*ratio)/ratio,w=Math.round(width*ratio)/ratio;
  if(this.app.renderer.resolution!==ratio||this.app.screen.height!==h||this.app.screen.width!==w){this.app.renderer.resize(width,h,ratio);this.sky.width=width;this.sky.height=height;changed=true;}
  if(changed)this.signature='';
 }
 draw(x:number,y:number,shakeX:number,shakeY:number,height:number){if(!this.available)return false;const signature=[Math.round(x*1024),Math.round(y*1024),shakeX,shakeY,height].join(',');if(signature!==this.signature){this.world.position.set(-x,-y);this.app.stage.position.set(shakeX,shakeY);this.app.render();this.frames++;this.signature=signature;}this.canvas.hidden=false;return true;}
 destroy(){if(this.disposed)return;this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);this.tiles.clear();if(this.app.renderer)this.app.destroy(false,{children:true,texture:true,textureSource:true});this.canvas.remove();}
}
