import {Application,CanvasSource,Texture,Sprite,Rectangle,VERSION} from 'pixi.js';
import {paintVehicle} from '../../src/vehicle-art';
import {VEHICLES} from '../../src/vehicles';

// A deliberately separate spike, never imported by src/main.ts or precached.
const size=160,resolution=2;
export function bakeVehicle(index:number){
 const c=document.createElement('canvas');c.width=c.height=size*resolution;
 const ctx=c.getContext('2d')!;ctx.scale(resolution,resolution);ctx.translate(size/2,size/2);
 paintVehicle(ctx,VEHICLES[index],45,0,0,false);return c;
}
class TextureProbe{
 app=new Application();textures:Texture[]=[];sources:HTMLCanvasElement[]=[];sprite:Sprite|null=null;
 uploads=0;renders=0;lost=false;destroyed=false;
 constructor(readonly canvas:HTMLCanvasElement){}
 private onLost=(e:Event)=>{e.preventDefault();this.lost=true;};
 private onRestored=()=>{this.lost=false;};
 async init(){
  await this.app.init({canvas:this.canvas,width:size,height:size,resolution,autoDensity:false,antialias:false,autoStart:false,sharedTicker:false,preference:'webgl',backgroundAlpha:0});
  this.app.stop();this.canvas.addEventListener('webglcontextlost',this.onLost);this.canvas.addEventListener('webglcontextrestored',this.onRestored);
  this.sources=VEHICLES.map((_,i)=>bakeVehicle(i));this.textures=this.sources.map(c=>this.upload(c));
  this.sprite=new Sprite(this.textures[0]);this.app.stage.addChild(this.sprite);this.render();
 }
 upload(c:HTMLCanvasElement){
  if(!c.width||!c.height)throw new Error('拒绝空纹理');
  const source=new CanvasSource({resource:c,resolution,autoGenerateMipmaps:false});
  this.uploads++;return new Texture({source});
 }
 render(){if(this.lost||this.destroyed)return false;this.app.render();this.renders++;return true;}
 show(index:number){this.sprite!.texture=this.textures[index];this.render();}
 compare(index:number){
  this.show(index);
  const {pixels,width,height}=this.app.renderer.extract.pixels({target:this.app.stage,frame:new Rectangle(0,0,size,size),resolution});
  const old=this.sources[index].getContext('2d')!.getImageData(0,0,width,height).data;
  let maxError=0,totalError=0,compared=0,opaque=0,largeErrors=0;
  for(let n=0;n<old.length;n+=4){if(old[n+3]>250)opaque++;for(let channel=0;channel<4;channel++){
   // WebGL extraction is premultiplied RGBA; Canvas ImageData is straight
   // RGBA. Compare in the same representation, including transparent edges.
   const expected=channel===3?old[n+3]:Math.round(old[n+channel]*old[n+3]/255);
   const error=Math.abs(expected-pixels[n+channel]);maxError=Math.max(maxError,error);totalError+=error;compared++;if(error>2)largeErrors++;
  }}
  return {id:VEHICLES[index].id,width,height,opaquePixels:opaque,maxChannelError:maxError,meanChannelError:totalError/compared,largeErrorFraction:largeErrors/compared};
 }
 async benchmark(count:number,mode:'paths'|'cached-canvas'|'pixi',frames=120){
  this.app.stage.removeChildren();
  const instances=Array.from({length:count},(_,i)=>{const s=new Sprite(this.textures[i%13]);s.position.set((i%4)*22-20,Math.floor(i/4)*3);return s;});
  instances.forEach(s=>this.app.stage.addChild(s));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size*resolution;const ctx=canvas.getContext('2d')!;
  const times:number[]=[];let first=0,last=0;
  await new Promise<void>(resolve=>{const tick=(now:number)=>{
   if(!first)first=now;const start=performance.now();
   if(mode==='pixi')this.render();else {ctx.setTransform(resolution,0,0,resolution,0,0);ctx.clearRect(0,0,size,size);
    for(let i=0;i<count;i++){const x=(i%4)*22-20,y=Math.floor(i/4)*3;
     if(mode==='paths'){ctx.save();ctx.translate(size/2+x,size/2+y);paintVehicle(ctx,VEHICLES[i%13],45,0,0,false);ctx.restore();}
     else ctx.drawImage(this.sources[i%13],x,y,size,size);
    }
   }times.push(performance.now()-start);last=now;
   if(times.length<frames)requestAnimationFrame(tick);else resolve();
  };requestAnimationFrame(tick);});
  instances.forEach(s=>s.destroy());this.app.stage.addChild(this.sprite!);this.render();
  const sorted=times.slice().sort((a,b)=>a-b);
  return {count,mode,frames,elapsedMs:last-first,meanSubmitMs:times.reduce((a,b)=>a+b,0)/frames,p95SubmitMs:sorted[Math.floor(frames*.95)],maxSubmitMs:sorted.at(-1),uploads:this.uploads};
 }
 destroy(){if(this.destroyed)return;this.destroyed=true;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestored);this.app.destroy(false,{children:true,texture:false,textureSource:false});this.textures.forEach(t=>t.destroy(true));this.textures=[];this.sources=[];this.sprite=null;}
}
const probe=new TextureProbe(document.querySelector<HTMLCanvasElement>('#probe')!);
try{await probe.init();document.querySelector('#status')!.textContent=`PixiJS ${VERSION}；13 个自绘纹理；ticker 已停止。`;}
catch(e){document.querySelector('#status')!.textContent=String(e);throw e;}
Object.assign(window,{__pixiProbe:probe,__pixiVersion:VERSION});
