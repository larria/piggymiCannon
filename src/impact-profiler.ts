import type {AudioManager} from './audio';
import type {Game} from './engine';import type {Renderer} from './renderer';
/** Explicit development-only instrumentation; no persistence or network. */
export class ImpactProfiler {
 private restorers:(()=>void)[]=[];private stage:any=null;private current:Record<string,any>|null=null;private records:Record<string,any>[]=[];private started=0;private rafTime=0;
 constructor(private game:Game,private renderer:Renderer,private audio?:AudioManager){
  for(const [object,name,key] of [[game,'explode','explosionInclusive'],[game.land,'removeEllipse','excavateInclusive'],[game.land,'rebuild','surface'],[game,'recordBattle','trace'],[renderer,'rebuildTerrain','raster'],[renderer,'rebuildStaticTerrain','staticInclusive']] as any[])this.wrap(object,name,key);
  if(audio)this.wrap(audio,'play','sound');
  console.info('[impact-profile] 弹着性能记录已开启；复制本局快照会附带报告。');
 }
 private wrap(object:any,name:string,key:string){
  const original=object[name];if(typeof original!=='function')return;
  object[name]=(...args:any[])=>{const current=this.current;if(!current)return original.apply(object,args);const start=performance.now();try{return original.apply(object,args);}finally{current.ms[key]=(current.ms[key]??0)+performance.now()-start;if(name==='explode')current.impacts++;}};
  this.restorers.push(()=>object[name]=original);
 }
 beginFrame(now:number){
  const previous=this.records.at(-1);if(previous&&previous.rafTime===this.rafTime)previous.nextRafGap=now-this.rafTime;
  this.rafTime=now;this.started=performance.now();this.current={action:this.game.turn+1,map:this.game.config.map,battleTime:this.game.elapsed,rafTime:now,ms:{},impacts:0,rasterBefore:this.renderer.terrainRevision};
  const stage=(this.renderer as any).stage;if(stage&&stage!==this.stage){this.stage=stage;this.wrap(stage,'sync','textureSync');this.wrap(stage.app,'render','gpuSubmit');}
 }
 measure<T>(key:string,fn:()=>T):T{const start=performance.now();try{return fn();}finally{if(this.current)this.current.ms[key]=(this.current.ms[key]??0)+performance.now()-start;}}
 finishFrame(){
  const row=this.current;this.current=null;if(!row?.impacts)return;
  row.ms.total=performance.now()-this.started;row.backend=this.renderer.backend;row.rasterPixels=row.rasterBefore!==this.renderer.terrainRevision?this.renderer.rasterPixelsLastUpdate:0;row.uploadedBytes=row.ms.textureSync!==undefined&&row.backend==='pixi'?(this.stage?.uploadedBytesLastSync??0):0;row.projectiles=this.game.projectiles.length;row.blasts=this.game.blasts.length;
  this.records.push(row);if(this.records.length>128)this.records.shift();console.info('[impact-profile]',JSON.stringify(row));
 }
 report(){return {format:'piggy-impact-profile',formatVersion:1,viewport:[this.renderer.canvas.clientWidth,this.renderer.canvas.clientHeight],dpr:this.renderer.ratio,records:JSON.parse(JSON.stringify(this.records)) as Record<string,any>[],resources:{textures:this.stage?.textures?.length??0,canvases:document.querySelectorAll('canvas').length,windMotes:(this.renderer as any).windMotes.length,particles:this.game.particles.length,projectiles:this.game.projectiles.length,heapBytes:(performance as any).memory?.usedJSHeapSize??null,audioBuffers:(this.audio as any)?.buffers?.size??0,audioLoads:(this.audio as any)?.loading?.size??0,audioSources:(this.audio as any)?.sources?.size??0}};}
 detach(){this.restorers.reverse().forEach(fn=>fn());this.restorers=[];this.current=null;}
}
